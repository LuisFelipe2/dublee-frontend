import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import './VideoPlayer.css';

const formatChrono = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 1000);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}:${String(ms).padStart(3, '0')}`;
};

const VideoPlayer = forwardRef(({ src, muted = false, subtitles = [], showChrono = true, showNativeCaptions = true, disableControls = false, badge = null, isVideoLoading }, ref) => {
  const videoRef = useRef(null);
  const wrapperRef = useRef(null);
  const fsPendingRef = useRef(false);
  const rafRef = useRef(null);
  const textTrackRef = useRef(null);
  const chronoCueRef = useRef(null);
  const chronoTrackRef = useRef(null);

  useImperativeHandle(ref, () => videoRef.current);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showNativeCaptions) return;
    if (!textTrackRef.current) {
      textTrackRef.current = video.addTextTrack('subtitles', 'Legendas', 'pt');
      textTrackRef.current.mode = 'showing';
    }
    const track = textTrackRef.current;
    while (track.cues?.length) track.removeCue(track.cues[0]);
    subtitles.forEach(sub => track.addCue(new VTTCue(sub.startTime, sub.endTime, sub.text)));
  }, [subtitles, isVideoLoading, showNativeCaptions]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    video.src = src;
  }, [src, isVideoLoading]);

  // Chronometer track
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showChrono) return;
    const track = video.addTextTrack('subtitles', 'Chrono', 'pt');
    track.mode = 'showing';
    const cue = new VTTCue(0, 999999, formatChrono(0));
    cue.line = 0;
    cue.position = 50;
    cue.align = 'center';
    track.addCue(cue);
    chronoCueRef.current = cue;
    chronoTrackRef.current = track;
    return () => {
      track.mode = 'hidden';
      chronoCueRef.current = null;
      chronoTrackRef.current = null;
    };
  }, [showChrono, isVideoLoading]);

  // Chronometer RAF
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tick = () => {
      if (chronoCueRef.current) chronoCueRef.current.text = formatChrono(video.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    const startTick = () => { if (!rafRef.current) rafRef.current = requestAnimationFrame(tick); };
    const stopTick = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (chronoCueRef.current) chronoCueRef.current.text = formatChrono(video.currentTime);
    };
    const refreshChrono = () => {
      const cue = chronoCueRef.current;
      const track = chronoTrackRef.current;
      if (!cue || !track) return;
      cue.text = formatChrono(video.currentTime);
      track.mode = 'hidden';
      track.mode = 'showing';
    };

    video.addEventListener('play', startTick);
    video.addEventListener('pause', stopTick);
    video.addEventListener('ended', stopTick);
    video.addEventListener('seeked', refreshChrono);
    return () => {
      video.removeEventListener('play', startTick);
      video.removeEventListener('pause', stopTick);
      video.removeEventListener('ended', stopTick);
      video.removeEventListener('seeked', refreshChrono);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isVideoLoading]);

  useEffect(() => {
    const video = videoRef.current;
    const wrapper = wrapperRef.current;
    if (!video || !wrapper) return;

    const onWebkitFsChange = () => {
      document.webkitExitFullscreen?.();
      wrapper.webkitRequestFullscreen?.();
    };

    document.addEventListener('webkitfullscreenchange', onWebkitFsChange);
    return () => {
      document.removeEventListener('webkitfullscreenchange', onWebkitFsChange);
    };
  }, [isVideoLoading]);

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
  }, [disableControls, isVideoLoading]);

  return (
    <>
      {isVideoLoading ? (
        <div className="video-loading-placeholder">
          ⏳ Carregando vídeo…
        </div>
      ) : (
        <div ref={wrapperRef} className="video-player">
          <video
            ref={videoRef}
            controls={!disableControls}
            muted={muted}
          />
          {badge}
        </div>
      )}
    </>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
