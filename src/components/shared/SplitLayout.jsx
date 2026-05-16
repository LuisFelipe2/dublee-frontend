import './SplitLayout.css';

const SplitLayout = ({
  variant = 'default',
  dividerLabel = 'ou',
  left,
  right,
  leftProps = {},
  rightProps = {},
}) => {
  const { className: leftCls, ...leftRest } = leftProps;
  const { className: rightCls, ...rightRest } = rightProps;

  return (
    <div className={`split-layout split-layout--${variant}`}>
      <div className={['split-panel', leftCls].filter(Boolean).join(' ')} {...leftRest}>
        {left}
      </div>
      <div className="split-divider">
        <div className="split-divider__line" />
        <span className="split-divider__label">{dividerLabel}</span>
        <div className="split-divider__line" />
      </div>
      <div className={['split-panel', rightCls].filter(Boolean).join(' ')} {...rightRest}>
        {right}
      </div>
    </div>
  );
};

export default SplitLayout;
