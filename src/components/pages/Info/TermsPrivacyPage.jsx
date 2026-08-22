import { Link } from 'react-router-dom';
import Header from '../../shared/Header/Header';
import Footer from '../../shared/Footer/Footer';
import PageHeader from '../../shared/PageHeader/PageHeader';
import './InfoPages.css';

const TermsPrivacyPage = () => (
  <>
    <Header />

    <main className="page-main info-page-main">
      <div className="container info-page-container">
        <PageHeader title="Termos e Privacidade" />

        <section className="info-page__content">
          <p className="info-page__placeholder">
            Nada que é hospedado no aplicativo É armazenado de forma definitiva em nossos servidores. Os vídeos importados são apenas processados para a remoção do áudio e em seguida são descartados. Não há conexão com banco de dados.

            O mesmo serve para as gravações de voz, que após mixadas no servidor são removidas da aplicação. O Dublee não armazena nenhum dado do usuário, garantindo a privacidade e segurança das informações.

            O código do Dublee é open-source, o que significa que está disponível para qualquer pessoa acessar, ler e inspecionar. Esse aplicativo é totalmente seguro e transparente.
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

export default TermsPrivacyPage;
