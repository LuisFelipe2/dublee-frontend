import { useState } from 'react';
import './SearchFilters.css';

// `tvNav` (===tier X/TV) também é usado pra ESCONDER o filtro de tags nessa
// tela — pedido explícito do usuário ("os filtros estão feios, quero
// removê-los em telas X"). A busca continua normal. Como consequência, toda
// a navegação por seta que existia pro botão Filtrar/dropdown/chips (só
// ativa quando tvNav===true) ficou sem propósito, já que agora é exatamente
// quando tvNav é true que esses elementos não existem mais no DOM — removida
// junto (senão seria código morto apontando pra elementos que nunca renderizam).
const SearchFilters = ({ search, onSearchChange, allTags, activeTags, onToggleTag, tvNav }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const openFilter = (isFilterOpen) => setIsFilterOpen(isFilterOpen);

  const handleSearchKeyDown = (e) => {
    if (!tvNav || e.key !== 'ArrowDown') return;
    // Sem resultado de busca não existe .video-card — cai direto no footer
    // pra nunca deixar a seta num beco sem saída.
    const target = document.querySelector('.video-card')
      || document.querySelector('.app-footer__copy--link, .app-footer__link');
    if (target) { e.preventDefault(); target.focus(); }
  };

  const showTagFilter = !tvNav && allTags.length > 0;

  return (
    <div className="catalog-filters">
      <div className="wrapper">
        <div className="wrapper catalog-search-wrapper">
          <svg className="catalog-search-icon" width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="9" cy="9" r="6"/><line x1="14.5" y1="14.5" x2="19" y2="19"/>
          </svg>
          <input
            className="catalog-search"
            type="search"
            placeholder="Buscar cenas..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </div>

        {showTagFilter && (
          <button
            className={`filter-btn${activeTags.length > 0 ? ' filter-btn--active' : ''}`}
            onClick={() => openFilter(!isFilterOpen)}
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

      </div>

      {showTagFilter && isFilterOpen && (
        <div className="filter-dropdown">
          <div className="filter-dropdown__row">
            {allTags.map(tag => (
              <button
                key={tag}
                className={`filter filter-option${activeTags.includes(tag) ? ' filter-option--active' : ''}`}
                onClick={() => onToggleTag(tag)}
              >
                {activeTags.includes(tag) && <span className="filter-option__check">✓ </span>}
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {showTagFilter && (
        <div className="filter-dropdown__row">
          {activeTags.map(tag => (
            <span key={tag} className="filter active-filter">
              {tag}
              <button
                className="active-filter__remove"
                onClick={() => onToggleTag(tag)}
                aria-label={`Remover filtro ${tag}`}
              >×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchFilters;
