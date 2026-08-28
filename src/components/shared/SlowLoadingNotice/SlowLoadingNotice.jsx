import Toast from '../Toast/Toast';

const SlowLoadingNotice = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <Toast
      type="info"
      message="Desculpe a demora, servidor mais lento hoje. Por favor, aguarde mais um pouco..."
      onClose={onClose}
      className="toast--slow-notice"
    />
  );
};

export default SlowLoadingNotice;
