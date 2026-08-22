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
            Fique atento pois manteremos o dublee sempre atualizado com novidades, melhorias e correções.

            Temos atualizações nos vídeos do catálogo toda a semana e eventualmente criando novas funcionalidades. Aceitamos sugestões e pedidos

            Mantenha contato para sempre saber das novidades por email ou pelo aplicativo de celular. Siga-nos nas redes sociais para ficar por dentro de tudo que acontece no Dublee. 
          </p>
        </section>

        <div className="page-nav">
          <Link to="/" className="btn btn--ghost">← Voltar para o início</Link>
        </div>
      </div>
    </main>

    <Footer />
  </>
);

export default NewsPage;
