import { useEffect, useRef } from 'react';
import './SubtitleCaptionInput.css';

const DOUBLE_TAP_THRESHOLD_MS = 350;

// Duplo-clique deve selecionar o texto INTEIRO, não só a palavra clicada
// (comportamento nativo do browser). Interceptando no mousedown (2º clique
// da sequência, e.detail===2) e bloqueando o default ANTES da seleção nativa
// de palavra ser aplicada é o único jeito confiável de sobrescrever isso —
// fazer só no onDoubleClick roda tarde demais em alguns browsers.
const handleMouseDown = (e) => {
  if (e.detail > 1) {
    e.preventDefault();
    e.target.focus();
    e.target.select();
  }
};

const SubtitleCaptionInput = ({ value, onChange, onBlur, onKeyDown, disabled, autoGrow = false }) => {
  // Duplo-toque em telas touch não gera um mousedown com detail>1 de forma
  // confiável (os eventos de mouse sintetizados a partir de toque variam
  // muito entre browsers mobile, e telas touch costumam tratar duplo-toque
  // como zoom, não como seleção) — precisa de detecção própria via toque.
  const lastTapRef = useRef(0);
  const handleTouchEnd = (e) => {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_THRESHOLD_MS) {
      e.preventDefault();
      e.target.focus();
      e.target.select();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  // `autoGrow` (usado só na legenda em tela cheia, ver SubtitleEditor.jsx)
  // troca o <input> de uma linha só por um <textarea> que cresce em altura
  // conforme o texto quebra linha — o wrap em si já é comportamento nativo
  // do textarea, só precisamos sincronizar a altura com o conteúdo.
  const textareaRef = useRef(null);
  useEffect(() => {
    if (!autoGrow || !textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [autoGrow, value]);

  const sharedProps = {
    className: 'subtitle-caption__input',
    value,
    onChange: e => onChange(e.target.value),
    onBlur,
    onKeyDown,
    onMouseDown: handleMouseDown,
    onDoubleClick: e => e.target.select(),
    onTouchEnd: handleTouchEnd,
    placeholder: 'Legendas...',
    disabled,
    autoComplete: 'off',
    spellCheck: false,
  };

  return (
    <div className={`subtitle-caption${autoGrow ? ' subtitle-caption--auto-grow' : ''}`}>
      <span className="subtitle-caption__quote" aria-hidden>&ldquo;</span>
      {autoGrow ? (
        <textarea ref={textareaRef} rows={1} {...sharedProps} />
      ) : (
        <input type="text" {...sharedProps} />
      )}
      <span className="subtitle-caption__quote" aria-hidden>&rdquo;</span>
    </div>
  );
};

export default SubtitleCaptionInput;
