import { Link } from 'react-router-dom';
import blee from '../../../static/blee-logo.png';
import './Header.css';

const Header = () => {
  return (
    <header className="app-header">
      <Link to="/" className="app-header__brand">
        <img src={blee} alt="" className="app-header__logo" />
        <div className="app-header__text">
          <h1>Dublee</h1>
        </div>
      </Link>
    </header>
  );
};

export default Header;
