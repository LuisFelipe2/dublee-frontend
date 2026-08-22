import { Link } from 'react-router-dom';
import Header from '../../shared/Header/Header';
import Footer from '../../shared/Footer/Footer';
import PageHeader from '../../shared/PageHeader/PageHeader';
import './InfoPages.css';

const CareersPage = () => (
  <>
    <Header />

    <main className="page-main info-page-main">
      <div className="container info-page-container">
        <PageHeader title="Trabalhe conosco" />

        <section className="info-page__content">
          <p className="info-page__placeholder">
            Quer trabalhar conosco? Sinta se livre para entrar em contato, o código do Dublee é open-source e estamos sempre abertos a novas ideias, sugestões e colaborações. Se você tem interesse em contribuir para o desenvolvimento da plataforma, seja como desenvolvedor, designer, ou em qualquer outra área, entre em contato conosco através das nossas redes sociais ou pelo email de contato disponível no site.
            Quiser entrar em contato, basta enviar um email para 
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

export default CareersPage;
