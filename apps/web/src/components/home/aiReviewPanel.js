import { Check, FileText, TriangleAlert } from 'lucide-react';
import { Badge, ButtonLink, Section } from '@/components/ui';

// AI document review promo with a static sample report (decorative, hidden from assistive technology)
export function AiReviewPanel({ copy, href }) {
  const { mockup } = copy;
  const lastRowIndex = mockup.rows.length - 1;

  return (
    <Section labelledBy="ai-review-title" size="sm">
      <div className="reveal grid items-center gap-8 overflow-hidden rounded-panel border border-line bg-assistant p-6 sm:p-8 lg:grid-cols-2 lg:gap-12 lg:p-10">
        <div>
          <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary-dark ring-1 ring-primary-100">
            {copy.pill}
          </span>
          <h2 id="ai-review-title" className="mt-3 text-section text-ink">
            {copy.title}
          </h2>
          <p className="mt-2 max-w-md leading-7 text-ink-muted">{copy.description}</p>
          <ul className="mt-5 space-y-2.5">
            {copy.points.map((point) => (
              <li key={point} className="flex items-center gap-2.5 text-[15px] text-ink">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success-50 text-success">
                  <Check aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
                </span>
                {point}
              </li>
            ))}
          </ul>
          <ButtonLink href={href} className="mt-6">
            {copy.cta}
          </ButtonLink>
          <p className="mt-2.5 text-xs text-ink-muted">{copy.note}</p>
        </div>

        <div aria-hidden="true" className="rounded-panel bg-white p-5 shadow-raised ring-1 ring-line sm:p-6">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-primary-50 text-primary">
              <FileText className="size-5" strokeWidth={1.75} />
            </span>
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{mockup.fileName}</p>
            <Badge tone="done">{mockup.status}</Badge>
          </div>
          <ul className="mt-4 space-y-3">
            {mockup.rows.map((row, rowIndex) => {
              const needsAttention = rowIndex === lastRowIndex;
              return (
                <li
                  key={row}
                  className={`flex items-center gap-3 rounded-control px-3 py-2.5 text-sm ${needsAttention ? 'bg-warning-50 text-ink' : 'bg-surface-alt text-ink-muted'}`}
                >
                  {needsAttention ? (
                    <TriangleAlert className="size-4 shrink-0 text-warning" strokeWidth={2} />
                  ) : (
                    <Check className="size-4 shrink-0 text-success" strokeWidth={2.5} />
                  )}
                  <span className="min-w-0 flex-1">{row}</span>
                  {needsAttention && <span className="shrink-0 text-xs font-semibold text-warning">{mockup.riskLabel}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Section>
  );
}
