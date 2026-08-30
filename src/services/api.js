import { postBlob , get, getBlob, post} from "./useApi";

export const uploadVideo = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  return await post('videos/upload', formData);
};

export const downloadVideo = async (videoId) => {
  return await getBlob(`videos/download/${videoId}`);
};

export const checkVoiceRemovalStatus = async (videoId) => {
  return await get(`videos/${videoId}/voice-removal-status`);
};

export const getNoVoiceAudio = async (videoId) => {
  return await getBlob(`videos/${videoId}/no-voice-audio`);
};

export const transcribeWithWhisper = async (videoId) => {
  return await post(`videos/${videoId}/subtitles/whisper`);
};

export const getCatalog = async (search = '', tags = []) => {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  tags.forEach(t => params.append('tags', t));
  
  return await get(`catalog?${params.toString()}`);
};

export const getCatalogPreview = async (catalogId) => {
  return await get(`catalog/${catalogId}/preview`);
};

export const importCatalogVideo = async (catalogId) => {
  return await post(`catalog/${catalogId}/import`);
};

export const translateSubtitles = async (videoId, subtitles, targetLang) => {
  const requestBody = JSON.stringify({ subtitles, target_lang: targetLang });
  const headers = { 'Content-Type': 'application/json' };
  return await post(`videos/${videoId}/subtitles/translate`, requestBody, headers);
};

export const submitFeedback = async (description) => {
  const requestBody = JSON.stringify({ description });
  const headers = { 'Content-Type': 'application/json' };
  return await post('feedback', requestBody, headers);
};

export const mixTracks = async (videoId, tracks) => {
  const formData = new FormData();
  formData.append('tracks_count', String(tracks.length));
  tracks.forEach((t, i) => {
    if (t.blob) formData.append(`tracks[${i}][audio]`, t.blob, `${t.kind}-${i}.webm`);
    formData.append(`tracks[${i}][kind]`, t.kind);
    formData.append(`tracks[${i}][volume]`, String(t.volume));
    formData.append(`tracks[${i}][offset]`, String(t.offset));
    formData.append(`tracks[${i}][trim_in]`, String(t.trimIn));
    formData.append(`tracks[${i}][trim_out]`, String(t.trimOut));
  });

  return await postBlob(`videos/${videoId}/mix`, formData);
};