import './PageHeader.css';

const PageHeader = ({ title, subtitle, description, children }) => (
  <div className="page-header">
    <h2 className="page-header__title">{title}</h2>
    {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
    <p className="page-header__desc">{description}</p>
    {children}
  </div>
);

export default PageHeader;
