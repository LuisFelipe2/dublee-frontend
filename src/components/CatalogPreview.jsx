import { useRef, useEffect } from 'react';
import VideoPlayer from './shared/VideoPlayer';
import Button from './shared/Button';
import './CatalogPreview.css';

const CatalogPreview = ({ selected, previewUrl, isLoadingPreview, isImporting, onClose, onImport }) => {
  const previewRef = useRef(null);

  useEffect(() => {
    if (!selected) return;
    const timer = setTimeout(
      () => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
      100
    );
    return () => clearTimeout(timer);
  }, [selected?.id]);

  if (!selected) return null;

  return (
    <div className="catalog-preview" ref={previewRef}>
      <div className="catalog-preview__header">
        <h3 className="catalog-preview__title">{selected.title}</h3>
        <button className="catalog-preview__close" onClick={onClose}>✕</button>
      </div>
      <div className="catalog-preview__player">
        {isLoadingPreview ? (
          <div className="catalog-preview__loading">Carregando preview...</div>
        ) : previewUrl ? (
          <VideoPlayer src={previewUrl} />
        ) : null}
      </div>
      <div className="catalog-preview__actions">
        <Button
          variant="advance"
          onClick={onImport}
          disabled={isImporting || isLoadingPreview || !previewUrl}
        >
          {isImporting ? 'Selecionando...' : 'Selecionar esta cena'}
        </Button>
      </div>
    </div>
  );
};

export default CatalogPreview;
