import { useRef, useState, useEffect, useCallback } from 'react';
import VideoPlayer from '../../../shared/VideoPlayer/VideoPlayer';
import './CatalogPreview.css';

const formatTime = (s) => {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

const CatalogPreview = ({ previewUrl, isLoadingPreview, isImporting, onImport, tvNav, onClose }) => {
  const videoRef = useRef(null);
  const stageRef = useRef(null);
  const continueRef = useRef(null);
  const pauseRef = useRef(null);
  const muteRef = useRef(null);
  const fsRef = useRef(null);
  const progressRef = useRef(null);
  const hasAutoFocused = useRef(false);

  const [isPaused, setIsPaused] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setIsPaused(false);
    const onPause = () => setIsPaused(true);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDuration = () => setDuration(video.duration || 0);
    const onVolumeChange = () => setIsMuted(video.muted);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDuration);
    video.addEventListener('volumechange', onVolumeChange);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDuration);
      video.removeEventListener('volumechange', onVolumeChange);
    };
  }, [previewUrl]);

  // TV: foco inicial no botão "Continuar" assim que o vídeo está pronto
  useEffect(() => {
    if (!tvNav || !previewUrl || hasAutoFocused.current) return;
    hasAutoFocused.current = true;
    continueRef.current?.focus();
  }, [tvNav, previewUrl]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.paused ? video.play().catch(() => {}) : video.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) video.muted = !video.muted;
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      stageRef.current?.requestFullscreen?.().catch(() => {});
    }
  }, []);

  const handleSeekChange = useCallback((e) => {
    const video = videoRef.current;
    if (video) video.currentTime = Number(e.target.value);
  }, []);

  const backToContinue = () => continueRef.current?.focus();

  const handleContinueKeyDown = (e) => {
    if (!tvNav) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      pauseRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      progressRef.current?.focus();
    } else if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      e.stopPropagation();
      onClose?.();
    }
  };

  const handlePauseKeyDown = (e) => {
    if (!tvNav) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); muteRef.current?.focus(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); backToContinue(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); progressRef.current?.focus(); }
    else if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); backToContinue(); }
  };

  const handleMuteKeyDown = (e) => {
    if (!tvNav) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); fsRef.current?.focus(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); pauseRef.current?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); backToContinue(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); progressRef.current?.focus(); }
    else if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); backToContinue(); }
  };

  const handleFsKeyDown = (e) => {
    if (!tvNav) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); backToContinue(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); muteRef.current?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); backToContinue(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); progressRef.current?.focus(); }
    else if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); backToContinue(); }
  };

  const handleProgressKeyDown = (e) => {
    if (!tvNav) return;
    if (e.key === 'ArrowUp') { e.preventDefault(); backToContinue(); }
    else if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); backToContinue(); }
    // ArrowLeft/ArrowRight: deixa o <input type="range"> nativo avançar/retroceder (step).
  };

  return (
    <div className="catalog-preview">
      <div className="catalog-preview__player">
        {isLoadingPreview ? (
          <div className="catalog-preview__loading">Carregando preview...</div>
        ) : previewUrl ? (
          <div className="catalog-preview__stage" ref={stageRef}>
            <VideoPlayer
              ref={videoRef}
              src={previewUrl}
              autoPlay
              disableControls
              showChrono={false}
            />

            <button
              ref={continueRef}
              type="button"
              className="catalog-preview__continue"
              onClick={onImport}
              onKeyDown={handleContinueKeyDown}
              disabled={isImporting}
            >
              {isImporting ? 'Selecionando...' : 'Continuar'}
            </button>

            <div className="catalog-preview__controls">
              <button
                ref={pauseRef}
                type="button"
                className="catalog-preview__ctrl-btn"
                onClick={togglePlay}
                onKeyDown={handlePauseKeyDown}
                aria-label={isPaused ? 'Reproduzir' : 'Pausar'}
              >
                {isPaused ? '▶' : '⏸'}
              </button>

              <span className="catalog-preview__time">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <input
                ref={progressRef}
                type="range"
                className="catalog-preview__progress"
                min={0}
                max={duration || 0}
                step={5}
                value={Math.min(currentTime, duration || 0)}
                onChange={handleSeekChange}
                onKeyDown={handleProgressKeyDown}
                aria-label="Progresso do vídeo"
              />

              <button
                ref={muteRef}
                type="button"
                className="catalog-preview__ctrl-btn"
                onClick={toggleMute}
                onKeyDown={handleMuteKeyDown}
                aria-label={isMuted ? 'Ativar som' : 'Mudo'}
              >
                {isMuted ? '🔇' : '🔈'}
              </button>

              <button
                ref={fsRef}
                type="button"
                className="catalog-preview__ctrl-btn"
                onClick={toggleFullscreen}
                onKeyDown={handleFsKeyDown}
                aria-label="Tela cheia"
              >
                ⛶
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CatalogPreview;
