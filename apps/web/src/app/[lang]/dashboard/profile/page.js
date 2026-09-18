import { titleMetadata } from '@/brand/pageMetadata';
import { ProfileForm } from '@/components/dashboard/profileForm';

export const generateMetadata = titleMetadata((dictionary) => dictionary.dashboard.profile.metadataTitle);

export default function DashboardProfilePage() {
  return <ProfileForm />;
}
