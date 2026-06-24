import './Footer.css';

const Footer = () => {
  return (
    <footer className="app-footer">
      <span className="app-footer__copy">© {new Date().getFullYear()} Dublee. Todos os direitos reservados.</span>
      <span className="app-footer__badge">v1.0</span>
    </footer>
  );
};

export default Footer;
