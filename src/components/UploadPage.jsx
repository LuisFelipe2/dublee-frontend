import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadVideo as uploadVideoAPI } from '../services/api';
import Header from './shared/Header';
import Footer from './shared/Footer';
import Button from './shared/Button';
import PageHeader from './shared/PageHeader';
import VideoPlayer from './shared/VideoPlayer';
import Toast from './shared/Toast';
import './UploadPage.css';

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [toast, setToast] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
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

  return (
    <>
      <Header />

      <main className="page-main">
        <div className="container">
          <PageHeader
            title="Bem-vindo ao Dublee"
            subtitle="Sua plataforma de redublagem de vídeos"
            description="Com o Dublee você importa um vídeo do seu computador, grava sua própria dublagem
              sincronizada com o áudio e as legendas originais. Ajuste os volumes da sua voz e do
              áudio de fundo, pré-visualize o resultado e baixe o vídeo final em alta qualidade,
              tudo em um único fluxo."
          >
            <p className="page-header__cta">Selecione o arquivo de vídeo abaixo para começar:</p>
          </PageHeader>

          <div style={{ padding: '0 40px 40px' }}>
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
          </div>

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
