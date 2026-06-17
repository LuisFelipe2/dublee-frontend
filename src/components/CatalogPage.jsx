import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCatalog, importCatalogVideo, uploadVideo as uploadVideoAPI } from '../services/api';
import Header from './shared/Header';
import Footer from './shared/Footer';
import Toast from './shared/Toast';
import HomeHero from './HomeHero';
import CatalogCarousel from './CatalogCarousel';
import FileImport from './FileImport';
import './CatalogPage.css';

const CatalogPage = () => {
  const [items, setItems] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);
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

  const handleImport = async (id) => {
    const data = await importCatalogVideo(id);
    if (data.subtitles?.length > 0) {
      localStorage.setItem(`dublee-subtitles-${data.id}`, JSON.stringify(data.subtitles));
    }
    showToast('success', 'Cena importada! Redirecionando...');
    setTimeout(() => navigate(`/subtitle/${data.id}?from=catalog`), 1500);
  };

  const handleUpload = async (file) => {
    const data = await uploadVideoAPI(file);
    showToast('success', 'Vídeo enviado! Redirecionando...');
    setTimeout(() => navigate(`/subtitle/${data.data.id}`), 2000);
  };

  return (
    <>
      <Header />

      <main className="page-main home-main">
        <div className="home-container">
          <HomeHero />
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
