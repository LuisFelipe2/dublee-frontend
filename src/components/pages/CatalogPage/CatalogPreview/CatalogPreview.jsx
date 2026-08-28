import { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import VideoPlayer from '../../../shared/VideoPlayer/VideoPlayer';
import ContinueButton from '../../../shared/ContinueButton/ContinueButton';
import SlowLoadingNotice from '../../../shared/SlowLoadingNotice/SlowLoadingNotice';
import useBreakpoint from '../../../../hooks/useBreakpoint';
import useSlowLoadingNotice from '../../../../hooks/useSlowLoadingNotice';
import './CatalogPreview.css';

// Tamanho mínimo de exibição do preview por tier (ver src/styles/breakpoints.css).
// Vídeos de baixa resolução (ex.: 144p) do catálogo respeitam a resolução
// original (ver CatalogPreview.css), mas ficam minúsculos em telas maiores —
// P fica de fora porque lá o vídeo já preenche a largura disponível.
const MIN_PREVIEW_SIZE = {
  M: { width: 480, height: 270 },
  G: { width: 640, height: 360 },
  X: { width: 960, height: 540 },
};

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
  const [isVideoReady, setIsVideoReady] = useState(false);

  const screenTier = useBreakpoint();

  // Aviso de "serviço lento" se o preview (busca da URL + buffer do vídeo
  // até 'canplay') passar de 10s — ver useSlowLoadingNotice.
  const isPreviewLoading = isLoadingPreview || Boolean(previewUrl && !isVideoReady);
  const { show: showSlowNotice, dismiss: dismissSlowNotice } = useSlowLoadingNotice(isPreviewLoading);

  // Volta pro estado "carregando" a cada troca de vídeo — sem isso o stage
  // (vídeo + controles) apareceria com o tamanho/frame do preview anterior
  // por um instante antes do 'canplay' do novo vídeo.
  useEffect(() => {
    setIsVideoReady(false);
  }, [previewUrl]);

  // Escala o vídeo pra cima (mantendo a proporção original) quando a
  // resolução nativa fica abaixo do mínimo do tier atual; acima do mínimo,
  // continua respeitando a resolução original (width/height voltam a 'auto',
  // ver CatalogPreview.css). min-width/min-height em CSS não servem aqui
  // porque cada um seria aplicado de forma independente, distorcendo a
  // proporção — por isso o cálculo é feito em JS a partir de videoWidth/
  // videoHeight.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const applyMinSize = () => {
      const { videoWidth: nw, videoHeight: nh } = video;
      const min = MIN_PREVIEW_SIZE[screenTier];
      if (!nw || !nh || !min) {
        video.style.width = '';
        video.style.height = '';
        return;
      }
      const widthScale = min.width / nw;
      const heightScale = min.height / nh;
      const scale = Math.max(1, widthScale, heightScale);
      if (scale === 1) {
        video.style.width = '';
        video.style.height = '';
      } else if (widthScale >= heightScale) {
        video.style.width = `${Math.round(nw * scale)}px`;
        video.style.height = 'auto';
      } else {
        video.style.height = `${Math.round(nh * scale)}px`;
        video.style.width = 'auto';
      }
    };

    // Em tela cheia o CSS força width/height:100% (ver
    // .catalog-preview__stage:fullscreen .video-player video), mas isso não
    // vence o style inline aplicado acima — por isso o mínimo é suspenso
    // (style limpo) enquanto em tela cheia e reaplicado ao sair.
    const onFullscreenChange = () => {
      if (document.fullscreenElement === stageRef.current) {
        video.style.width = '';
        video.style.height = '';
      } else {
        applyMinSize();
      }
    };

    applyMinSize();
    video.addEventListener('loadedmetadata', applyMinSize);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      video.removeEventListener('loadedmetadata', applyMinSize);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [previewUrl, screenTier]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setIsPaused(false);
    const onPause = () => setIsPaused(true);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDuration = () => setDuration(video.duration || 0);
    const onVolumeChange = () => setIsMuted(video.muted);
    // 'canplay': primeiro frame decodificado e buffer suficiente pra tocar
    // sem travar — nesse ponto o tamanho já foi resolvido (loadedmetadata,
    // que dispara antes, ver efeito acima) e a tela preta acabou, então dá
    // pra revelar o stage já pronto/tocando em vez de em etapas.
    const onCanPlay = () => setIsVideoReady(true);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDuration);
    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('canplay', onCanPlay);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDuration);
      video.removeEventListener('volumechange', onVolumeChange);
      video.removeEventListener('canplay', onCanPlay);
    };
  }, [previewUrl]);

  // TV: foco inicial no botão "Continuar" assim que o vídeo está pronto
  // (isVideoReady, não só previewUrl — antes disso o stage está oculto).
  useEffect(() => {
    if (!tvNav || !previewUrl || !isVideoReady || hasAutoFocused.current) return;
    hasAutoFocused.current = true;
    continueRef.current?.focus();
  }, [tvNav, previewUrl, isVideoReady]);

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
        {(isLoadingPreview || (previewUrl && !isVideoReady)) && (
          <div className="catalog-preview__loading">Carregando preview...</div>
        )}
        {previewUrl && (
          // Fica montado (fora da tela, sem interação) desde a troca de
          // previewUrl pra já começar a carregar em segundo plano — só
          // revela quando isVideoReady vira true (evento 'canplay'), pra
          // não mostrar o stage em etapas (tela preta → redimensiona →
          // toca). Ver efeitos de 'canplay'/'loadedmetadata' acima.
          <div
            className={`catalog-preview__stage${isVideoReady ? '' : ' catalog-preview__stage--hidden'}`}
            ref={stageRef}
          >
            <VideoPlayer
              ref={videoRef}
              src={previewUrl}
              autoPlay
              disableControls
              showChrono={false}
            />

            <ContinueButton
              ref={continueRef}
              onClick={onImport}
              onKeyDown={handleContinueKeyDown}
              disabled={isImporting}
              loading={isImporting}
            />

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
        )}
      </div>

      {/* Portado pra fora da árvore do Modal pai (CatalogPage.jsx) — a
          animação de entrada do Modal (Modal.css, modalSlideUp) deixa um
          `transform: translateY(0)` residual via animation-fill-mode:
          forwards, que cria containing block pra descendentes
          position:fixed. Sem o portal, este toast ficaria preso dentro do
          box do modal em vez de ancorado no canto do viewport. */}
      {createPortal(
        <SlowLoadingNotice open={showSlowNotice} onClose={dismissSlowNotice} />,
        document.body
      )}
    </div>
  );
};

export default CatalogPreview;
