import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import useHoverCapable from '../../../hooks/useHoverCapable';
import './VideoCard.css';

const CardInner = ({ item, durationLabel }) => (
  <>
    <div className="video-card__thumb-wrapper">
      {item.thumbnailUrl
        ? <img className="video-card__thumb" src={item.thumbnailUrl} alt={item.title} loading="lazy" />
        : <div className="video-card__thumb-placeholder">🎬</div>
      }
      {durationLabel && <span className="video-card__duration">{durationLabel}</span>}
      <div className="video-card__overlay">
        <span className="video-card__play-icon">▶</span>
      </div>
    </div>
    <div className="video-card__info">
      <p className="video-card__title">{item.title}</p>
    </div>
  </>
);

const VideoCard = ({ item, isSelected, onClick, outerRef, canScrollLeft, canScrollRight, tvNav }) => {
  const [hovering, setHovering] = useState(false);
  const [rect, setRect] = useState(null);
  const cardRef = useRef(null);
  const closeTimer = useRef(null);
  const focusTimer = useRef(null);
  const canHover = useHoverCapable();

  const mins = Math.floor(item.duration / 60);
  const secs = Math.floor(item.duration % 60);
  const durationLabel = item.duration > 0
    ? `${mins}:${String(secs).padStart(2, '0')}`
    : null;

  const open = useCallback(() => {
    if (!canHover) return;
    clearTimeout(closeTimer.current);
    const card = cardRef.current;
    if (!card) return;
    const cardR = card.getBoundingClientRect();
    if (outerRef?.current) {
      const outerR = outerRef.current.getBoundingClientRect();
      const btnW = parseInt(getComputedStyle(outerRef.current).getPropertyValue('--scroll-btn-w')) || 75;
      if ((canScrollLeft  && cardR.left  < outerR.left  + btnW) ||
          (canScrollRight && cardR.right > outerR.right - btnW)) return;
    }
    setRect(cardR);
    setHovering(true);
  }, [canHover, canScrollLeft, canScrollRight]);

  const close = useCallback(() => {
    closeTimer.current = setTimeout(() => setHovering(false), 30);
  }, []);

  // scrolla a fileira pra revelar o card focado por completo, deixando o próximo pela metade.
  // retorna true se precisou scrollar (pra quem chama saber que deve aguardar a animação).
  const scrollIntoRow = useCallback(() => {
    const card = cardRef.current;
    const row = card?.closest('.catalog-row');
    const outer = outerRef?.current;
    if (!card || !row || !outer) return false;
    const cardR = card.getBoundingClientRect();
    const outerR = outer.getBoundingClientRect();
    const btnW = parseInt(getComputedStyle(outer).getPropertyValue('--scroll-btn-w')) || 0;
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    const peek = cardR.width / 2 + gap / 2;
    const leftBound = outerR.left + btnW;
    const rightBound = outerR.right - btnW;

    let delta = 0;
    if (cardR.left < leftBound) {
      delta = cardR.left - leftBound - peek;
    } else if (cardR.right > rightBound) {
      delta = (cardR.right - rightBound) + peek;
    } else {
      return false;
    }
    // scrollTo com alvo absoluto (em vez de scrollBy relativo) pra não acumular
    // erro quando o foco muda rápido e uma animação anterior ainda está em voo.
    row.scrollTo({ left: row.scrollLeft + delta, behavior: 'smooth' });
    return true;
  }, [outerRef]);

  // TV: foco no card funciona como o hover do mouse (mesmo destaque flutuante),
  // e garante que o card focado fique totalmente visível na fileira.
  const handleFocus = useCallback(() => {
    if (!tvNav) return;
    clearTimeout(closeTimer.current);
    clearTimeout(focusTimer.current);
    const reveal = () => {
      const card = cardRef.current;
      if (!card) return;
      setRect(card.getBoundingClientRect());
      setHovering(true);
    };
    if (scrollIntoRow()) {
      focusTimer.current = setTimeout(reveal, 320);
    } else {
      reveal();
    }
  }, [tvNav, scrollIntoRow]);

  const handleBlur = useCallback(() => {
    clearTimeout(focusTimer.current);
    close();
  }, [close]);

  // fecha ao rolar a página verticalmente (window scroll não captura scroll de elementos internos)
  useEffect(() => {
    if (!hovering) return;
    const dismiss = () => setHovering(false);
    window.addEventListener('scroll', dismiss);
    return () => window.removeEventListener('scroll', dismiss);
  }, [hovering]);

  // navegação por controle remoto (TV): setas movem o foco entre cards, import tile e busca
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
      return;
    }
    if (!tvNav) return;
    const card = cardRef.current;
    if (!card) return;
    if (e.key === 'ArrowRight') {
      const next = card.nextElementSibling;
      if (next?.classList.contains('video-card')) { e.preventDefault(); next.focus(); }
    } else if (e.key === 'ArrowLeft') {
      const prev = card.previousElementSibling;
      if (prev?.classList.contains('video-card')) {
        e.preventDefault();
        prev.focus();
      } else {
        const tile = document.querySelector('.import-tile');
        if (tile) { e.preventDefault(); tile.focus(); }
      }
    } else if (e.key === 'ArrowUp') {
      const search = document.querySelector('.catalog-search');
      if (search) { e.preventDefault(); search.focus(); }
    } else if (e.key === 'ArrowDown') {
      const footerFirst = document.querySelector('.app-footer__copy--link, .app-footer__link');
      if (footerFirst) { e.preventDefault(); footerFirst.focus(); }
    }
  }, [onClick, tvNav]);

  return (
    <>
      <div
        ref={cardRef}
        data-item-id={item.id}
        className={`video-card${isSelected ? ' video-card--selected' : ''}${hovering ? ' video-card--ghost' : ''}`}
        onClick={onClick}
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={handleFocus}
        onBlur={handleBlur}
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <CardInner item={item} durationLabel={durationLabel} />
      </div>

      {hovering && rect && createPortal(
        <div
          className={`video-card video-card--floating${isSelected ? ' video-card--selected' : ''}`}
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, pointerEvents: 'none' }}
        >
          <CardInner item={item} durationLabel={durationLabel} />
        </div>,
        document.body
      )}
    </>
  );
};

export default VideoCard;
