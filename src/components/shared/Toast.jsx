import { useState, useEffect, useCallback } from 'react';
import './Toast.css';

const ICONS = { success: '✓', error: '⚠' };

const Toast = ({ type = 'success', message, onClose }) => {
  const [leaving, setLeaving] = useState(false);

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(onClose, 280);
  }, [onClose]);

  useEffect(() => {
    if (type === 'loading') return;
    const t = setTimeout(dismiss, 5000);
    return () => clearTimeout(t);
  }, [dismiss, type]);

  return (
    <div className={`toast toast--${type}${leaving ? ' toast--leaving' : ''}`} role="alert">
      <div className="toast__icon">
        {type === 'loading'
          ? <span className="toast__spinner" />
          : ICONS[type]
        }
      </div>
      <p className="toast__message">{message}</p>
      <button className="toast__close" onClick={dismiss} aria-label="Fechar">×</button>
    </div>
  );
};

export default Toast;
