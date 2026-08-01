import { useEffect, useReducer, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { downloadVideo, getNoVoiceAudio, checkVoiceRemovalStatus, mixTracks } from '../../../services/api';
import Header from '../../shared/Header/Header';
import Footer from '../../shared/Footer/Footer';
import PageHeader from '../../shared/PageHeader/PageHeader';
import VideoPlayer from '../../shared/VideoPlayer/VideoPlayer';
import Button from '../../shared/Button/Button';
import Toast from '../../shared/Toast/Toast';
import Timeline from '../../shared/Timeline/Timeline';
import AddTrackMenu from '../../shared/AddTrackMenu/AddTrackMenu';
import { handleToastLoading, showToastError } from '../../../utils/utils';
import { editorReducer, createInitialState, createTrack, clipDuration, TRACK_KIND } from './editorReducer';
import './EditorPage.css';

const storageKey = (id) => `dublee-subtitles-${id}`;

const formatTime = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const isTrackAudible = (track, tracks) => {
  if (track.muted) return false;
  const anySolo = tracks.some(t => t.solo);
  return !anySolo || track.solo;
};

const EditorPage = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();

  const [state, dispatch] = useReducer(editorReducer, videoId, createInitialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [toast, setToast] = useState(null);
  const showToast = (type, message) => setToast({ type, message, id: Date.now() });

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
  const monitorAudioRef = useRef(null);
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
      const [blob, success] = await downloadVideo(videoId);
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

    const check = async () => {
      try {
        const [data, success] = await checkVoiceRemovalStatus(videoId);
        if (!success) {
          showToast('error', 'Erro ao verificar processamento do vídeo.');
          clearInterval(pollRef.current);
          return;
        }
        if (data.is_complete) {
          clearInterval(pollRef.current);
          setIsWaitingDemucs(false);
          loadBackgroundTrack();
        }
      } catch {
        console.warn('Falha ao verificar status do processamento. Tentando novamente...');
      }
    };

    check();
    pollRef.current = setInterval(check, 2000);
    return () => clearInterval(pollRef.current);
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
      if (monitorAudioRef.current) monitorAudioRef.current.close();
      if (audioContextRef.current) audioContextRef.current.close();
      removeVideoListenersRef.current?.();
    };
  }, []);

  // ── Faixas ──────────────────────────────────────────────────────
  const handleAddVoiceTrack = () => {
    const voiceCount = state.tracks.filter(t => t.kind === TRACK_KIND.VOICE).length;
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
    try {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const arrayBuffer = await blob.arrayBuffer();
      const ctx = ensureAudioContext();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
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
    if (monitorAudioRef.current) {
      monitorAudioRef.current.close();
      monitorAudioRef.current = null;
    }
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
      setIsPaused(true);
      setToast(null);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      videoRef.current?.play();
      setIsPaused(false);
      showToast('loading', 'Gravando... Fale em sincronia com o vídeo.');
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
    if (monitorAudioRef.current) {
      monitorAudioRef.current.close();
      monitorAudioRef.current = null;
    }
    videoRef.current?.pause();
    setIsRecording(false);
    setIsPaused(false);
    setToast(null);
  };

  const finalizeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') mediaRecorderRef.current.resume();
    stopRecording();
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast('error', 'Microfone não suportado. Use HTTPS ou um navegador moderno.');
      return;
    }

    pausePlayback();

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = mediaStream;

      if (audioMonitor) {
        const monitorCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = monitorCtx.createMediaStreamSource(mediaStream);
        source.connect(monitorCtx.destination);
        monitorAudioRef.current = monitorCtx;
      }

      const recorder = new MediaRecorder(mediaStream);
      mediaRecorderRef.current = recorder;

      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
      };
      const startOffset = stateRef.current.playheadSec;
      const selected = stateRef.current.tracks.find(t => t.id === stateRef.current.selectedTrackId);
      const targetTrackId = selected && selected.kind === TRACK_KIND.VOICE ? selected.id : null;
      recorder.onstop = () => finalizeRecordedTrack(chunks, startOffset, targetTrackId);

      recorder.start();
      isRecordingRef.current = true;
      setIsRecording(true);
      showToast('loading', 'Gravando... Fale em sincronia com o vídeo.');

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
            showToast('loading', 'Gravando... Fale em sincronia com o vídeo.');
          }
        };
        videoRef.current.addEventListener('pause', handleVideoPause);
        videoRef.current.addEventListener('play', handleVideoPlay);
        removeVideoListenersRef.current = () => {
          videoRef.current?.removeEventListener('pause', handleVideoPause);
          videoRef.current?.removeEventListener('play', handleVideoPlay);
        };

        await videoRef.current.play();
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

  return (
    <>
      <Header />

      <main className="page-main">
        <div className="container container--wide">

          <PageHeader
            title="Editor de dublagem"
            subtitle="Grave, importe e mixe suas faixas de áudio"
            description="Arraste os clipes na timeline, ajuste volume/mute/solo por faixa e gere o vídeo final."
          />

          <div className="content">
            <div className="section">

              <div className="player-wrapper editor-player-wrapper">
                <VideoPlayer
                  ref={videoRef}
                  src={blobUrl}
                  muted
                  subtitles={subtitles}
                  disableControls
                  isVideoLoading={isVideoLoading}
                  badge={isRecording && (
                    <div className={`rec-badge${isPaused ? ' rec-badge--paused' : ''}`}>
                      <span className="rec-badge__dot" />
                      {isPaused ? 'PAUSADO' : 'REC'}
                    </div>
                  )}
                />
                {!isVideoLoading && isWaitingDemucs && (
                  <div className="editor-overlay">
                    <div className="editor-overlay__card">
                      <span className="editor-overlay__icon editor-overlay__icon--spin">⚙️</span>
                      <p className="editor-overlay__text">
                        Finalizando processamento do vídeo…<br />
                        Aguarde, quase pronto!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="editor-transport">
                <Button
                  variant="danger"
                  onClick={isRecording ? finalizeRecording : startRecording}
                  disabled={transportDisabled}
                  title={isRecording
                    ? 'Finaliza a gravação e salva a faixa'
                    : isReRecord
                      ? `Grava e substitui o áudio de "${selectedVoiceTrack.label}"`
                      : selectedVoiceTrack
                        ? `Grava na faixa "${selectedVoiceTrack.label}"`
                        : 'Cria uma nova faixa de voz e grava nela'}
                >
                  {isRecording ? '⏹ Finalizar' : isReRecord ? '🎙 Regravar' : '🎙 Gravar'}
                </Button>

                <Button
                  variant={(isRecording ? isPaused : !state.isPlaying) ? 'primary' : 'ghost'}
                  onClick={isRecording ? (isPaused ? resumeRecording : pauseRecording) : handleTogglePlay}
                  disabled={transportDisabled}
                >
                  {isRecording
                    ? (isPaused ? '▶ Continuar' : '⏸ Pausar')
                    : (state.isPlaying ? '⏸ Pausar' : '▶ Reproduzir')}
                </Button>

                <Button
                  variant="outline"
                  onClick={isRecording ? discardRecording : () => handleSeek(0)}
                  disabled={transportDisabled}
                  title={isRecording ? 'Descarta a gravação em andamento' : 'Recomeça a reprodução do início'}
                >
                  {isRecording ? '✕ Descartar' : '↺ Recomeçar'}
                </Button>

                <span className="editor-transport__time">
                  {formatTime(state.playheadSec)} / {formatTime(state.videoDurationSec)}
                </span>

                <div className="editor-transport__spacer" />

                <div className="editor-settings-menu" ref={settingsMenuRef}>
                  <button
                    className={`recording-settings-btn${isSettingsOpen ? ' recording-settings-btn--open' : ''}`}
                    onClick={() => setIsSettingsOpen(o => !o)}
                    aria-label="Preferências de gravação"
                    title="Preferências"
                    disabled={isRecording}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                  </button>

                  {isSettingsOpen && (
                    <div className="recording-settings-panel">
                      <label className="recording-option">
                        <input
                          type="checkbox"
                          checked={fullscreenOnStart}
                          onChange={e => setFullscreenOnStart(e.target.checked)}
                        />
                        Gravar em tela cheia
                      </label>
                      <label className="recording-option">
                        <input
                          type="checkbox"
                          checked={audioMonitor}
                          onChange={e => setAudioMonitor(e.target.checked)}
                        />
                        Retorno do áudio
                        <span className="recording-option__hint"> (use fones de ouvido)</span>
                      </label>
                    </div>
                  )}
                </div>

                <AddTrackMenu
                  onAddVoiceTrack={handleAddVoiceTrack}
                  onImportFile={handleImportFile}
                  showError={(msg) => showToast('error', msg)}
                  disabled={interactionsDisabled}
                />
              </div>

              <Timeline
                tracks={state.tracks}
                durationSec={state.videoDurationSec}
                playheadSec={state.playheadSec}
                pxPerSec={state.zoomPxPerSec}
                selectedTrackId={state.selectedTrackId}
                disabled={interactionsDisabled}
                onSeek={handleSeek}
                onZoomIn={() => dispatch({ type: 'SET_ZOOM', zoom: state.zoomPxPerSec * 1.4 })}
                onZoomOut={() => dispatch({ type: 'SET_ZOOM', zoom: state.zoomPxPerSec / 1.4 })}
                onSelectTrack={id => dispatch({ type: 'SELECT_TRACK', id })}
                onMoveClip={(id, offsetSec) => dispatch({ type: 'MOVE_CLIP', id, offsetSec })}
                onTrimClipStart={(id, deltaSec) => dispatch({ type: 'TRIM_CLIP_START', id, deltaSec })}
                onTrimClipEnd={(id, deltaSec) => dispatch({ type: 'TRIM_CLIP_END', id, deltaSec })}
                onVolumeChange={(id, volume) => dispatch({ type: 'SET_VOLUME', id, volume })}
                onToggleMute={id => dispatch({ type: 'TOGGLE_MUTE', id })}
                onToggleSolo={id => dispatch({ type: 'TOGGLE_SOLO', id })}
                onRemoveTrack={id => dispatch({ type: 'REMOVE_TRACK', id })}
                onRenameTrack={(id, label) => dispatch({ type: 'RENAME_TRACK', id, label })}
              />

              <div className="button-group editor-actions">
                <Button
                  variant="ghost"
                  onClick={() => navigate(`/subtitle/${videoId}`)}
                  disabled={isRecording || isMixing}
                >
                  Voltar
                </Button>
                <Button
                  variant="advance"
                  onClick={handleDownload}
                  disabled={interactionsDisabled || isMixing}
                  style={{ marginLeft: 'auto' }}
                >
                  {isMixing ? 'Gerando…' : '⬇ Baixar vídeo'}
                </Button>
              </div>

            </div>
          </div>

        </div>
      </main>

      <Footer />

      {toast && (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

export default EditorPage;
