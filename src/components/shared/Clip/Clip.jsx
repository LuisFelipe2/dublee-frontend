import { useRef } from 'react';
import './Clip.css';

const clipDurationSec = (track) =>
  Math.max(0, track.sourceDurationSec - track.trimInSec - track.trimOutSec);

const Clip = ({ track, pxPerSec, disabled, selected, onSelect, onMove, onTrimStart, onTrimEnd }) => {
  const dragRef = useRef(null);

  const duration = clipDurationSec(track);
  const left = track.offsetSec * pxPerSec;
  const width = Math.max(6, duration * pxPerSec);

  const beginDrag = (e, type) => {
    if (disabled) return;
    if (type === 'move' && !track.draggable) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { type, startX: e.clientX, startOffset: track.offsetSec };
    onSelect?.();
  };

  const onPointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag) return;
    const deltaSec = (e.clientX - drag.startX) / pxPerSec;
    if (drag.type === 'move') {
      onMove(drag.startOffset + deltaSec);
    } else if (drag.type === 'trim-start') {
      onTrimStart(deltaSec);
      dragRef.current = { ...drag, startX: e.clientX };
    } else if (drag.type === 'trim-end') {
      onTrimEnd(-deltaSec);
      dragRef.current = { ...drag, startX: e.clientX };
    }
  };

  const endDrag = (e) => {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  return (
    <div
      className={`clip clip--${track.kind}${selected ? ' clip--selected' : ''}${disabled ? ' clip--disabled' : ''}${track.muted ? ' clip--muted' : ''}`}
      style={{ left, width }}
      onPointerDown={e => beginDrag(e, 'move')}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
    >
      <span className="clip__label">{track.label}</span>
      {track.draggable && (
        <>
          <div
            className="clip__handle clip__handle--left"
            onPointerDown={e => beginDrag(e, 'trim-start')}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
          />
          <div
            className="clip__handle clip__handle--right"
            onPointerDown={e => beginDrag(e, 'trim-end')}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
          />
        </>
      )}
    </div>
  );
};

export default Clip;
