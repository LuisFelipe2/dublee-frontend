import { useEffect, useReducer, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getNoVoiceAudio, checkVoiceRemovalStatus, mixTracks } from '../../../services/api';
import { downloadVideoCached } from '../../../services/videoCache';
import { handleToastLoading, showToastError } from '../../../utils/utils';
import { editorReducer, createInitialState, createTrack, clipDuration, TRACK_KIND } from './editorReducer';

const storageKey = (id) => `dublee-subtitles-${id}`;

const MAX_VOICE_TRACKS = 5;
const MAX_IMPORT_DURATION_SEC = 10 * 60;
const POLL_INTERVAL_MS = 2000;
const POLL_BACKOFF_AFTER_ATTEMPTS = 30;
const POLL_BACKOFF_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

export const formatTime = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const isTrackAudible = (track, tracks) => {
  if (track.muted) return false;
  const anySolo = tracks.some(t => t.solo);
  return !anySolo || track.solo;
};

const SILENCE_PEAK_THRESHOLD = 0.01;

const isSilentAudioBuffer = (audioBuffer, threshold = SILENCE_PEAK_THRESHOLD) => {
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i]) > threshold) return false;
    }
  }
  return true;
};

/**
 * Business-logic engine shared by EditorPageDesktop and EditorPageMobile:
 * video/background loading, Web-Audio-based multi-track playback, multi-take
 * recording, audio import and final mixing/download. No JSX here — both
 * views drive playback through their own custom buttons/scrub bar (calling
 * handleTogglePlay/handleSeek), never through native <video> controls.
 */
