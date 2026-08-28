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
            O Dublee é um aplicativo para treino de dublagem, oferecendo recursos e ferramentas para ajudar os usuários desenvolverem suas 
            habilidades de dublagem.
          </p>
          <p className="info-page__placeholder">
            Para utilizar a plataforma basta acessar um vídeo disponível em nosso catálogo ou importar um vídeo pessoal; 
            adicionar legendas; e gravar sua voz no próprio aplicativo. O Dublee se encarrega da substituir a voz original, 
            utilizando a IA pública do <a href="https://github.com/facebookresearch/demucs">DEMUCS</a> para separar as faixas de áudio, 
            mantendo todos os demais sons que o DEMUCS não reconhecer como voz. 
          </p>
          <p className="info-page__placeholder">
            O código do Dublee é <a href="https://github.com/LuisFelipe2/dublee-backend">open-source</a>, o que significa que a comunidade 
            pode contribuir para o desenvolvimento da plataforma, sugerindo melhorias, corrigindo bugs e adicionando novos recursos. 
            O Dublee não tem fins lucrativos, toda futura arrecadação que fizer será utilizada para mantar a aplicação e pagar os 
            custos de hospedagem, garantindo que a plataforma continue acessível e disponível para todos os usuários interessados 
            em praticar dublagem.
          </p>
          <p className="info-page__placeholder">
            Espero que se divirtam e aproveitem ao máximo o Dublee!
          </p>
          <p className="info-page__placeholder">
            Caso queiram compartilhar suas histórias conosco, entre em contato pela redes social: <a href="https://www.instagram.com/dublee_oficial/">@Dublee_oficial</a>.
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

export default HowItWorksPage;
