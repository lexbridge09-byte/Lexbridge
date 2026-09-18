import { LocaleLink } from '@/components/localeLink';
import { ButtonLink, Section, SectionHeader } from '@/components/ui';

// Latest published guides; the home page only renders this when at least one exists
export function GuidesList({ copy, guides }) {
  return (
    <Section labelledBy="guides-title" size="sm">
      <SectionHeader
        id="guides-title"
        title={copy.title}
        description={copy.description}
        action={
          <ButtonLink href="/insights" variant="link">
            {copy.viewAll}
          </ButtonLink>
        }
      />
      <ul className="grid gap-4 md:grid-cols-3">
        {guides.map((guide) => (
          <li key={guide._id}>
            <article className="lift relative h-full rounded-card border border-line bg-white p-5">
              <h3 className="text-h4 text-ink">
                <LocaleLink href={`/insights/${guide.Slug}`} className="after:absolute after:inset-0 after:rounded-card after:content-['']">
                  {guide.Title}
                </LocaleLink>
              </h3>
              {guide.Summary && <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-muted">{guide.Summary}</p>}
            </article>
          </li>
        ))}
      </ul>
    </Section>
  );
}
