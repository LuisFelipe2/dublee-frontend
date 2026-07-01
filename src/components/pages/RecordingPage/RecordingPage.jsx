import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { downloadVideo } from '../../../services/api';
import { setRecordedAudio } from '../../../store/recordingStore';
import Header from '../../shared/Header/Header';
import VideoPlayer from '../../shared/VideoPlayer/VideoPlayer';
import Footer from '../../shared/Footer/Footer';
import Button from '../../shared/Button/Button';
import PageHeader from '../../shared/PageHeader/PageHeader';
import Toast from '../../shared/Toast/Toast';
import './RecordingPage.css';

const storageKey = (id) => `dublee-subtitles-${id}`;

const RecordingPage = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const showToast = (type, message) => setToast({ type, message, id: Date.now() });
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const videoRef = useRef(null);
  const isRecordingRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const monitorAudioRef = useRef(null);
  const removeVideoListenersRef = useRef(null);

  const [fullscreenOnStart, setFullscreenOnStart] = useState(false);
  const [audioMonitor, setAudioMonitor] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [subtitles] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey(videoId));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (monitorAudioRef.current) {
        monitorAudioRef.current.close();
        monitorAudioRef.current = null;
      }
      removeVideoListenersRef.current?.();
    };
  }, []);

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
    showToast('loading', 'Processando áudio gravado...');
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

  const restartRecording = () => {
    isRecordingRef.current = false;
    removeVideoListenersRef.current?.();
    removeVideoListenersRef.current = null;
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
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
      videoRef.current.currentTime = 0;
      videoRef.current.onended = null;
    }
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setIsRecording(false);
    setIsPaused(false);
    setToast(null);
  };

  const finalizeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
    }
    stopRecording();
  };

  const saveAndGoToMix = (chunks) => {
    if (chunks.length === 0) {
      showToast('error', 'Nenhum áudio gravado.');
      return;
    }
    const blob = new Blob(chunks, { type: 'audio/webm' });
    setRecordedAudio(blob);
    navigate(`/mix/${videoId}`);
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('error', 'Microfone não suportado. Use HTTPS ou um navegador moderno.');
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });
      streamRef.current = mediaStream;

      if (audioMonitor) {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(mediaStream);
        source.connect(audioCtx.destination);
        monitorAudioRef.current = audioCtx;
      }

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
      showToast('loading', 'Gravando... Fale em sincronia com o vídeo.');

      if (videoRef.current) {
        videoRef.current.currentTime = 0;
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

  return (
    <>
      <Header />

      <main className="page-main">
        <div className="container">

          <PageHeader
            title="Tela de gravação"
            subtitle="Passo 2 de 2"
            description="Clique para iniciar gravação e fale em sincronia com o vídeo."
          />

          <div className="content">
            <div className="section">

              <div className="player-wrapper">
                <VideoPlayer
                  ref={videoRef}
                  src={downloadVideo(videoId)}
                  muted
                  subtitles={subtitles}
                  showFsButton
                  disableControls
                  badge={isRecording && (
                    <div className={`rec-badge${isPaused ? ' rec-badge--paused' : ''}`}>
                      <span className="rec-badge__dot" />
                      {isPaused ? 'PAUSADO' : 'REC'}
                    </div>
                  )}
                />
              </div>

              {!isRecording ? (
                <div className="recording-start-area">
                  <div className="recording-start-row">
                    <Button variant="advance" onClick={startRecording}>
                      <span className="rec-btn-content">
                        <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="10" fill="#ff3b30"/></svg>
                        Iniciar Gravação
                      </span>
                    </Button>

                    <button
                      className={`recording-settings-btn${isSettingsOpen ? ' recording-settings-btn--open' : ''}`}
                      onClick={() => setIsSettingsOpen(o => !o)}
                      aria-label="Preferências de gravação"
                      title="Preferências"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                      </svg>
                    </button>
                  </div>

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
              ) : (
                <div className="recording-controls">
                  <Button
                    variant={isPaused ? 'primary' : 'ghost'}
                    onClick={isPaused ? resumeRecording : pauseRecording}
                  >
                    <span className="rec-btn-content">
                      {isPaused ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><polygon points="5,3 19,12 5,21"/></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                      )}
                      {isPaused ? 'Continuar' : 'Pausar'}
                    </span>
                  </Button>
                  <Button variant="danger" onClick={finalizeRecording}>
                    <span className="rec-btn-content">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                      Finalizar
                    </span>
                  </Button>
                  <Button variant="outline" onClick={restartRecording}>
                    <span className="rec-btn-content">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.32"/></svg>
                      Recomeçar
                    </span>
                  </Button>
                </div>
              )}

            </div>
          </div>

          <div className="page-nav">
            <Button
              variant="ghost"
              onClick={() => navigate(`/subtitle/${videoId}`)}
              disabled={isRecording}
            >
              Voltar
            </Button>
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

export default RecordingPage;
