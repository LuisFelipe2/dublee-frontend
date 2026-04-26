import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { checkVoiceRemovalStatus as checkStatusAPI, recordAudio as recordAudioAPI, downloadVideo } from '../services/api';

const RecordingPage = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isProcessing, setIsProcessing] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [stream, setStream] = useState(null);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef(null);
  const statusCheckIntervalRef = useRef(null);

  useEffect(() => {
    if (videoId) {
      loadVideo();
      checkVoiceRemovalStatus();
      statusCheckIntervalRef.current = setInterval(checkVoiceRemovalStatus, 2000);
    }

    return () => {
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoId]);

  const loadVideo = () => {
    if (videoRef.current) {
      videoRef.current.src = downloadVideo(videoId);
      videoRef.current.load();
    }
  };

  const checkVoiceRemovalStatus = async () => {
    if (!videoId || !isProcessing) return;

    try {
      const data = await checkStatusAPI(videoId);

      const { is_processing, is_complete, error } = data.data;

      if (error) {
        setStatus({ type: 'error', message: `Erro no processamento: ${error}` });
        setIsProcessing(false);
      } else if (is_complete) {
        setIsProcessing(false);
        setProgress(100);
        setStatus({ type: 'success', message: 'Vídeo pronto! Você pode começar a gravar sua dubagem.' });
      } else if (is_processing) {
        setProgress(50);
        setStatus({ type: 'loading', message: 'Processando áudio...' });
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus({ type: 'error', message: '❌ Microfone não suportado. Use HTTPS ou um navegador moderno.' });
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream);

      const recorder = new MediaRecorder(mediaStream);
      setMediaRecorder(recorder);

      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => finalizeRecording(chunks);

      recorder.start();
      setIsRecording(true);
      setStatus({ type: 'loading', message: '🎙 Gravando... Fale em sincronia com o vídeo.' });

      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        await videoRef.current.play();
      }
    } catch (error) {
      let errorMessage = 'Erro ao acessar microfone: ';
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Permissão negada. Permita acesso ao microfone.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'Microfone não encontrado.';
      } else {
        errorMessage += error.message;
      }
      setStatus({ type: 'error', message: errorMessage });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setIsRecording(false);
    setStatus({ type: 'loading', message: 'Processando áudio gravado...' });
  };

  const finalizeRecording = async (chunks) => {
    if (chunks.length === 0) {
      setStatus({ type: 'error', message: 'Nenhum áudio gravado.' });
      return;
    }

    const blob = new Blob(chunks, { type: 'audio/webm' });

    setStatus({ type: 'loading', message: 'Renderizando vídeo final...' });

    try {
      const videoBlob = await recordAudioAPI(videoId, blob);
      const downloadUrl = URL.createObjectURL(videoBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `video-redublado-${new Date().getTime()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      setStatus({ type: 'success', message: '✅ Download iniciado! Seu vídeo redublado está pronto.' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Erro ao processar: ' + error.message });
    }
  };

  const resetAll = () => {
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current);
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
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
            <span className="section-number">2</span>
            Grave sua dublagem
          </h2>

          {isProcessing && (
            <div className="processing-status">
              <div style={{ marginBottom: '10px' }}>⚙️ Preparando vídeo...</div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          <video ref={videoRef} controls muted style={{ marginTop: '20px' }}></video>

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