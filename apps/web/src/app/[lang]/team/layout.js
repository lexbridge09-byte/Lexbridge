import { redirect } from 'next/navigation';
import { getDictionary } from '@/brand';
import { loadAuthedUser } from '@/lib/serverApi';
import { OfficeSidebar } from '@/components/officeSidebar';
import { Container } from '@/components/ui';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const title = getDictionary(lang).team.metadataTitle;
  return { title: { default: title, template: `%s | LexBridge ${title}` }, robots: { index: false, follow: false } };
}

export default async function TeamLayout({ children, params }) {
  const { lang } = await params;
  const copy = getDictionary(lang).team;

  // One account, one view: the main owner works in /admin, clients in /dashboard.
  const viewer = await loadAuthedUser();
  if (!viewer) redirect(`/${lang}/login?next=/${lang}/team`);
  if (viewer.Role === 'owner') redirect(`/${lang}/admin`);
  if (viewer.Role === 'client') redirect(`/${lang}/dashboard`);

  const links = [
    { href: '/team', label: copy.nav.assignments, exact: true },
    viewer.Role === 'manager' && { href: '/team/desk', label: copy.nav.desk },
    viewer.Role === 'manager' && { href: '/team/lawyers', label: copy.nav.lawyers },
  ].filter(Boolean);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface-alt flex">
      <OfficeSidebar label={copy.navLabel} links={links} />
      <div className="min-w-0 flex-1">
        <Container className="py-4 lg:py-6">{children}</Container>
      </div>
    </div>
  );
}
