import { useState } from 'react';
import Button from '../Button/Button';
import Toast from '../Toast/Toast';
import './ReportProblemForm.css';

const SUPPORT_EMAIL = 'dublee.plataforma@gmail.com';

const ReportProblemForm = ({ onSent }) => {
  const [description, setDescription] = useState('');
  const [toast, setToast] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setToast({ type: 'error', message: 'Descreva o problema antes de enviar.', id: Date.now() });
      return;
    }

    const subject = encodeURIComponent('[Dublee] Reportar problema');
    const body = encodeURIComponent(`Descrição do problema:\n${description.trim()}`);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    setDescription('');
    onSent?.();
  };

  return (
    <div className="report-problem-form">
      <form onSubmit={handleSubmit}>
        <textarea
          className="report-problem-form__textarea"
          placeholder="Descreva o problema ou dúvida que você encontrou..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
        />
        <div className="report-problem-form__actions">
          <Button type="submit" variant="primary">Enviar</Button>
        </div>
      </form>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
};

export default ReportProblemForm;
