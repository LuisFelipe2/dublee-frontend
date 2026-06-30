import './CatalogSkeleton.css';

const CARDS = 10;

const CatalogSkeleton = () => (
  <div className="catalog-row-outer">
    <div className="catalog-row catalog-skeleton-row">
      <p className="skeleton-heading">Carregando...</p>
      {Array.from({ length: CARDS }, (_, i) => (
        <div
          key={i}
          className="skeleton-card"
          style={{ animationDelay: `${i * 0.065}s` }}
        >
          <div className="skeleton-thumb">
            <div className="skeleton-play">
              <div className="skeleton-play-circle" />
            </div>
            <div className="skeleton-badge" />
          </div>
          <div className="skeleton-info">
            <div className="skeleton-line skeleton-line--a" />
            <div className="skeleton-line skeleton-line--b" />
            <div className="skeleton-tags-row">
              <div className="skeleton-tag skeleton-tag--a" />
              <div className="skeleton-tag skeleton-tag--b" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default CatalogSkeleton;
