import { useState } from 'react';
import { getCatalogPreview } from '../services/api';
import SearchFilters from './SearchFilters';
import CatalogRow from './CatalogRow';
import CatalogPreview from './CatalogPreview';
import './CatalogCarousel.css';

const CatalogCarousel = ({ items, allTags, isLoading, onImport, showToast }) => {
  const [search, setSearch] = useState('');
  const [activeTags, setActiveTags] = useState([]);
  const [selected, setSelected] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const filtered = items.filter(item => {
    const matchSearch = !search || item.title.toLowerCase().includes(search.toLowerCase());
    const matchTags = activeTags.length === 0 || activeTags.every(t => item.tags?.includes(t));
    return matchSearch && matchTags;
  });

  const toggleTag = tag =>
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const handleSelectCard = async (item) => {
    if (selected?.id === item.id) {
      setSelected(null);
      setPreviewUrl(null);
      return;
    }
    setSelected(item);
    setPreviewUrl(null);
    setIsLoadingPreview(true);
    try {
      const url = await getCatalogPreview(item.id);
      setPreviewUrl(url);
    } catch (err) {
      showToast('error', `Erro ao carregar preview: ${err.message}`);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleImport = async () => {
    if (!selected) return;
    setIsImporting(true);
    showToast('loading', 'Importando cena...');
    try {
      await onImport(selected.id);
    } catch (err) {
      showToast('error', err.message);
      setIsImporting(false);
    }
  };

  return (
    <section className="catalog-section">
      <SearchFilters
        search={search}
        onSearchChange={setSearch}
        allTags={allTags}
        activeTags={activeTags}
        onToggleTag={toggleTag}
      />
      <CatalogRow
        items={filtered}
        isLoading={isLoading}
        selected={selected}
        onSelectCard={handleSelectCard}
      />
      <CatalogPreview
        selected={selected}
        previewUrl={previewUrl}
        isLoadingPreview={isLoadingPreview}
        isImporting={isImporting}
        onClose={() => { setSelected(null); setPreviewUrl(null); }}
        onImport={handleImport}
      />
    </section>
  );
};

export default CatalogCarousel;
