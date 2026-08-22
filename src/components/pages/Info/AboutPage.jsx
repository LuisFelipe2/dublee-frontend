import { Link } from 'react-router-dom';
import Header from '../../shared/Header/Header';
import Footer from '../../shared/Footer/Footer';
import PageHeader from '../../shared/PageHeader/PageHeader';
import './InfoPages.css';

const AboutPage = () => (
  <>
    <Header />

    <main className="page-main info-page-main">
      <div className="container info-page-container">
        <PageHeader title="Sobre o Dublee" />

        <section className="info-page__content">
          <p className="info-page__placeholder">
            A missão do Dublee é prover o melhor ambiente para o treino e desenvolvimento da voz aplicada a dublagem.
          </p>
          <p className="info-page__placeholder">  
            Com uma ferramente acessível e intuitiva. Visamos facilitar a prática de dublagem, permitindo a todos treinar e desenvolver suas habilidades de forma eficiente e divertida.
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

export default AboutPage;
