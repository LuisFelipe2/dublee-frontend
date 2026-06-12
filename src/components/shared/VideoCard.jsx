import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
      {item.tags?.length > 0 && (
        <div className="video-card__tags">
          {item.tags.map(tag => (
            <span key={tag} className="video-card__tag">{tag}</span>
          ))}
        </div>
      )}
    </div>
  </>
);

const VideoCard = ({ item, isSelected, onClick, outerRef, canScrollLeft, canScrollRight }) => {
  const [hovering, setHovering] = useState(false);
  const [rect, setRect] = useState(null);
  const cardRef = useRef(null);
  const closeTimer = useRef(null);

  const mins = Math.floor(item.duration / 60);
  const secs = Math.floor(item.duration % 60);
  const durationLabel = item.duration > 0
    ? `${mins}:${String(secs).padStart(2, '0')}`
    : null;

  const open = useCallback(() => {
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
  }, [canScrollLeft, canScrollRight]);

  const close = useCallback(() => {
    closeTimer.current = setTimeout(() => setHovering(false), 30);
  }, []);

  // fecha ao rolar a página verticalmente (window scroll não captura scroll de elementos internos)
  useEffect(() => {
    if (!hovering) return;
    const dismiss = () => setHovering(false);
    window.addEventListener('scroll', dismiss);
    return () => window.removeEventListener('scroll', dismiss);
  }, [hovering]);

  return (
    <>
      <div
        ref={cardRef}
        className={`video-card${isSelected ? ' video-card--selected' : ''}${hovering ? ' video-card--ghost' : ''}`}
        onClick={onClick}
        onMouseEnter={open}
        onMouseLeave={close}
        role="button"
        tabIndex={0}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
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
