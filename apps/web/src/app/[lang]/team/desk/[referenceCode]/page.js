import { redirect } from 'next/navigation';
import { getDictionary } from '@/brand';
import { loadAuthedUser } from '@/lib/serverApi';
import { AdminRequestDetail } from '@/components/admin/adminRequestDetail';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return { title: getDictionary(lang).team.desk.metadataTitle };
}

export default async function TeamDeskRequestDetailPage({ params }) {
  const { lang, referenceCode } = await params;
  // The desk is the 2nd owner's area; lawyers only see their assignments
  const viewer = await loadAuthedUser();
  if (!viewer) redirect(`/${lang}/login?next=/${lang}/team/desk`);
  if (viewer.Role !== 'manager') redirect(`/${lang}${viewer.Role === 'owner' ? '/admin' : '/team'}`);
  return (
    <AdminRequestDetail
      referenceCode={referenceCode}
      basePath="/team/desk/requests"
      backHref="/team/desk"
      teamSourcePath="/team/lawyers"
    />
  );
}
