import { useState } from 'react';
import VolumeSlider from '../VolumeSlider/VolumeSlider';
import './TrackControls.css';

const ICONS = { background: '🎵', voice: '🎙', imported: '📁' };

const TrackControls = ({ track, disabled, selected, onSelect, onVolumeChange, onToggleMute, onToggleSolo, onRemove, onRename }) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(track.label);

  const beginEdit = (e) => {
    e.stopPropagation();
    setEditValue(track.label);
    setEditing(true);
  };

  const commitEdit = () => {
    setEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== track.label) onRename(trimmed);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditValue(track.label);
  };

  return (
  <div
    className={`track-controls track-controls--${track.kind}${selected ? ' track-controls--selected' : ''}`}
    onClick={onSelect}
  >
    <div className="track-controls__top">
      <span className="track-controls__icon">{ICONS[track.kind] ?? '🎧'}</span>
      {editing ? (
        <input
          type="text"
          className="track-controls__label-input"
          value={editValue}
          autoFocus
          onFocus={e => e.target.select()}
          onClick={e => e.stopPropagation()}
          onChange={e => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => {
            if (e.key === 'Enter') e.currentTarget.blur();
            else if (e.key === 'Escape') cancelEdit();
          }}
        />
      ) : (
        <span
          className="track-controls__label"
          title={`${track.label} (duplo clique para renomear)`}
          onDoubleClick={beginEdit}
        >
          {track.label}
        </span>
      )}
      {track.removable && (
        <button
          type="button"
          className="track-controls__remove"
          onClick={e => { e.stopPropagation(); onRemove(); }}
          aria-label="Remover faixa"
          title="Remover faixa"
        >
          ×
        </button>
      )}
    </div>

    <VolumeSlider
      compact
      label=""
      value={track.volume}
      onChange={onVolumeChange}
      disabled={disabled}
    />

    <div className="track-controls__toggles">
      <button
        type="button"
        className={`track-controls__toggle${track.muted ? ' track-controls__toggle--active' : ''}`}
        onClick={e => { e.stopPropagation(); onToggleMute(); }}
        title="Mudo"
      >
        M
      </button>
      <button
        type="button"
        className={`track-controls__toggle track-controls__toggle--solo${track.solo ? ' track-controls__toggle--active' : ''}`}
        onClick={e => { e.stopPropagation(); onToggleSolo(); }}
        title="Solo"
      >
        S
      </button>
    </div>
  </div>
  );
};

export default TrackControls;
