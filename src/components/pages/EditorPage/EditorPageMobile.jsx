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
import './EditorPage.css';
import './EditorPageMobile.css';

const TRACK_ICONS = { background: '🎵', voice: '🎙', imported: '📁' };
const MENU_DRAG_THRESHOLD_PX = 32;

const EditorPageMobile = () => {
  const {
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
  } = useEditorEngine({ isMobile: true });

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

  return (
    <div className="editor-mobile" ref={rootRef}>
      <div className="editor-mobile__video-wrapper">
        <VideoPlayer
          ref={videoRef}
          src={blobUrl}
          muted
          subtitles={subtitles}
          showNativeCaptions={false}
          disableControls
          isVideoLoading={isVideoLoading}
          badge={isRecording && (
            <div className={`rec-badge${isPaused ? ' rec-badge--paused' : ''}`}>
              <span className="rec-badge__dot" />
              {isPaused ? 'PAUSADO' : 'REC'}
            </div>
          )}
        />
        {activeSubtitle && (
          <div className="editor-mobile__subtitle">{activeSubtitle.text}</div>
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
          disabled={interactionsDisabled}
          aria-label="Posição no vídeo"
        />
        <span className="editor-mobile__transport-time">
          {formatTime(state.playheadSec)} / {formatTime(state.videoDurationSec)}
        </span>
      </div>

      </div>

      <Modal open={isVolumeModalOpen} onClose={() => setIsVolumeModalOpen(false)} title="Volume das faixas">
        <div className="editor-mobile__volume-list">
          {state.tracks.map(track => (
            <div key={track.id} className="editor-mobile__volume-item">
              <VolumeSlider
                label={`${TRACK_ICONS[track.kind] ?? '🎧'} ${track.label}`}
                value={track.volume}
                onChange={volume => dispatch({ type: 'SET_VOLUME', id: track.id, volume })}
                disabled={interactionsDisabled}
              />
            </div>
          ))}
        </div>
      </Modal>

      <Modal open={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="Configurações">
        <div className="editor-mobile__settings">
          <label className="recording-option">
            <input
              type="checkbox"
              checked={fullscreenOnStart}
              onChange={e => setFullscreenOnStart(e.target.checked)}
            />
            Gravar em tela cheia
          </label>
          <label className="recording-option">
            <input
              type="checkbox"
              checked={audioMonitor}
              onChange={e => setAudioMonitor(e.target.checked)}
            />
            Retorno do áudio
            <span className="recording-option__hint"> (Usar fone de ouvido)</span>
          </label>

          <div className="editor-mobile__settings-actions">
            <Button variant="outline" onClick={openTracksModal}>
              ✎ Editar faixas
            </Button>
            <Button variant="outline" onClick={openReportModal}>
              🚩 Reportar problema
            </Button>
            <Button
              variant="advance"
              onClick={handleDownloadFromSettings}
              disabled={interactionsDisabled || isMixing}
            >
              {isMixing ? 'Gerando…' : '⬇ Baixar vídeo'}
            </Button>
          </div>
        </div>
      </Modal>

      <ReportProblemModal open={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} />

      <Modal open={isTracksModalOpen} onClose={() => setIsTracksModalOpen(false)} title="Editar faixas">
        <div className="editor-mobile__tracks">
          <AddTrackMenu
            onAddVoiceTrack={handleAddVoiceTrack}
            onImportFile={handleImportFile}
            showError={(msg) => showToast('error', msg)}
            disabled={interactionsDisabled}
          />

          <Timeline
            tracks={state.tracks}
            durationSec={state.videoDurationSec}
            playheadSec={state.playheadSec}
            pxPerSec={state.zoomPxPerSec}
            selectedTrackId={state.selectedTrackId}
            disabled={interactionsDisabled}
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
