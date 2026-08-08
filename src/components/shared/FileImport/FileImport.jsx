import { useState } from 'react';
import VideoPlayer from '../VideoPlayer/VideoPlayer';
import Button from '../Button/Button';
import './FileImport.css';
import CatalogPreview from '../carousel/CatalogPreview/CatalogPreview';

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_DURATION_SEC = 5 * 60;

const readVideoDuration = (file) => new Promise((resolve, reject) => {
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.onloadedmetadata = () => {
    URL.revokeObjectURL(video.src);
    resolve(video.duration);
  };
  video.onerror = () => {
    URL.revokeObjectURL(video.src);
    reject(new Error('Não foi possível ler o vídeo.'));
  };
  video.src = URL.createObjectURL(file);
});

const FileImport = ({ onUpload, showToast }) => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const applyFile = async (f) => {
    if (!f) return;
    if (!f.type.startsWith('video/')) {
      showToast('error', 'Arquivo inválido. Selecione um vídeo.');
      return;
    }
    if (f.size > MAX_SIZE_BYTES) {
      showToast('error', 'Vídeo muito grande. Limite máximo 10 MB.');
      return;
    }
    try {
      const duration = await readVideoDuration(f);
      if (duration > MAX_DURATION_SEC) {
        showToast('error', 'Vídeo muito longo. Limite máximo 5 minutos.');
        return;
      }
    } catch {
      showToast('error', 'Não foi possível validar o vídeo. Tente outro arquivo.');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleFileChange = (e) => {
    applyFile(e.target.files[0]);
    e.target.value = '';
  };

  const handleDragOver = e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); };
  const handleDragLeave = e => { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); };
  const handleDrop = e => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    applyFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    showToast('loading', 'Enviando vídeo...');
    
    await onUpload(file);

    setIsUploading(false);
  };

  return (
    <section className="catalog-section">
      <h2 className="section-title">📁 Arquivo local</h2>

      <div className="file-input-wrapper">
        <input
          type="file"
          id="file-input"
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
          <div className="upload-label-content">
            <div className="upload-label-icon">📹</div>
            <div className="upload-label-hint">Clique para selecionar ou arraste seu vídeo aqui</div>
            <div className="upload-label-formats">MP4, MOV, AVI e outros formatos</div>
            <div className="upload-limit">Máximo 10 MB, até 5 minutos</div>
          </div>
        </label>
      </div>

      {previewUrl && (
        <CatalogPreview selected={file} onImport={handleUpload} isImporting={isUploading} previewUrl={previewUrl} />
      )}
    </section>
  );
};

export default FileImport;
