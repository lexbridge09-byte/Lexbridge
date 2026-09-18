import { getRequestDictionary } from '@/brand/serverI18n';
import { ButtonLink, Section } from '@/components/ui';

export default async function NotFound() {
  const copy = (await getRequestDictionary()).common.notFound;
  return (
    <Section>
      <div className="mx-auto max-w-xl py-8 text-center">
        <p aria-hidden="true" className="font-display text-7xl font-extrabold text-primary-100">
          404
        </p>
        <h1 className="mt-4 text-h2 text-ink">{copy.title}</h1>
        <p className="mt-3 leading-7 text-ink-muted">{copy.body}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/">{copy.home}</ButtonLink>
          <ButtonLink href="/services" variant="secondary">
            {copy.services}
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}
