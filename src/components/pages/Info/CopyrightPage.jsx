import { Link } from 'react-router-dom';
import Header from '../../shared/Header/Header';
import Footer from '../../shared/Footer/Footer';
import PageHeader from '../../shared/PageHeader/PageHeader';
import './InfoPages.css';

const CopyrightPage = () => (
  <>
    <Header />

    <main className="page-main info-page-main">
      <div className="container info-page-container">
        <PageHeader title="Direitos autorais" />

        <section className="info-page__content">
          <p className="info-page__placeholder">Conteúdo em breve.</p>
        </section>

        <div className="page-nav">
          <Link to="/" className="btn btn--ghost">← Voltar para o início</Link>
        </div>
      </div>
    </main>

    <Footer />
  </>
);

export default CopyrightPage;
