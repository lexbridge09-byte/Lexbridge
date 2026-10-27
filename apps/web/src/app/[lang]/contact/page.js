import { ArrowUpRight, Mail, MessageCircle, Phone } from 'lucide-react';
import { SERVICE_CATEGORY_KEYS, WHATSAPP_AI_PLAN } from '@lexbridge/shared';
import { getDictionary, getServerFeatures } from '@/brand';
import { CallbackRequestButton } from '@/components/callbackRequestButton';
import { LocaleLink } from '@/components/localeLink';
import { ServiceRequestForm } from '@/components/serviceRequestForm';
import { ButtonLink, FormSheet, TaskPage } from '@/components/ui';
import { formatRupees } from '@/lib/formatValues';
import { deriveTelHref, deriveWhatsAppHref, SUPPORT_EMAIL, SUPPORT_PHONE } from '@/lib/publicContact';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return getDictionary(lang).contact.metadata;
}

// Direct-contact rows: icon tile, label, arrow that slides on hover
const CONTACT_ROW_CLASS =
  'group flex items-center gap-3 rounded-card border border-line-canvas bg-canvas px-4 py-3.5 text-sm font-semibold text-on-canvas transition-[border-color,transform] duration-(--dur-200) hover:-translate-y-0.5 hover:border-primary/50 motion-reduce:hover:translate-y-0';

function ContactRowIcon({ icon: Icon }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary-bright ring-1 ring-primary/30">
      <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
    </span>
  );
}

export default async function ContactPage({ params, searchParams }) {
  const { lang } = await params;
  const { service } = await searchParams;
  const dictionary = getDictionary(lang);
  const features = await getServerFeatures();
  const copy = dictionary.contact;
  const assistantCopy = dictionary.whatsapp.assistant;
  const defaultCategory = SERVICE_CATEGORY_KEYS.includes(service) ? service : '';
  const whatsAppHref = features.whatsAppAiAssistant ? deriveWhatsAppHref(dictionary.whatsapp.greeting) : '';

  const rail = (
    <>
      <section aria-labelledby="direct-contact-title" className="rounded-panel border border-line-canvas bg-canvas-alt p-5">
        <h2 id="direct-contact-title" className="text-h4 text-on-canvas">{copy.direct.title}</h2>
        <ul className="mt-4 space-y-2.5">
          {features.consultationBooking && (
            <li>
              <ButtonLink href="/consultation" isFullWidth>
                {copy.direct.consult}
              </ButtonLink>
            </li>
          )}
          {features.callbackRequests && (
            <li>
              <CallbackRequestButton variant="block" />
            </li>
          )}
          {SUPPORT_PHONE && (
            <li>
              <a href={deriveTelHref(SUPPORT_PHONE)} className={CONTACT_ROW_CLASS}>
                <ContactRowIcon icon={Phone} />
                <span className="min-w-0 flex-1">{dictionary.common.support.call(SUPPORT_PHONE)}</span>
                <ArrowUpRight aria-hidden="true" className="size-4 text-on-canvas-subtle transition-transform duration-(--dur-150) group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary-bright" strokeWidth={2} />
              </a>
            </li>
          )}
          {SUPPORT_EMAIL && (
            <li>
              <a href={`mailto:${SUPPORT_EMAIL}`} className={CONTACT_ROW_CLASS}>
                <ContactRowIcon icon={Mail} />
                <span className="min-w-0 flex-1 break-all">{dictionary.common.support.email(SUPPORT_EMAIL)}</span>
                <ArrowUpRight aria-hidden="true" className="size-4 text-on-canvas-subtle transition-transform duration-(--dur-150) group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary-bright" strokeWidth={2} />
              </a>
            </li>
          )}
        </ul>
        <p className="mt-3 text-xs leading-5 text-on-canvas-subtle">{copy.direct.note}</p>
      </section>

      {whatsAppHref && (
        <section aria-labelledby="whatsapp-assistant-title" className="relative overflow-hidden rounded-panel border border-success/30 bg-canvas-alt p-5">
          <div aria-hidden="true" className="absolute -right-12 -top-12 size-40 rounded-full bg-[radial-gradient(closest-side,rgb(29_122_70/0.3),transparent)]" />
          <h2 id="whatsapp-assistant-title" className="relative flex items-center gap-2 text-h4 text-on-canvas">
            <MessageCircle aria-hidden="true" className="size-5 text-[#4ade80]" strokeWidth={2} />
            {assistantCopy.title}
          </h2>
          <p className="relative mt-2 text-sm leading-6 text-on-canvas-muted">{assistantCopy.body}</p>
          <ul className="relative mt-3 space-y-1.5 text-sm leading-6 text-on-canvas-muted">
            {[
              assistantCopy.freeQuestions(WHATSAPP_AI_PLAN.freeMessages),
              assistantCopy.pack(formatRupees(WHATSAPP_AI_PLAN.packPricePaise, lang), WHATSAPP_AI_PLAN.packMessages),
              assistantCopy.human,
            ].map((point) => (
              <li key={point} className="flex gap-2">
                <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-[#4ade80]" />
                {point}
              </li>
            ))}
          </ul>
          <a
            href={whatsAppHref}
            target="_blank"
            rel="noopener noreferrer"
            className="relative mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control bg-success px-6 py-3 text-[15px] font-semibold text-white transition-[filter,transform] duration-(--dur-150) hover:brightness-110 active:scale-(--press-scale)"
          >
            <MessageCircle aria-hidden="true" className="size-5" strokeWidth={2} />
            {assistantCopy.cta}
          </a>
          <p className="relative mt-3 text-xs leading-5 text-on-canvas-subtle">
            {assistantCopy.privacyBefore}
            <LocaleLink href="/legal/privacy" className="font-semibold text-on-canvas-muted underline underline-offset-4 hover:text-primary-bright">
              {assistantCopy.privacyLink}
            </LocaleLink>
            {assistantCopy.privacyAfter}
          </p>
        </section>
      )}
    </>
  );

  return (
    <TaskPage title={copy.header.title} rail={rail}>
      <FormSheet title={copy.formTitle}>
        <ServiceRequestForm source="contact-form" defaultCategory={defaultCategory} />
      </FormSheet>
    </TaskPage>
  );
}
