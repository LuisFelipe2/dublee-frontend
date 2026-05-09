import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { downloadVideo, translateSubtitles } from '../services/api';
import SubtitleSourceSelector from './SubtitleSourceSelector';

const LANGUAGES = [
  { code: 'pt', label: 'Português' },
  { code: 'en', label: 'Inglês' },
  { code: 'es', label: 'Espanhol' },
  { code: 'fr', label: 'Francês' },
  { code: 'de', label: 'Alemão' },
  { code: 'it', label: 'Italiano' },
  { code: 'ja', label: 'Japonês' },
  { code: 'ko', label: 'Coreano' },
  { code: 'zh-CN', label: 'Chinês (simplificado)' },
  { code: 'ru', label: 'Russo' },
];

const storageKey = (id) => `dublee-subtitles-${id}`;

const formatTime = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const SubtitleEditor = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  const [subtitles, setSubtitles] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey(videoId));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [pendingText, setPendingText] = useState('');
  const [activeSubtitle, setActiveSubtitle] = useState(null);
  const [displayedSavedText, setDisplayedSavedText] = useState('');
  const [isPaused, setIsPaused] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [targetLang, setTargetLang] = useState('pt');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateMsg, setTranslateMsg] = useState({ text: '', error: false });

  // Refs to avoid stale closures in event handlers
  const pendingTextRef = useRef('');
  const activeSubtitleRef = useRef(null);
  const pausedAtRef = useRef(0);
  const subtitlesRef = useRef(subtitles);

  useEffect(() => {
    subtitlesRef.current = subtitles;
    localStorage.setItem(storageKey(videoId), JSON.stringify(subtitles));
  }, [subtitles, videoId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.src = downloadVideo(videoId);

    const onPause = () => {
      setIsPaused(true);
      if (activeSubtitleRef.current) {
        const endTime = video.currentTime;
        if (endTime > activeSubtitleRef.current.startTime) {
          const sub = {
            id: Date.now(),
            text: activeSubtitleRef.current.text,
            startTime: activeSubtitleRef.current.startTime,
            endTime,
          };
          setSubtitles(prev =>
            [...prev, sub].sort((a, b) => a.startTime - b.startTime)
          );
        }
        activeSubtitleRef.current = null;
        setActiveSubtitle(null);
        setPendingText('');
        pendingTextRef.current = '';
      } else {
        pausedAtRef.current = video.currentTime;
      }
    };

    const onPlay = () => {
      setIsPaused(false);
      const text = pendingTextRef.current.trim();
      if (text) {
        const sub = { text, startTime: pausedAtRef.current };
        activeSubtitleRef.current = sub;
        setActiveSubtitle(sub);
      }
    };

    const onTimeUpdate = () => {
      if (activeSubtitleRef.current) return;
      const t = video.currentTime;
      const found = subtitlesRef.current.find(s => t >= s.startTime && t <= s.endTime);
      setDisplayedSavedText(found?.text ?? '');
    };

    video.addEventListener('pause', onPause);
    video.addEventListener('play', onPlay);
    video.addEventListener('timeupdate', onTimeUpdate);
    return () => {
      video.removeEventListener('pause', onPause);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [videoId]);

  const handleTextChange = (e) => {
    pendingTextRef.current = e.target.value;
    setPendingText(e.target.value);
    if (activeSubtitleRef.current) {
      const updated = { ...activeSubtitleRef.current, text: e.target.value };
      activeSubtitleRef.current = updated;
      setActiveSubtitle(updated);
    }
  };

  const deleteSubtitle = (id) => setSubtitles(prev => prev.filter(s => s.id !== id));

  const startEditing = (sub) => {
    setEditingId(sub.id);
    setEditingData({ text: sub.text, startTime: sub.startTime, endTime: sub.endTime });
  };

  const saveEdit = () => {
    setSubtitles(prev =>
      prev
        .map(s => (s.id === editingId ? { ...s, ...editingData } : s))
        .sort((a, b) => a.startTime - b.startTime)
    );
    setEditingId(null);
  };

  const handleTranslate = async () => {
    if (!subtitles.length) return;
    setIsTranslating(true);
    setTranslateMsg({ text: 'Traduzindo...', error: false });
    try {
      const data = await translateSubtitles(videoId, subtitles, targetLang);
      const translated = data.subtitles ?? [];
      setSubtitles(translated);
      setTranslateMsg({ text: `${translated.length} legendas traduzidas`, error: false });
    } catch (e) {
      setTranslateMsg({ text: e.message, error: true });
    } finally {
      setIsTranslating(false);
    }
  };

  const overlayText = activeSubtitle?.text || (!isPaused ? displayedSavedText : null);

  return (
    <div className="container">
      <div className="header">
        <h1>🎬 Redublador de Vídeos</h1>
        <p>Adicione legendas ao vídeo antes de gravar sua dublagem</p>
      </div>

      <div className="content">
        <div className="section">
          <h2>
            <span className="section-number">2</span>
            Adicionar Legendas
          </h2>

          <SubtitleSourceSelector
            videoId={videoId}
            onSubtitlesLoaded={(subs) => setSubtitles(subs)}
          />

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
              <span style={{ fontSize: '13px', color: '#555', fontWeight: 500 }}>Traduzir para:</span>
              <select
                value={targetLang}
                onChange={e => setTargetLang(e.target.value)}
                disabled={isTranslating}
                style={{
                  padding: '4px 8px',
                  borderRadius: '5px',
                  border: '1px solid #ccc',
                  fontSize: '13px',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
              <button
                onClick={handleTranslate}
                disabled={isTranslating || subtitles.length === 0}
                style={{
                  padding: '5px 14px',
                  fontSize: '13px',
                  borderRadius: '5px',
                  border: 'none',
                  fontWeight: 500,
                  cursor: isTranslating || subtitles.length === 0 ? 'not-allowed' : 'pointer',
                  background: isTranslating || subtitles.length === 0 ? '#ccc' : '#764ba2',
                  color: '#fff',
                  transition: 'background 0.15s',
                }}
              >
                {isTranslating ? '⏳ Traduzindo...' : '🌐 Traduzir'}
              </button>
            </div>
            {translateMsg.text && (
              <span style={{ fontSize: '12px', color: translateMsg.error ? '#e53935' : '#777', paddingLeft: '2px' }}>
                {translateMsg.text}
              </span>
            )}
          </div>

          <div style={{ position: 'relative', width: '100%' }}>
            <video
              ref={videoRef}
              controls
              style={{ width: '100%', display: 'block', marginBottom: 0, borderRadius: '8px', background: '#000' }}
            />

            {/* Subtitle text overlay during playback */}
            {overlayText && (
              <div style={{
                position: 'absolute',
                bottom: '52px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.78)',
                color: '#fff',
                padding: '5px 16px',
                borderRadius: '4px',
                fontSize: '18px',
                maxWidth: '90%',
                textAlign: 'center',
                pointerEvents: 'none',
                whiteSpace: 'pre-wrap',
              }}>
                {overlayText}
              </div>
            )}

            {/* Subtitle input overlay when paused */}
            {isPaused && (
              <div style={{
                position: 'absolute',
                bottom: '52px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '90%',
              }}>
                <input
                  type="text"
                  value={pendingText}
                  onChange={handleTextChange}
                  placeholder="Digite a legenda e dê play para iniciar..."
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    background: 'rgba(0,0,0,0.75)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.35)',
                    borderRadius: '4px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
            )}
          </div>

          <p style={{ fontSize: '12px', color: '#999', marginTop: '8px', textAlign: 'center' }}>
            Pause → escreva a legenda → play para iniciar → pause novamente para salvar
          </p>

          {/* Saved subtitles list */}
          {subtitles.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ fontSize: '14px', color: '#555', marginBottom: '10px' }}>
                Legendas adicionadas ({subtitles.length})
              </h3>
              {subtitles.map(sub => (
                <div
                  key={sub.id}
                  style={{
                    background: '#f8f8f8',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    marginBottom: '8px',
                  }}
                >
                  {editingId === sub.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="text"
                        value={editingData.text}
                        onChange={e => setEditingData(d => ({ ...d, text: e.target.value }))}
                        style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px' }}
                      />
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', flexWrap: 'wrap' }}>
                        <label style={{ color: '#666' }}>Início (s)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={Number(editingData.startTime).toFixed(1)}
                          onChange={e => setEditingData(d => ({ ...d, startTime: parseFloat(e.target.value) || 0 }))}
                          style={{ width: '70px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                        <label style={{ color: '#666' }}>Fim (s)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={Number(editingData.endTime).toFixed(1)}
                          onChange={e => setEditingData(d => ({ ...d, endTime: parseFloat(e.target.value) || 0 }))}
                          style={{ width: '70px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                          <button
                            onClick={saveEdit}
                            className="btn"
                            style={{ padding: '4px 12px', background: '#4caf50', color: '#fff', fontSize: '13px' }}
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="btn btn-cancel"
                            style={{ padding: '4px 10px', fontSize: '13px' }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', color: '#999', minWidth: '105px' }}>
                        {formatTime(sub.startTime)} → {formatTime(sub.endTime)}
                      </span>
                      <span style={{ flex: 1, fontSize: '14px', color: '#333' }}>{sub.text}</span>
                      <button
                        onClick={() => startEditing(sub)}
                        className="btn"
                        style={{ padding: '3px 10px', background: '#667eea', color: '#fff', fontSize: '12px' }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteSubtitle(sub.id)}
                        className="btn"
                        style={{ padding: '3px 10px', background: '#e53935', color: '#fff', fontSize: '12px' }}
                      >
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="button-group" style={{ marginTop: '24px' }}>
            <button className="btn btn-record" onClick={() => navigate(`/record/${videoId}`)}>
              Iniciar Gravação 🎙
            </button>
            <button className="btn btn-cancel" onClick={() => navigate('/')}>
              Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubtitleEditor;
