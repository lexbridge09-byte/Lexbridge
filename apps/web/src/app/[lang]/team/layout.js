import { getDictionary } from '@/brand';
import { SectionNav } from '@/components/sectionNav';
import { SignOutButton } from '@/components/signOutButton';
import { Container } from '@/components/ui';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const title = getDictionary(lang).team.metadataTitle;
  return { title: { default: title, template: `%s | LexBridge ${title}` }, robots: { index: false, follow: false } };
}

export default async function TeamLayout({ children, params }) {
  const { lang } = await params;
  const copy = getDictionary(lang).team;
  const links = [{ href: '/team', label: copy.nav.assignments, exact: true }];

  return (
    <div className="min-h-[60vh] bg-surface-alt">
      <SectionNav
        label={copy.navLabel}
        orientation="horizontal"
        links={links}
        footer={<SignOutButton className="whitespace-nowrap py-3 text-sm font-semibold text-ink-muted hover:text-ink" />}
      />
      <Container className="py-5 lg:py-7">{children}</Container>
    </div>
  );
}