export function useEditorEngine({ isMobile = false } = {}) {
  const { videoId } = useParams();
  const navigate = useNavigate();

  const [state, dispatch] = useReducer(editorReducer, videoId, createInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [toast, setToast] = useState(null);
  const showToast = (type, message) => setToast({ type, message, id: Date.now() });
  // No mobile, o transport já mostra o estado "gravando" com o botão pulsando
  // e o REC badge no vídeo — o toast só ocuparia espaço por cima da tela cheia.
  const showRecordingToast = () => {
    if (!isMobile) showToast('loading', 'Gravando... Fale em sincronia com o vídeo.');
  };

  const [blobUrl, setBlobUrl] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isWaitingDemucs, setIsWaitingDemucs] = useState(true);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [fullscreenOnStart, setFullscreenOnStart] = useState(false);
  const [audioMonitor, setAudioMonitor] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsMenuRef = useRef(null);

  const [isMixing, setIsMixing] = useState(false);

  const [subtitles] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey(videoId));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const videoRef = useRef(null);
  const pollRef = useRef(null);
  const audioContextRef = useRef(null);
  const activeSourceNodesRef = useRef([]);
  const rafRef = useRef(null);

  const isRecordingRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const monitorSourceRef = useRef(null);
  const removeVideoListenersRef = useRef(null);

  const ensureAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  const stopAllSources = () => {
    activeSourceNodesRef.current.forEach(({ source }) => {
      try { source.stop(); } catch { /* already stopped */ }
    });
    activeSourceNodesRef.current = [];
  };

  const reopenAudioContext = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const stopPlayheadLoop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const pausePlayback = () => {
    stopAllSources();
    videoRef.current?.pause();
    dispatch({ type: 'SET_PLAYING', playing: false });
    stopPlayheadLoop();
  };

  const startPlayheadLoop = () => {
    const tick = () => {
      const video = videoRef.current;
      if (video) {
        dispatch({ type: 'SET_PLAYHEAD', sec: video.currentTime });
        if (video.ended || video.currentTime >= stateRef.current.videoDurationSec) {
          pausePlayback();
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const scheduleTrackPlayback = (ctx, track, fromSec, contextStartTime) => {
    if (!track.audioBuffer) return;
    const duration = clipDuration(track);
    if (duration <= 0) return;
    const clipEnd = track.offsetSec + duration;
    if (fromSec >= clipEnd) return;

    const source = ctx.createBufferSource();
    source.buffer = track.audioBuffer;
    const gain = ctx.createGain();
    gain.gain.value = track.volume / 100;
    source.connect(gain).connect(ctx.destination);

    if (fromSec >= track.offsetSec) {
      const bufferOffset = track.trimInSec + (fromSec - track.offsetSec);
      const remaining = clipEnd - fromSec;
      source.start(contextStartTime, bufferOffset, remaining);
    } else {
      const when = contextStartTime + (track.offsetSec - fromSec);
      source.start(when, track.trimInSec, duration);
    }
    activeSourceNodesRef.current.push({ source });
  };

  const startPlayback = async (fromSec) => {
    const ctx = ensureAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    stopAllSources();
    const contextStartTime = ctx.currentTime + 0.05;
    stateRef.current.tracks.forEach(track => {
      if (isTrackAudible(track, stateRef.current.tracks)) {
        scheduleTrackPlayback(ctx, track, fromSec, contextStartTime);
      }
    });
    if (videoRef.current) {
      videoRef.current.currentTime = fromSec;
      videoRef.current.play().catch(() => {});
    }
    dispatch({ type: 'SET_PLAYING', playing: true });
    startPlayheadLoop();
  };

  const handleTogglePlay = () => {
    if (state.isPlaying) {
      pausePlayback();
    } else {
      startPlayback(state.playheadSec);
    }
  };

  const handleSeek = (sec) => {
    const clamped = Math.max(0, Math.min(sec, state.videoDurationSec));
    dispatch({ type: 'SET_PLAYHEAD', sec: clamped });
    if (state.isPlaying) {
      startPlayback(clamped);
    } else if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
  };

  // ── Carrega o vídeo original (visual) ──────────────────────────
  useEffect(() => {
    let cancelled = false;
    let createdBlobUrl = null;
    async function fetchVideo() {
      handleToastLoading(showToast, setIsVideoLoading, 'Baixando vídeo…');
      const [blob, success] = await downloadVideoCached(videoId);
      if (cancelled) return;
      if (!success) {
        showToastError(showToast, setIsVideoLoading, 'Erro ao baixar vídeo. Tente novamente ou comunique o suporte.');
        return;
      }
      createdBlobUrl = URL.createObjectURL(blob);
      setBlobUrl(createdBlobUrl);
      setIsVideoLoading(false);
      setToast(null);
    }
    fetchVideo();
    return () => {
      cancelled = true;
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // ── Aguarda o Demucs terminar e baixa o áudio de fundo ──────────
  useEffect(() => {
    const loadBackgroundTrack = async () => {
      const [blob, success] = await getNoVoiceAudio(videoId);
      if (!success) {
        showToast('error', 'Erro ao carregar áudio de fundo.');
        return;
      }
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const ctx = ensureAudioContext();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        dispatch({ type: 'SET_BACKGROUND_SOURCE', blob, audioBuffer });
      } catch {
        showToast('error', 'Erro ao decodificar áudio de fundo.');
      }
    };

    let cancelled = false;
    let attempts = 0;
    const startedAt = Date.now();

    const scheduleNext = () => {
      if (cancelled) return;
      const interval = attempts >= POLL_BACKOFF_AFTER_ATTEMPTS ? POLL_BACKOFF_INTERVAL_MS : POLL_INTERVAL_MS;
      pollRef.current = setTimeout(check, interval);
    };

    const check = async () => {
      if (cancelled) return;
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        showToast('error', 'Tempo limite excedido ao processar o vídeo. Tente novamente mais tarde.');
        return;
      }
      attempts += 1;
      try {
        const [data, success] = await checkVoiceRemovalStatus(videoId);
        if (!success) {
          showToast('error', 'Erro ao verificar processamento do vídeo.');
          return;
        }
        if (data.is_complete) {
          setIsWaitingDemucs(false);
          loadBackgroundTrack();
          return;
        }
      } catch {
        console.warn('Falha ao verificar status do processamento. Tentando novamente...');
      }
      scheduleNext();
    };

    check();
    return () => {
      cancelled = true;
      clearTimeout(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // ── Duração do vídeo assim que os metadados carregam ────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onLoadedMetadata = () => {
      dispatch({ type: 'SET_VIDEO_DURATION', durationSec: video.duration || 0 });
    };
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    if (video.duration) onLoadedMetadata();
    return () => video.removeEventListener('loadedmetadata', onLoadedMetadata);
  }, [blobUrl]);

  // ── Fecha o menu de configurações ao clicar fora ────────────────
  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleClickOutside = (e) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target)) setIsSettingsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSettingsOpen]);

  // ── Limpeza geral ao desmontar ───────────────────────────────────
  useEffect(() => {
    return () => {
      stopPlayheadLoop();
      stopAllSources();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (monitorSourceRef.current) monitorSourceRef.current.disconnect();
      if (audioContextRef.current) audioContextRef.current.close();
      removeVideoListenersRef.current?.();
    };
  }, []);

  // ── Faixas ──────────────────────────────────────────────────────
  const handleAddVoiceTrack = () => {
    const voiceCount = state.tracks.filter(t => t.kind === TRACK_KIND.VOICE).length;
    if (voiceCount >= MAX_VOICE_TRACKS) {
      showToast('error', `Limite de ${MAX_VOICE_TRACKS} faixas de voz atingido.`);
      return;
    }
    const track = createTrack({ kind: TRACK_KIND.VOICE, label: `Voz ${voiceCount + 1}` });
    dispatch({ type: 'ADD_TRACK', track });
  };

  const selectedVoiceTrack = state.tracks.find(
    t => t.id === state.selectedTrackId && t.kind === TRACK_KIND.VOICE
  );
  const isReRecord = Boolean(selectedVoiceTrack?.audioBuffer);

  // ── Gravação multi-take ──────────────────────────────────────────
  const finalizeRecordedTrack = async (chunks, offsetSec, targetTrackId) => {
    if (chunks.length === 0) {
      showToast('error', 'Nenhum áudio gravado.');
      return;
    }
    if (!targetTrackId) {
      const voiceCount = stateRef.current.tracks.filter(t => t.kind === TRACK_KIND.VOICE).length;
      if (voiceCount >= MAX_VOICE_TRACKS) {
        showToast('error', `Limite de ${MAX_VOICE_TRACKS} faixas de voz atingido. Gravação descartada.`);
        return;
      }
    }
    try {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const arrayBuffer = await blob.arrayBuffer();
      const ctx = ensureAudioContext();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      if (isSilentAudioBuffer(audioBuffer)) {
        showToast('error',
          'A gravação saiu sem áudio audível. Isso costuma acontecer com fones Bluetooth quando ' +
          '"Retorno do áudio" está ativado — desative essa opção (ou use um fone com fio) e grave novamente.'
        );
        return;
      }
      if (targetTrackId) {
        dispatch({ type: 'SET_TRACK_AUDIO', id: targetTrackId, blob, audioBuffer, offsetSec });
      } else {
        const voiceCount = stateRef.current.tracks.filter(t => t.kind === TRACK_KIND.VOICE).length;
        const track = createTrack({
          kind: TRACK_KIND.VOICE,
          label: `Voz ${voiceCount + 1}`,
          blob,
          audioBuffer,
          offsetSec,
        });
        dispatch({ type: 'ADD_TRACK', track });
      }
      setToast(null);
    } catch (error) {
      showToast('error', 'Erro ao processar gravação: ' + error.message);
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    removeVideoListenersRef.current?.();
    removeVideoListenersRef.current = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (monitorSourceRef.current) {
      monitorSourceRef.current.disconnect();
      monitorSourceRef.current = null;
    }
    reopenAudioContext();
    stopPlayheadLoop();
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.onended = null;
    }
    setIsRecording(false);
    setIsPaused(false);
    showToast('loading', 'Processando faixa gravada...');
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      videoRef.current?.pause();
      stopPlayheadLoop();
      setIsPaused(true);
      setToast(null);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      videoRef.current?.play();
      startPlayheadLoop();
      setIsPaused(false);
      showRecordingToast();
    }
  };

  const discardRecording = () => {
    isRecordingRef.current = false;
    removeVideoListenersRef.current?.();
    removeVideoListenersRef.current = null;
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (monitorSourceRef.current) {
      monitorSourceRef.current.disconnect();
      monitorSourceRef.current = null;
    }
    reopenAudioContext();
    stopPlayheadLoop();
    videoRef.current?.pause();
    setIsRecording(false);
    setIsPaused(false);
    setToast(null);
  };

  const finalizeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') mediaRecorderRef.current.resume();
    stopRecording();
  };

  /**
   * Starts a new recording take. `atSec` (optional) pins the timeline
   * position to record from — pass a number to override the current
   * playhead (e.g. the mobile record button always starts at 0). Desktop's
   * button wires this handler directly to onClick, which would pass a
   * SyntheticEvent as the first arg; that's why we only honor `atSec` when
   * it's actually a number.
   */
  const startRecording = async (atSec) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast('error', 'Microfone não suportado. Use HTTPS ou um navegador moderno.');
      return;
    }

    pausePlayback();

    const startOffset = typeof atSec === 'number' ? atSec : stateRef.current.playheadSec;
    dispatch({ type: 'SET_PLAYHEAD', sec: startOffset });

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = mediaStream;

      if (audioMonitor) {
        const ctx = ensureAudioContext();
        if (ctx.state === 'suspended') await ctx.resume();
        const source = ctx.createMediaStreamSource(mediaStream);
        source.connect(ctx.destination);
        monitorSourceRef.current = source;
      }

      const recorder = new MediaRecorder(mediaStream);
      mediaRecorderRef.current = recorder;

      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
      };
      const selected = stateRef.current.tracks.find(t => t.id === stateRef.current.selectedTrackId);
      const targetTrackId = selected && selected.kind === TRACK_KIND.VOICE ? selected.id : null;
      recorder.onstop = () => finalizeRecordedTrack(chunks, startOffset, targetTrackId);

      recorder.start();
      isRecordingRef.current = true;
      setIsRecording(true);
      showRecordingToast();

      if (videoRef.current) {
        videoRef.current.currentTime = startOffset;
        videoRef.current.onended = () => {
          if (isRecordingRef.current) stopRecording();
        };

        const handleVideoPause = () => {
          if (!isRecordingRef.current) return;
          if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
            setToast(null);
          }
        };
        const handleVideoPlay = () => {
          if (!isRecordingRef.current) return;
          if (mediaRecorderRef.current?.state === 'paused') {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
            showRecordingToast();
          }
        };
        videoRef.current.addEventListener('pause', handleVideoPause);
        videoRef.current.addEventListener('play', handleVideoPlay);
        removeVideoListenersRef.current = () => {
          videoRef.current?.removeEventListener('pause', handleVideoPause);
          videoRef.current?.removeEventListener('play', handleVideoPlay);
        };

        await videoRef.current.play();
        startPlayheadLoop();
      }

      if (fullscreenOnStart && videoRef.current?.parentElement) {
        videoRef.current.parentElement.requestFullscreen?.().catch(() => {});
      }
    } catch (error) {
      let msg = 'Erro ao acessar microfone: ';
      if (error.name === 'NotAllowedError') msg += 'Permissão negada. Permita acesso ao microfone.';
      else if (error.name === 'NotFoundError') msg += 'Microfone não encontrado.';
      else msg += error.message;
      showToast('error', msg);
    }
  };

  // ── Importação de áudio externo ──────────────────────────────────
  const handleImportFile = async (file) => {
    try {
      showToast('loading', 'Importando áudio...');
      const arrayBuffer = await file.arrayBuffer();
      const ctx = ensureAudioContext();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      if (audioBuffer.duration > MAX_IMPORT_DURATION_SEC) {
        showToast('error', `Áudio muito longo. Limite máximo de ${MAX_IMPORT_DURATION_SEC / 60} minutos.`);
        return;
      }
      const track = createTrack({
        kind: TRACK_KIND.IMPORTED,
        label: file.name,
        blob: file,
        audioBuffer,
        offsetSec: stateRef.current.playheadSec,
      });
      dispatch({ type: 'ADD_TRACK', track });
      setToast(null);
    } catch (error) {
      showToast('error', 'Não foi possível importar esse áudio: ' + error.message);
    }
  };

  // ── Mixagem final ────────────────────────────────────────────────
  const buildTracksPayload = () => {
    const anySolo = state.tracks.some(t => t.solo);
    return state.tracks
      .filter(t => !t.muted && (!anySolo || t.solo))
      .map(t => ({
        kind: t.kind,
        blob: t.kind === TRACK_KIND.BACKGROUND ? null : t.blob,
        volume: t.volume / 100,
        offset: t.offsetSec,
        trimIn: t.trimInSec,
        trimOut: t.trimOutSec,
      }));
  };

  const handleDownload = async () => {
    const tracksPayload = buildTracksPayload();
    if (tracksPayload.length === 0) {
      showToast('error', 'Todas as faixas estão mudas. Ative pelo menos uma faixa para mixar.');
      return;
    }
    setIsMixing(true);
    showToast('loading', 'Gerando vídeo final...');
    try {
      const [videoBlob, success] = await mixTracks(videoId, tracksPayload);
      if (!success) {
        showToast('error', 'Erro ao gerar a mixagem. Tente novamente.');
        return;
      }
      const url = URL.createObjectURL(videoBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `video-redublado-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('success', 'Download iniciado!');
    } catch (error) {
      showToast('error', 'Erro ao gerar a mixagem: ' + error.message);
    } finally {
      setIsMixing(false);
    }
  };

  const interactionsDisabled = isRecording || isWaitingDemucs || isVideoLoading;
  const transportDisabled = isWaitingDemucs || isVideoLoading;

  return {
    videoId,
    navigate,

    state,
    dispatch,

    toast,
    setToast,
    showToast,

    blobUrl,
    isVideoLoading,
    isWaitingDemucs,
    subtitles,

    isRecording,
    isPaused,
    fullscreenOnStart,
    setFullscreenOnStart,
    audioMonitor,
    setAudioMonitor,
    isSettingsOpen,
    setIsSettingsOpen,
    settingsMenuRef,

    isMixing,

    videoRef,

    handleTogglePlay,
    handleSeek,

    handleAddVoiceTrack,
    selectedVoiceTrack,
    isReRecord,

    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    discardRecording,
    finalizeRecording,

    handleImportFile,
    handleDownload,

    interactionsDisabled,
    transportDisabled,
  };
}
