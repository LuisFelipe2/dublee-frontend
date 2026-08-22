import { useRef } from 'react';
import TrackRow from '../TrackRow/TrackRow';
import TrackControls from '../TrackControls/TrackControls';
import './Timeline.css';

const ROW_HEIGHT = 92;
const RULER_HEIGHT = 32;
const TICK_OPTIONS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];

const pickTickInterval = (pxPerSec) =>
  TICK_OPTIONS.find(sec => sec * pxPerSec >= 70) ?? TICK_OPTIONS[TICK_OPTIONS.length - 1];

const formatTick = (sec) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const Timeline = ({
  tracks,
  durationSec,
  playheadSec,
  pxPerSec,
  selectedTrackId,
  disabled,
  isPlaying,
  onTogglePlay,
  onSeek,
  onZoomIn,
  onZoomOut,
  onSelectTrack,
  onMoveClip,
  onTrimClipStart,
  onTrimClipEnd,
  onVolumeChange,
  onToggleMute,
  onToggleSolo,
  onRemoveTrack,
  onRenameTrack,
  tvNav,
}) => {
  const contentRef = useRef(null);

  // Navegação por controle remoto (TV): play/zoom navegam entre si por
  // ArrowRight/Left (mesma linha), ArrowUp volta pro botão "+ Adicionar
  // faixa". Os controles por faixa (M/S/remover/arrastar/redimensionar
  // clipe) ficam de fora de propósito — arrastar clipe pelo D-pad é ruim
  // (mesmo racional já aplicado à timeline de legendas em SubtitleEditor.jsx),
  // então esses continuam só mouse/toque/Tab por enquanto.
  const handleZoomRowKeyDown = (e) => {
    if (!tvNav) return;
    const btns = Array.from(document.querySelectorAll('.timeline__play-btn, .timeline__zoom-btn'));
    const idx = btns.indexOf(e.currentTarget);
    if (e.key === 'ArrowRight') {
      if (idx < btns.length - 1) { e.preventDefault(); btns[idx + 1].focus(); }
    } else if (e.key === 'ArrowLeft') {
      if (idx > 0) { e.preventDefault(); btns[idx - 1].focus(); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      document.querySelector('.add-track-menu .btn')?.focus();
    }
  };

  const safeDuration = Math.max(durationSec, 1);
  const contentWidth = safeDuration * pxPerSec + 80;
  const tickInterval = pickTickInterval(pxPerSec);
  const ticks = [];
  for (let t = 0; t <= safeDuration; t += tickInterval) ticks.push(t);

  const handleRulerPointerDown = (e) => {
    if (disabled || !contentRef.current) return;
    const rect = contentRef.current.getBoundingClientRect();
    const sec = Math.max(0, (e.clientX - rect.left) / pxPerSec);
    onSeek(sec);
  };

  return (
    <div className="timeline">
      <div className="timeline__controls-col">
        <div className="timeline__controls-spacer" style={{ height: RULER_HEIGHT }}>
          <div className="timeline__zoom">
            {/* Toca/pausa sem fechar o modal de faixas — o transport normal
                da página fica atrás do backdrop do modal (inalcançável),
                então esse é o único jeito de ouvir o resultado enquanto
                ainda está ajustando as faixas. */}
            {onTogglePlay && (
              <button
                type="button"
                className="timeline__play-btn"
                onClick={onTogglePlay}
                onKeyDown={handleZoomRowKeyDown}
                disabled={disabled}
                aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
                title={isPlaying ? 'Pausar' : 'Reproduzir'}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
            )}
            <span className="timeline__zoom-icon" aria-hidden>🔍</span>
            <button
              type="button"
              className="timeline__zoom-btn"
              onClick={onZoomOut}
              onKeyDown={handleZoomRowKeyDown}
              disabled={disabled}
              aria-label="Diminuir zoom"
            >
              −
            </button>
            <button
              type="button"
              className="timeline__zoom-btn"
              onClick={onZoomIn}
              onKeyDown={handleZoomRowKeyDown}
              disabled={disabled}
              aria-label="Aumentar zoom"
            >
              +
            </button>
          </div>
        </div>
        {tracks.map(track => (
          <TrackControls
            key={track.id}
            track={track}
            selected={track.id === selectedTrackId}
            disabled={disabled}
            onSelect={() => onSelectTrack(track.id)}
            onVolumeChange={v => onVolumeChange(track.id, v)}
            onToggleMute={() => onToggleMute(track.id)}
            onToggleSolo={() => onToggleSolo(track.id)}
            onRemove={() => onRemoveTrack(track.id)}
            onRename={label => onRenameTrack(track.id, label)}
          />
        ))}
      </div>

      <div className="timeline__scroll">
        <div className="timeline__content" ref={contentRef} style={{ width: contentWidth }}>
          <div
            className="timeline__ruler"
            style={{ height: RULER_HEIGHT }}
            onPointerDown={handleRulerPointerDown}
          >
            {ticks.map(t => (
              <div key={t} className="timeline__tick" style={{ left: t * pxPerSec }}>
                <span className="timeline__tick-label">{formatTick(t)}</span>
              </div>
            ))}
          </div>

          <div className="timeline__tracks">
            {tracks.map(track => (
              <TrackRow
                key={track.id}
                track={track}
                pxPerSec={pxPerSec}
                height={ROW_HEIGHT}
                selected={track.id === selectedTrackId}
                disabled={disabled}
                onSelect={() => onSelectTrack(track.id)}
                onMove={offsetSec => onMoveClip(track.id, offsetSec)}
                onTrimStart={deltaSec => onTrimClipStart(track.id, deltaSec)}
                onTrimEnd={deltaSec => onTrimClipEnd(track.id, deltaSec)}
              />
            ))}
          </div>

          <div
            className="timeline__playhead"
            style={{ left: playheadSec * pxPerSec, height: RULER_HEIGHT + tracks.length * ROW_HEIGHT }}
          />
        </div>
      </div>
    </div>
  );
};

export default Timeline;
