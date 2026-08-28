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
            O Dublee respeita os direitos autorais e a propriedade intelectual de terceiros. 
          </p>
          <p className="info-page__placeholder">
            Todo o conteúdo disponível na plataforma, 
            incluindo vídeos, áudios, imagens e textos, é protegido por leis de direitos autorais e não pode ser reproduzido, distribuído 
            ou utilizado sem a devida autorização dos detentores dos direitos.
          </p>
          <p className="info-page__placeholder">
            O Dublee não se responsabiliza por qualquer violação de direitos autorais cometida pelos usuários da plataforma.
            Os usuários são responsáveis por garantir que possuem os direitos necessários para utilizar qualquer conteúdo protegido por direitos autorais
          </p>
          <p className="info-page__placeholder">
            Os trechos audio-vísual de obras preexistentes disponibilizados na plataforma são utilizados exclusivamente para fins de estudo e prática de dublagem,                                                                
            estando em conformidade com a legislação brasileira, conforme os termos de exceção da Lei nº 9.610, de 19 de fevereiro de 1998, no artigo 46, incisos III e VIII
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
