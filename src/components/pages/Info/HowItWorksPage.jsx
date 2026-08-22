import { Link } from 'react-router-dom';
import Header from '../../shared/Header/Header';
import Footer from '../../shared/Footer/Footer';
import PageHeader from '../../shared/PageHeader/PageHeader';
import './InfoPages.css';

const HowItWorksPage = () => (
  <>
    <Header />

    <main className="page-main info-page-main">
      <div className="container info-page-container">
        <PageHeader title="Como o Dublee funciona" />

        <section className="info-page__content">
          <p className="info-page__placeholder">
            O Dublee funciona como uma plataforma de aprendizado de dublagem, oferecendo recursos e ferramentas para ajudar os usuários a desenvolver suas habilidades de voz.

            Ao importar um vídeo, os usuários podem acessar o editor de legendas, onde podem criar, ajustar e sincronizar legendas com o áudio do vídeo. A plataforma também oferece recursos de gravação e edição de voz, permitindo que os usuários pratiquem a dublagem de forma interativa.

            O aplicativo utiliza a IA do Demucs para separar o áudio do vídeo em diferentes faixas, como voz, música e efeitos sonoros. Isso permite que os usuários isolem a voz original e pratiquem a dublagem de maneira mais eficaz.

            O código do Dublee é open-source, o que significa que a comunidade pode contribuir para o desenvolvimento da plataforma, sugerindo melhorias, corrigindo bugs e adicionando novos recursos. A colaboração da comunidade é fundamental para o crescimento e aprimoramento contínuo do Dublee.

            O Dublee não tem fins lucrativos, toda arrecadação que fizer será utilizada para mantar a aplicação e pagar os custos de hospedagem, garantindo que a plataforma continue acessível e disponível para todos os usuários interessados em aprender e praticar dublagem.

            Espero que se divirtam e aproveitem ao máximo o Dublee para aprimorar suas habilidades de dublagem!

            Por favor, nos conte suas histórias pelas nossas redes sociais: @instagram, @facebook, @linkedin, @github, @youtube.
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

export default HowItWorksPage;
