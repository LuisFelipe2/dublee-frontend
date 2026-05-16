import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import './VideoPlayer.css';

const formatChrono = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 1000);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}:${String(ms).padStart(3, '0')}`;
};

const VideoPlayer = forwardRef(({ src, youtubeId, muted = false, subtitles = [], showFsButton = false }, ref) => {
  const videoRef = useRef(null);
  const wrapperRef = useRef(null);
  const chronoRef = useRef(null);
  const subtitlesRef = useRef(subtitles);
  const fsPendingRef = useRef(false);
  const rafRef = useRef(null);
  const [currentText, setCurrentText] = useState('');

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

  if (youtubeId) {
    return (
      <div className="video-player video-player--youtube">
        <iframe
          className="video-player__youtube"
          src={`https://www.youtube.com/embed/${youtubeId}`}
          title="Pré-visualização do YouTube"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="video-player">
      <video
        ref={videoRef}
        controls
        muted={muted}
        controlsList={showFsButton ? 'nofullscreen' : undefined}
      />
      <div ref={chronoRef} className="video-player__chrono">00:00:000</div>
      {currentText && (
        <div className="video-player__subtitle">{currentText}</div>
      )}
      {showFsButton && (
        <button
          className="video-player__fs-btn"
          title="Tela cheia (com legendas e cronômetro)"
          onClick={() => wrapperRef.current?.requestFullscreen()}
        >
          ⛶
        </button>
      )}
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
