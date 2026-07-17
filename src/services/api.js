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

export const mixAudio = async (videoId, audioBlob, voiceVolume, effectsVolume) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recorded_audio.webm');
  formData.append('voice_volume', voiceVolume.toString());
  formData.append('effects_volume', effectsVolume.toString());

  return await postBlob(`videos/${videoId}/mix`, formData);
};