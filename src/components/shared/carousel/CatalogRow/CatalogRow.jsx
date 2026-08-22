import { useState, useEffect, useRef, useCallback } from 'react';
import VideoCard from '../../VideoCard/VideoCard';
import CatalogSkeleton from '../CatalogSkeleton/CatalogSkeleton';
import './CatalogRow.css';

const CatalogRow = ({ items, isLoading, selected, onSelectCard, tvNav }) => {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const rowRef = useRef(null);
  const outerRef = useRef(null);
  const hasAutoFocused = useRef(false);

  const updateScrollBtns = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    updateScrollBtns();
    el.addEventListener('scroll', updateScrollBtns, { passive: true });
    return () => el.removeEventListener('scroll', updateScrollBtns);
  }, [items.length, updateScrollBtns]);

  // TV: foco inicial do controle remoto vai pro primeiro card, uma única vez.
  useEffect(() => {
    if (!tvNav || hasAutoFocused.current || isLoading || items.length === 0) return;
    hasAutoFocused.current = true;
    rowRef.current?.querySelector('.video-card')?.focus();
  }, [tvNav, isLoading, items.length]);

  const scrollRow = useCallback((dir) => {
    const el = rowRef.current;
    if (!el) return;
    const card = el.querySelector('.video-card');
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const step = (card?.getBoundingClientRect().width || el.clientWidth * 0.4) + gap;
    el.scrollBy({ left: dir * 3 * step, behavior: 'smooth' });
  }, []);

  if (isLoading) return <CatalogSkeleton />;
  if (items.length === 0) return <div className="catalog-empty">Nenhuma cena encontrada.</div>;

  return (
    <div className="catalog-row-outer" ref={outerRef}>
      {canScrollLeft && (
        <button
          className="catalog-scroll-btn catalog-scroll-btn--left"
          onClick={() => scrollRow(-1)}
          aria-label="Rolar para esquerda"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      )}
      <div className="catalog-row" ref={rowRef}>
        {items.map(item => (
          <VideoCard
            key={item.id}
            item={item}
            isSelected={selected === item.id}
            onClick={() => onSelectCard(item)}
            outerRef={outerRef}
            canScrollLeft={canScrollLeft}
            canScrollRight={canScrollRight}
            tvNav={tvNav}
          />
        ))}
      </div>
      {canScrollRight && (
        <button
          className="catalog-scroll-btn catalog-scroll-btn--right"
          onClick={() => scrollRow(1)}
          aria-label="Rolar para direita"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      )}
    </div>
  );
};

export default CatalogRow;
