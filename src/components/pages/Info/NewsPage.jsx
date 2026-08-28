import { Link } from 'react-router-dom';
import Header from '../../shared/Header/Header';
import Footer from '../../shared/Footer/Footer';
import PageHeader from '../../shared/PageHeader/PageHeader';
import './InfoPages.css';

const NewsPage = () => (
  <>
    <Header />

    <main className="page-main info-page-main">
      <div className="container info-page-container">
        <PageHeader title="Novidades" />

        <section className="info-page__content">
          <p className="info-page__placeholder">
            Fique atento pois o dublee está sempre se atualizando com novidades, melhorias e correções.
          </p>
          <p className="info-page__placeholder">
            Toda a semana novos vídeos são adicionados ao catálogo! 
            Novas funcionalidades são publicadas nas redes sociais!
          </p>
          <p className="info-page__placeholder">
            Aceitamos sugestões e pedidos, mande mensagem para o <a href="https://www.instagram.com/dublee_oficial/">@Dublee_oficial</a>
          </p>
        </section>

        <div className="page-nav">
          <Link to="/" className="btn btn--ghost">Voltar para o início</Link>
        </div>
      </div>
    </main>

    <Footer />
  </>
);

export default NewsPage;
