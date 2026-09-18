import { CircleCheck } from 'lucide-react';
import { getDictionary, isFeatureEnabled, requireFeaturePage } from '@/brand';
import { ButtonLink, Card, Section, StepIndicator } from '@/components/ui';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return { title: getDictionary(lang).commerce.success.metadata.title, robots: { index: false, follow: false } };
}

const ORDER_REFERENCE_PATTERN = /^LO-[A-Z0-9-]{3,40}$/i;
const REQUEST_REFERENCE_PATTERN = /^LB-[A-Z0-9-]{3,40}$/i;

function readReference(value, pattern) {
  return typeof value === 'string' && pattern.test(value) ? value.toUpperCase() : '';
}

export default async function CheckoutSuccessPage({ params, searchParams }) {
  requireFeaturePage('onlinePayments');
  const { lang } = await params;
  const query = await searchParams;
  const dictionary = getDictionary(lang);
  const copy = dictionary.commerce.success;
  const orderReference = readReference(query.reference, ORDER_REFERENCE_PATTERN);
  const requestReference = readReference(query.request, REQUEST_REFERENCE_PATTERN);
  const hasAccounts = isFeatureEnabled('clientAccounts');

  return (
    <Section tone="alt" size="sm">
      <StepIndicator label={dictionary.ux.steps.label} steps={dictionary.ux.steps.checkout} current={4} className="mx-auto mb-4 max-w-2xl" />
      <Card padding="lg" role="status" className="mx-auto max-w-2xl">
        <span className="success-mark flex size-12 items-center justify-center rounded-full bg-success-50 text-success">
          <CircleCheck aria-hidden="true" className="size-7" strokeWidth={2} />
        </span>
        <h1 className="mt-4 text-h2 text-ink">{copy.title}</h1>

        {(orderReference || requestReference) && (
          <dl className="mt-5 grid gap-4 rounded-xl bg-surface-alt p-4 sm:grid-cols-2">
            {orderReference && (
              <div>
                <dt className="text-xs font-semibold text-ink-muted">{copy.referenceLabel}</dt>
                <dd className="mt-0.5 font-semibold tracking-wide text-ink">{orderReference}</dd>
              </div>
            )}
            {requestReference && (
              <div>
                <dt className="text-xs font-semibold text-ink-muted">{copy.requestLabel}</dt>
                <dd className="mt-0.5 font-semibold tracking-wide text-ink">{requestReference}</dd>
              </div>
            )}
          </dl>
        )}

        <h2 className="mt-6 text-h4 text-ink">{copy.nextTitle}</h2>
        <ol className="mt-3 space-y-2.5">
          {copy.nextSteps.map((step, stepIndex) => (
            <li key={step} className="flex items-start gap-3 text-[15px] text-ink">
              <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-cta text-xs font-bold text-white">
                {stepIndex + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
          {hasAccounts && orderReference && <ButtonLink href={`/dashboard/orders/${orderReference}`}>{copy.viewOrder}</ButtonLink>}
          <ButtonLink href="/services" variant={hasAccounts && orderReference ? 'link' : 'primary'}>
            {copy.browse}
          </ButtonLink>
        </div>
      </Card>
    </Section>
  );
}
