// API service functions for interacting with the backend

const API_BASE_URL = 'https://dublee-image-558237336336.southamerica-east1.run.app/api';

export const uploadVideo = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/videos/upload`, {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Upload failed');
  }
  return data;
};

export const getVideo = async (videoId) => {
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to get video');
  }
  return data;
};

export const downloadVideo = (videoId) => {
  return `${API_BASE_URL}/videos/download/${videoId}`;
};

export const checkVoiceRemovalStatus = async (videoId) => {
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/voice-removal-status`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to check status');
  }
  return data;
};

export const recordAudio = async (videoId, audioBlob) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recorded_audio.webm');

  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/record-audio`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || data.message || 'Failed to record audio');
  }

  return response.blob();
};

export const deleteVideo = async (videoId) => {
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}`, {
    method: 'DELETE'
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to delete video');
  }
  return data;
};

export const fetchYoutubeSubtitles = async (videoId) => {
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/subtitles/youtube`, {
    method: 'POST',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Falha ao buscar legendas do YouTube');
  return data.data;
};

export const transcribeWithWhisper = async (videoId) => {
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/subtitles/whisper`, {
    method: 'POST',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Falha na transcrição');
  return data.data;
};

export const importFromUrl = async (url) => {
  const response = await fetch(`${API_BASE_URL}/videos/import-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Falha ao importar vídeo');
  }
  return data;
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