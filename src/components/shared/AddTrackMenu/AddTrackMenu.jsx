import { useEffect, useRef, useState } from 'react';
import Button from '../Button/Button';
import './AddTrackMenu.css';

const MAX_SIZE_BYTES = 50 * 1024 * 1024;

const AddTrackMenu = ({ onAddVoiceTrack, onImportFile, showError, disabled, tvNav }) => {
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

  // Navegação por controle remoto (TV): botão-gatilho abre/desce pro
  // dropdown (ou pro próximo controle abaixo, se fechado); itens do
  // dropdown navegam entre si e fecham com Escape/Backspace/ArrowUp.
  const handleTriggerKeyDown = (e) => {
    if (!tvNav) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (open) {
        document.querySelector('.add-track-menu__item')?.focus();
      } else {
        document.querySelector('.timeline__play-btn, .timeline__zoom-btn')?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      document.querySelector('.modal__close')?.focus();
    }
  };

  const closeDropdown = () => {
    setOpen(false);
    containerRef.current?.querySelector('.btn')?.focus();
  };

  const handleItemKeyDown = (e) => {
    if (!tvNav) return;
    const items = Array.from(document.querySelectorAll('.add-track-menu__item'));
    const idx = items.indexOf(e.currentTarget);
    if (e.key === 'ArrowDown') {
      if (idx < items.length - 1) { e.preventDefault(); items[idx + 1].focus(); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (idx > 0) items[idx - 1].focus();
      else closeDropdown();
    } else if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      e.stopPropagation();
      closeDropdown();
    }
  };

  return (
    <div className="add-track-menu" ref={containerRef}>
      <Button variant="outline" onClick={() => setOpen(o => !o)} onKeyDown={handleTriggerKeyDown} disabled={disabled}>
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
            onKeyDown={handleItemKeyDown}
          >
            🎙 Nova faixa de voz (vazia)
          </button>
          <button
            type="button"
            className="add-track-menu__item"
            onClick={() => { setOpen(false); fileInputRef.current?.click(); }}
            onKeyDown={handleItemKeyDown}
          >
            📁 Importar áudio
          </button>
        </div>
      )}
    </div>
  );
};

export default AddTrackMenu;
