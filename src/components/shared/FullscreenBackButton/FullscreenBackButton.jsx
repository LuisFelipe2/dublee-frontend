import './FullscreenBackButton.css';

const FullscreenBackButton = ({ onClick, onKeyDown }) => (
  <button
    type="button"
    className="fullscreen-back-btn"
    onClick={onClick}
    onKeyDown={onKeyDown}
    aria-label="Voltar"
    title="Voltar"
  >
    ‹
  </button>
);

export default FullscreenBackButton;
