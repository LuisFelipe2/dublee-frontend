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
          <p className="info-page__placeholder">
            O Dublee respeita os direitos autorais e a propriedade intelectual de terceiros. Todo o conteúdo disponível na plataforma, 
            incluindo vídeos, áudios, imagens e textos, é protegido por leis de direitos autorais e não pode ser reproduzido, distribuído 
            ou utilizado sem a devida autorização dos detentores dos direitos.
            Os trechos audio-vísual de obras preexistentes são utilizados exclusivamente para fins de estudo, como é previsto na legislação brasileira, 
            nos termos da Lei nº 9.610, de 19 de fevereiro de 1998, artigo 46, incisos III e VIII
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

export default CopyrightPage;
