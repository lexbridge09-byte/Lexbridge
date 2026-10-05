import { redirect } from 'next/navigation';
import { getDictionary } from '@/brand';
import { loadAuthedUser } from '@/lib/serverApi';
import { LawyersPanel } from '@/components/team/lawyersPanel';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return { title: getDictionary(lang).team.lawyers.metadataTitle };
}

export default async function TeamLawyersPage({ params }) {
  const { lang } = await params;
  // Lawyer onboarding is the 2nd owner's job; lawyers only see their assignments
  const viewer = await loadAuthedUser();
  if (!viewer) redirect(`/${lang}/login?next=/${lang}/team/lawyers`);
  if (viewer.Role !== 'manager') redirect(`/${lang}${viewer.Role === 'owner' ? '/admin' : '/team'}`);
  return <LawyersPanel />;
}
