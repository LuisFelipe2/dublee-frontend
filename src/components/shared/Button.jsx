import './Button.css';

const Button = ({ variant = 'primary', type = 'button', disabled, onClick, children, className, ...rest }) => {
  const cls = ['btn', `btn--${variant}`, className].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} disabled={disabled} onClick={onClick} {...rest}>
      {children}
    </button>
  );
};

export default Button;
