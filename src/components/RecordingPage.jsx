import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { checkVoiceRemovalStatus as checkStatusAPI, downloadVideo } from '../services/api';
import { setRecordedAudio } from '../store/recordingStore';
import Header from './shared/Header';
import VideoPlayer from './shared/VideoPlayer';
import Footer from './shared/Footer';
import Button from './shared/Button';
import PageHeader from './shared/PageHeader';
import './RecordingPage.css';

const storageKey = (id) => `dublee-subtitles-${id}`;

const RecordingPage = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isProcessing, setIsProcessing] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const videoRef = useRef(null);
  const statusCheckIntervalRef = useRef(null);
  const isProcessingRef = useRef(true);
  const isRecordingRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

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
    };
  }, [videoId]);

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
    setIsPaused(false);
    setStatus({ type: 'loading', message: 'Processando áudio gravado...' });
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      videoRef.current?.pause();
      setIsPaused(true);
      setStatus({ type: '', message: '' });
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      videoRef.current?.play();
      setIsPaused(false);
      setStatus({ type: 'loading', message: 'Gravando... Fale em sincronia com o vídeo.' });
    }
  };

  const restartRecording = async () => {
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
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.onended = null;
    }
    isRecordingRef.current = false;
    setIsRecording(false);
    setIsPaused(false);
    await startRecording();
  };

  const finalizeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
    }
    stopRecording();
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
      setStatus({ type: 'error', message: 'Microfone não suportado. Use HTTPS ou um navegador moderno.' });
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
      setStatus({ type: 'loading', message: 'Gravando... Fale em sincronia com o vídeo.' });

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

              {isProcessing && (
                <div className="processing-status">
                  <div style={{ marginBottom: '10px' }}>⚙️ Preparando vídeo...</div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              )}

              <VideoPlayer
                ref={videoRef}
                src={downloadVideo(videoId)}
                muted
                subtitles={subtitles}
                showFsButton
              />

              {!isRecording ? (
                <Button
                  variant="advance"
                  className="recording-btn-main"
                  onClick={startRecording}
                  disabled={isProcessing}
                >
                  Iniciar Gravação 🎙
                </Button>
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

              {status.message && (
                <div className={`status-message show ${status.type}`}>
                  {status.type === 'loading' && <span className="spinner"></span>}
                  {status.message}
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
    </>
  );
};

export default RecordingPage;
