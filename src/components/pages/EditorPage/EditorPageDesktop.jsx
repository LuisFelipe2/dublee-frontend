import Header from '../../shared/Header/Header';
import Footer from '../../shared/Footer/Footer';
import PageHeader from '../../shared/PageHeader/PageHeader';
import VideoPlayer from '../../shared/VideoPlayer/VideoPlayer';
import Button from '../../shared/Button/Button';
import Toast from '../../shared/Toast/Toast';
import Timeline from '../../shared/Timeline/Timeline';
import AddTrackMenu from '../../shared/AddTrackMenu/AddTrackMenu';
import useFullscreenElement from '../../../hooks/useFullscreenElement';
import { useEditorEngine, formatTime } from './useEditorEngine';
import './EditorPage.css';

const EditorPageDesktop = () => {
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
    isSettingsOpen,
    setIsSettingsOpen,
    settingsMenuRef,
    isMixing,
    videoRef,
    handleTogglePlay,
    handleSeek,
    handleAddVoiceTrack,
    selectedVoiceTrack,
    isReRecord,
    startRecording,
    pauseRecording,
    resumeRecording,
    discardRecording,
    finalizeRecording,
    handleImportFile,
    handleDownload,
    interactionsDisabled,
    transportDisabled,
  } = useEditorEngine();

  const isFullscreen = !!useFullscreenElement();

  return (
    <>
      <Header />

      <main className="page-main">
        <div className="container container--wide">

          <div className="content">
            <div className="section">

              <div className="player-wrapper editor-player-wrapper">
                <VideoPlayer
                  ref={videoRef}
                  src={blobUrl}
                  muted
                  subtitles={subtitles}
                  disableControls
                  isVideoLoading={isVideoLoading}
                  badge={isRecording ? (
                    <div className={`rec-badge${isPaused ? ' rec-badge--paused' : ''}`}>
                      <span className="rec-badge__dot" />
                      {isPaused ? 'PAUSADO' : 'REC'}
                    </div>
                  ) : isFullscreen && (
                    // Fora de tela cheia o "Voltar" já existe embaixo (button-group
                    // editor-actions); em tela cheia essa área some (fica fora do
                    // .video-player, que é o elemento que realmente entra em
                    // fullscreen), então precisa de uma cópia própria aqui dentro.
                    <button
                      type="button"
                      className="editor-desktop__back-btn"
                      onClick={() => navigate(`/subtitle/${videoId}`)}
                      aria-label="Voltar"
                      title="Voltar"
                    >
                      ‹
                    </button>
                  )}
                />
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

              <div className="editor-transport">
                <Button
                  variant="danger"
                  onClick={isRecording ? finalizeRecording : startRecording}
                  disabled={transportDisabled}
                  title={isRecording
                    ? 'Finaliza a gravação e salva a faixa'
                    : isReRecord
                      ? `Grava e substitui o áudio de "${selectedVoiceTrack.label}"`
                      : selectedVoiceTrack
                        ? `Grava na faixa "${selectedVoiceTrack.label}"`
                        : 'Cria uma nova faixa de voz e grava nela'}
                >
                  {isRecording ? '⏹ Finalizar' : isReRecord ? '🎙 Regravar' : '🎙 Gravar'}
                </Button>

                <Button
                  variant={(isRecording ? isPaused : !state.isPlaying) ? 'primary' : 'ghost'}
                  onClick={isRecording ? (isPaused ? resumeRecording : pauseRecording) : handleTogglePlay}
                  disabled={transportDisabled}
                >
                  {isRecording
                    ? (isPaused ? '▶ Continuar' : '⏸ Pausar')
                    : (state.isPlaying ? '⏸ Pausar' : '▶ Reproduzir')}
                </Button>

                <Button
                  variant="outline"
                  onClick={isRecording ? discardRecording : () => handleSeek(0)}
                  disabled={transportDisabled}
                  title={isRecording ? 'Descarta a gravação em andamento' : 'Recomeça a reprodução do início'}
                >
                  {isRecording ? '✕ Descartar' : '↺ Recomeçar'}
                </Button>

                <span className="editor-transport__time">
                  {formatTime(state.playheadSec)} / {formatTime(state.videoDurationSec)}
                </span>

                <div className="editor-transport__spacer" />

                <div className="editor-settings-menu" ref={settingsMenuRef}>
                  <button
                    className={`recording-settings-btn${isSettingsOpen ? ' recording-settings-btn--open' : ''}`}
                    onClick={() => setIsSettingsOpen(o => !o)}
                    aria-label="Preferências de gravação"
                    title="Preferências"
                    disabled={isRecording}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                  </button>

                  {isSettingsOpen && (
                    <div className="recording-settings-panel">
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
                    </div>
                  )}
                </div>

                <AddTrackMenu
                  onAddVoiceTrack={handleAddVoiceTrack}
                  onImportFile={handleImportFile}
                  showError={(msg) => showToast('error', msg)}
                  disabled={interactionsDisabled}
                />
              </div>

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

              <div className="button-group editor-actions">
                <Button
                  variant="ghost"
                  onClick={() => navigate(`/subtitle/${videoId}`)}
                  disabled={isRecording || isMixing}
                >
                  Voltar
                </Button>
                <Button
                  variant="advance"
                  onClick={handleDownload}
                  disabled={interactionsDisabled || isMixing}
                  style={{ marginLeft: 'auto' }}
                >
                  {isMixing ? 'Gerando…' : '⬇ Baixar vídeo'}
                </Button>
              </div>

            </div>
          </div>

        </div>
      </main>

      <Footer />

      {toast && (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

export default EditorPageDesktop;
