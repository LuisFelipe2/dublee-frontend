import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { downloadVideo, translateSubtitles, transcribeWithWhisper } from '../services/api';
import Header from './shared/Header';
import Footer from './shared/Footer';
import VideoPlayer from './shared/VideoPlayer';
import Button from './shared/Button';
import SplitLayout from './shared/SplitLayout';
import PageHeader from './shared/PageHeader';
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
  const editingValueRef = useRef('');

  const [subtitles, setSubtitles] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey(videoId));
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [editingCell, setEditingCell] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateMsg, setGenerateMsg] = useState({ text: '', error: false });
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [targetLang, setTargetLang] = useState('pt');

  useEffect(() => {
    localStorage.setItem(storageKey(videoId), JSON.stringify(subtitles));
  }, [subtitles, videoId]);

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

  const handleTimeInputChange = (raw) => {
    const prev = editingValueRef.current;
    const cleaned = raw.replace(/[^\d:]/g, '');

    let formatted;
    if (cleaned.includes(':')) {
      const [mins, secs = ''] = cleaned.split(':');
      formatted = `${mins}:${secs.slice(0, 2)}`;
    } else if (raw.length > prev.length && cleaned.length >= 3) {
      formatted = `${cleaned.slice(0, cleaned.length - 2)}:${cleaned.slice(-2)}`;
    } else {
      formatted = cleaned;
    }

    handleEditingValueChange(formatted);
  };

  const editCell = (e, id, field, currentValue) => {
    e.stopPropagation();
    startCellEdit(id, field, currentValue);
  };

  // ── Drag and drop ──────────────────────────────────────────────────────────

  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== id) setDragOverId(id);
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    setSubtitles(prev => {
      const arr = [...prev];
      const fromIdx = arr.findIndex(s => s.id === draggedId);
      const toIdx = arr.findIndex(s => s.id === targetId);
      const [removed] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, removed);
      return arr;
    });
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  // ── Row actions ────────────────────────────────────────────────────────────

  const deleteSubtitle = (id) => {
    setSubtitles(prev => prev.filter(s => s.id !== id));
    if (editingCell?.id === id) {
      setEditingCell(null);
      setEditingValue('');
      editingValueRef.current = '';
    }
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

  // ── Derived ───────────────────────────────────────────────────────────────

  const outOfOrderIds = new Set();
  for (let i = 0; i < subtitles.length - 1; i++) {
    if (subtitles[i + 1].startTime < subtitles[i].startTime) {
      outOfOrderIds.add(subtitles[i].id);
      outOfOrderIds.add(subtitles[i + 1].id);
    }
  }

  const invalidEndIds = new Set();
  for (let i = 0; i < subtitles.length; i++) {
    const sub = subtitles[i];
    const next = subtitles[i + 1];
    if (sub.endTime <= sub.startTime) invalidEndIds.add(sub.id);
    else if (next && sub.endTime > next.startTime) invalidEndIds.add(sub.id);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Header />

      <main className="page-main">
        <div className="container">

          <PageHeader
            title="Adicionar Legendas"
            subtitle="Passo 2 de 4"
            description="Use a IA para gerar legendas automaticamente, ou adicione manualmente
              consultando o cronômetro do vídeo e preenchendo a tabela abaixo."
          />

          <div className="content">

            {/* ── Seção 1: Vídeo ── */}
            <div className="section">
              <VideoPlayer
                src={downloadVideo(videoId)}
                subtitles={subtitles}
                showFsButton
              />
            </div>

            {/* ── Seção 2: Métodos ── */}
            <div className="section">
              <SplitLayout
                variant="bordered"
                left={
                  <>
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
                  </>
                }
                right={
                  <>
                    <h3 className="subtitle-method-panel__title">
                      <span>🤖</span> IA (Whisper)
                    </h3>
                    <p className="subtitle-method-panel__desc">
                      Gere legendas automaticamente a partir do áudio usando o modelo Whisper.
                      O processo pode levar alguns instantes dependendo da duração do vídeo.
                    </p>
                    <Button
                      variant="primary"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                    >
                      {isGenerating ? '⏳ Gerando…' : '✨ Gerar legendas'}
                    </Button>
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
                  </>
                }
              />
            </div>

            {/* ── Seção 3: Tabela ── */}
            <div className="section">
              <div className="subtitle-table">
                <div className="subtitle-table__header">
                  <div className="subtitle-col subtitle-col--handle" />
                  <div className="subtitle-col subtitle-col--time">Início</div>
                  <div className="subtitle-col subtitle-col--text">
                    Legenda
                    <span className="subtitle-col__hint">clique para editar</span>
                  </div>
                  <div className="subtitle-col subtitle-col--time">Fim</div>
                  <div className="subtitle-col subtitle-col--delete" />
                </div>

                <div className="subtitle-table__body">
                  {subtitles.length === 0 && (
                    <div className="subtitle-table__empty">
                      Nenhuma legenda ainda — clique em <strong>+</strong> abaixo para adicionar.
                    </div>
                  )}

                  {subtitles.map(sub => {
                    const isOoo = outOfOrderIds.has(sub.id);
                    const isDragging = draggedId === sub.id;
                    const isDragOver = dragOverId === sub.id && draggedId !== sub.id;
                    return (
                      <div
                        key={sub.id}
                        className={`subtitle-row${isDragging ? ' subtitle-row--dragging' : ''}${isDragOver ? ' subtitle-row--drag-over' : ''}`}
                        onDragOver={e => handleDragOver(e, sub.id)}
                        onDrop={e => handleDrop(e, sub.id)}
                      >
                        {/* Handle */}
                        <div className="subtitle-cell subtitle-cell--handle">
                          <span
                            className="subtitle-drag-handle"
                            draggable
                            onDragStart={e => handleDragStart(e, sub.id)}
                            onDragEnd={handleDragEnd}
                          >
                            ⠿
                          </span>
                        </div>

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
                              onChange={e => handleTimeInputChange(e.target.value)}
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
                              onChange={e => handleTimeInputChange(e.target.value)}
                              onBlur={() => saveCellEdit(sub.id, 'endTime')}
                              onKeyDown={e => handleCellKeyDown(e, sub.id, 'endTime')}
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            <span className={`subtitle-cell__value subtitle-cell__value--time${invalidEndIds.has(sub.id) ? ' subtitle-cell__value--ooo' : ''}`}>
                              {formatTime(sub.endTime)}
                            </span>
                          )}
                        </div>

                        {/* Excluir */}
                        <div className="subtitle-cell subtitle-cell--delete">
                          <button
                            className="subtitle-delete-btn"
                            title="Excluir legenda"
                            onClick={e => { e.stopPropagation(); deleteSubtitle(sub.id); }}
                          >
                            ×
                          </button>
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
            <div className="subtitle-nav">
              <Button variant="ghost" onClick={() => navigate('/')}>
                ← Importar outro vídeo
              </Button>
              <Button variant="advance" onClick={() => navigate(`/record/${videoId}`)}>
                Iniciar Gravação 🎙
              </Button>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default SubtitleEditor;
