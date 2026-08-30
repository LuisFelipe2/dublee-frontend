import { useState } from 'react';
import Button from '../Button/Button';
import Toast from '../Toast/Toast';
import { submitFeedback } from '../../../services/api';
import './ReportProblemForm.css';

const ReportProblemForm = ({ onSent }) => {
  const [description, setDescription] = useState('');
  const [toast, setToast] = useState(null);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setToast({ type: 'error', message: 'Descreva o problema antes de enviar.', id: Date.now() });
      return;
    }

    setSending(true);
    const [, ok] = await submitFeedback(description.trim());
    setSending(false);

    if (!ok) {
      setToast({ type: 'error', message: 'Não foi possível enviar. Tente novamente.', id: Date.now() });
      return;
    }

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
          <Button type="submit" variant="primary" disabled={sending}>
            {sending ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      </form>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
};

export default ReportProblemForm;
