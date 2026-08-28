import { useState, useEffect, useCallback } from 'react';
import './Toast.css';

const ICONS = { success: '✓', error: '⚠', info: '⏳' };

const Toast = ({ type = 'success', message, onClose, className }) => {
  const [leaving, setLeaving] = useState(false);

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(onClose, 280);
  }, [onClose]);

  useEffect(() => {
    // 'loading'/'info' ficam até o chamador desmontar ou o usuário fechar
    // manualmente — não têm um tempo fixo de vida (ex.: SlowLoadingNotice).
    if (type === 'loading' || type === 'info') return;
    const t = setTimeout(dismiss, 5000);
    return () => clearTimeout(t);
  }, [dismiss, type]);

  return (
    <div className={`toast toast--${type}${leaving ? ' toast--leaving' : ''}${className ? ` ${className}` : ''}`} role="alert">
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
