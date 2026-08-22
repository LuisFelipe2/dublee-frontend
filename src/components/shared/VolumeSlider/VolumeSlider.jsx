import './VolumeSlider.css';

const VolumeSlider = ({ label, value, onChange, disabled, compact = false, onKeyDown }) => (
  <div className={`volume-slider${compact ? ' volume-slider--compact' : ''}`}>
    <div className="volume-slider__header">
      <span className="volume-slider__label">{label}</span>
      <span className="volume-slider__value">{value}%</span>
    </div>
    <input
      type="range"
      min={0}
      max={300}
      step={5}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      onKeyDown={onKeyDown}
      disabled={disabled}
      className="volume-slider__input"
    />
    {!compact && (
      <div className="volume-slider__scale">
        <span>0%</span>
        <span>100%</span>
        <span>200%</span>
        <span>300%</span>
      </div>
    )}
  </div>
);

export default VolumeSlider;
