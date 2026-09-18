const PADDING_CLASSES = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export function Card({ as: Element = 'div', padding = 'md', className = '', children, ...elementProps }) {
  return (
    <Element
      className={`rounded-2xl border border-line bg-white shadow-sm ${PADDING_CLASSES[padding] ?? PADDING_CLASSES.md} ${className}`}
      {...elementProps}
    >
      {children}
    </Element>
  );
}
