import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { checkVoiceRemovalStatus as checkStatusAPI, downloadVideo } from '../services/api';
import { setRecordedAudio } from '../store/recordingStore';
import Header from './shared/Header';
import VideoPlayer from './shared/VideoPlayer';
import Footer from './shared/Footer';
import Button from './shared/Button';
import PageHeader from './shared/PageHeader';
import Toast from './shared/Toast';
import './RecordingPage.css';

const storageKey = (id) => `dublee-subtitles-${id}`;

const RecordingPage = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const showToast = (type, message) => setToast({ type, message, id: Date.now() });
  const [isProcessing, setIsProcessing] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const videoRef = useRef(null);
  const statusCheckIntervalRef = useRef(null);
  const isProcessingRef = useRef(true);
  const isRecordingRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const monitorAudioRef = useRef(null);
  const removeVideoListenersRef = useRef(null);

  const [fullscreenOnStart, setFullscreenOnStart] = useState(false);
  const [audioMonitor, setAudioMonitor] = useState(false);

  const [subtitles] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey(videoId));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (videoId) {
      checkVoiceRemovalStatus();
      statusCheckIntervalRef.current = setInterval(checkVoiceRemovalStatus, 2000);
    }

    return () => {
      if (statusCheckIntervalRef.current) clearInterval(statusCheckIntervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (monitorAudioRef.current) {
        monitorAudioRef.current.pause();
        monitorAudioRef.current.srcObject = null;
      }
      removeVideoListenersRef.current?.();
    };
  }, [videoId]);

  const checkVoiceRemovalStatus = async () => {
    if (!videoId || !isProcessingRef.current) return;
    try {
      const data = await checkStatusAPI(videoId);
      const { is_processing, is_complete, error } = data.data;

      if (error) {
        showToast('error', `Erro no processamento: ${error}`);
        isProcessingRef.current = false;
        setIsProcessing(false);
        clearInterval(statusCheckIntervalRef.current);
      } else if (is_complete) {
        isProcessingRef.current = false;
        setIsProcessing(false);
        showToast('success', 'Vídeo pronto! Você pode começar a gravar sua dublagem.');
        clearInterval(statusCheckIntervalRef.current);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
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
      monitorAudioRef.current.pause();
      monitorAudioRef.current.srcObject = null;
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
      monitorAudioRef.current.pause();
      monitorAudioRef.current.srcObject = null;
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
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = mediaStream;

      if (audioMonitor) {
        const monEl = new Audio();
        monEl.srcObject = mediaStream;
        monEl.play().catch(() => {});
        monitorAudioRef.current = monEl;
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

  const resetAll = () => {
    if (statusCheckIntervalRef.current) clearInterval(statusCheckIntervalRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    navigate('/');
  };

  return (
    <>
      <Header />

      <main className="page-main">
        <div className="container">

          <PageHeader
            title="Gravar Dublagem"
            subtitle="Passo 3 de 4"
            description="Aguarde o processamento do vídeo e em seguida grave sua dublagem
              em sincronia com as legendas e o áudio original."
          />

          <div className="content">
            <div className="section">

              <div className="recording-player-wrapper">
                <VideoPlayer
                  ref={videoRef}
                  src={downloadVideo(videoId)}
                  muted
                  subtitles={subtitles}
                  showFsButton
                />
                {isProcessing && (
                  <div className="recording-overlay">
                    <div className="recording-overlay__card">
                      <span className="recording-overlay__icon">⚙️</span>
                      <p className="recording-overlay__text">
                        Preparando vídeo<span className="recording-overlay__dots" /><br />
                        aguarde enquanto processamos o áudio.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {!isRecording ? (
                <>
                  {!isProcessing && (
                    <div className="recording-options">
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
                  <Button
                    variant="advance"
                    className="recording-btn-main"
                    onClick={startRecording}
                    disabled={isProcessing}
                  >
                    Iniciar Gravação 🎙
                  </Button>
                </>
              ) : (
                <div className="recording-controls">
                  <Button
                    variant={isPaused ? 'primary' : 'ghost'}
                    onClick={isPaused ? resumeRecording : pauseRecording}
                  >
                    {isPaused ? 'Continuar' : 'Pausar'}
                  </Button>
                  <Button variant="outline" onClick={restartRecording}>
                    Recomeçar
                  </Button>
                  <Button variant="success" onClick={finalizeRecording}>
                    Finalizar ✓
                  </Button>
                </div>
              )}


            </div>
          </div>

          <div className="recording-nav">
            <Button
              variant="ghost"
              onClick={() => navigate(`/subtitle/${videoId}`)}
              disabled={isRecording}
            >
              ← Reeditar Legendas
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
