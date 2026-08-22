import { useState } from 'react';
import ReportProblemModal from '../ReportProblemModal/ReportProblemModal';
import './Footer.css';

const Footer = () => {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  return (
    <footer className="app-footer">
      <span className="app-footer__copy">© {new Date().getFullYear()} Dublee. Todos os direitos reservados.</span>
      <div className="app-footer__actions">
        <button type="button" className="app-footer__link" onClick={() => setIsReportModalOpen(true)}>
          Reportar problema
        </button>
        <span className="app-footer__badge">v1.0</span>
      </div>
      <ReportProblemModal open={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} />
    </footer>
  );
};

export default Footer;
