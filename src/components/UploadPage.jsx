import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadVideo as uploadVideoAPI, importFromUrl as importFromUrlAPI } from '../services/api';
import Header from './shared/Header';
import Footer from './shared/Footer';
import './UploadPage.css';

const extractYoutubeId = (url) => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return match ? match[1] : null;
};

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubePreviewId, setYoutubePreviewId] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      setYoutubeUrl('');
      setYoutubePreviewId(null);
      setFile(selectedFile);
      setFileName(`${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`);
      setVideoPreviewUrl(URL.createObjectURL(selectedFile));
      setStatus({ type: '', message: '' });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      fileInputRef.current.files = e.dataTransfer.files;
      handleFileChange({ target: { files: e.dataTransfer.files } });
    }
  };

  const uploadVideo = async () => {
    if (!file) return;

    setIsUploading(true);
    setStatus({ type: 'loading', message: 'Enviando vídeo...' });

    try {
      const data = await uploadVideoAPI(file);
      setStatus({ type: 'success', message: 'Vídeo enviado! Redirecionando...' });
      setTimeout(() => {
        navigate(`/subtitle/${data.data.id}`);
      }, 2000);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleYoutubeUrlChange = (e) => {
    const url = e.target.value;
    setYoutubeUrl(url);
    const id = extractYoutubeId(url);
    setYoutubePreviewId(id);
    if (id) {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      setFile(null);
      setFileName('');
      setVideoPreviewUrl(null);
      fileInputRef.current.value = '';
    }
    setStatus({ type: '', message: '' });
  };

  const importFromYoutube = async () => {
    if (!youtubeUrl.trim()) return;

    setIsImporting(true);
    setStatus({ type: 'loading', message: 'Baixando vídeo do YouTube...' });

    try {
      const data = await importFromUrlAPI(youtubeUrl.trim());
      const subtitles = data.data.subtitles ?? [];
      if (subtitles.length > 0) {
        localStorage.setItem(`dublee-subtitles-${data.data.id}`, JSON.stringify(subtitles));
      }
      const msg = subtitles.length > 0
        ? `Vídeo importado com ${subtitles.length} legendas! Redirecionando...`
        : 'Vídeo importado! Redirecionando...';
      setStatus({ type: 'success', message: msg });
      setTimeout(() => {
        navigate(`/subtitle/${data.data.id}`);
      }, 2000);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <Header />

      <main className="page-main">
        <div className="container">
          <div className="upload-welcome">
            <h2 className="upload-welcome__title">Bem-vindo ao Dublee</h2>
            <p className="upload-welcome__subtitle">Sua plataforma de redublagem de vídeos</p>
            <p className="upload-welcome__desc">
              Com o Dublee você importa qualquer vídeo — do seu computador ou diretamente do YouTube —
              e grava sua própria dublagem sincronizada com o áudio e as legendas originais.
              Ajuste os volumes da sua voz e do áudio de fundo, pré-visualize o resultado e
              baixe o vídeo final em alta qualidade, tudo em um único fluxo.
            </p>
            <p className="upload-welcome__cta">Escolha abaixo como deseja importar o seu vídeo para começar:</p>
          </div>

          <div className="import-layout">

            {/* Painel esquerdo: upload de arquivo */}
            <div className="import-panel">
              <h2 className="import-panel__title">
                <span className="import-panel__title-icon">📁</span>
                Arquivo local
              </h2>
              <div className="file-input-wrapper">
                <input
                  type="file"
                  id="file-input"
                  ref={fileInputRef}
                  accept="video/*"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="file-input"
                  className="file-input-label"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '36px', marginBottom: '12px' }}>📹</div>
                    <div>Clique para selecionar ou arraste seu vídeo aqui</div>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                      MP4, MOV, AVI e outros formatos
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Divisor central */}
            <div className="import-divider">
              <div className="import-divider__line" />
              <span className="import-divider__label">ou</span>
              <div className="import-divider__line" />
            </div>

            {/* Painel direito: YouTube */}
            <div className="import-panel import-panel--youtube">
              <h2 className="import-panel__title">
                <span className="import-panel__title-icon">▶️</span>
                Importar do YouTube
              </h2>
              <p className="import-panel__desc">Cole o link e o vídeo aparecerá abaixo para confirmação</p>
              <input
                type="url"
                className="youtube-url-input"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={handleYoutubeUrlChange}
                disabled={isImporting}
              />
            </div>

          </div>

          {youtubePreviewId && (
            <div className="video-preview-section">
              <h3 className="video-preview-title">
                <span>▶️</span> Pré-visualização do YouTube
              </h3>
              <div className="youtube-iframe-wrapper">
                <iframe
                  className="youtube-preview-iframe"
                  src={`https://www.youtube.com/embed/${youtubePreviewId}`}
                  title="Pré-visualização do YouTube"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="video-preview-actions">
                <button
                  className="btn btn-upload btn-send"
                  onClick={importFromYoutube}
                  disabled={isImporting}
                >
                  {isImporting ? 'Importando...' : 'Importar Vídeo'}
                </button>
              </div>
            </div>
          )}

          {videoPreviewUrl && (
            <div className="video-preview-section">
              <h3 className="video-preview-title">
                <span>🎬</span> {fileName}
              </h3>
              <video
                className="video-preview-player"
                src={videoPreviewUrl}
                controls
              />
              <div className="video-preview-actions">
                <button
                  className="btn btn-upload btn-send"
                  onClick={uploadVideo}
                  disabled={isUploading}
                >
                  {isUploading ? 'Enviando...' : 'Enviar Vídeo'}
                </button>
              </div>
            </div>
          )}

          {status.message && (
            <div className="import-status">
              <div className={`status-message show ${status.type}`}>
                {status.type === 'loading' && <span className="spinner"></span>}
                {status.message}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
};

export default UploadPage;