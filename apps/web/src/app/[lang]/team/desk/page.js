import { redirect } from 'next/navigation';
import { getDictionary } from '@/brand';
import { loadAuthedUser } from '@/lib/serverApi';
import { AdminRequests } from '@/components/admin/adminRequests';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return { title: getDictionary(lang).team.desk.metadataTitle };
}

export default async function TeamDeskPage({ params }) {
  const { lang } = await params;
  // The desk is the 2nd owner's area; lawyers only see their assignments
  const viewer = await loadAuthedUser();
  if (!viewer) redirect(`/${lang}/login?next=/${lang}/team/desk`);
  if (viewer.Role !== 'manager') redirect(`/${lang}${viewer.Role === 'owner' ? '/admin' : '/team'}`);
  const copy = getDictionary(lang).team.desk;
  return (
    <AdminRequests
      basePath="/team/desk/requests"
      detailHrefBase="/team/desk"
      heading={{ title: copy.title, description: copy.description }}
    />
  );
}
