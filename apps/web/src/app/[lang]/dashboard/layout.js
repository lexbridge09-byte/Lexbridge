import { redirect } from 'next/navigation';
import { getDictionary, getServerFeatures, requireFeaturePage } from '@/brand';
import { loadAuthedUser } from '@/lib/serverApi';
import { deriveHomePath } from '@/lib/safeRedirect';
import { OfficeSidebar } from '@/components/officeSidebar';
import { Container } from '@/components/ui';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dashboardName = getDictionary(lang).common.brand.dashboardName;
  return { title: { default: dashboardName, template: `%s | ${dashboardName}` }, robots: { index: false, follow: false } };
}

export default async function DashboardLayout({ children, params }) {
  await requireFeaturePage('clientAccounts');
  const { lang } = await params;
  const dictionary = getDictionary(lang);
  const features = await getServerFeatures();

  // One account, one view: team members never see the client dashboard — send them to their own area
  const viewer = await loadAuthedUser();
  if (viewer && viewer.Role !== 'client') {
    redirect(`/${lang}${deriveHomePath(viewer)}`);
  }

  const copy = dictionary.dashboard;
  const links = [
    { href: '/dashboard', label: copy.nav.overview, exact: true },
    { href: '/dashboard/requests', label: copy.nav.requests },
    { href: '/dashboard/orders', label: dictionary.commerce.orders.title, feature: 'onlinePayments' },
    { href: '/dashboard/consultations', label: copy.nav.consultations, feature: 'consultationBooking' },
    { href: '/dashboard/document-reviews', label: dictionary.documentReview.list.navLabel, feature: 'aiDocumentReview' },
    { href: '/dashboard/documents', label: copy.nav.documents, feature: 'documentUploads' },
    { href: '/dashboard/profile', label: copy.nav.profile },
  ].filter((link) => !link.feature || features[link.feature]);

  return (
    <div className="bg-surface-alt flex">
      <OfficeSidebar label={copy.navLabel} links={links} />
      <div className="min-w-0 flex-1">
        <Container className="py-4 lg:py-6">{children}</Container>
      </div>
    </div>
  );
}
