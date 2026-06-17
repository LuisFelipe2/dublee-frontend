import { useState, useRef } from 'react';
import './SearchFilters.css';

const SearchFilters = ({ search, onSearchChange, allTags, activeTags, onToggleTag }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const closeTimer = useRef(null);

  const openFilter = () => { clearTimeout(closeTimer.current); setIsFilterOpen(true); };
  const closeFilter = () => { closeTimer.current = setTimeout(() => setIsFilterOpen(false), 150); };

  return (
    <div className="catalog-filters">
      <div className="catalog-filter-row">
        <div className="catalog-search-wrapper">
          <svg className="catalog-search-icon" width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="9" cy="9" r="6"/><line x1="14.5" y1="14.5" x2="19" y2="19"/>
          </svg>
          <input
            className="catalog-search"
            type="search"
            placeholder="Buscar cenas..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>

        {allTags.length > 0 && (
          <button
            className={`filter-btn${activeTags.length > 0 ? ' filter-btn--active' : ''}`}
            onMouseEnter={openFilter}
            onMouseLeave={closeFilter}
            aria-expanded={isFilterOpen}
            aria-label="Filtrar por tag"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L13 10.414V15a1 1 0 01-.553.894l-4 2A1 1 0 017 17v-6.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd"/>
            </svg>
            Filtrar
            {activeTags.length > 0 && (
              <span className="filter-btn__count">{activeTags.length}</span>
            )}
          </button>
        )}

        {isFilterOpen && allTags.length > 0 && (
          <div
            className="filter-dropdown"
            onMouseEnter={openFilter}
            onMouseLeave={closeFilter}
          >
            <div className="filter-dropdown__row">
              {allTags.map(tag => (
                <button
                  key={tag}
                  className={`filter-option${activeTags.includes(tag) ? ' filter-option--active' : ''}`}
                  onClick={() => onToggleTag(tag)}
                >
                  {activeTags.includes(tag) && <span className="filter-option__check">✓ </span>}
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="active-filters">
        {activeTags.map(tag => (
          <span key={tag} className="active-filter">
            {tag}
            <button
              className="active-filter__remove"
              onClick={() => onToggleTag(tag)}
              aria-label={`Remover filtro ${tag}`}
            >×</button>
          </span>
        ))}
      </div>
    </div>
  );
};

export default SearchFilters;
