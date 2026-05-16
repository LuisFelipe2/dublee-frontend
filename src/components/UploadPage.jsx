import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadVideo as uploadVideoAPI, importFromUrl as importFromUrlAPI } from '../services/api';
import Header from './shared/Header';
import Footer from './shared/Footer';
import Button from './shared/Button';
import SplitLayout from './shared/SplitLayout';
import PageHeader from './shared/PageHeader';
import VideoPlayer from './shared/VideoPlayer';
import Toast from './shared/Toast';
import './UploadPage.css';

const extractYoutubeId = (url) => {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return match ? match[1] : null;
};

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [toast, setToast] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubePreviewId, setYoutubePreviewId] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const showToast = (type, message) => setToast({ type, message, id: Date.now() });
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        showToast('error', 'Vídeo muito grande para importar. Limite máximo 10 MB.');
        e.target.value = '';
        return;
      }
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      setYoutubeUrl('');
      setYoutubePreviewId(null);
      setFile(selectedFile);
      setFileName(`${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`);
      setVideoPreviewUrl(URL.createObjectURL(selectedFile));
      setToast(null);
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
    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'Vídeo muito grande para importar. Limite máximo 10 MB.');
      return;
    }

    setIsUploading(true);
    showToast('loading', 'Enviando vídeo...');

    try {
      const data = await uploadVideoAPI(file);
      showToast('success', 'Vídeo enviado! Redirecionando...');
      setTimeout(() => navigate(`/subtitle/${data.data.id}`), 2000);
    } catch (error) {
      showToast('error', error.message);
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
    setToast(null);
  };

  const importFromYoutube = async () => {
    if (!youtubeUrl.trim()) return;

    setIsImporting(true);
    showToast('loading', 'Baixando vídeo do YouTube...');

    try {
      const data = await importFromUrlAPI(youtubeUrl.trim());
      const subtitles = data.data.subtitles ?? [];
      if (subtitles.length > 0) {
        localStorage.setItem(`dublee-subtitles-${data.data.id}`, JSON.stringify(subtitles));
      }
      const msg = subtitles.length > 0
        ? `Vídeo importado com ${subtitles.length} legendas! Redirecionando...`
        : 'Vídeo importado! Redirecionando...';
      showToast('success', msg);
      setTimeout(() => navigate(`/subtitle/${data.data.id}`), 2000);
    } catch (error) {
      showToast('error', error.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <Header />

      <main className="page-main">
        <div className="container">
          <PageHeader
            title="Bem-vindo ao Dublee"
            subtitle="Sua plataforma de redublagem de vídeos"
            description="Com o Dublee você importa qualquer vídeo — do seu computador ou diretamente do YouTube —
              e grava sua própria dublagem sincronizada com o áudio e as legendas originais.
              Ajuste os volumes da sua voz e do áudio de fundo, pré-visualize o resultado e
              baixe o vídeo final em alta qualidade, tudo em um único fluxo."
          >
            <p className="page-header__cta">Escolha abaixo como deseja importar o seu vídeo para começar:</p>
          </PageHeader>

          <SplitLayout
            left={
              <>
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
                      <div className="import-panel__limit">Máximo 10 MB</div>
                    </div>
                  </label>
                </div>
              </>
            }
            right={
              <>
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
                <p className="import-panel__limit">Máximo 2 minutos · Qualidade limitada a 1080p</p>
              </>
            }
            rightProps={{ style: { justifyContent: 'center', gap: '14px' } }}
          />

          {youtubePreviewId && (
            <div className="video-preview-section">
              <VideoPlayer youtubeId={youtubePreviewId} />
              <div className="video-preview-actions">
                <Button
                  variant="advance"
                  onClick={importFromYoutube}
                  disabled={isImporting}
                >
                  {isImporting ? 'Importando...' : 'Importar Vídeo'}
                </Button>
              </div>
            </div>
          )}

          {videoPreviewUrl && (
            <div className="video-preview-section">
              <VideoPlayer src={videoPreviewUrl} />
              <div className="video-preview-actions">
                <Button
                  variant="advance"
                  onClick={uploadVideo}
                  disabled={isUploading}
                >
                  {isUploading ? 'Enviando...' : 'Enviar Vídeo'}
                </Button>
              </div>
            </div>
          )}

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

export default UploadPage;