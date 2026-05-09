import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { checkVoiceRemovalStatus as checkStatusAPI, downloadVideo } from '../services/api';
import { setRecordedAudio } from '../store/recordingStore';
import SubtitleSourceSelector from './SubtitleSourceSelector';

const storageKey = (id) => `dublee-subtitles-${id}`;

const RecordingPage = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isProcessing, setIsProcessing] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [progress, setProgress] = useState(0);

  const videoRef = useRef(null);
  const videoWrapperRef = useRef(null);
  const chronoRef = useRef(null);
  const rafRef = useRef(null);
  const statusCheckIntervalRef = useRef(null);
  const isProcessingRef = useRef(true);
  const isRecordingRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  const [subtitles, setSubtitles] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey(videoId));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentSubtitleText, setCurrentSubtitleText] = useState('');
  const subtitlesRef = useRef(subtitles);

  useEffect(() => {
    subtitlesRef.current = subtitles;
  }, [subtitles]);

  useEffect(() => {
    if (videoId) {
      loadVideo();
      checkVoiceRemovalStatus();
      statusCheckIntervalRef.current = setInterval(checkVoiceRemovalStatus, 2000);
    }

    return () => {
      if (statusCheckIntervalRef.current) clearInterval(statusCheckIntervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, [videoId]);

  useEffect(() => {
    const video = videoRef.current;
    const wrapper = videoWrapperRef.current;
    if (!video || !wrapper) return;

    const redirectFullscreen = () => {
      if (document.fullscreenElement === video) {
        document.exitFullscreen()
          .then(() => wrapper.requestFullscreen?.())
          .catch(() => {});
      }
    };

    const redirectWebkitFullscreen = () => {
      if (document.webkitFullscreenElement === video) {
        document.webkitExitFullscreen?.();
        wrapper.webkitRequestFullscreen?.();
      }
    };

    document.addEventListener('fullscreenchange', redirectFullscreen);
    document.addEventListener('webkitfullscreenchange', redirectWebkitFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', redirectFullscreen);
      document.removeEventListener('webkitfullscreenchange', redirectWebkitFullscreen);
    };
  }, []);

  const formatChrono = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(ms).padStart(3, '0')}`;
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tick = () => {
      if (chronoRef.current) chronoRef.current.textContent = formatChrono(video.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };

    const startTick = () => { if (!rafRef.current) rafRef.current = requestAnimationFrame(tick); };
    const stopTick = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (chronoRef.current) chronoRef.current.textContent = formatChrono(video.currentTime);
    };
    const onSeeked = () => {
      if (chronoRef.current) chronoRef.current.textContent = formatChrono(video.currentTime);
    };

    video.addEventListener('play', startTick);
    video.addEventListener('pause', stopTick);
    video.addEventListener('ended', stopTick);
    video.addEventListener('seeked', onSeeked);
    return () => {
      video.removeEventListener('play', startTick);
      video.removeEventListener('pause', stopTick);
      video.removeEventListener('ended', stopTick);
      video.removeEventListener('seeked', onSeeked);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => {
      const t = video.currentTime;
      const found = subtitlesRef.current.find(s => t >= s.startTime && t <= s.endTime);
      setCurrentSubtitleText(found?.text ?? '');
    };
    video.addEventListener('timeupdate', onTimeUpdate);
    return () => video.removeEventListener('timeupdate', onTimeUpdate);
  }, []);

  const loadVideo = () => {
    if (videoRef.current) {
      videoRef.current.src = downloadVideo(videoId);
      videoRef.current.load();
    }
  };

  const checkVoiceRemovalStatus = async () => {
    if (!videoId || !isProcessingRef.current) return;
    try {
      const data = await checkStatusAPI(videoId);
      const { is_processing, is_complete, error } = data.data;

      if (error) {
        setStatus({ type: 'error', message: `Erro no processamento: ${error}` });
        isProcessingRef.current = false;
        setIsProcessing(false);
        clearInterval(statusCheckIntervalRef.current);
      } else if (is_complete) {
        isProcessingRef.current = false;
        setIsProcessing(false);
        setProgress(100);
        setStatus({ type: 'success', message: 'Vídeo pronto! Você pode começar a gravar sua dublagem.' });
        clearInterval(statusCheckIntervalRef.current);
      } else if (is_processing) {
        setProgress(50);
        setStatus({ type: 'loading', message: 'Processando áudio...' });
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.onended = null;
    }
    isRecordingRef.current = false;
    setIsRecording(false);
    setStatus({ type: 'loading', message: 'Processando áudio gravado...' });
  };

  const saveAndGoToMix = (chunks) => {
    if (chunks.length === 0) {
      setStatus({ type: 'error', message: 'Nenhum áudio gravado.' });
      return;
    }
    const blob = new Blob(chunks, { type: 'audio/webm' });
    setRecordedAudio(blob);
    navigate(`/mix/${videoId}`);
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus({ type: 'error', message: '❌ Microfone não suportado. Use HTTPS ou um navegador moderno.' });
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = mediaStream;

      const recorder = new MediaRecorder(mediaStream);
      mediaRecorderRef.current = recorder;

      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => saveAndGoToMix(chunks);

      recorder.start();
      isRecordingRef.current = true;
      setIsRecording(true);
      setStatus({ type: 'loading', message: '🎙 Gravando... Fale em sincronia com o vídeo.' });

      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.onended = () => {
          if (isRecordingRef.current) stopRecording();
        };
        await videoRef.current.play();
      }
    } catch (error) {
      let msg = 'Erro ao acessar microfone: ';
      if (error.name === 'NotAllowedError') msg += 'Permissão negada. Permita acesso ao microfone.';
      else if (error.name === 'NotFoundError') msg += 'Microfone não encontrado.';
      else msg += error.message;
      setStatus({ type: 'error', message: msg });
    }
  };

  const resetAll = () => {
    if (statusCheckIntervalRef.current) clearInterval(statusCheckIntervalRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    navigate('/');
  };

  return (
    <div className="container">
      <div className="header">
        <h1>🎬 Redublador de Vídeos</h1>
        <p>Importe seu vídeo, grave a dublagem e baixe o resultado</p>
      </div>

      <div className="content">
        <div className="section">
          <h2>
            <span className="section-number">3</span>
            Grave sua dublagem
          </h2>

          <SubtitleSourceSelector
            videoId={videoId}
            onSubtitlesLoaded={(subs) => setSubtitles(subs)}
          />

          {isProcessing && (
            <div className="processing-status">
              <div style={{ marginBottom: '10px' }}>⚙️ Preparando vídeo...</div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          <div ref={videoWrapperRef} className="video-wrapper" style={{ position: 'relative', marginTop: '20px' }}>
            <video ref={videoRef} controls muted style={{ marginBottom: 0 }}></video>
            <div ref={chronoRef} className="chronometer">00:00:000</div>
            {currentSubtitleText && (
              <div style={{
                position: 'absolute',
                bottom: '52px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.78)',
                color: '#fff',
                padding: '5px 16px',
                borderRadius: '4px',
                fontSize: '18px',
                maxWidth: '90%',
                textAlign: 'center',
                pointerEvents: 'none',
                whiteSpace: 'pre-wrap',
              }}>
                {currentSubtitleText}
              </div>
            )}
          </div>

          <div className="button-group">
            <button
              className="btn btn-record"
              onClick={startRecording}
              disabled={isProcessing || isRecording}
            >
              Iniciar Gravação 🎙
            </button>
            <button
              className="btn btn-stop"
              onClick={stopRecording}
              disabled={!isRecording}
            >
              Parar Gravação
            </button>
          </div>
          <button
            className="btn btn-cancel"
            style={{ width: '100%', marginTop: '10px' }}
            onClick={resetAll}
          >
            Cancelar
          </button>

          {status.message && (
            <div className={`status-message show ${status.type}`}>
              {status.type === 'loading' && <span className="spinner"></span>}
              {status.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordingPage;
