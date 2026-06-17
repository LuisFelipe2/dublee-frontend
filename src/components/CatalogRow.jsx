import { useState, useEffect, useRef, useCallback } from 'react';
import VideoCard from './shared/VideoCard';
import './CatalogRow.css';

const CatalogRow = ({ items, isLoading, selected, onSelectCard }) => {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const rowRef = useRef(null);
  const outerRef = useRef(null);

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

  const scrollRow = useCallback((dir) => {
    rowRef.current?.scrollBy({ left: dir * 3 * 162, behavior: 'smooth' });
  }, []);

  if (isLoading) return <div className="catalog-empty">Carregando catálogo...</div>;
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
            isSelected={selected?.id === item.id}
            onClick={() => onSelectCard(item)}
            outerRef={outerRef}
            canScrollLeft={canScrollLeft}
            canScrollRight={canScrollRight}
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
