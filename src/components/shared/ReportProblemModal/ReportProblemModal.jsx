import { useState } from 'react';
import Modal from '../Modal/Modal';
import ReportProblemForm from '../ReportProblemForm/ReportProblemForm';
import Toast from '../Toast/Toast';

const ReportProblemModal = ({ open, onClose }) => {
  const [toast, setToast] = useState(null);

  const handleSent = () => {
    onClose();
    setToast({ type: 'success', message: 'Mensagem enviada com sucesso!', id: Date.now() });
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="Reportar problema" draggable>
        <ReportProblemForm onSent={handleSent} />
      </Modal>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  );
};

export default ReportProblemModal;
