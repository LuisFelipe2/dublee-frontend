import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCatalog, importCatalogVideo, uploadVideo as uploadVideoAPI } from '../../../services/api';
import Header from '../../shared/Header/Header';
import Footer from '../../shared/Footer/Footer';
import Toast from '../../shared/Toast/Toast';
import CatalogCarousel from '../../shared/carousel/CatalogCarousel/CatalogCarousel';
import FileImport from '../../shared/FileImport/FileImport';
import './CatalogPage.css';
import PageHeader from '../../shared/PageHeader/PageHeader';

const CatalogPage = () => {
  const [items, setItems] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const showToast = (type, message) => setToast({ type, message, id: Date.now() });

  useEffect(() => {
    (async () => {
      const [data, success] = await getCatalog();
      if (!success) showToast('error', 'Falha ao carregar catálogo');
      setItems(data);
      setAllTags([...new Set(data.flatMap(i => i.tags || []))].sort());
      setIsLoading(false);
    })();
  }, []);

  const handleImport = async (id) => {
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

  const handleUpload = async (file) => {
    const [data, success] = await uploadVideoAPI(file);
    if (!success) {
      showToast('error', 'Erro ao enviar vídeo. Tente novamente.');
      return;
    }
    showToast('success', 'Vídeo enviado! Redirecionando...');
    setTimeout(() => navigate(`/subtitle/${data.data.id}`), 2000);
  };

  return (
    <>
      <Header />

      <main className="page-main home-main">
        <div className="container">
          <PageHeader
            title="O app de DUBLAGEM mais RÁPIDO da internet"
            subtitle="Treine dublagem de forma rápida e se profissionalize"
            description="Escolha uma cena do catálogo ou importe seu próprio vídeo, Tudo pronto para gravar a sua dublagem!"
          />

          <CatalogCarousel
            items={items}
            allTags={allTags}
            isLoading={isLoading}
            onImport={handleImport}
            showToast={showToast}
          />
          <div className="section-divider">
            <span>ou importe seu próprio vídeo</span>
          </div>
          <FileImport onUpload={handleUpload} showToast={showToast} />
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
