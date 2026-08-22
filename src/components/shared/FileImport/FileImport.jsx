import './FileImport.css';

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

const FileImport = ({ variant = 'panel', onFileSelected, showToast }) => {
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
    onFileSelected(f);
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

  const handleTileKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      document.getElementById('file-input')?.click();
    } else if (e.key === 'ArrowRight') {
      const first = document.querySelector('.video-card');
      if (first) { e.preventDefault(); first.focus(); }
    } else if (e.key === 'ArrowUp') {
      const search = document.querySelector('.catalog-search');
      if (search) { e.preventDefault(); search.focus(); }
    }
  };

  const input = (
    <input
      type="file"
      id="file-input"
      accept="video/*"
      onChange={handleFileChange}
    />
  );

  if (variant === 'tile') {
    return (
      <div className="file-input-wrapper import-tile-wrapper">
        {input}
        <label
          htmlFor="file-input"
          className="import-tile"
          tabIndex={0}
          role="button"
          aria-label="Importar vídeo"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onKeyDown={handleTileKeyDown}
        >
          <span className="import-tile__plus" aria-hidden="true">+</span>
        </label>
      </div>
    );
  }

  return (
    <section className="catalog-section">
      <div className="file-input-wrapper">
        {input}
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
    </section>
  );
};

export default FileImport;
