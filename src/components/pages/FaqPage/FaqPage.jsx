import { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../shared/Header/Header';
import Footer from '../../shared/Footer/Footer';
import PageHeader from '../../shared/PageHeader/PageHeader';
import ReportProblemForm from '../../shared/ReportProblemForm/ReportProblemForm';
import Toast from '../../shared/Toast/Toast';
import './FaqPage.css';

const FaqPage = () => {
  const [toast, setToast] = useState(null);

  const handleSent = () => {
    setToast({ type: 'success', message: 'Mensagem enviada com sucesso!', id: Date.now() });
  };

  return (
    <>
      <Header />

      <main className="page-main faq-main">
        <div className="container faq-container">
          <PageHeader
            title="Central de ajuda"
            description="Envie sua dúvida ou problema diretamente para a nossa equipe."
          />

          <section className="faq-report" aria-label="Reportar problema">
            <ReportProblemForm onSent={handleSent} />
          </section>

          <div className="page-nav">
            <Link to="/" className="btn btn--ghost">Voltar para o início</Link>
          </div>
        </div>
      </main>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <Footer />
    </>
  );
};

export default FaqPage;
