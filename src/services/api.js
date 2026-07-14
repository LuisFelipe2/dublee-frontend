// API service functions for interacting with the backend

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'https://dublee-image-558237336336.us-east4.run.app/api';

export const uploadVideo = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const data = await fetch(`${API_BASE_URL}/videos/upload`, {
    method: 'POST',
    body: formData
  }).then(res => res.json());

  return [data, !data.error];
};

export const downloadVideo = async (videoId) => {
  const data = await fetch(`${API_BASE_URL}/videos/download/${videoId}`)
      .then(r => {
        return r.blob();
      });
  return [data, !data.error];
};

export const checkVoiceRemovalStatus = async (videoId) => {
  const data = await fetch(`${API_BASE_URL}/videos/${videoId}/voice-removal-status`)
      .then(r => r.json());

  return [data, !data.error];
};

export const transcribeWithWhisper = async (videoId) => {
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/subtitles/whisper`, {
    method: 'POST',
  }).then(res => res.json());
  
  return [data.data, !data.error];
};

export const getCatalog = async (search = '', tags = []) => {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  tags.forEach(t => params.append('tags', t));
  
  const data = await fetch(`${API_BASE_URL}/catalog?${params}`)
    .then(r => r.json());

  return [data.data.items, !data.error];
};

export const getCatalogPreview = async (catalogId) => {
  const data = await fetch(`${API_BASE_URL}/catalog/${catalogId}/preview`)
    .then(r => r.json());

  return [data.data.previewUrl, !data.error];
};

export const importCatalogVideo = async (catalogId) => {
  const response = await fetch(`${API_BASE_URL}/catalog/${catalogId}/import`, {
    method: 'POST',
  }).then(res => res.json());

  return [data.data, !data.error];
};

export const translateSubtitles = async (videoId, subtitles, targetLang) => {
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/subtitles/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subtitles, target_lang: targetLang }),
  }).then(res => res.json());
  return [data.data, !data.error];
};

export const mixAudio = async (videoId, audioBlob, voiceVolume, effectsVolume) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recorded_audio.webm');
  formData.append('voice_volume', voiceVolume.toString());
  formData.append('effects_volume', effectsVolume.toString());

  const blob = await fetch(`${API_BASE_URL}/videos/${videoId}/mix`, {
    method: 'POST',
    body: formData,
  }).then(res => res.blob());

  return [blob, !blob.error];
};