import { useEffect, useRef, useState } from 'react';
import './Modal.css';

const Modal = ({ open, onClose, title, children, className, draggable = false }) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Arrastar (segurar o cabeçalho e mover) — opcional, só quando `draggable`.
  // O offset reseta pra posição default toda vez que o modal fecha, já que
  // este componente não desmonta ao fechar (só retorna null), então o
  // estado sobreviveria entre aberturas se não fosse resetado explicitamente.
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStateRef = useRef(null);

  useEffect(() => {
    if (!open) setDragOffset({ x: 0, y: 0 });
  }, [open]);

  const handleHeaderPointerDown = (e) => {
    if (!draggable || e.target.closest('.modal__close')) return;
    dragStateRef.current = { startX: e.clientX, startY: e.clientY, baseX: dragOffset.x, baseY: dragOffset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleHeaderPointerMove = (e) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    setDragOffset({
      x: drag.baseX + (e.clientX - drag.startX),
      y: drag.baseY + (e.clientY - drag.startY),
    });
  };

  const handleHeaderPointerUp = (e) => {
    dragStateRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* já liberado */ }
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={['modal', className, draggable && 'modal--draggable'].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        style={draggable ? { position: 'relative', left: dragOffset.x, top: dragOffset.y } : undefined}
      >
        <div
          className="modal__header"
          onPointerDown={handleHeaderPointerDown}
          onPointerMove={handleHeaderPointerMove}
          onPointerUp={handleHeaderPointerUp}
        >
          {title && <h3 className="modal__title">{title}</h3>}
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className="modal__body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
