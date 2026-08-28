import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { translateSubtitles, transcribeWithWhisper } from '../../../services/api';
import { downloadVideoCached } from '../../../services/videoCache';
import Header from '../../shared/Header/Header';
import Footer from '../../shared/Footer/Footer';
import VideoPlayer from '../../shared/VideoPlayer/VideoPlayer';
import Button from '../../shared/Button/Button';
import FullscreenBackButton from '../../shared/FullscreenBackButton/FullscreenBackButton';
import ContinueButton from '../../shared/ContinueButton/ContinueButton';
import Toast from '../../shared/Toast/Toast';
import SubtitleCaptionInput from './CaptionInput/SubtitleCaptionInput';
import SubtitleTimeline from './Timeline/SubtitleTimeline';
import SubtitleSettingsModal from './SettingsModal/SubtitleSettingsModal';
import useFullscreenElement from '../../../hooks/useFullscreenElement';
import useBreakpoint from '../../../hooks/useBreakpoint';
import useCaptionSize from '../../../hooks/useCaptionSize';
import { CAPTION_FONT_SIZE, CAPTION_FONT_SIZE_IMMERSIVE, CAPTION_SIZE_MULTIPLIER } from '../../../constants/captionSize';
import { formatChrono } from '../../../utils/chrono';
import './SubtitleEditor.css';
import { showToastError, handleToastLoading }  from '../../../utils/utils';

const storageKey = (id) => `dublee-subtitles-${id}`;

// Menor duração possível de um bloco comitado — evita blocos de duração zero
// quando o fechamento acontece exatamente no instante em que ele foi aberto.
const MIN_BLOCK_DURATION = 0.05;

// Fecha um bloco pendente (texto sendo digitado) num array de legendas comitadas,
// virando um bloco fixo com início/fim. Ignora pendentes vazios (nada a fechar).
const closeBlock = (subs, pending, endSec) => {
  if (!pending || pending.text.trim() === '') return subs;
  const block = {
    id: Date.now(),
    startTime: pending.startSec,
    endTime: Math.max(endSec, pending.startSec + MIN_BLOCK_DURATION),
    text: pending.text,
  };
  return [...subs, block].sort((a, b) => a.startTime - b.startTime);
};

// Se já existir um bloco comitado logo à frente do pendente com o MESMO texto,
// mescla os dois (o bloco existente "puxa" o início pra trás) — só chamado ao
// sair do input (blur), nunca durante a digitação, pra não mesclar por engano.
const mergeIfMatches = (subs, pending) => {
  if (!pending) return { subs, merged: false };
  const next = subs.filter(s => s.startTime >= pending.startSec).sort((a, b) => a.startTime - b.startTime)[0];
  if (next && next.text === pending.text) {
    return {
      subs: subs.map(s => (s.id === next.id ? { ...s, startTime: pending.startSec } : s)),
      merged: true,
    };
  }
  return { subs, merged: false };
};

// Início da próxima legenda comitada a partir de um instante (ou o fim do
// vídeo, se não houver nenhuma à frente) — usado pra limitar até onde a
// prévia da legenda pendente é exibida (timeline e vídeo).
const nextBoundary = (subs, fromSec, fallbackSec) =>
  subs.filter(s => s.startTime >= fromSec).reduce((min, s) => Math.min(min, s.startTime), fallbackSec);

// Segundos avançados/retrocedidos por seta na barra de progresso em tela X —
// mesmo racional/valor do fix equivalente em CatalogPreview.jsx: JS explícito
// em vez de depender do avanço nativo do <input type="range">, que pode não
// disparar de forma confiável dependendo de como o remoto entrega os eventos.
const SEEK_STEP_SEC = 5;

