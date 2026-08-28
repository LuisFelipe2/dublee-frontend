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
            Quer trabalhar no Dublee? 
          </p>
          <p className="info-page__placeholder">o código fonte é <a href="https://github.com/LuisFelipe2/dublee-backend">open-source</a>, se você tem interesse em contribuir para o desenvolvimento da plataforma, 
            seja como desenvolvedor, designer, ou em qualquer outra área, basta abrir um PR no github e entrar em contato através do 
            instagran: <a href="https://www.instagram.com/dublee_oficial/">@Dublee_oficial</a> ou pelo email: dublee.plataforma@gmail.com
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
