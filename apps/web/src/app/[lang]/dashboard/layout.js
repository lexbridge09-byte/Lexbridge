import { getDictionary, isFeatureEnabled, requireFeaturePage } from '@/brand';
import { SectionNav } from '@/components/sectionNav';
import { SignOutButton } from '@/components/signOutButton';
import { Container } from '@/components/ui';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dashboardName = getDictionary(lang).common.brand.dashboardName;
  return { title: { default: dashboardName, template: `%s | ${dashboardName}` }, robots: { index: false, follow: false } };
}

export default async function DashboardLayout({ children, params }) {
  requireFeaturePage('clientAccounts');
  const { lang } = await params;
  const dictionary = getDictionary(lang);
  const copy = dictionary.dashboard;
  const links = [
    { href: '/dashboard', label: copy.nav.overview, exact: true },
    { href: '/dashboard/requests', label: copy.nav.requests },
    { href: '/dashboard/orders', label: dictionary.commerce.orders.title, feature: 'onlinePayments' },
    { href: '/dashboard/consultations', label: copy.nav.consultations, feature: 'consultationBooking' },
    { href: '/dashboard/document-reviews', label: dictionary.documentReview.list.navLabel, feature: 'aiDocumentReview' },
    { href: '/dashboard/documents', label: copy.nav.documents, feature: 'documentUploads' },
    { href: '/dashboard/profile', label: copy.nav.profile },
  ].filter((link) => !link.feature || isFeatureEnabled(link.feature));

  return (
    <div className="bg-surface-alt">
      <Container className="py-5 lg:grid lg:grid-cols-[14rem_1fr] lg:gap-8 lg:py-8">
        <SectionNav
          label={copy.navLabel}
          links={links}
          footer={
            <SignOutButton className="whitespace-nowrap rounded-full bg-surface-alt px-4 py-2 text-sm font-semibold text-ink-muted hover:text-ink lg:w-full lg:rounded-xl lg:bg-transparent lg:px-3 lg:py-2.5 lg:hover:bg-surface-alt" />
          }
        />
        <div className="min-w-0">{children}</div>
      </Container>
    </div>
  );
}
