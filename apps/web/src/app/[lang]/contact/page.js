import { Mail, MessageCircle, Phone } from 'lucide-react';
import { SERVICE_CATEGORY_KEYS, WHATSAPP_AI_PLAN } from '@lexbridge/shared';
import { getDictionary, isFeatureEnabled } from '@/brand';
import { CallbackRequestButton } from '@/components/callbackRequestButton';
import { LocaleLink } from '@/components/localeLink';
import { ServiceRequestForm } from '@/components/serviceRequestForm';
import { ButtonLink, Card, PageHeader, Section } from '@/components/ui';
import { formatRupees } from '@/lib/formatValues';
import { deriveTelHref, deriveWhatsAppHref, SUPPORT_EMAIL, SUPPORT_PHONE } from '@/lib/publicContact';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return getDictionary(lang).contact.metadata;
}

const CONTACT_LINK_CLASS =
  'flex items-center gap-3 rounded-xl border border-line px-4 py-3 font-semibold text-ink hover:border-primary-100 hover:bg-primary-50';

export default async function ContactPage({ params, searchParams }) {
  const { lang } = await params;
  const { service } = await searchParams;
  const dictionary = getDictionary(lang);
  const copy = dictionary.contact;
  const assistantCopy = dictionary.whatsapp.assistant;
  const defaultCategory = SERVICE_CATEGORY_KEYS.includes(service) ? service : '';
  const whatsAppHref = isFeatureEnabled('whatsAppAiAssistant') ? deriveWhatsAppHref(dictionary.whatsapp.greeting) : '';

  return (
    <>
      <PageHeader title={copy.header.title} lead={copy.header.lead} />

      <Section tone="alt" size="sm">
        <div className="grid items-start gap-6 lg:grid-cols-[1.7fr_1fr] lg:gap-8">
          <Card padding="lg">
            <h2 className="mb-5 text-h3 text-ink">{copy.formTitle}</h2>
            <ServiceRequestForm source="contact-form" defaultCategory={defaultCategory} />
          </Card>

          <div className="space-y-5 lg:sticky lg:top-24">
            <Card as="aside" padding="md" aria-labelledby="direct-contact-title">
              <h2 id="direct-contact-title" className="text-h4 text-ink">
                {copy.direct.title}
              </h2>
              <ul className="mt-4 space-y-2">
                {isFeatureEnabled('consultationBooking') && (
                  <li>
                    <ButtonLink href="/consultation" variant="secondary" isFullWidth>
                      {copy.direct.consult}
                    </ButtonLink>
                  </li>
                )}
                {isFeatureEnabled('callbackRequests') && (
                  <li>
                    <CallbackRequestButton variant="block" />
                  </li>
                )}
                {SUPPORT_PHONE && (
                  <li>
                    <a href={deriveTelHref(SUPPORT_PHONE)} className={CONTACT_LINK_CLASS}>
                      <Phone aria-hidden="true" className="size-5 text-primary" strokeWidth={1.75} />
                      {dictionary.common.support.call(SUPPORT_PHONE)}
                    </a>
                  </li>
                )}
                {SUPPORT_EMAIL && (
                  <li>
                    <a href={`mailto:${SUPPORT_EMAIL}`} className={CONTACT_LINK_CLASS}>
                      <Mail aria-hidden="true" className="size-5 text-primary" strokeWidth={1.75} />
                      {dictionary.common.support.email(SUPPORT_EMAIL)}
                    </a>
                  </li>
                )}
              </ul>
              <p className="mt-3 text-sm leading-6 text-ink-muted">{copy.direct.note}</p>
            </Card>

            {whatsAppHref && (
              <Card as="aside" padding="md" aria-labelledby="whatsapp-assistant-title">
                <h2 id="whatsapp-assistant-title" className="flex items-center gap-2 text-h4 text-ink">
                  <MessageCircle aria-hidden="true" className="size-5 text-success" strokeWidth={2} />
                  {assistantCopy.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{assistantCopy.body}</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink-muted marker:text-success">
                  <li>{assistantCopy.freeQuestions(WHATSAPP_AI_PLAN.freeMessages)}</li>
                  <li>{assistantCopy.pack(formatRupees(WHATSAPP_AI_PLAN.packPricePaise, lang), WHATSAPP_AI_PLAN.packMessages)}</li>
                  <li>{assistantCopy.human}</li>
                </ul>
                <p className="mt-2 text-xs leading-5 text-ink-muted">
                  {assistantCopy.privacyBefore}
                  <LocaleLink href="/legal/privacy" className="font-semibold underline underline-offset-4">
                    {assistantCopy.privacyLink}
                  </LocaleLink>
                  {assistantCopy.privacyAfter}
                </p>
                <a
                  href={whatsAppHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-success px-6 py-3 text-[15px] font-semibold text-white hover:brightness-110"
                >
                  <MessageCircle aria-hidden="true" className="size-5" strokeWidth={2} />
                  {assistantCopy.cta}
                </a>
              </Card>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}
