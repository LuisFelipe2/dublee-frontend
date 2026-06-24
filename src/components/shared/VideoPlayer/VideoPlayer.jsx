import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import './VideoPlayer.css';

const formatChrono = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 1000);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}:${String(ms).padStart(3, '0')}`;
};

const VideoPlayer = forwardRef(({ src, muted = false, subtitles = [], showFsButton = false, showChrono = true, disableControls = false, badge = null }, ref) => {
  const videoRef = useRef(null);
  const wrapperRef = useRef(null);
  const chronoRef = useRef(null);
  const subtitlesRef = useRef(subtitles);
  const fsPendingRef = useRef(false);
  const rafRef = useRef(null);
  const [currentText, setCurrentText] = useState('');
  const [isFs, setIsFs] = useState(false);

  useImperativeHandle(ref, () => videoRef.current);

  useEffect(() => { subtitlesRef.current = subtitles; }, [subtitles]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    video.src = src;
  }, [src]);

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

  // Subtitle overlay
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => {
      const t = video.currentTime;
      const found = subtitlesRef.current.find(s => t >= s.startTime && t <= s.endTime);
      setCurrentText(found?.text ?? '');
    };
    video.addEventListener('timeupdate', onTimeUpdate);
    return () => video.removeEventListener('timeupdate', onTimeUpdate);
  }, []);

  // Fullscreen redirect: video → wrapper so overlays stay visible
  useEffect(() => {
    const video = videoRef.current;
    const wrapper = wrapperRef.current;
    if (!video || !wrapper) return;

    const onFsChange = () => {
      if (document.fullscreenElement === video) {
        fsPendingRef.current = true;
        document.exitFullscreen().catch(() => { fsPendingRef.current = false; });
      } else if (!document.fullscreenElement && fsPendingRef.current) {
        fsPendingRef.current = false;
        wrapper.requestFullscreen?.().catch(() => {});
      } else {
        setIsFs(document.fullscreenElement === wrapper);
      }
    };
    const onWebkitFsChange = () => {
      if (document.webkitFullscreenElement === video) {
        document.webkitExitFullscreen?.();
        wrapper.webkitRequestFullscreen?.();
      } else {
        setIsFs(!!document.webkitFullscreenElement);
      }
    };

    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onWebkitFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onWebkitFsChange);
    };
  }, []);

  // Click → play/pause | Double-click → toggle fullscreen
  useEffect(() => {
    const video = videoRef.current;
    if (!video || disableControls) return;

    let timer = null;

    const onClick = (e) => {
      e.preventDefault();
      clearTimeout(timer);
      timer = setTimeout(() => {
        video.paused ? video.play().catch(() => {}) : video.pause();
      }, 220);
    };

    const onDblClick = () => {
      clearTimeout(timer);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        wrapperRef.current?.requestFullscreen?.().catch(() => {});
      }
    };

    video.addEventListener('click', onClick);
    video.addEventListener('dblclick', onDblClick);
    return () => {
      video.removeEventListener('click', onClick);
      video.removeEventListener('dblclick', onDblClick);
      clearTimeout(timer);
    };
  }, [disableControls]);

  const toggleFs = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      wrapperRef.current?.requestFullscreen?.().catch(() => {});
    }
  };

  return (
    <div ref={wrapperRef} className="video-player">
      <video
        ref={videoRef}
        controls={!disableControls}
        muted={muted}
        controlsList={showFsButton && !disableControls ? 'nofullscreen' : undefined}
      />
      {disableControls && <div className="video-player__blocker" />}
      {badge}
      {showChrono && <div ref={chronoRef} className="video-player__chrono">00:00:000</div>}
      {currentText && (
        <div className="video-player__subtitle">{currentText}</div>
      )}
      {showFsButton && (
        <button
          className="video-player__fs-btn"
          title={isFs ? 'Sair da tela cheia' : 'Tela cheia'}
          onClick={toggleFs}
        >
          {isFs ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
          )}
        </button>
      )}
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
