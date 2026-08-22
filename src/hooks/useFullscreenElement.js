import { useSyncExternalStore } from 'react';

const getSnapshot = () => document.fullscreenElement;
const subscribe = (cb) => {
  document.addEventListener('fullscreenchange', cb);
  return () => document.removeEventListener('fullscreenchange', cb);
};

const useFullscreenElement = () => useSyncExternalStore(subscribe, getSnapshot, () => null);

export default useFullscreenElement;
