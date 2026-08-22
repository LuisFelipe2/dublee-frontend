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
            Quer trabalhar no Dublee? o código fonte é open-source, se você tem interesse em contribuir para o desenvolvimento da plataforma, 
            seja como desenvolvedor, designer, ou em qualquer outra área, basta abrir um PR no github e entrar em contato através do 
            instagran: @dublee_oficial ou pelo email: dublee.plataforma@gmail.com
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

export default CareersPage;
