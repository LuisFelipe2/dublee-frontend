// Module-level store for the recorded audio blob (survives navigation within the SPA)
let recordedAudioBlob = null;

export const setRecordedAudio = (blob) => { recordedAudioBlob = blob; };
export const getRecordedAudio = () => recordedAudioBlob;