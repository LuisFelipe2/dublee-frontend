import { useState } from 'react';
import { transcribeWithWhisper } from '../services/api';

const SUBTITLES_KEY = (id) => `dublee-subtitles-${id}`;

const btnBase = {
  padding: '5px 14px',
  fontSize: '13px',
  borderRadius: '5px',
  cursor: 'pointer',
  border: 'none',
  fontWeight: 500,
  transition: 'background 0.15s',
};
const btnReload = { ...btnBase, background: '#f0f0f0', color: '#333', border: '1px solid #ccc' };

const SubtitleSourceSelector = ({ videoId, onSubtitlesLoaded }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const reload = async () => {
    setIsLoading(true);
    setIsError(false);
    setMessage('Transcrevendo com IA... (primeira vez pode levar mais tempo)');
    try {
      const data = await transcribeWithWhisper(videoId);
      const subtitles = data.subtitles ?? [];
      localStorage.setItem(SUBTITLES_KEY(videoId), JSON.stringify(subtitles));
      onSubtitlesLoaded?.(subtitles);
      setMessage(subtitles.length > 0 ? `${subtitles.length} legendas carregadas` : 'Nenhuma legenda encontrada');
    } catch (error) {
      setIsError(true);
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      padding: '10px 14px',
      background: '#f8f8f8',
      borderRadius: '8px',
      marginBottom: '16px',
      border: '1px solid #eee',
    }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', color: '#555', fontWeight: 500, marginRight: '2px' }}>
          Legendas:
        </span>
        <button
          style={{ ...btnReload, opacity: isLoading ? 0.6 : 1 }}
          onClick={reload}
          disabled={isLoading}
        >
          {isLoading ? '⏳' : '🔄'} Transcrever com IA (Whisper)
        </button>
      </div>
      {message && (
        <span style={{ fontSize: '12px', color: isError ? '#e53935' : '#777', paddingLeft: '2px' }}>
          {message}
        </span>
      )}
    </div>
  );
};

export default SubtitleSourceSelector;
