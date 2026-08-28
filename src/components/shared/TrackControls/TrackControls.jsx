import { useEffect, useRef, useState } from 'react';
import VolumeSlider from '../VolumeSlider/VolumeSlider';
import './TrackControls.css';

const ICONS = { background: '🎵', voice: '🎙', imported: '📁' };
const DOUBLE_TAP_THRESHOLD_MS = 350;

const TrackControls = ({ track, disabled, selected, onSelect, onVolumeChange, onToggleMute, onToggleSolo, onRemove, onRename }) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(track.label);

  // Remover exige 2 cliques no ×: o 1º só "arma" a confirmação (linha
  // esmaecida com contorno vermelho, botão maior/vermelho); o 2º de fato
  // remove. Clicar em qualquer outro lugar cancela — o listener de
  // 'pointerdown' no document cobre isso (dispara antes do onClick do
  // próprio botão, mas esse não deixa o evento chegar ao document, ver
  // onPointerDown abaixo), então qualquer outro clique/toque (na própria
  // linha, em M/S, fora do modal etc.) desarma.
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  useEffect(() => {
    if (!confirmingRemove) return;
    const cancel = () => setConfirmingRemove(false);
    document.addEventListener('pointerdown', cancel);
    return () => document.removeEventListener('pointerdown', cancel);
  }, [confirmingRemove]);

  const beginEdit = (e) => {
    e.stopPropagation();
    setEditValue(track.label);
    setEditing(true);
  };

  // Duplo-toque em telas touch não gera um dblclick de forma confiável
  // (mesmo motivo/fix já usado em SubtitleCaptionInput.jsx) — precisa de
  // detecção própria via toque, senão renomear faixa não funciona no mobile.
  const lastTapRef = useRef(0);
  const handleTouchEnd = (e) => {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_THRESHOLD_MS) {
      e.preventDefault();
      beginEdit(e);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
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
    className={`track-controls track-controls--${track.kind}${selected ? ' track-controls--selected' : ''}${confirmingRemove ? ' track-controls--confirm-remove' : ''}`}
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
          title={`${track.label} (duplo clique/toque para renomear)`}
          onDoubleClick={beginEdit}
          onTouchEnd={handleTouchEnd}
        >
          {track.label}
        </span>
      )}
      {track.removable && (
        <button
          type="button"
          className={`track-controls__remove${confirmingRemove ? ' track-controls__remove--confirm' : ''}`}
          onPointerDown={e => e.stopPropagation()}
          onClick={e => {
            e.stopPropagation();
            if (confirmingRemove) onRemove();
            else setConfirmingRemove(true);
          }}
          aria-label={confirmingRemove ? 'Confirmar remoção da faixa' : 'Remover faixa'}
          title={confirmingRemove ? 'Clique novamente para confirmar' : 'Remover faixa'}
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
