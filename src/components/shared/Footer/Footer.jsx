import { useState } from 'react';
import { Link } from 'react-router-dom';
import ReportProblemModal from '../ReportProblemModal/ReportProblemModal';
import './Footer.css';

const Footer = ({ tvNav }) => {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Navegação por controle remoto (TV): setas percorrem os links do rodapé.
  // O link de copyright fica fora de .app-footer__actions (não é sibling dos
  // outros 6), então em vez de nextElementSibling (padrão usado nos cards)
  // achamos a posição atual via querySelectorAll + indexOf.
  const handleFooterKeyDown = (e) => {
    if (!tvNav) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const items = Array.from(document.querySelectorAll('.app-footer__copy--link, .app-footer__link'));
      const idx = items.indexOf(e.currentTarget);
      if (idx === -1) return;
      const nextIdx = e.key === 'ArrowRight' ? idx + 1 : idx - 1;
      if (nextIdx >= 0 && nextIdx < items.length) { e.preventDefault(); items[nextIdx].focus(); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const target = document.querySelector('.video-card')
        || document.querySelector('.import-tile')
        || document.querySelector('.catalog-search');
      target?.focus();
    }
  };

  return (
    <footer className="app-footer">
      <Link
        to="/direitos-autorais"
        className="app-footer__copy app-footer__copy--link"
        onKeyDown={handleFooterKeyDown}
      >
        © {new Date().getFullYear()} Dublee. Todos os direitos reservados.
      </Link>
      <div className="app-footer__actions">
        <Link to="/sobre" className="app-footer__link" onKeyDown={handleFooterKeyDown}>Sobre o Dublee</Link>
        <Link to="/como-funciona" className="app-footer__link" onKeyDown={handleFooterKeyDown}>Como funciona</Link>
        <Link to="/novidades" className="app-footer__link" onKeyDown={handleFooterKeyDown}>Novidades</Link>
        <Link to="/trabalhe-conosco" className="app-footer__link" onKeyDown={handleFooterKeyDown}>Trabalhe conosco</Link>
        <Link to="/termos-privacidade" className="app-footer__link" onKeyDown={handleFooterKeyDown}>Termos e privacidade</Link>
        <button
          type="button"
          className="app-footer__link"
          onClick={() => setIsReportModalOpen(true)}
          onKeyDown={handleFooterKeyDown}
        >
          Reportar problema
        </button>
        <span className="app-footer__badge">v1.0</span>
      </div>
      <ReportProblemModal open={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} />
    </footer>
  );
};

export default Footer;