// Tempo m:ss pra barra de controles própria (mesmo formato de CatalogPreview.jsx).
const formatTime = (s) => {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

const SubtitleEditor = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const stageRef = useRef(null);
  const rafRef = useRef(null);

  const [blobUrl, setBlobUrl] = useState(null);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [subtitles, setSubtitles] = useState([]);
  const [pendingBlock, setPendingBlock] = useState(null);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [playheadSec, setPlayheadSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState(null);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [targetLang, setTargetLang] = useState('pt');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Preferência de tamanho de legenda/cronômetro é global (não por vídeo) e
  // compartilhada com a tela de gravação (ver useCaptionSize).
  const [captionSize, setCaptionSize] = useCaptionSize();
  const showToast = (type, message) => setToast({ type, message, id: Date.now() });

  // Refs "espelho" pra ler o estado mais recente de dentro dos listeners
  // nativos do <video> e dos handlers do input, sem precisar re-registrar
  // os listeners a cada render (mesmo padrão de stateRef em useEditorEngine.js).
  const subtitlesRef = useRef(subtitles);
  subtitlesRef.current = subtitles;
  const pendingBlockRef = useRef(pendingBlock);
  pendingBlockRef.current = pendingBlock;
  const playheadRef = useRef(playheadSec);
  playheadRef.current = playheadSec;
  const durationRef = useRef(durationSec);
  durationRef.current = durationSec;

  // Só true depois que a leitura inicial de `subtitles` do localStorage (com
  // sucesso ou falha no download) já aconteceu para o `videoId` atual — evita
  // que o efeito de escrita logo abaixo sobrescreva legendas salvas com o
  // estado inicial `[]` antes dessa leitura terminar (era exatamente isso que
  // fazia as legendas sumirem ao voltar de `/record/:videoId`: o efeito de
  // escrita disparava com `subtitles=[]` antes do fetch conseguir ler o que
  // já estava salvo). Precisa ficar declarado ANTES do efeito de escrita,
  // já que a ordem de declaração é a ordem de execução dos effects no mesmo
  // commit — isso também protege o caso de `videoId` mudar sem desmontar o
  // componente.
  const hasLoadedSubtitlesRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let createdBlobUrl = null;
    hasLoadedSubtitlesRef.current = false;

    async function fetchVideo() {
      handleToastLoading(showToast, setIsVideoLoading, 'Baixando vídeo…');

      const [blob, success] = await downloadVideoCached(videoId);
      if (cancelled) return;

      if (!success) {
        showToastError(showToast, setIsVideoLoading, 'Erro ao baixar vídeo. Tente novamente ou comunique o suporte.');
        hasLoadedSubtitlesRef.current = true;
        return;
      }

      createdBlobUrl = URL.createObjectURL(blob);
      setBlobUrl(createdBlobUrl);

      const saved = localStorage.getItem(storageKey(videoId));
      setSubtitles(saved ? JSON.parse(saved) : []);
      hasLoadedSubtitlesRef.current = true;
      setIsVideoLoading(false);
      setToast(null);
    }

    fetchVideo();
    return () => {
      cancelled = true;
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
    };
  }, [videoId]);

  useEffect(() => {
    if (!hasLoadedSubtitlesRef.current) return;
    localStorage.setItem(storageKey(videoId), JSON.stringify(subtitles));
  }, [subtitles, videoId]);

  // ── Playhead / duração / play-pause via <video> nativo ──────────────────
  const stopPlayheadLoop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const startPlayheadLoop = () => {
    const tick = () => {
      const video = videoRef.current;
      if (video) setPlayheadSec(video.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  // Fecha o bloco pendente preenchendo TODO o espaço amarelo exibido (até o
  // início da próxima legenda comitada, ou o fim do vídeo) — não até onde o
  // playhead está no momento do fechamento, senão clicar na timeline pra sair
  // do input cortaria a legenda bem antes do previsto, e sair do input sem o
  // vídeo ter andado criaria uma legenda de duração praticamente zero.
  // Disparado ao sair do input (blur), apertar Enter, ou clicar no vídeo.
  const commitPendingCaption = () => {
    const pending = pendingBlockRef.current;
    if (!pending || pending.text.trim() === '') return;

    const origSubs = subtitlesRef.current;
    const merged = mergeIfMatches(origSubs, pending);
    const endSec = nextBoundary(origSubs, pending.startSec, Math.max(durationRef.current, 1));
    const subs = merged.merged ? merged.subs : closeBlock(origSubs, pending, endSec);

    subtitlesRef.current = subs;
    setSubtitles(subs);
    pendingBlockRef.current = null;
    setPendingBlock(null);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoadedMetadata = () => setDurationSec(video.duration || 0);
    const onPlay = () => { setIsPlaying(true); startPlayheadLoop(); };
    const onPause = () => { setIsPlaying(false); stopPlayheadLoop(); setPlayheadSec(video.currentTime); };
    const onSeeked = () => setPlayheadSec(video.currentTime);
    const onEnded = () => {
      setIsPlaying(false);
      stopPlayheadLoop();
      setPlayheadSec(video.currentTime);
      const subs = closeBlock(subtitlesRef.current, pendingBlockRef.current, video.currentTime);
      subtitlesRef.current = subs;
      setSubtitles(subs);
      pendingBlockRef.current = null;
      setPendingBlock(null);
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('ended', onEnded);
    if (video.duration) onLoadedMetadata();

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('ended', onEnded);
      stopPlayheadLoop();
    };
    // isVideoLoading também é dependência: o <video> só existe no DOM depois
    // que ele vira false (VideoPlayer troca o placeholder pelo elemento real),
    // e isso pode acontecer sem blobUrl mudar (ex.: falha no download).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blobUrl, isVideoLoading]);

  // ── Legendas: digitar cria/fecha/divide blocos; mesclar só ao sair do input ──
  const handleCaptionChange = (newValue) => {
    const video = videoRef.current;
    if (video && !video.paused) video.pause();

    const t = playheadRef.current;
    const pending = pendingBlockRef.current;
    let subs = subtitlesRef.current;
    let nextPending = null;

    if (pending) {
      if (newValue === '') {
        // Apagar fecha o bloco pendente imediatamente (não espera sair do input).
        subs = closeBlock(subs, pending, t);
      } else {
        // Continua digitando: só refina o texto do mesmo bloco pendente.
        // O fechamento/divisão em dois blocos acontece ao sair do input (blur)
        // ou ao editar de novo em outro instante — nunca a cada tecla aqui.
        nextPending = { ...pending, text: newValue };
      }
    } else {
      const covering = subs.find(s => s.startTime <= t && t < s.endTime);
      if (covering) {
        subs = t <= covering.startTime
          ? subs.filter(s => s.id !== covering.id)
          : subs.map(s => (s.id === covering.id ? { ...s, endTime: t } : s));
      }
      if (newValue !== '') {
        nextPending = { startSec: t, text: newValue };
      }
    }

    subtitlesRef.current = subs;
    setSubtitles(subs);
    pendingBlockRef.current = nextPending;
    setPendingBlock(nextPending);
  };

  // Ao sair do campo de texto (ou apertar Enter): aplica a legenda pendente.
  const handleCaptionBlur = () => commitPendingCaption();

  // isTV é lido dentro dos handlers via closure — só é usado depois que o
  // componente termina de renderizar (nunca durante a própria renderização),
  // então não importa que `isTV` seja declarado mais abaixo no arquivo.
  const handleCaptionKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitPendingCaption();
      return;
    }
    if (!isTV) return;
    // Navegação por controle remoto (TV, tier X): a legenda é sempre em
    // tela cheia nessa tela (ver isTV/showOverlayCaptionUI mais abaixo), e o
    // pedido explícito foi: seta pro lado sai do input pro botão Continuar;
    // seta pra cima vai pras configurações; seta pra baixo entra na barra
    // de controles do vídeo (play/pausa).
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      document.querySelector('.subtitle-editor__continue-btn')?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      document.querySelector('.subtitle-editor__settings-btn')?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      document.querySelector('.subtitle-editor__ctrl-btn')?.focus();
    }
  };

  const handleContinueBtnKeyDown = (e) => {
    if (!isTV) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      document.querySelector('.subtitle-editor__fullscreen-caption .subtitle-caption__input')?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      document.querySelector('.subtitle-editor__settings-btn')?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      document.querySelector('.subtitle-editor__ctrl-btn')?.focus();
    }
  };

  const handleSettingsBtnKeyDown = (e) => {
    if (!isTV) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      document.querySelector('.fullscreen-back-btn')?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      document.querySelector('.subtitle-editor__fullscreen-caption .subtitle-caption__input')?.focus();
    }
  };

  const handleBackBtnKeyDown = (e) => {
    if (!isTV) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      document.querySelector('.subtitle-editor__settings-btn')?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      document.querySelector('.subtitle-editor__fullscreen-caption .subtitle-caption__input')?.focus();
    }
  };

  const backToCaption = () =>
    document.querySelector('.subtitle-editor__fullscreen-caption .subtitle-caption__input')?.focus();

  const handlePlayBtnKeyDown = (e) => {
    if (!isTV) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); document.querySelector('.subtitle-editor__progress')?.focus(); }
    else if (e.key === 'ArrowUp' || e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); backToCaption(); }
  };

  const handleProgressKeyDown = (e) => {
    if (!isTV) return;
    const video = videoRef.current;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (video) handleSeek(Math.min(playheadRef.current + SEEK_STEP_SEC, durationRef.current || playheadRef.current));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (video) handleSeek(Math.max(playheadRef.current - SEEK_STEP_SEC, 0));
    } else if (e.key === 'ArrowUp' || e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      backToCaption();
    }
  };

  const handleSeek = (sec) => {
    const video = videoRef.current;
    const clamped = Math.max(0, Math.min(sec, durationRef.current || sec));
    if (video) video.currentTime = clamped;
    playheadRef.current = clamped;
    setPlayheadSec(clamped);
  };

  // ── Controles próprios do vídeo (substituem os nativos — mesmo padrão de
  // CatalogPreview.jsx, necessário pra que a barra de controles, a legenda
  // em tela cheia e o botão Continuar continuem visíveis em fullscreen: o
  // alvo do requestFullscreen agora é o .subtitle-editor__stage, que envolve
  // vídeo + controles + badge, em vez do <video> nativo sozinho). ──────────
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.paused ? video.play().catch(() => {}) : video.pause();
  };

  // Clicar no vídeo também comita o bloco de legenda pendente, antes de
  // alternar play/pause (senão o texto digitado se perderia sem passar
  // pelo blur/Enter que normalmente dispara o commit).
  const handleVideoToggleClick = () => {
    commitPendingCaption();
    togglePlay();
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      stageRef.current?.requestFullscreen?.().catch(() => {});
    }
  };

  const handleSelectBlock = (id) => setSelectedBlockId(id);

  const handleDeleteBlock = (id) => {
    const next = subtitlesRef.current.filter(s => s.id !== id);
    subtitlesRef.current = next;
    setSubtitles(next);
    setSelectedBlockId(sel => (sel === id ? null : sel));
  };

  // ── Arrastar/redimensionar blocos na timeline: nunca sobrepõe outro bloco;
  // ao crescer contra um vizinho COLADO (sem lacuna), o vizinho encolhe pra
  // abrir espaço em vez de simplesmente travar o crescimento na borda dele. ──
  const handleMoveBlock = (id, rawNewStart) => {
    const subs = subtitlesRef.current;
    const block = subs.find(s => s.id === id);
    if (!block) return;

    const duration = block.endTime - block.startTime;
    const prev = subs.filter(s => s.id !== id && s.endTime <= block.startTime)
      .sort((a, b) => b.endTime - a.endTime)[0];
    const next = subs.filter(s => s.id !== id && s.startTime >= block.endTime)
      .sort((a, b) => a.startTime - b.startTime)[0];

    const minStart = prev ? prev.endTime : 0;
    // Sem próximo vizinho, o limite é a duração do vídeo — mas só aplicamos
    // esse teto quando ela já é conhecida (> 0); enquanto não carregou, não
    // limitamos por duração (senão o bloco fica travado sem poder avançar).
    const maxStart = next
      ? next.startTime - duration
      : (durationRef.current > 0 ? durationRef.current - duration : Infinity);
    const newStart = Math.max(minStart, Math.min(rawNewStart, maxStart));

    const updated = subs.map(s => (s.id === id ? { ...s, startTime: newStart, endTime: newStart + duration } : s));
    subtitlesRef.current = updated;
    setSubtitles(updated);
  };

  const handleTrimBlockStart = (id, rawNewStart) => {
    const subs = subtitlesRef.current;
    const block = subs.find(s => s.id === id);
    if (!block) return;

    let newStart = Math.max(0, Math.min(rawNewStart, block.endTime - MIN_BLOCK_DURATION));

    const prev = subs.filter(s => s.id !== id && s.endTime <= block.startTime)
      .sort((a, b) => b.endTime - a.endTime)[0];

    let updated = subs;
    if (prev && newStart < prev.endTime) {
      const touching = block.startTime - prev.endTime < 1e-6;
      if (touching) {
        const prevFloor = prev.startTime + MIN_BLOCK_DURATION;
        newStart = Math.max(newStart, prevFloor);
        updated = subs.map(s => (s.id === prev.id ? { ...s, endTime: newStart } : s));
      } else {
        newStart = Math.max(newStart, prev.endTime);
      }
    }

    updated = updated.map(s => (s.id === id ? { ...s, startTime: newStart } : s));
    subtitlesRef.current = updated;
    setSubtitles(updated);
  };

  const handleTrimBlockEnd = (id, rawNewEnd) => {
    const subs = subtitlesRef.current;
    const block = subs.find(s => s.id === id);
    if (!block) return;

    // Mesma ideia do maxStart em handleMoveBlock: só limita pela duração do
    // vídeo quando ela já é conhecida (> 0).
    const durationCap = durationRef.current > 0 ? durationRef.current : Infinity;
    let newEnd = Math.max(block.startTime + MIN_BLOCK_DURATION, Math.min(rawNewEnd, durationCap));

    const next = subs.filter(s => s.id !== id && s.startTime >= block.endTime)
      .sort((a, b) => a.startTime - b.startTime)[0];

    let updated = subs;
    if (next && newEnd > next.startTime) {
      const touching = next.startTime - block.endTime < 1e-6;
      if (touching) {
        const nextFloor = next.endTime - MIN_BLOCK_DURATION;
        newEnd = Math.min(newEnd, nextFloor);
        updated = subs.map(s => (s.id === next.id ? { ...s, startTime: newEnd } : s));
      } else {
        newEnd = Math.min(newEnd, next.startTime);
      }
    }

    updated = updated.map(s => (s.id === id ? { ...s, endTime: newEnd } : s));
    subtitlesRef.current = updated;
    setSubtitles(updated);
  };

  // Delete/Backspace remove o bloco selecionado, exceto quando o foco está
  // num campo de texto (não queremos roubar o Backspace de quem está digitando).
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!selectedBlockId) return;
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      handleDeleteBlock(selectedBlockId);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBlockId]);

  // ── Geração por IA (Whisper) ──────────────────────────────────────────
  const applySubtitles = (subs) => {
    subtitlesRef.current = subs;
    setSubtitles(subs);
    pendingBlockRef.current = null;
    setPendingBlock(null);
    setSelectedBlockId(null);
  };

  const handleGenerate = async () => {
    handleToastLoading(showToast, setIsGenerating, 'Transcrevendo com IA… pode levar alguns instantes');

    const [result, success] = await transcribeWithWhisper(videoId)
    if (!success) return showToastError(showToast, setIsGenerating, 'Falha ao transcrever vídeo');

    if (autoTranslate) await handleTranslateGenerate(result.subtitles);
    else applySubtitles(result.subtitles);

    showToast('success', 'Legendas geradas com sucesso!');
    setIsGenerating(false);
  };

  const handleTranslateGenerate = async (subs) => {
    if (subs.length > 0) {
      handleToastLoading(showToast, setIsGenerating, 'Traduzindo legendas…');
      const [translated, success] = await translateSubtitles(videoId, subs, targetLang);

      if (!success) return showToastError(showToast, setIsGenerating, 'Falha ao traduzir legendas');

      applySubtitles(translated.subtitles);
    }
  };

  const onAutoTranslateChange = (e) => {
    setAutoTranslate(e.target.checked);
  };

  const onTargetLangChange = (e) => {
    setTargetLang(e.target.value);
  };

  // ── Texto exibido no input: pendente > legenda comitada no playhead > vazio ──
  const displayedBlock = !pendingBlock
    ? subtitles.find(s => s.startTime <= playheadSec && playheadSec < s.endTime)
    : null;
  const captionValue = pendingBlock ? pendingBlock.text : (displayedBlock?.text ?? '');

  // Mesmo ainda pendente (amarelo), a legenda sendo digitada já aparece no
  // vídeo — um cue "fantasma" só pra exibição, limitado ao início da próxima
  // legenda comitada (nunca é salvo em `subtitles`).
  const videoSubtitles = pendingBlock && pendingBlock.text.trim() !== ''
    ? [...subtitles, {
        id: 'pending-preview',
        startTime: pendingBlock.startSec,
        endTime: Math.max(pendingBlock.startSec + 0.1, nextBoundary(subtitles, pendingBlock.startSec, Math.max(durationSec, 1))),
        text: pendingBlock.text,
      }]
    : subtitles;

  const overlayCaptionText = videoSubtitles.find(s => s.startTime <= playheadSec && playheadSec < s.endTime)?.text;
  const fullscreenEl = useFullscreenElement();
  const isFullscreen = !!fullscreenEl;
  const screenTier = useBreakpoint();

  // Tela X (TV): mexer nos blocos da timeline via controle é ruim, então
  // essa tela vira SÓ o modo de edição em tela cheia (input+cronômetro+
  // Continuar sobre o vídeo) — nunca mostra a timeline nem o input normal
  // abaixo do vídeo, independente do estado real da Fullscreen API.
  const isTV = screenTier === 'X';
  const showOverlayCaptionUI = isFullscreen || isTV;

  // Caixa da legenda em tela cheia arrastável (mesmo padrão de Modal.jsx):
  // arrastar não pode roubar o clique de posicionar o cursor/selecionar texto
  // dentro do input, então só inicia se o pointerdown não for no próprio
  // input (ver handleCaptionBoxPointerDown). Reseta ao sair do modo overlay
  // pra não começar deslocado da próxima vez que entrar em tela cheia.
  const [captionDragOffset, setCaptionDragOffset] = useState({ x: 0, y: 0 });
  const captionDragStateRef = useRef(null);

  // Soltar a legenda em cima da zona de lixeira (topo do stage, ver
  // .subtitle-editor__caption-trash) apaga o bloco em vez de só reposicionar.
  // isDraggingCaption/isOverTrash só existem pra feedback visual (contorno do
  // bloco + zona de lixeira reagindo); a decisão real de apagar no pointerup
  // usa isOverTrashRef, atualizado em sincronia a cada pointermove — ler o
  // state isOverTrash ali arriscaria pegar um valor de closure desatualizado.
  const [isDraggingCaption, setIsDraggingCaption] = useState(false);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const isOverTrashRef = useRef(false);
  const trashZoneRef = useRef(null);

  useEffect(() => {
    if (!showOverlayCaptionUI) setCaptionDragOffset({ x: 0, y: 0 });
  }, [showOverlayCaptionUI]);

  const handleCaptionBoxPointerDown = (e) => {
    if (e.target.closest('.subtitle-caption__input')) return;
    captionDragStateRef.current = { startX: e.clientX, startY: e.clientY, baseX: captionDragOffset.x, baseY: captionDragOffset.y };
    setIsDraggingCaption(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleCaptionBoxPointerMove = (e) => {
    const drag = captionDragStateRef.current;
    if (!drag) return;
    setCaptionDragOffset({
      x: drag.baseX + (e.clientX - drag.startX),
      y: drag.baseY + (e.clientY - drag.startY),
    });

    const trashRect = trashZoneRef.current?.getBoundingClientRect();
    const over = !!trashRect
      && e.clientX >= trashRect.left && e.clientX <= trashRect.right
      && e.clientY >= trashRect.top && e.clientY <= trashRect.bottom;
    isOverTrashRef.current = over;
    setIsOverTrash(over);
  };

  const handleCaptionBoxPointerUp = (e) => {
    const droppedOnTrash = isOverTrashRef.current;
    captionDragStateRef.current = null;
    isOverTrashRef.current = false;
    setIsDraggingCaption(false);
    setIsOverTrash(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* já liberado */ }

    // Só apaga bloco já comitado — enquanto ainda está pendente (digitando)
    // não há bloco salvo pra apagar por aqui (ver displayedBlock acima).
    if (droppedOnTrash && displayedBlock) {
      handleDeleteBlock(displayedBlock.id);
      setCaptionDragOffset({ x: 0, y: 0 });
    }
  };

  // Legenda e cronômetro usam sempre o MESMO tamanho (pedido explícito do
  // usuário) — a tabela "imersiva" (maior) vale tanto pra tela cheia real
  // quanto pro modo forçado de tier X, daí checar showOverlayCaptionUI (não
  // isFullscreen sozinho, que fica sempre false em tier X já que não
  // chamamos a Fullscreen API de verdade lá).
  const overlayFontSize = Math.round(
    (showOverlayCaptionUI ? CAPTION_FONT_SIZE_IMMERSIVE : CAPTION_FONT_SIZE)[captionSize] * CAPTION_SIZE_MULTIPLIER[screenTier]
  );

  // Foco automático no input de legenda (pedido explícito do usuário: dar
  // pra digitar a legenda sem precisar do mouse) — dispara assim que o vídeo
  // termina de carregar e sempre que entra/sai do modo overlay (tela cheia
  // real ou tier X), já que aí o input visível troca de elemento (o normal,
  // dentro de "Legendagem ao vivo", ou o de dentro de .subtitle-editor__stage).
  // Quando showOverlayCaptionUI é true o input de tela cheia vem ANTES do
  // normal na árvore (Seção 1 antes da Seção 2), então um seletor sem escopo
  // já pega o certo mesmo nos dois existindo ao mesmo tempo (fullscreen real
  // fora do tier X não desmonta a Seção 2, só fica visualmente coberta).
  useEffect(() => {
    if (isVideoLoading) return;
    const input = document.querySelector('.subtitle-caption__input');
    input?.focus();
    input?.select();
  }, [isVideoLoading, showOverlayCaptionUI]);

  // Tela X (TV): não basta esconder a timeline/input normal dentro do layout
  // de página normal (Header + container + Footer) — isso ainda deixa a
  // página sujeita a scroll (altura total > viewport, dependendo do aspect
  // ratio do vídeo), e num controle remoto/D-pad não tem como rolar a
  // página, então informação pode ficar simplesmente inalcançável. "Tela
  // cheia" aqui precisa ser literal: raiz própria, position:fixed cobrindo
  // 100% do viewport, sem Header/Footer — MESMO padrão já usado (e já
  // validado) em EditorPageMobile.jsx/.css (.editor-mobile).
  const stageEl = (
    <div className="subtitle-editor__stage" ref={stageRef}>
      <VideoPlayer
        ref={videoRef}
        src={blobUrl}
        subtitles={videoSubtitles}
        showNativeCaptions={false}
        showChrono={false}
        disableControls
        onToggleClick={handleVideoToggleClick}
        isVideoLoading={isVideoLoading}
        badge={!isVideoLoading && (
          <>
            {isTV && (
              <FullscreenBackButton onClick={() => navigate('/')} onKeyDown={handleBackBtnKeyDown} />
            )}

            <button
              type="button"
              className="subtitle-editor__settings-btn"
              title="Configurações"
              onClick={() => setIsSettingsOpen(true)}
              onKeyDown={handleSettingsBtnKeyDown}
            >
              ⚙️
            </button>
            <div className="subtitle-editor__chrono" style={{ fontSize: overlayFontSize }}>
              {formatChrono(playheadSec)}
            </div>
            {showOverlayCaptionUI ? (
              <>
                {/* Tela cheia (real ou forçada em tier X) esconde tudo que
                    fica fora do stage (inclusive o input e a timeline abaixo
                    do vídeo — em tier X isso já não existe mais no DOM, ver
                    showOverlayCaptionUI/isTV mais acima) — então o input de
                    legenda precisa de uma cópia própria aqui dentro. */}
                <div
                  ref={trashZoneRef}
                  className={`subtitle-editor__caption-trash${isDraggingCaption ? ' subtitle-editor__caption-trash--active' : ''}${
                    isOverTrash ? ' subtitle-editor__caption-trash--armed' : ''
                  }`}
                  aria-hidden="true"
                >
                </div>
                <div
                  className={`subtitle-editor__fullscreen-caption${isDraggingCaption ? ' subtitle-editor__fullscreen-caption--dragging' : ''}${
                    isOverTrash ? ' subtitle-editor__fullscreen-caption--armed' : ''
                  }`}
                  style={{ transform: `translate(calc(-50% + ${captionDragOffset.x}px), ${captionDragOffset.y}px)` }}
                  onPointerDown={handleCaptionBoxPointerDown}
                  onPointerMove={handleCaptionBoxPointerMove}
                  onPointerUp={handleCaptionBoxPointerUp}
                >
                  <SubtitleCaptionInput
                    value={captionValue}
                    onChange={handleCaptionChange}
                    onBlur={handleCaptionBlur}
                    onKeyDown={handleCaptionKeyDown}
                    autoGrow
                  />
                </div>
                <ContinueButton
                  className="subtitle-editor__continue-btn"
                  onClick={() => navigate(`/record/${videoId}`)}
                  onKeyDown={handleContinueBtnKeyDown}
                />
              </>
            ) : overlayCaptionText && (
              <div className="subtitle-editor__overlay-caption" style={{ fontSize: overlayFontSize }}>
                {overlayCaptionText}
              </div>
            )}
          </>
        )}
      />

      {/* Controles próprios (substituem os nativos do <video>) */}
      {!isVideoLoading && (
        <div className="subtitle-editor__controls">
          <button
            type="button"
            className="subtitle-editor__ctrl-btn"
            onClick={togglePlay}
            onKeyDown={handlePlayBtnKeyDown}
            aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <span className="subtitle-editor__time">
            {formatTime(playheadSec)} / {formatTime(durationSec)}
          </span>

          <input
            type="range"
            className="subtitle-editor__progress"
            min={0}
            max={durationSec || 0}
            step="any"
            value={Math.min(playheadSec, durationSec || 0)}
            onChange={e => handleSeek(Number(e.target.value))}
            onKeyDown={handleProgressKeyDown}
            aria-label="Progresso do vídeo"
          />

          {/* Tela cheia é sempre forçada em tier X (ver isTV), então o
              botão de alternar tela cheia não faz sentido lá. */}
          {!isTV && (
            <button
              type="button"
              className="subtitle-editor__ctrl-btn"
              onClick={toggleFullscreen}
              aria-label="Tela cheia"
            >
              ⛶
            </button>
          )}
        </div>
      )}
    </div>
  );

  // Modal e toast precisam ser portalizados pra dentro do elemento em tela
  // cheia REAL quando ela está ativa — fullscreen é um "top layer" do
  // browser, então qualquer coisa fora do elemento em fullscreen (inclusive
  // um modal montado no fim da árvore, como esse) fica completamente
  // invisível, não importa o z-index. Mesmo padrão já usado em
  // CatalogPage.jsx pro Toast. Em tier X não existe fullscreen real (ver
  // comentário grande acima de stageEl), então cai no fallback document.body,
  // o que já funciona normalmente (a raiz .subtitle-editor-tv é filha direta
  // do body, não tem nada "por cima" escondendo o modal).
  const modalAndToastPortal = createPortal(
    <>
      <SubtitleSettingsModal
        open={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          if (isTV) document.querySelector('.subtitle-editor__settings-btn')?.focus();
        }}
        tvNav={isTV}
        captionSize={captionSize}
        onCaptionSizeChange={setCaptionSize}
        handleGenerate={handleGenerate}
        isGenerating={isGenerating}
        autoTranslate={autoTranslate}
        handleAutoTranslate={onAutoTranslateChange}
        targetLang={targetLang}
        handleTargetLang={onTargetLangChange}
      />

      {toast && (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </>,
    fullscreenEl || document.body
  );

  if (isTV) {
    return (
      <div className="subtitle-editor-tv">
        {stageEl}
        {modalAndToastPortal}
      </div>
    );
  }

  return (
    <>
      <Header />

      <main className="page-main subtitle-editor-main">
        <div className="container">
          <div className="content">
            {/* ── Seção 1: Vídeo ── */}
            <div className="section">
              {stageEl}
            </div>

            {/* ── Seção 2: Legendagem ao vivo ── */}
            <div className="section">
              <SubtitleCaptionInput
                value={captionValue}
                onChange={handleCaptionChange}
                onBlur={handleCaptionBlur}
                onKeyDown={handleCaptionKeyDown}
                disabled={isVideoLoading}
              />
              <SubtitleTimeline
                subtitles={subtitles}
                pendingBlock={pendingBlock}
                durationSec={durationSec}
                playheadSec={playheadSec}
                selectedBlockId={selectedBlockId}
                disabled={isVideoLoading}
                onSeek={handleSeek}
                onSelectBlock={handleSelectBlock}
                onDeleteBlock={handleDeleteBlock}
                onMoveBlock={handleMoveBlock}
                onTrimBlockStart={handleTrimBlockStart}
                onTrimBlockEnd={handleTrimBlockEnd}
              />
            </div>

            {/* ── Seção 3: Navegação ── */}
            <div className="page-nav page-nav--end">
              <Button variant="ghost" onClick={() => navigate('/')}>
                Voltar
              </Button>
              <Button variant="advance" onClick={() => navigate(`/record/${videoId}`)}>
                Continuar
              </Button>
            </div>

          </div>
        </div>
      </main>

      <Footer />

      {modalAndToastPortal}
    </>
  );
};

export default SubtitleEditor;
