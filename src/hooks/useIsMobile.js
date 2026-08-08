import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

// Uses the *shorter* viewport dimension so the mobile/desktop decision
// doesn't flip when a phone is rotated (portrait width ≈ landscape height).
const computeIsMobile = () =>
  typeof window !== 'undefined' &&
  Math.min(window.innerWidth, window.innerHeight) <= MOBILE_BREAKPOINT;

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(computeIsMobile);

  useEffect(() => {
    const handleChange = () => setIsMobile(computeIsMobile());
    window.addEventListener('resize', handleChange);
    window.addEventListener('orientationchange', handleChange);
    return () => {
      window.removeEventListener('resize', handleChange);
      window.removeEventListener('orientationchange', handleChange);
    };
  }, []);

  return isMobile;
};

export default useIsMobile;
