import Clip from '../Clip/Clip';
import './TrackRow.css';

const TrackRow = ({ track, pxPerSec, height, selected, disabled, onSelect, onMove, onTrimStart, onTrimEnd }) => (
  <div className={`track-row${selected ? ' track-row--selected' : ''}`} style={{ height }}>
    {track.audioBuffer && (
      <Clip
        track={track}
        pxPerSec={pxPerSec}
        disabled={disabled}
        selected={selected}
        onSelect={onSelect}
        onMove={onMove}
        onTrimStart={onTrimStart}
        onTrimEnd={onTrimEnd}
      />
    )}
  </div>
);

export default TrackRow;
