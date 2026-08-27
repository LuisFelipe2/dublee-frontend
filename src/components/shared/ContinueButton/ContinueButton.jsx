import { forwardRef } from 'react';
import './ContinueButton.css';

// CTA "Continuar" sobreposto ao vídeo (CatalogPreview, SubtitleEditor tela
// cheia/TV) — antes duplicado em cada tela com texto simples; unificado aqui
// como ícone (chevron duplo) com anel dourado, pra se destacar dos outros
// controles e não depender de texto (que ficava apertado/ilegível em
// resoluções pequenas ou por cima de vídeos claros).
const ContinueButton = forwardRef(({ onClick, onKeyDown, disabled, loading, className, ...rest }, ref) => {
  const label = loading ? 'Selecionando vídeo…' : 'Continuar';
  const cls = ['continue-btn', loading ? 'continue-btn--loading' : '', className].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      type="button"
      className={cls}
      onClick={onClick}
      onKeyDown={onKeyDown}
      disabled={disabled}
      aria-label={label}
      title={label}
      {...rest}
    >
      {loading ? (
        <span className="continue-btn__spinner" aria-hidden="true" />
      ) : (
        <svg
          className="continue-btn__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="3 17 9 12 3 7" />
          <polyline points="11 17 17 12 11 7" />
        </svg>
      )}
    </button>
  );
});

ContinueButton.displayName = 'ContinueButton';

export default ContinueButton;
