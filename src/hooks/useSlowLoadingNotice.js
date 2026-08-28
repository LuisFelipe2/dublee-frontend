import { useEffect, useRef, useState } from 'react';

const DEFAULT_DELAY_MS = 10000;

// Aviso não-bloqueante quando `isLoading` fica `true` por mais de
// `delayMs` — não cancela nem afeta a operação em curso, é só informativo.
const useSlowLoadingNotice = (isLoading, delayMs = DEFAULT_DELAY_MS) => {
  const [isSlow, setIsSlow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isLoading) {
      setDismissed(false);
      timerRef.current = setTimeout(() => setIsSlow(true), delayMs);
    } else {
      setIsSlow(false);
    }
    return () => clearTimeout(timerRef.current);
  }, [isLoading, delayMs]);

  return { show: isSlow && !dismissed, dismiss: () => setDismissed(true) };
};

export default useSlowLoadingNotice;
