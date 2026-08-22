import { useState } from 'react';
import SearchFilters from '../SearchFilters/SearchFilters';
import CatalogRow from '../CatalogRow/CatalogRow';
import './CatalogCarousel.css';

const CatalogCarousel = ({ items, allTags, isLoading, selectedId, onSelectItem, tvNav, leadingImport }) => {
  const [search, setSearch] = useState('');
  const [activeTags, setActiveTags] = useState([]);

  const filtered = items.filter(item => {
    const matchSearch = !search || item.title.toLowerCase().includes(search.toLowerCase());
    const matchTags = activeTags.length === 0 || activeTags.every(t => item.tags?.includes(t));
    return matchSearch && matchTags;
  });

  const toggleTag = tag =>
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  return (
    <section className="catalog-section">
      <SearchFilters
        search={search}
        onSearchChange={setSearch}
        allTags={allTags}
        activeTags={activeTags}
        onToggleTag={toggleTag}
        tvNav={tvNav}
      />
      <div className="catalog-row-group">
        {leadingImport}
        <CatalogRow
          items={filtered}
          isLoading={isLoading}
          selected={selectedId}
          onSelectCard={onSelectItem}
          tvNav={tvNav}
        />
      </div>
    </section>
  );
};

export default CatalogCarousel;
