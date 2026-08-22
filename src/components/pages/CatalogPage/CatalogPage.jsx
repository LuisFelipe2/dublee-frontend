import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getCatalog, getCatalogPreview, importCatalogVideo, uploadVideo as uploadVideoAPI } from '../../../services/api';
import useBreakpoint from '../../../hooks/useBreakpoint';
import useFullscreenElement from '../../../hooks/useFullscreenElement';
import Header from '../../shared/Header/Header';
import Footer from '../../shared/Footer/Footer';
import Toast from '../../shared/Toast/Toast';
import Modal from '../../shared/Modal/Modal';
import CatalogCarousel from '../../shared/carousel/CatalogCarousel/CatalogCarousel';
import FileImport from '../../shared/FileImport/FileImport';
import CatalogPreview from './CatalogPreview/CatalogPreview';
import './CatalogPage.css';
import PageHeader from '../../shared/PageHeader/PageHeader';

const CatalogPage = () => {
  const [items, setItems] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();
  const isTV = useBreakpoint() === 'X';
  const fullscreenEl = useFullscreenElement();

  const [selectedCatalogId, setSelectedCatalogId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const blobUrlRef = useRef(null);

  const selected = selectedCatalogId ?? selectedFile;

  const showToast = (type, message) => setToast({ type, message, id: Date.now() });

  const releaseBlobUrl = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };

  const clearSelection = () => {
    if (isTV) {
      const target = selectedCatalogId
        ? `.video-card[data-item-id="${CSS.escape(selectedCatalogId)}"]`
        : '.import-tile';
      document.querySelector(target)?.focus();
    }
    releaseBlobUrl();
    setSelectedCatalogId(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsLoadingPreview(false);
  };

  // enquanto importa/envia, não deixa fechar o modal (evita navegação
  // confusa se o usuário clicar em outro card por baixo).
  const handleModalClose = isImporting ? () => {} : clearSelection;

  const handleSelectCatalogItem = async (item) => {
    if (selectedCatalogId === item.id) {
      clearSelection();
      return;
    }
    releaseBlobUrl();
    setSelectedFile(null);
    setSelectedCatalogId(item.id);
    setPreviewUrl(null);
    setIsLoadingPreview(true);

    const [url, success] = await getCatalogPreview(item.id);
    if (!success) {
      showToast('error', 'Erro ao carregar preview');
      clearSelection();
      return;
    }
    setPreviewUrl(url?.previewUrl);
    setIsLoadingPreview(false);
  };

  const handleSelectFile = (file) => {
    releaseBlobUrl();
    const url = URL.createObjectURL(file);
    blobUrlRef.current = url;
    setSelectedCatalogId(null);
    setSelectedFile(file);
    setPreviewUrl(url);
    setIsLoadingPreview(false);
  };

  useEffect(() => {
    (async () => {
      const [data, success] = await getCatalog();
      if (!success) showToast('error', 'Falha ao carregar catálogo');
      setItems(data.items || []);
      setAllTags([...new Set(data.items.flatMap(i => i.tags || []))].sort());
      setIsLoading(false);
    })();
  }, []);

  const importFromCatalog = async (id) => {
    const [data, success] = await importCatalogVideo(id);
    if (!success) {
      showToast('error', 'Falha ao importar cena do catálogo');
      return;
    }

    if (data.subtitles?.length > 0) {
      localStorage.setItem(`dublee-subtitles-${data.id}`, JSON.stringify(data.subtitles));
    }
    showToast('success', 'Cena importada! Redirecionando...');
    setTimeout(() => navigate(`/subtitle/${data.id}?from=catalog`), 1500);
  };

  const uploadLocalFile = async (file) => {
    const [data, success] = await uploadVideoAPI(file);
    if (!success) {
      showToast('error', 'Erro ao enviar vídeo. Tente novamente.');
      return;
    }
    showToast('success', 'Vídeo enviado! Redirecionando...');
    setTimeout(() => navigate(`/subtitle/${data.id}`), 2000);
  };

  const handleConfirmSelection = async () => {
    if (!selected) return;
    setIsImporting(true);
    try {
      if (selectedFile) {
        showToast('loading', 'Enviando vídeo...');
        await uploadLocalFile(selectedFile);
      } else {
        showToast('loading', 'Importando cena...');
        await importFromCatalog(selectedCatalogId);
      }
    } catch (err) {
      showToast('error', err.message);
      setIsImporting(false);
    }
  };

  return (
    <>
      <Header />

      <main className="page-main home-main">
        <div className="container">

          <CatalogCarousel
            items={items}
            allTags={allTags}
            isLoading={isLoading}
            selectedId={selectedCatalogId}
            onSelectItem={handleSelectCatalogItem}
            tvNav={isTV}
            leadingImport={isTV ? (
              <FileImport variant="tile" onFileSelected={handleSelectFile} showToast={showToast} />
            ) : null}
          />
          {!isTV && (
            <>
              <div className="section-divider">
                <span>ou importe seu próprio vídeo</span>
              </div>
              <FileImport onFileSelected={handleSelectFile} showToast={showToast} />
            </>
          )}

        </div>
      </main>

      <Modal open={!!selected} onClose={handleModalClose} className="catalog-preview-modal">
        <CatalogPreview
          previewUrl={previewUrl}
          isLoadingPreview={isLoadingPreview}
          isImporting={isImporting}
          onImport={handleConfirmSelection}
          tvNav={isTV}
          onClose={handleModalClose}
        />
      </Modal>

      <Footer tvNav={isTV} />

      {toast && createPortal(
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />,
        fullscreenEl || document.body
      )}
    </>
  );
};

export default CatalogPage;
