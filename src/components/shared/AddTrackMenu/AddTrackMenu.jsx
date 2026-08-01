import { useEffect, useRef, useState } from 'react';
import Button from '../Button/Button';
import './AddTrackMenu.css';

const MAX_SIZE_BYTES = 50 * 1024 * 1024;

const AddTrackMenu = ({ onAddVoiceTrack, onImportFile, showError, disabled }) => {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      showError?.('Arquivo inválido. Selecione um áudio ou vídeo.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      showError?.('Arquivo muito grande. Limite máximo 50 MB.');
      return;
    }
    onImportFile(file);
  };

  return (
    <div className="add-track-menu" ref={containerRef}>
      <Button variant="outline" onClick={() => setOpen(o => !o)} disabled={disabled}>
        + Adicionar faixa
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/*"
        className="add-track-menu__file-input"
        onChange={handleFileChange}
      />

      {open && (
        <div className="add-track-menu__dropdown">
          <button
            type="button"
            className="add-track-menu__item"
            onClick={() => { setOpen(false); onAddVoiceTrack(); }}
          >
            🎙 Nova faixa de voz (vazia)
          </button>
          <button
            type="button"
            className="add-track-menu__item"
            onClick={() => { setOpen(false); fileInputRef.current?.click(); }}
          >
            📁 Importar áudio
          </button>
        </div>
      )}
    </div>
  );
};

export default AddTrackMenu;
