import { useRef, useState, useEffect, useCallback } from 'react';
import VideoPlayer from '../../../shared/VideoPlayer/VideoPlayer';
import './CatalogPreview.css';

// Segundos avançados/retrocedidos por pressionar de seta na barra de
// progresso — mesmo valor do `step` nativo do <input type="range"> (mantido
// como fallback visual), mas implementado explicitamente em JS porque
// depender do avanço nativo do range em ArrowLeft/Right é o único ponto
// desse arquivo que não segue o padrão do resto (todo o resto do sistema de
// D-pad é 100% JS explícito, nunca depende de comportamento nativo do
// browser pra teclas de seta) — e é exatamente o tipo de coisa que pode não
// disparar dependendo de como o remoto/TV entrega os eventos de teclado.
const SEEK_STEP_SEC = 5;

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

  // TV: o botão de fechar (×) é renderizado pelo Modal genérico (fora da
  // árvore deste componente), então ele nunca fazia parte do mapa de setas —
  // só dava pra fechar via Escape/Backspace, nunca navegando até o botão de
  // verdade. Anexado via DOM direto (em vez de prop-drilling pro Modal
  // genérico, que também é usado por ReportProblemModal/SubtitleSettingsModal
  // sem noção de tvNav) pra não acoplar um componente compartilhado a este
  // caso específico.
  useEffect(() => {
    if (!tvNav) return;
    const closeBtn = document.querySelector('.modal__close');
    if (!closeBtn) return;
    const onKeyDown = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); continueRef.current?.focus(); }
      else if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); onClose?.(); }
    };
    closeBtn.addEventListener('keydown', onKeyDown);
    return () => closeBtn.removeEventListener('keydown', onKeyDown);
  }, [tvNav, onClose]);

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
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      pauseRef.current?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      document.querySelector('.modal__close')?.focus();
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
    const video = videoRef.current;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (video) video.currentTime = Math.min(video.currentTime + SEEK_STEP_SEC, duration || video.currentTime);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (video) video.currentTime = Math.max(video.currentTime - SEEK_STEP_SEC, 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      backToContinue();
    } else if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      e.stopPropagation();
      backToContinue();
    }
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
                step={SEEK_STEP_SEC}
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
