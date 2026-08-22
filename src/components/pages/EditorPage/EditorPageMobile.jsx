import { useEffect, useMemo, useRef, useState } from 'react';
import VideoPlayer from '../../shared/VideoPlayer/VideoPlayer';
import Button from '../../shared/Button/Button';
import Toast from '../../shared/Toast/Toast';
import Timeline from '../../shared/Timeline/Timeline';
import AddTrackMenu from '../../shared/AddTrackMenu/AddTrackMenu';
import VolumeSlider from '../../shared/VolumeSlider/VolumeSlider';
import Modal from '../../shared/Modal/Modal';
import ReportProblemModal from '../../shared/ReportProblemModal/ReportProblemModal';
import { useEditorEngine, formatTime } from './useEditorEngine';
import useCaptionSize from '../../../hooks/useCaptionSize';
import useBreakpoint from '../../../hooks/useBreakpoint';
import { CAPTION_FONT_SIZE_IMMERSIVE, CAPTION_SIZE_MULTIPLIER } from '../../../constants/captionSize';
import { formatChrono } from '../../../utils/chrono';
import './EditorPage.css';
import './EditorPageMobile.css';

const TRACK_ICONS = { background: '🎵', voice: '🎙', imported: '📁' };
const MENU_DRAG_THRESHOLD_PX = 32;

// TV: o botão de fechar (×) é renderizado pelo Modal genérico (fora da
// árvore de EditorPageMobile), então nunca faz parte do mapa de setas por
// padrão — anexado via DOM direto (mesmo padrão já usado em
// CatalogPreview.jsx/SubtitleSettingsModal.jsx). `getFirstFocusable` decide
// pra onde a seta ArrowDown a partir do × deve ir em cada modal.
const useModalCloseNav = (isTV, isOpen, getFirstFocusable, onClose) => {
  useEffect(() => {
    if (!isTV || !isOpen) return;
    const closeBtn = document.querySelector('.modal__close');
    if (!closeBtn) return;
    const onKeyDown = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); getFirstFocusable()?.focus(); }
      else if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); onClose(); }
    };
    closeBtn.addEventListener('keydown', onKeyDown);
    return () => closeBtn.removeEventListener('keydown', onKeyDown);
  }, [isTV, isOpen, getFirstFocusable, onClose]);
};

// TV: foco inicial no primeiro controle do modal assim que ele abre — mesmo
// padrão de auto-foco já usado em CatalogPreview.jsx/SubtitleSettingsModal.jsx.
const useModalAutoFocus = (isTV, isOpen, getFirstFocusable) => {
  const hasFocusedRef = useRef(false);
  useEffect(() => {
    if (!isOpen) { hasFocusedRef.current = false; return; }
    if (!isTV || hasFocusedRef.current) return;
    hasFocusedRef.current = true;
    getFirstFocusable()?.focus();
  }, [isTV, isOpen, getFirstFocusable]);
};

