export const TRACK_KIND = {
  BACKGROUND: 'background',
  VOICE: 'voice',
  IMPORTED: 'imported',
};

export const MIN_CLIP_SEC = 0.2;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const newTrackId = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `track-${Date.now()}-${Math.random().toString(16).slice(2)}`);

export const clipDuration = (track) =>
  Math.max(0, track.sourceDurationSec - track.trimInSec - track.trimOutSec);

export const createTrack = ({ kind, label, blob = null, audioBuffer = null, offsetSec = 0 }) => ({
  id: newTrackId(),
  kind,
  label,
  removable: kind !== TRACK_KIND.BACKGROUND,
  draggable: kind !== TRACK_KIND.BACKGROUND,
  blob,
  audioBuffer,
  sourceDurationSec: audioBuffer ? audioBuffer.duration : 0,
  offsetSec: kind === TRACK_KIND.BACKGROUND ? 0 : offsetSec,
  trimInSec: 0,
  trimOutSec: 0,
  volume: 100,
  muted: false,
  solo: false,
});

export const createInitialState = (videoId) => ({
  videoId,
  videoDurationSec: 0,
  tracks: [
    createTrack({ kind: TRACK_KIND.BACKGROUND, label: 'Fundo / Efeitos' }),
  ],
  playheadSec: 0,
  isPlaying: false,
  zoomPxPerSec: 60,
  selectedTrackId: null,
});

const updateTrack = (state, id, updater) => ({
  ...state,
  tracks: state.tracks.map(t => (t.id === id ? updater(t) : t)),
});

export function editorReducer(state, action) {
  switch (action.type) {
    case 'SET_VIDEO_DURATION':
      return { ...state, videoDurationSec: action.durationSec };

    case 'SET_BACKGROUND_SOURCE':
      return updateTrack(state, state.tracks[0].id, t => ({
        ...t,
        blob: action.blob,
        audioBuffer: action.audioBuffer,
        sourceDurationSec: action.audioBuffer.duration,
      }));

    case 'ADD_TRACK':
      return { ...state, tracks: [...state.tracks, action.track], selectedTrackId: action.track.id };

    case 'SET_TRACK_AUDIO':
      return updateTrack(state, action.id, t => ({
        ...t,
        blob: action.blob,
        audioBuffer: action.audioBuffer,
        sourceDurationSec: action.audioBuffer.duration,
        offsetSec: clamp(action.offsetSec, 0, Math.max(0, state.videoDurationSec)),
        trimInSec: 0,
        trimOutSec: 0,
      }));

    case 'RENAME_TRACK':
      return updateTrack(state, action.id, t => {
        const label = action.label.trim();
        return label ? { ...t, label } : t;
      });

    case 'REMOVE_TRACK': {
      const track = state.tracks.find(t => t.id === action.id);
      if (!track || !track.removable) return state;
      return {
        ...state,
        tracks: state.tracks.filter(t => t.id !== action.id),
        selectedTrackId: state.selectedTrackId === action.id ? null : state.selectedTrackId,
      };
    }

    case 'SET_VOLUME':
      return updateTrack(state, action.id, t => ({ ...t, volume: clamp(action.volume, 0, 300) }));

    case 'TOGGLE_MUTE':
      return updateTrack(state, action.id, t => ({ ...t, muted: !t.muted }));

    // Solo é exclusivo (só uma faixa por vez, como um radio button) — clicar
    // no S de uma faixa já solada desliga (volta a ouvir tudo); clicar no S
    // de outra faixa troca o solo pra ela. Antes cada faixa tinha seu
    // próprio `solo` independente, então dava pra deixar várias marcadas ao
    // mesmo tempo sem querer — o usuário perdia o controle de quais faixas
    // realmente estavam tocando (mudar seleção de solo silenciava faixas
    // que ele não tinha intenção de mexer, parecendo "mutar" com o S).
    case 'TOGGLE_SOLO':
      return {
        ...state,
        tracks: state.tracks.map(t => ({
          ...t,
          solo: t.id === action.id ? !t.solo : false,
        })),
      };

    case 'MOVE_CLIP':
      return updateTrack(state, action.id, t => {
        if (!t.draggable) return t;
        return { ...t, offsetSec: clamp(action.offsetSec, 0, Math.max(0, state.videoDurationSec)) };
      });

    case 'TRIM_CLIP_START':
      return updateTrack(state, action.id, t => {
        const maxTrimIn = Math.max(0, t.sourceDurationSec - t.trimOutSec - MIN_CLIP_SEC);
        const newTrimIn = clamp(t.trimInSec + action.deltaSec, 0, maxTrimIn);
        const actualDelta = newTrimIn - t.trimInSec;
        return {
          ...t,
          trimInSec: newTrimIn,
          offsetSec: clamp(t.offsetSec + actualDelta, 0, Math.max(0, state.videoDurationSec)),
        };
      });

    case 'TRIM_CLIP_END':
      return updateTrack(state, action.id, t => {
        const maxTrimOut = Math.max(0, t.sourceDurationSec - t.trimInSec - MIN_CLIP_SEC);
        return { ...t, trimOutSec: clamp(t.trimOutSec + action.deltaSec, 0, maxTrimOut) };
      });

    case 'SET_PLAYHEAD':
      return { ...state, playheadSec: clamp(action.sec, 0, Math.max(0, state.videoDurationSec)) };

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.playing };

    case 'SET_ZOOM':
      return { ...state, zoomPxPerSec: clamp(action.zoom, 10, 400) };

    case 'SELECT_TRACK':
      return { ...state, selectedTrackId: action.id };

    default:
      return state;
  }
}
