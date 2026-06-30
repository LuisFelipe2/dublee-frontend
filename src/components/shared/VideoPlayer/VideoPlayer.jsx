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
  const fsPendingRef = useRef(false);
  const rafRef = useRef(null);
  const textTrackRef = useRef(null);
  const [isFs, setIsFs] = useState(false);

  useImperativeHandle(ref, () => videoRef.current);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!textTrackRef.current) {
      textTrackRef.current = video.addTextTrack('subtitles', 'Legendas', 'pt');
      textTrackRef.current.mode = 'showing';
    }
    const track = textTrackRef.current;
    while (track.cues?.length) track.removeCue(track.cues[0]);
    subtitles.forEach(sub => track.addCue(new VTTCue(sub.startTime, sub.endTime, sub.text)));
  }, [subtitles]);

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

  useEffect(() => {
    const video = videoRef.current;
    const wrapper = wrapperRef.current;
    if (!video || !wrapper) return;

    const onWebkitFsChange = () => {
      if (document.webkitFullscreenElement === video) {
        document.webkitExitFullscreen?.();
        wrapper.webkitRequestFullscreen?.();
      } else {
        setIsFs(!!document.webkitFullscreenElement);
      }
    };

    document.addEventListener('webkitfullscreenchange', onWebkitFsChange);
    return () => {
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

  return (
    <div ref={wrapperRef} className="video-player">
      <video
        ref={videoRef}
        controls={!disableControls}
        muted={muted}
      />
      {badge}
      {showChrono && <div ref={chronoRef} className="video-player__chrono">00:00:000</div>}
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
