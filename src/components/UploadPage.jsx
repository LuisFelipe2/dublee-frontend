import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadVideo as uploadVideoAPI } from '../services/api';

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    console.log('Evento de mudança de arquivo:', e);
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(`Arquivo: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)}MB)`);
      console.log('Arquivo selecionado:', selectedFile);
    } else {
      setFile(null);
      setFileName('');
      console.log('Nenhum arquivo selecionado');
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

  const resetForm = () => {
    setFile(null);
    setFileName('');
    fileInputRef.current.value = '';
    setStatus({ type: '', message: '' });
  };

  const uploadVideo = async () => {
    if (!file) return;

    setIsUploading(true);
    setStatus({ type: 'loading', message: 'Enviando vídeo...' });

    try {
      const data = await uploadVideoAPI(file);
      setStatus({ type: 'success', message: 'Vídeo enviado! Redirecionando...' });
      setTimeout(() => {
        navigate(`/record/${data.data.id}`);
      }, 2000);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsUploading(false);
    }
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
            <span className="section-number">1</span>
            Importe seu vídeo
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
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>📹</div>
                <div>Clique para selecionar ou arraste seu vídeo aqui</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                  MP4, MOV, AVI e outros formatos
                </div>
              </div>
            </label>
          </div>
          {fileName && <div className="filename-display">{fileName}</div>}
          <div className="button-group">
            <button
              className="btn btn-upload"
              onClick={uploadVideo}
              disabled={!file || isUploading}
            >
              {isUploading ? 'Enviando...' : 'Enviar Vídeo'}
            </button>
            <button className="btn btn-reset" onClick={resetForm}>
              Limpar
            </button>
          </div>
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

export default UploadPage;