const EditorPageMobile = () => {
  const {
    videoId,
    navigate,
    state,
    dispatch,
    toast,
    setToast,
    showToast,
    blobUrl,
    isVideoLoading,
    isWaitingDemucs,
    subtitles,
    isRecording,
    isPaused,
    fullscreenOnStart,
    setFullscreenOnStart,
    audioMonitor,
    setAudioMonitor,
    isMixing,
    videoRef,
    handleTogglePlay,
    handleSeek,
    handleAddVoiceTrack,
    startRecording,
    pauseRecording,
    resumeRecording,
    finalizeRecording,
    handleImportFile,
    handleDownload,
    interactionsDisabled,
    transportDisabled,
  } = useEditorEngine();

  const [isVolumeModalOpen, setIsVolumeModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isTracksModalOpen, setIsTracksModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  const menuDragRef = useRef(null);
  const rootRef = useRef(null);
  const bottomStackRef = useRef(null);

  const activeSubtitle = useMemo(
    () => subtitles.find(s => state.playheadSec >= s.startTime && state.playheadSec < s.endTime),
    [subtitles, state.playheadSec]
  );

  // Legenda/cronômetro do mesmo tamanho escolhido na tela de legendagem (ver
  // SubtitleEditor.jsx) — preferência global via useCaptionSize. Essa tela é
  // sempre full-bleed (ver EditorPage.jsx), então usa sempre a tabela
  // "imersiva" (maior), igual à tela de legendagem em tela cheia/tier X.
  const [captionSize] = useCaptionSize();
  const screenTier = useBreakpoint();
  const overlayFontSize = Math.round(
    CAPTION_FONT_SIZE_IMMERSIVE[captionSize] * CAPTION_SIZE_MULTIPLIER[screenTier]
  );
  const isTV = screenTier === 'X';

  // Mantém a legenda sempre acima da pilha de controles (menu + transport),
  // que muda de altura quando o menu puxável abre/fecha.
  useEffect(() => {
    const root = rootRef.current;
    const stack = bottomStackRef.current;
    if (!root || !stack) return;
    const observer = new ResizeObserver(([entry]) => {
      root.style.setProperty('--bottom-stack-h', `${entry.contentRect.height}px`);
    });
    observer.observe(stack);
    return () => observer.disconnect();
  }, []);

  // TV: foco inicial no puxador do menu assim que o vídeo estiver pronto.
  const hasAutoFocusedRef = useRef(false);
  useEffect(() => {
    if (!isTV || isVideoLoading || hasAutoFocusedRef.current) return;
    hasAutoFocusedRef.current = true;
    document.querySelector('.editor-mobile__menu-handle')?.focus();
  }, [isTV, isVideoLoading]);

  const openTracksModal = () => {
    setIsSettingsModalOpen(false);
    setIsTracksModalOpen(true);
  };

  const handleDownloadFromSettings = () => {
    setIsSettingsModalOpen(false);
    handleDownload();
  };

  const openReportModal = () => {
    setIsSettingsModalOpen(false);
    setIsReportModalOpen(true);
  };

  // TV: fechar um modal devolve o foco pro botão que abriu ele (mesmo padrão
  // já usado em SubtitleSettingsModal.jsx) — sem isso, o foco simplesmente
  // some, deixando o controle remoto sem noção de onde está.
  const iconBtnRefocus = (index) => () => {
    if (isTV) Array.from(document.querySelectorAll('.editor-mobile__icon-btn'))[index]?.focus();
  };
  const closeVolumeModal = () => { setIsVolumeModalOpen(false); iconBtnRefocus(0)(); };
  const closeSettingsModal = () => { setIsSettingsModalOpen(false); iconBtnRefocus(1)(); };
  const closeTracksModal = () => { setIsTracksModalOpen(false); iconBtnRefocus(1)(); };
  const closeReportModal = () => { setIsReportModalOpen(false); iconBtnRefocus(1)(); };

  const volumeSliderKeyDown = (e) => {
    if (!isTV) return;
    const inputs = Array.from(document.querySelectorAll('.volume-slider__input'));
    const idx = inputs.indexOf(e.currentTarget);
    if (e.key === 'ArrowDown') {
      if (idx < inputs.length - 1) { e.preventDefault(); inputs[idx + 1].focus(); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (idx > 0) inputs[idx - 1].focus();
      else document.querySelector('.modal__close')?.focus();
    } else if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      e.stopPropagation();
      closeVolumeModal();
    }
  };

  const settingsRowKeyDown = (e) => {
    if (!isTV) return;
    const rows = Array.from(document.querySelectorAll('.editor-mobile__settings-nav-item'));
    const idx = rows.indexOf(e.currentTarget);
    if (e.key === 'ArrowDown') {
      if (idx < rows.length - 1) { e.preventDefault(); rows[idx + 1].focus(); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (idx > 0) rows[idx - 1].focus();
      else document.querySelector('.modal__close')?.focus();
    } else if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      e.stopPropagation();
      closeSettingsModal();
    }
  };

  useModalAutoFocus(isTV, isVolumeModalOpen, () => document.querySelector('.volume-slider__input'));
  useModalCloseNav(isTV, isVolumeModalOpen, () => document.querySelector('.volume-slider__input'), closeVolumeModal);

  useModalAutoFocus(isTV, isSettingsModalOpen, () => document.querySelector('.editor-mobile__settings-nav-item'));
  useModalCloseNav(isTV, isSettingsModalOpen, () => document.querySelector('.editor-mobile__settings-nav-item'), closeSettingsModal);

  useModalAutoFocus(isTV, isTracksModalOpen, () => document.querySelector('.add-track-menu .btn'));
  useModalCloseNav(isTV, isTracksModalOpen, () => document.querySelector('.add-track-menu .btn'), closeTracksModal);

  // Puxar (arrastar) o handle abre/fecha o menu, igual apps de streaming;
  // um tap simples no handle também alterna. Continua disponível durante
  // a gravação — mesmo se o menu fechar, o handle continua ali para
  // reabri-lo e acessar o botão de finalizar.
  const handleMenuHandlePointerDown = (e) => {
    menuDragRef.current = { startY: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleMenuHandlePointerMove = (e) => {
    if (!menuDragRef.current) return;
    if (Math.abs(e.clientY - menuDragRef.current.startY) > 4) {
      menuDragRef.current.moved = true;
    }
  };

  const handleMenuHandlePointerUp = (e) => {
    const drag = menuDragRef.current;
    menuDragRef.current = null;
    if (!drag) return;
    const deltaY = e.clientY - drag.startY;
    if (Math.abs(deltaY) >= MENU_DRAG_THRESHOLD_PX) {
      setIsMenuOpen(deltaY < 0);
    } else if (!drag.moved) {
      setIsMenuOpen(open => !open);
    }
  };

  // ── Navegação por controle remoto (TV, tier X) ───────────────────────────
  // Mesmo padrão do resto do app: document.querySelector por classe dentro
  // de onKeyDown, guardado por `if (!isTV) return`, sem estado de índice em
  // React. Volume/Configurações/Gravar não são siblings diretos no DOM (o
  // botão de Gravar fica fora de .editor-mobile__menu-secondary), então
  // percorrer os 3 usa querySelectorAll+indexOf (mesma técnica de Footer.jsx).
  const handleBackBtnKeyDown = (e) => {
    if (!isTV) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); document.querySelector('.editor-mobile__menu-handle')?.focus(); }
  };

  const handleMenuHandleKeyDown = (e) => {
    if (!isTV) return;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      document.querySelector('.editor-mobile__back-btn')?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      (document.querySelector('.editor-mobile__icon-btn') || document.querySelector('.editor-mobile__transport-play'))?.focus();
    }
  };

  const handleIconBtnKeyDown = (e) => {
    if (!isTV) return;
    const btns = Array.from(document.querySelectorAll('.editor-mobile__icon-btn'));
    const idx = btns.indexOf(e.currentTarget);
    if (e.key === 'ArrowRight') {
      if (idx < btns.length - 1) { e.preventDefault(); btns[idx + 1].focus(); }
    } else if (e.key === 'ArrowLeft') {
      if (idx > 0) { e.preventDefault(); btns[idx - 1].focus(); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      document.querySelector('.editor-mobile__menu-handle')?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      document.querySelector('.editor-mobile__transport-play')?.focus();
    }
  };

  const handleTransportPlayKeyDown = (e) => {
    if (!isTV) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); document.querySelector('.editor-mobile__scrub')?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); document.querySelector('.editor-mobile__menu-handle')?.focus(); }
  };

  const handleScrubKeyDown = (e) => {
    if (!isTV) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleSeek(Math.min(state.playheadSec + 5, state.videoDurationSec));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handleSeek(Math.max(state.playheadSec - 5, 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      document.querySelector('.editor-mobile__menu-handle')?.focus();
    }
  };

  return (
    <div className="editor-mobile" ref={rootRef}>
      <div className="editor-mobile__video-wrapper">
        <VideoPlayer
          ref={videoRef}
          src={blobUrl}
          muted
          subtitles={subtitles}
          showNativeCaptions={false}
          showChrono={false}
          disableControls
          isVideoLoading={isVideoLoading}
          badge={isRecording ? (
            <div className={`rec-badge${isPaused ? ' rec-badge--paused' : ''}`}>
              <span className="rec-badge__dot" />
              {isPaused ? 'PAUSADO' : 'REC'}
            </div>
          ) : (
            <button
              type="button"
              className="editor-mobile__back-btn"
              onClick={() => navigate(`/subtitle/${videoId}`)}
              onKeyDown={handleBackBtnKeyDown}
              aria-label="Voltar"
              title="Voltar"
            >
              ‹
            </button>
          )}
        />
        {!isVideoLoading && (
          <div className="editor-mobile__chrono" style={{ fontSize: overlayFontSize }}>
            {formatChrono(state.playheadSec)}
          </div>
        )}
        {activeSubtitle && (
          <div className="editor-mobile__subtitle" style={{ fontSize: overlayFontSize }}>{activeSubtitle.text}</div>
        )}
        {!isVideoLoading && isWaitingDemucs && (
          <div className="editor-overlay">
            <div className="editor-overlay__card">
              <span className="editor-overlay__icon editor-overlay__icon--spin">⚙️</span>
              <p className="editor-overlay__text">
                Finalizando processamento do vídeo…<br />
                Aguarde, quase pronto!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Pilha inferior: menu puxável (topo) + handle + transport do vídeo
          (base, sempre visível) — empilhados via flex, nunca se sobrepõem. */}
      <div className="editor-mobile__bottom-stack" ref={bottomStackRef}>

      {/* Menu (volume / gravar / configurações) — puxável para cima/baixo */}
      <div className="editor-mobile__menu">
        <button
          type="button"
          className="editor-mobile__menu-handle"
          onPointerDown={handleMenuHandlePointerDown}
          onPointerMove={handleMenuHandlePointerMove}
          onPointerUp={handleMenuHandlePointerUp}
          onKeyDown={handleMenuHandleKeyDown}
          aria-label={isMenuOpen ? 'Recolher menu' : 'Abrir menu'}
        >
          <span className="editor-mobile__menu-grip" />
        </button>

        <div className={`editor-mobile__menu-panel${isMenuOpen ? ' editor-mobile__menu-panel--open' : ''}${isRecording ? ' editor-mobile__menu-panel--recording' : ''}`}>
          <div className="editor-mobile__menu-secondary">
            <button
              type="button"
              className="editor-mobile__icon-btn"
              onClick={() => setIsVolumeModalOpen(true)}
              onKeyDown={handleIconBtnKeyDown}
              disabled={interactionsDisabled}
              aria-label="Volume das faixas"
              title="Volume das faixas"
            >
              🔊
            </button>

            <button
              type="button"
              className="editor-mobile__icon-btn"
              onClick={() => setIsSettingsModalOpen(true)}
              onKeyDown={handleIconBtnKeyDown}
              disabled={interactionsDisabled}
              aria-label="Configurações"
              title="Configurações"
            >
              ⚙️
            </button>
          </div>

          <button
            type="button"
            className={`editor-mobile__icon-btn editor-mobile__icon-btn--record${isRecording ? ' editor-mobile__icon-btn--recording' : ''}`}
            onClick={isRecording ? finalizeRecording : () => startRecording(0)}
            onKeyDown={handleIconBtnKeyDown}
            disabled={transportDisabled}
            aria-label={isRecording ? 'Finalizar gravação' : 'Gravar'}
            title={isRecording ? 'Finalizar gravação' : 'Gravar do início'}
          >
            {isRecording ? '⏹' : '🎙'}
          </button>
        </div>
      </div>

      {/* Controles próprios do vídeo: só play/pausar e avançar/retroceder */}
      <div className="editor-mobile__transport">
        <button
          type="button"
          className="editor-mobile__transport-play"
          onClick={isRecording ? (isPaused ? resumeRecording : pauseRecording) : handleTogglePlay}
          onKeyDown={handleTransportPlayKeyDown}
          disabled={transportDisabled}
          aria-label={(isRecording ? isPaused : !state.isPlaying) ? 'Reproduzir' : 'Pausar'}
        >
          {(isRecording ? isPaused : !state.isPlaying) ? '▶' : '⏸'}
        </button>
        <input
          type="range"
          className="editor-mobile__scrub"
          min={0}
          max={Math.max(state.videoDurationSec, 0.01)}
          step={0.01}
          value={Math.min(state.playheadSec, state.videoDurationSec)}
          onChange={e => handleSeek(Number(e.target.value))}
          onKeyDown={handleScrubKeyDown}
          disabled={interactionsDisabled}
          aria-label="Posição no vídeo"
        />
        <span className="editor-mobile__transport-time">
          {formatTime(state.playheadSec)} / {formatTime(state.videoDurationSec)}
        </span>
      </div>

      </div>

      <Modal open={isVolumeModalOpen} onClose={closeVolumeModal} title="Volume das faixas">
        <div className="editor-mobile__volume-list">
          {state.tracks.map(track => (
            <div key={track.id} className="editor-mobile__volume-item">
              <VolumeSlider
                label={`${TRACK_ICONS[track.kind] ?? '🎧'} ${track.label}`}
                value={track.volume}
                onChange={volume => dispatch({ type: 'SET_VOLUME', id: track.id, volume })}
                onKeyDown={volumeSliderKeyDown}
                disabled={interactionsDisabled}
              />
            </div>
          ))}
        </div>
      </Modal>

      <Modal open={isSettingsModalOpen} onClose={closeSettingsModal} title="Configurações">
        <div className="editor-mobile__settings">
          <label className="recording-option">
            <input
              type="checkbox"
              className="editor-mobile__settings-nav-item"
              checked={audioMonitor}
              onChange={e => setAudioMonitor(e.target.checked)}
              onKeyDown={settingsRowKeyDown}
            />
            Retorno do áudio
            <span className="recording-option__hint"> (Usar fone de ouvido)</span>
          </label>

          <div className="editor-mobile__settings-actions">
            <Button variant="outline" className="editor-mobile__settings-nav-item" onKeyDown={settingsRowKeyDown} onClick={openTracksModal}>
              ✎ Editar faixas
            </Button>
            <Button variant="outline" className="editor-mobile__settings-nav-item" onKeyDown={settingsRowKeyDown} onClick={openReportModal}>
              🚩 Reportar problema
            </Button>
            <Button
              variant="advance"
              className="editor-mobile__settings-nav-item"
              onKeyDown={settingsRowKeyDown}
              onClick={handleDownloadFromSettings}
              disabled={interactionsDisabled || isMixing}
            >
              {isMixing ? 'Gerando…' : '⬇ Baixar vídeo'}
            </Button>
          </div>
        </div>
      </Modal>

      <ReportProblemModal open={isReportModalOpen} onClose={closeReportModal} />

      <Modal open={isTracksModalOpen} onClose={closeTracksModal} title="Editar faixas" draggable>
        <div className="editor-mobile__tracks">
          <AddTrackMenu
            tvNav={isTV}
            onAddVoiceTrack={handleAddVoiceTrack}
            onImportFile={handleImportFile}
            showError={(msg) => showToast('error', msg)}
            disabled={interactionsDisabled}
          />

          <Timeline
            tvNav={isTV}
            tracks={state.tracks}
            durationSec={state.videoDurationSec}
            playheadSec={state.playheadSec}
            pxPerSec={state.zoomPxPerSec}
            selectedTrackId={state.selectedTrackId}
            disabled={interactionsDisabled}
            isPlaying={state.isPlaying}
            onTogglePlay={handleTogglePlay}
            onSeek={handleSeek}
            onZoomIn={() => dispatch({ type: 'SET_ZOOM', zoom: state.zoomPxPerSec * 1.4 })}
            onZoomOut={() => dispatch({ type: 'SET_ZOOM', zoom: state.zoomPxPerSec / 1.4 })}
            onSelectTrack={id => dispatch({ type: 'SELECT_TRACK', id })}
            onMoveClip={(id, offsetSec) => dispatch({ type: 'MOVE_CLIP', id, offsetSec })}
            onTrimClipStart={(id, deltaSec) => dispatch({ type: 'TRIM_CLIP_START', id, deltaSec })}
            onTrimClipEnd={(id, deltaSec) => dispatch({ type: 'TRIM_CLIP_END', id, deltaSec })}
            onVolumeChange={(id, volume) => dispatch({ type: 'SET_VOLUME', id, volume })}
            onToggleMute={id => dispatch({ type: 'TOGGLE_MUTE', id })}
            onToggleSolo={id => dispatch({ type: 'TOGGLE_SOLO', id })}
            onRemoveTrack={id => dispatch({ type: 'REMOVE_TRACK', id })}
            onRenameTrack={(id, label) => dispatch({ type: 'RENAME_TRACK', id, label })}
          />
        </div>
      </Modal>

      {toast && (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default EditorPageMobile;
