const PADDING_CLASSES = {
  none: '',
  sm: 'p-4',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-7',
};

export function Card({ as: Element = 'div', padding = 'md', className = '', children, ...elementProps }) {
  return (
    <Element
      className={`rounded-card border border-line bg-card shadow-sm ${PADDING_CLASSES[padding] ?? PADDING_CLASSES.md} ${className}`}
      {...elementProps}
    >
      {children}
    </Element>
  );
}
