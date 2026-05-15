import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { downloadVideo, translateSubtitles, transcribeWithWhisper } from '../services/api';
import Header from './shared/Header';
import Footer from './shared/Footer';
import './SubtitleEditor.css';

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

const formatChrono = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 1000);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}:${String(ms).padStart(3, '0')}`;
};

const parseTimeInput = (str) => {
  const s = String(str).trim();
  if (s.includes(':')) {
    const [m, sec] = s.split(':');
    return Math.max(0, (parseInt(m) || 0) * 60 + (parseFloat(sec) || 0));
  }
  return Math.max(0, parseFloat(s) || 0);
};

const SubtitleEditor = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const videoWrapperRef = useRef(null);
  const chronoRef = useRef(null);
  const rafRef = useRef(null);
  const subtitlesRef = useRef([]);
  const editingValueRef = useRef('');
  const fsPendingRef = useRef(false);

  const [subtitles, setSubtitles] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey(videoId));
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [displayedSavedText, setDisplayedSavedText] = useState('');
  const [editingCell, setEditingCell] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [activeRowId, setActiveRowId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateMsg, setGenerateMsg] = useState({ text: '', error: false });
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [targetLang, setTargetLang] = useState('pt');

  useEffect(() => {
    subtitlesRef.current = subtitles;
    localStorage.setItem(storageKey(videoId), JSON.stringify(subtitles));
  }, [subtitles, videoId]);

  // Load video + subtitle display during playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.src = downloadVideo(videoId);

    const onTimeUpdate = () => {
      const t = video.currentTime;
      const found = subtitlesRef.current.find(s => t >= s.startTime && t <= s.endTime);
      setDisplayedSavedText(found?.text ?? '');
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    return () => video.removeEventListener('timeupdate', onTimeUpdate);
  }, [videoId]);

  // Chronometer
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tick = () => {
      if (chronoRef.current) chronoRef.current.textContent = formatChrono(video.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    const startTick = () => { if (!rafRef.current) rafRef.current = requestAnimationFrame(tick); };
    const stopTick = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (chronoRef.current) chronoRef.current.textContent = formatChrono(video.currentTime);
    };
    const onSeeked = () => {
      if (chronoRef.current) chronoRef.current.textContent = formatChrono(video.currentTime);
    };

    video.addEventListener('play', startTick);
    video.addEventListener('pause', stopTick);
    video.addEventListener('ended', stopTick);
    video.addEventListener('seeked', onSeeked);
    return () => {
      video.removeEventListener('play', startTick);
      video.removeEventListener('pause', stopTick);
      video.removeEventListener('ended', stopTick);
      video.removeEventListener('seeked', onSeeked);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  // Fullscreen redirect: video → wrapper so overlays stay visible.
  // Uses two-event flag approach: exit first, then re-request on wrapper
  // inside the second fullscreenchange (which browsers allow without gesture check).
  useEffect(() => {
    const video = videoRef.current;
    const wrapper = videoWrapperRef.current;
    if (!video || !wrapper) return;

    const onFsChange = () => {
      if (document.fullscreenElement === video) {
        fsPendingRef.current = true;
        document.exitFullscreen().catch(() => { fsPendingRef.current = false; });
      } else if (!document.fullscreenElement && fsPendingRef.current) {
        fsPendingRef.current = false;
        wrapper.requestFullscreen?.().catch(() => {});
      }
    };
    const onWebkitFsChange = () => {
      if (document.webkitFullscreenElement === video) {
        document.webkitExitFullscreen?.();
        wrapper.webkitRequestFullscreen?.();
      }
    };

    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onWebkitFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onWebkitFsChange);
    };
  }, []);

  // ── Cell editing ──────────────────────────────────────────────────────────

  const startCellEdit = (id, field, currentValue) => {
    if (editingCell?.id === id && editingCell?.field === field) return;
    const initValue = (field === 'startTime' || field === 'endTime')
      ? formatTime(currentValue)
      : currentValue;
    editingValueRef.current = initValue;
    setEditingCell({ id, field });
    setEditingValue(initValue);
  };

  const saveCellEdit = (id, field) => {
    const raw = editingValueRef.current;
    const newValue = (field === 'startTime' || field === 'endTime')
      ? parseTimeInput(raw)
      : raw;
    // Preserve display order — do NOT auto-sort
    setSubtitles(prev => prev.map(s => s.id === id ? { ...s, [field]: newValue } : s));
    setEditingCell(null);
    setEditingValue('');
    editingValueRef.current = '';
  };

  const handleCellKeyDown = (e, id, field) => {
    if (e.key === 'Enter') { e.preventDefault(); saveCellEdit(id, field); }
    if (e.key === 'Escape') {
      setEditingCell(null);
      setEditingValue('');
      editingValueRef.current = '';
    }
  };

  const handleEditingValueChange = (val) => {
    editingValueRef.current = val;
    setEditingValue(val);
  };

  const editCell = (e, id, field, currentValue) => {
    if (activeRowId !== id) return; // first click → bubble up to handleRowClick (opens menu)
    e.stopPropagation();            // second click on active row → start editing
    setActiveRowId(null);
    startCellEdit(id, field, currentValue);
  };

  // ── Row menu ──────────────────────────────────────────────────────────────

  const handleRowClick = (e, id) => {
    e.stopPropagation();
    if (activeRowId === id) { setActiveRowId(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.top, right: window.innerWidth - rect.right });
    setActiveRowId(id);
  };

  const moveSubtitle = (id, direction) => {
    setSubtitles(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx === -1) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
    setActiveRowId(null);
  };

  const deleteSubtitle = (id) => {
    setSubtitles(prev => prev.filter(s => s.id !== id));
    if (editingCell?.id === id) {
      setEditingCell(null);
      setEditingValue('');
      editingValueRef.current = '';
    }
    setActiveRowId(null);
  };

  const addSubtitle = () => {
    const lastSub = subtitles[subtitles.length - 1];
    const startTime = lastSub ? lastSub.endTime : 0;
    const newSub = { id: Date.now(), text: '', startTime, endTime: startTime + 3 };
    setSubtitles(prev => [...prev, newSub]);
    editingValueRef.current = '';
    setEditingCell({ id: newSub.id, field: 'text' });
    setEditingValue('');
  };

  // ── AI generation ─────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateMsg({ text: 'Transcrevendo com IA… pode levar alguns instantes', error: false });
    try {
      const result = await transcribeWithWhisper(videoId);
      let subs = result.subtitles ?? [];
      if (autoTranslate && subs.length > 0) {
        setGenerateMsg({ text: 'Traduzindo legendas…', error: false });
        const translated = await translateSubtitles(videoId, subs, targetLang);
        subs = translated.subtitles ?? subs;
      }
      setSubtitles(subs);
      setGenerateMsg({ text: `${subs.length} legenda${subs.length !== 1 ? 's' : ''} gerada${subs.length !== 1 ? 's' : ''}`, error: false });
    } catch (e) {
      setGenerateMsg({ text: e.message, error: true });
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Derived: out-of-order row IDs ─────────────────────────────────────────

  const outOfOrderIds = new Set();
  for (let i = 0; i < subtitles.length - 1; i++) {
    if (subtitles[i + 1].startTime < subtitles[i].startTime) {
      outOfOrderIds.add(subtitles[i].id);
      outOfOrderIds.add(subtitles[i + 1].id);
    }
  }

  const activeIdx = activeRowId !== null ? subtitles.findIndex(s => s.id === activeRowId) : -1;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Header />

      <main className="page-main">
        <div className="container">

          <div className="subtitle-welcome">
            <h2 className="subtitle-welcome__title">Adicionar Legendas</h2>
            <p className="subtitle-welcome__subtitle">Passo 2 de 4</p>
            <p className="subtitle-welcome__desc">
              Use a IA para gerar legendas automaticamente, ou adicione manualmente
              consultando o cronômetro do vídeo e preenchendo a tabela abaixo.
            </p>
          </div>

          <div className="content">

            {/* ── Seção 1: Vídeo ── */}
            <div className="section">
              <div ref={videoWrapperRef} className="video-wrapper" style={{ position: 'relative', width: '100%' }}>
                <video
                  ref={videoRef}
                  controls
                  controlsList="nofullscreen"
                  style={{ width: '100%', display: 'block', borderRadius: '8px', background: '#000', marginBottom: 0 }}
                />
                <div ref={chronoRef} className="subtitle-chrono">00:00:000</div>
                {displayedSavedText && (
                  <div className="subtitle-overlay-text">{displayedSavedText}</div>
                )}
                <button
                  className="subtitle-fs-btn"
                  title="Tela cheia (com legendas e cronômetro)"
                  onClick={() => videoWrapperRef.current?.requestFullscreen()}
                >
                  ⛶
                </button>
              </div>
            </div>

            {/* ── Seção 2: Métodos ── */}
            <div className="section">
              <div className="subtitle-methods">

                <div className="subtitle-method-panel">
                  <h3 className="subtitle-method-panel__title">
                    <span>✍️</span> Manual
                  </h3>
                  <p className="subtitle-method-panel__desc">
                    Adicione legendas consultando o cronômetro do vídeo e preenchendo a tabela abaixo:
                  </p>
                  <ol className="subtitle-method-steps">
                    <li>Reproduza o vídeo e anote os tempos pelo <strong>cronômetro</strong></li>
                    <li>Clique em <strong>+</strong> na tabela para adicionar uma linha</li>
                    <li>Clique no campo <strong>Início</strong> e digite o tempo (ex: <code>0:05</code>)</li>
                    <li>Clique no campo <strong>Legenda</strong> e escreva o texto</li>
                    <li>Clique em <strong>Fim</strong> e informe quando a fala termina</li>
                  </ol>
                </div>

                <div className="subtitle-methods__divider">
                  <div className="subtitle-methods__divider-line" />
                  <span className="subtitle-methods__divider-label">ou</span>
                  <div className="subtitle-methods__divider-line" />
                </div>

                <div className="subtitle-method-panel">
                  <h3 className="subtitle-method-panel__title">
                    <span>🤖</span> IA (Whisper)
                  </h3>
                  <p className="subtitle-method-panel__desc">
                    Gere legendas automaticamente a partir do áudio usando o modelo Whisper.
                    O processo pode levar alguns instantes dependendo da duração do vídeo.
                  </p>
                  <button
                    className="btn btn-upload"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >
                    {isGenerating ? '⏳ Gerando…' : '✨ Gerar legendas'}
                  </button>
                  <label className="subtitle-translate-check">
                    <input
                      type="checkbox"
                      checked={autoTranslate}
                      onChange={e => setAutoTranslate(e.target.checked)}
                      disabled={isGenerating}
                    />
                    Traduzir automaticamente após gerar
                  </label>
                  {autoTranslate && (
                    <select
                      value={targetLang}
                      onChange={e => setTargetLang(e.target.value)}
                      disabled={isGenerating}
                      className="subtitle-lang-select"
                    >
                      {LANGUAGES.map(l => (
                        <option key={l.code} value={l.code}>{l.label}</option>
                      ))}
                    </select>
                  )}
                  {generateMsg.text && (
                    <span className={`subtitle-method-msg${generateMsg.error ? ' subtitle-method-msg--error' : ''}`}>
                      {generateMsg.text}
                    </span>
                  )}
                </div>

              </div>
            </div>

            {/* ── Seção 3: Tabela ── */}
            <div className="section">
              <div className="subtitle-table">
                <div className="subtitle-table__header">
                  <div className="subtitle-col subtitle-col--time">Início</div>
                  <div className="subtitle-col subtitle-col--text">
                    Legenda
                    <span className="subtitle-col__hint">clique para editar</span>
                  </div>
                  <div className="subtitle-col subtitle-col--time">Fim</div>
                </div>

                <div className="subtitle-table__body">
                  {subtitles.length === 0 && (
                    <div className="subtitle-table__empty">
                      Nenhuma legenda ainda — clique em <strong>+</strong> abaixo para adicionar.
                    </div>
                  )}

                  {subtitles.map(sub => {
                    const isOoo = outOfOrderIds.has(sub.id);
                    return (
                      <div
                        key={sub.id}
                        className={`subtitle-row${activeRowId === sub.id ? ' subtitle-row--active' : ''}`}
                        onClick={e => handleRowClick(e, sub.id)}
                      >
                        {/* Início */}
                        <div
                          className="subtitle-cell subtitle-cell--time"
                          onClick={e => editCell(e, sub.id, 'startTime', sub.startTime)}
                        >
                          {editingCell?.id === sub.id && editingCell?.field === 'startTime' ? (
                            <input
                              autoFocus
                              className="subtitle-cell__input subtitle-cell__input--time"
                              value={editingValue}
                              onChange={e => handleEditingValueChange(e.target.value)}
                              onBlur={() => saveCellEdit(sub.id, 'startTime')}
                              onKeyDown={e => handleCellKeyDown(e, sub.id, 'startTime')}
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            <span className={`subtitle-cell__value subtitle-cell__value--time${isOoo ? ' subtitle-cell__value--ooo' : ''}`}>
                              {formatTime(sub.startTime)}
                            </span>
                          )}
                        </div>

                        {/* Texto */}
                        <div
                          className="subtitle-cell subtitle-cell--text"
                          onClick={e => editCell(e, sub.id, 'text', sub.text)}
                        >
                          {editingCell?.id === sub.id && editingCell?.field === 'text' ? (
                            <input
                              autoFocus
                              className="subtitle-cell__input"
                              value={editingValue}
                              onChange={e => handleEditingValueChange(e.target.value)}
                              onBlur={() => saveCellEdit(sub.id, 'text')}
                              onKeyDown={e => handleCellKeyDown(e, sub.id, 'text')}
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            <span className={`subtitle-cell__value${!sub.text ? ' subtitle-cell__value--empty' : ''}`}>
                              {sub.text || 'clique para editar…'}
                            </span>
                          )}
                        </div>

                        {/* Fim */}
                        <div
                          className="subtitle-cell subtitle-cell--time"
                          onClick={e => editCell(e, sub.id, 'endTime', sub.endTime)}
                        >
                          {editingCell?.id === sub.id && editingCell?.field === 'endTime' ? (
                            <input
                              autoFocus
                              className="subtitle-cell__input subtitle-cell__input--time"
                              value={editingValue}
                              onChange={e => handleEditingValueChange(e.target.value)}
                              onBlur={() => saveCellEdit(sub.id, 'endTime')}
                              onKeyDown={e => handleCellKeyDown(e, sub.id, 'endTime')}
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            <span className={`subtitle-cell__value subtitle-cell__value--time${isOoo ? ' subtitle-cell__value--ooo' : ''}`}>
                              {formatTime(sub.endTime)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div
                    className="subtitle-row subtitle-row--add"
                    onClick={e => { e.stopPropagation(); addSubtitle(); }}
                  >
                    <span className="subtitle-row--add__icon">+</span>
                    <span className="subtitle-row--add__label">Adicionar legenda</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Seção 4: Navegação ── */}
            <div className="section">
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                Quando as legendas estiverem prontas, prossiga para a gravação da dublagem.
              </p>
              <div className="button-group">
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
      </main>

      {/* Ghost menu — backdrop closes on outside click; menu floats above row */}
      {activeRowId !== null && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => setActiveRowId(null)}
          />
          <div
            className="subtitle-row-menu"
            style={{
              position: 'fixed',
              bottom: `calc(100vh - ${menuPos.top}px + 4px)`,
              right: `${menuPos.right}px`,
              zIndex: 100,
            }}
          >
          {activeIdx > 0 && (
            <button className="subtitle-row-menu__btn" onClick={() => moveSubtitle(activeRowId, -1)}>
              ↑ Mover para cima
            </button>
          )}
          {activeIdx < subtitles.length - 1 && (
            <button className="subtitle-row-menu__btn" onClick={() => moveSubtitle(activeRowId, 1)}>
              ↓ Mover para baixo
            </button>
          )}
          {(activeIdx > 0 || activeIdx < subtitles.length - 1) && (
            <div className="subtitle-row-menu__sep" />
          )}
          <button
            className="subtitle-row-menu__btn subtitle-row-menu__btn--delete"
            onClick={() => deleteSubtitle(activeRowId)}
          >
            🗑 Excluir
          </button>
        </div>
        </>
      )}

      <Footer />
    </>
  );
};

export default SubtitleEditor;
