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
}) => {
  const contentRef = useRef(null);

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
            <span className="timeline__zoom-icon" aria-hidden>🔍</span>
            <button
              type="button"
              className="timeline__zoom-btn"
              onClick={onZoomOut}
              disabled={disabled}
              aria-label="Diminuir zoom"
            >
              −
            </button>
            <button
              type="button"
              className="timeline__zoom-btn"
              onClick={onZoomIn}
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
