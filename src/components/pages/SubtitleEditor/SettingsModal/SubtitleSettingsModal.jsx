import { useEffect, useRef } from 'react';
import Modal from '../../../shared/Modal/Modal';
import { SubtitleAiDescriptionPanel } from '../Panel/SubtitleAiDescriptionPanel';
import './SubtitleSettingsModal.css';

const CAPTION_SIZES = [
  { value: 'sm', label: 'Pequeno' },
  { value: 'md', label: 'Médio' },
  { value: 'lg', label: 'Grande' },
];

const SubtitleSettingsModal = ({
  open,
  onClose,
  tvNav,
  captionSize,
  onCaptionSizeChange,
  handleGenerate,
  isGenerating,
  autoTranslate,
  handleAutoTranslate,
  targetLang,
  handleTargetLang,
}) => {
  const hasAutoFocused = useRef(false);

  // TV: foco inicial no botão de tamanho ativo assim que o modal abre —
  // mesmo padrão de auto-foco de CatalogPreview.jsx.
  useEffect(() => {
    if (!open) { hasAutoFocused.current = false; return; }
    if (!tvNav || hasAutoFocused.current) return;
    hasAutoFocused.current = true;
    const target = document.querySelector('.subtitle-settings__size-btn--active')
      || document.querySelector('.subtitle-settings__size-btn');
    target?.focus();
  }, [open, tvNav]);

  // TV: o botão de fechar (×) é renderizado pelo Modal genérico (fora da
  // árvore deste componente) — anexado via DOM direto (mesmo padrão usado em
  // CatalogPreview.jsx) em vez de prop-drilling pro Modal compartilhado, que
  // também é usado por ReportProblemModal sem noção de tvNav.
  useEffect(() => {
    if (!open || !tvNav) return;
    const closeBtn = document.querySelector('.modal__close');
    if (!closeBtn) return;
    const onKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        (document.querySelector('.subtitle-settings__size-btn--active') || document.querySelector('.subtitle-settings__size-btn'))?.focus();
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
      }
    };
    closeBtn.addEventListener('keydown', onKeyDown);
    return () => closeBtn.removeEventListener('keydown', onKeyDown);
  }, [open, tvNav, onClose]);

  const handleSizeBtnKeyDown = (e) => {
    if (!tvNav) return;
    const btn = e.currentTarget;
    if (e.key === 'ArrowRight') {
      const next = btn.nextElementSibling;
      if (next?.classList.contains('subtitle-settings__size-btn')) { e.preventDefault(); next.focus(); }
    } else if (e.key === 'ArrowLeft') {
      const prev = btn.previousElementSibling;
      if (prev?.classList.contains('subtitle-settings__size-btn')) { e.preventDefault(); prev.focus(); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      document.querySelector('.modal__close')?.focus();
    } else if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      e.stopPropagation();
      onClose?.();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Configurações" className="subtitle-settings-modal" draggable>
      <div className="subtitle-settings__section">
        <h4 className="subtitle-settings__label">Tamanho da legenda/cronômetro</h4>
        <div className="subtitle-settings__size-options">
          {CAPTION_SIZES.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`subtitle-settings__size-btn${captionSize === opt.value ? ' subtitle-settings__size-btn--active' : ''}`}
              onClick={() => onCaptionSizeChange(opt.value)}
              onKeyDown={handleSizeBtnKeyDown}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="subtitle-settings__section">
        <h4 className="subtitle-settings__label">Gerar legendas por IA</h4>
        <SubtitleAiDescriptionPanel
          handleGenerate={handleGenerate}
          isGenerating={isGenerating}
          autoTranslate={autoTranslate}
          handleAutoTranslate={handleAutoTranslate}
          targetLang={targetLang}
          handleTargetLang={handleTargetLang}
        />
      </div>
    </Modal>
  );
};

export default SubtitleSettingsModal;
