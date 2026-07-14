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
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/voice-removal-status`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to check status');
  }
  return data;
};

export const transcribeWithWhisper = async (videoId) => {
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/subtitles/whisper`, {
    method: 'POST',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Falha na transcrição');
  return data.data;
};

export const getCatalog = async (search = '', tags = []) => {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  tags.forEach(t => params.append('tags', t));
  const response = await fetch(`${API_BASE_URL}/catalog?${params}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Falha ao carregar catálogo');
  return data.data.items;
};

export const getCatalogPreview = async (catalogId) => {
  const response = await fetch(`${API_BASE_URL}/catalog/${catalogId}/preview`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Falha ao gerar preview');
  return data.data.previewUrl;
};

export const importCatalogVideo = async (catalogId) => {
  const response = await fetch(`${API_BASE_URL}/catalog/${catalogId}/import`, {
    method: 'POST',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Falha ao importar vídeo do catálogo');
  return data.data;
};

export const translateSubtitles = async (videoId, subtitles, targetLang) => {
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/subtitles/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subtitles, target_lang: targetLang }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Falha na tradução');
  return data.data;
};

export const mixAudio = async (videoId, audioBlob, voiceVolume, effectsVolume) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recorded_audio.webm');
  formData.append('voice_volume', voiceVolume.toString());
  formData.append('effects_volume', effectsVolume.toString());

  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/mix`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || data.message || 'Mix failed');
  }

  return response.blob();
};