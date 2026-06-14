import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCatalog,
  getCatalogPreview,
  importCatalogVideo,
  uploadVideo as uploadVideoAPI,
} from '../services/api';
import Header from './shared/Header';
import Footer from './shared/Footer';
import VideoCard from './shared/VideoCard';
import VideoPlayer from './shared/VideoPlayer';
import Button from './shared/Button';
import Toast from './shared/Toast';
import './CatalogPage.css';

const CatalogPage = () => {
  const [items, setItems] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTags, setActiveTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [file, setFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const [toast, setToast] = useState(null);
  const previewRef = useRef(null);
  const filterCloseTimer = useRef(null);
  const rowRef = useRef(null);
  const outerRef = useRef(null);
  const navigate = useNavigate();

  const showToast = (type, message) => setToast({ type, message, id: Date.now() });

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const data = await getCatalog();
        setItems(data);
        setAllTags([...new Set(data.flatMap(i => i.tags || []))].sort());
      } catch (err) {
        showToast('error', err.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const filtered = items.filter(item => {
    const matchSearch = !search || item.title.toLowerCase().includes(search.toLowerCase());
    const matchTags = activeTags.length === 0 || activeTags.every(t => item.tags?.includes(t));
    return matchSearch && matchTags;
  });

  const toggleTag = tag =>
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

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
  }, [filtered.length, updateScrollBtns]);

  const scrollRow = useCallback((dir) => {
    rowRef.current?.scrollBy({ left: dir * 3 * 162, behavior: 'smooth' });
  }, []);

  const openFilter = useCallback(() => {
    clearTimeout(filterCloseTimer.current);
    setIsFilterOpen(true);
  }, []);

  const closeFilter = useCallback(() => {
    filterCloseTimer.current = setTimeout(() => setIsFilterOpen(false), 150);
  }, []);

  const handleSelectCard = async (item) => {
    if (selected?.id === item.id) {
      setSelected(null);
      setPreviewUrl(null);
      return;
    }
    setSelected(item);
    setPreviewUrl(null);
    setIsLoadingPreview(true);
    setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
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
      const data = await importCatalogVideo(selected.id);
      if (data.subtitles?.length > 0) {
        localStorage.setItem(`dublee-subtitles-${data.id}`, JSON.stringify(data.subtitles));
      }
      showToast('success', 'Cena importada! Redirecionando...');
      setTimeout(() => navigate(`/subtitle/${data.id}?from=catalog`), 1500);
    } catch (err) {
      showToast('error', err.message);
      setIsImporting(false);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      showToast('error', 'Vídeo muito grande. Limite máximo 10 MB.');
      e.target.value = '';
      return;
    }
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setFile(f);
    setVideoPreviewUrl(URL.createObjectURL(f));
    setToast(null);
  };

  const handleDragOver = e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); };
  const handleDragLeave = e => { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); };
  const handleDrop = e => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if (f) handleFileChange({ target: { files: e.dataTransfer.files } });
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    showToast('loading', 'Enviando vídeo...');
    try {
      const data = await uploadVideoAPI(file);
      showToast('success', 'Vídeo enviado! Redirecionando...');
      setTimeout(() => navigate(`/subtitle/${data.data.id}`), 2000);
    } catch (err) {
      showToast('error', err.message);
      setIsUploading(false);
    }
  };

  return (
    <>
      <Header />

      <main className="page-main home-main">
        <div className="home-container">

          <div className="home-hero">
            <h1 className="home-hero__title">O app de DUBLAGEM mais RÁPIDO da internet</h1>
            <p className="home-hero__subtitle">Treine dublagem de forma rápida e se profissionalize</p>
            <p className="home-hero__desc">
              Escolha uma cena do catálogo ou importe seu próprio vídeo, Tudo pronto para
              gravar a sua dublagem!
            </p>
          </div>

          <section className="catalog-section">
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
                    onChange={e => setSearch(e.target.value)}
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
                          onClick={() => toggleTag(tag)}
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
                      onClick={() => toggleTag(tag)}
                      aria-label={`Remover filtro ${tag}`}
                    >×</button>
                  </span>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="catalog-empty">Carregando catálogo...</div>
            ) : filtered.length === 0 ? (
              <div className="catalog-empty">Nenhuma cena encontrada.</div>
            ) : (
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
                  {filtered.map(item => (
                    <VideoCard
                      key={item.id}
                      item={item}
                      isSelected={selected?.id === item.id}
                      onClick={() => handleSelectCard(item)}
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
            )}

            {selected && (
              <div className="catalog-preview" ref={previewRef}>
                <div className="catalog-preview__header">
                  <h3 className="catalog-preview__title">{selected.title}</h3>
                  <button
                    className="catalog-preview__close"
                    onClick={() => { setSelected(null); setPreviewUrl(null); }}
                  >✕</button>
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
                    onClick={handleImport}
                    disabled={isImporting || isLoadingPreview || !previewUrl}
                  >
                    {isImporting ? 'Selecionando...' : 'Selecionar esta cena'}
                  </Button>
                </div>
              </div>
            )}
          </section>

          <div className="section-divider">
            <span>ou importe seu próprio vídeo</span>
          </div>

          <section className="upload-section">
            <h2 className="section-title">📁 Arquivo local</h2>

            <div className="file-input-wrapper">
              <input
                type="file"
                id="file-input"
                accept="video/*"
                onChange={handleFileChange}
              />
              <label
                htmlFor="file-input"
                className="file-input-label"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="upload-label-content">
                  <div className="upload-label-icon">📹</div>
                  <div className="upload-label-hint">Clique para selecionar ou arraste seu vídeo aqui</div>
                  <div className="upload-label-formats">MP4, MOV, AVI e outros formatos</div>
                  <div className="upload-limit">Máximo 10 MB</div>
                </div>
              </label>
            </div>

            {videoPreviewUrl && (
              <div className="upload-preview">
                <VideoPlayer src={videoPreviewUrl} />
                <div className="upload-preview__actions">
                  <Button variant="advance" onClick={handleUpload} disabled={isUploading}>
                    {isUploading ? 'Enviando...' : 'Enviar Vídeo'}
                  </Button>
                </div>
              </div>
            )}
          </section>

        </div>
      </main>

      <Footer />

      {toast && (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

export default CatalogPage;
