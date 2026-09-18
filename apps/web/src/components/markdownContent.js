import Markdown from 'react-markdown';

// react-markdown ignores raw HTML by default, so article bodies can't inject markup
const MARKDOWN_COMPONENTS = {
  h1: ({ children }) => <h2 className="mt-10 text-h3 text-ink">{children}</h2>,
  h2: ({ children }) => <h2 className="mt-10 text-h3 text-ink">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-8 text-h4 text-ink">{children}</h3>,
  h4: ({ children }) => <h4 className="mt-6 text-base font-semibold text-ink">{children}</h4>,
  p: ({ children }) => <p className="mt-4">{children}</p>,
  ul: ({ children }) => <ul className="mt-4 list-disc space-y-1.5 pl-6 marker:text-primary">{children}</ul>,
  ol: ({ children }) => <ol className="mt-4 list-decimal space-y-1.5 pl-6 marker:text-primary">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mt-6 rounded-r-xl border-l-4 border-primary bg-primary-50 px-5 py-3 text-ink">{children}</blockquote>
  ),
  a: ({ href, children }) => {
    const isExternal = /^https?:\/\//.test(href ?? '');
    return (
      <a
        href={href}
        className="font-semibold text-primary underline underline-offset-4"
        {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
    );
  },
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  code: ({ children }) => <code className="rounded-md bg-surface-alt px-1.5 py-0.5 text-[0.9em]">{children}</code>,
  hr: () => <hr className="my-8 border-line" />,
};

export function MarkdownContent({ source }) {
  return (
    <div className="max-w-[68ch] text-[17px] leading-8 text-ink/90">
      <Markdown components={MARKDOWN_COMPONENTS}>{source ?? ''}</Markdown>
    </div>
  );
}
