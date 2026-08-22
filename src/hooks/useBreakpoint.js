import { useSyncExternalStore } from 'react';
import { BREAKPOINTS } from '../constants/breakpoints';

const getTier = () => {
  const w = window.innerWidth;
  if (w >= BREAKPOINTS.X) return 'X';
  if (w >= BREAKPOINTS.G) return 'G';
  if (w >= BREAKPOINTS.M) return 'M';
  return 'P';
};

const subscribe = (cb) => {
  window.addEventListener('resize', cb);
  window.addEventListener('orientationchange', cb);
  return () => {
    window.removeEventListener('resize', cb);
    window.removeEventListener('orientationchange', cb);
  };
};

const useBreakpoint = () => useSyncExternalStore(subscribe, getTier, () => 'G');

export default useBreakpoint; // 'P' | 'M' | 'G' | 'X'
