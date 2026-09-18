'use client';

import { useDictionary } from '@/brand/localeContext';
import { RiskBadge } from '@/components/statusBadge';
import { Card, InlineAlert } from '@/components/ui';

function ReportSection({ title, children }) {
  return (
    <Card as="section" padding="md">
      <h2 className="text-h4 text-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

// The AI report exactly as returned by the API; the disclaimer is always shown
export function DocumentReviewReport({ report }) {
  const copy = useDictionary().documentReview.report;
  if (!report) return null;

  return (
    <div className="space-y-4">
      {!report.isLegalDocument && <InlineAlert tone="warning">{copy.notLegal}</InlineAlert>}

      <Card as="section" padding="md">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold text-ink-muted">{copy.documentType}</dt>
            <dd className="mt-0.5 font-semibold text-ink">{report.documentType}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-ink-muted">{copy.overallRisk}</dt>
            <dd className="mt-1">
              <RiskBadge level={report.overallRisk} />
            </dd>
          </div>
        </dl>
        {report.overallRiskReason && <p className="mt-3 text-sm leading-6 text-ink">{report.overallRiskReason}</p>}
        <h2 className="mt-4 border-t border-line pt-4 text-h4 text-ink">{copy.summaryTitle}</h2>
        <p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-ink">{report.plainSummary}</p>
      </Card>

      {report.risks?.length > 0 && (
        <ReportSection title={copy.risksTitle}>
          <ul className="space-y-3">
            {report.risks.map((risk) => (
              <li key={risk.title} className="rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-ink">{risk.title}</p>
                  <RiskBadge level={risk.severity} />
                </div>
                <p className="mt-1 text-sm leading-6 text-ink-muted">{risk.explanation}</p>
              </li>
            ))}
          </ul>
        </ReportSection>
      )}

      {report.keyObligations?.length > 0 && (
        <ReportSection title={copy.obligationsTitle}>
          <ul className="divide-y divide-line">
            {report.keyObligations.map((item) => (
              <li key={`${item.party}-${item.obligation}`} className="py-2 text-sm leading-6 first:pt-0 last:pb-0">
                <span className="font-semibold text-ink">{item.party}:</span> <span className="text-ink-muted">{item.obligation}</span>
              </li>
            ))}
          </ul>
        </ReportSection>
      )}

      {report.missingOrUnusualClauses?.length > 0 && (
        <ReportSection title={copy.missingTitle}>
          <ul className="space-y-2.5">
            {report.missingOrUnusualClauses.map((item) => (
              <li key={item.clause} className="text-sm leading-6">
                <p className="font-semibold text-ink">{item.clause}</p>
                <p className="text-ink-muted">{item.whyItMatters}</p>
              </li>
            ))}
          </ul>
        </ReportSection>
      )}

      {report.questionsForLawyer?.length > 0 && (
        <ReportSection title={copy.questionsTitle}>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-6 text-ink marker:text-primary">
            {report.questionsForLawyer.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ol>
        </ReportSection>
      )}

      {report.disclaimer && <p className="rounded-xl bg-warning-50 px-4 py-3 text-xs leading-5 text-ink">{report.disclaimer}</p>}
    </div>
  );
}
