import { Link } from 'react-router-dom';
import './Header.css';

const Header = () => {
  return (
    <header className="app-header">
      <div className="app-header__text">
        <h1><Link to="/">Dublee</Link></h1>
      </div>
    </header>
  );
};

export default Header;
