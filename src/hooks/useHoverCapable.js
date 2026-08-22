import { useSyncExternalStore } from 'react';

const query = '(hover: hover) and (pointer: fine)';
const getSnapshot = () => window.matchMedia(query).matches;
const subscribe = (cb) => {
  const mql = window.matchMedia(query);
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
};

const useHoverCapable = () => useSyncExternalStore(subscribe, getSnapshot, () => true);

export default useHoverCapable;
