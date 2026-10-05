import { redirect } from 'next/navigation';
import { getDictionary, getServerFeatures } from '@/brand';
import { loadAuthedUser } from '@/lib/serverApi';
import { OfficeSidebar } from '@/components/officeSidebar';
import { Container } from '@/components/ui';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const title = getDictionary(lang).admin.metadataTitle;
  return { title: { default: title, template: `%s | LexBridge ${title}` }, robots: { index: false, follow: false } };
}

export default async function AdminLayout({ children, params }) {
  const { lang } = await params;
  const dictionary = getDictionary(lang);
  const features = await getServerFeatures();

  // The back office is the main owner's area. Managers work in /team, clients in /dashboard.
  const viewer = await loadAuthedUser();
  if (!viewer) redirect(`/${lang}/login?next=/${lang}/admin`);
  if (viewer.Role !== 'owner') redirect(`/${lang}${viewer.Role === 'client' ? '/dashboard' : '/team'}`);

  const copy = dictionary.admin;
  const commerceNav = dictionary.adminCommerce.nav;
  const links = [
    { href: '/admin', label: copy.nav.overview, exact: true },
    { href: '/admin/requests', label: copy.nav.requests },
    { href: '/admin/orders', label: commerceNav.orders, feature: 'onlinePayments' },
    { href: '/admin/callbacks', label: commerceNav.callbacks, feature: 'callbackRequests' },
    { href: '/admin/consultations', label: copy.nav.consultations, feature: 'consultationBooking' },
    { href: '/admin/slots', label: copy.nav.slots, feature: 'consultationBooking' },
    { href: '/admin/products', label: commerceNav.products, feature: 'serviceCatalog' },
    { href: '/admin/coupons', label: commerceNav.coupons, feature: 'coupons' },
    { href: '/admin/document-reviews', label: commerceNav.documentReviews, feature: 'aiDocumentReview' },
    { href: '/admin/articles', label: copy.nav.articles, feature: 'legalInsights' },
    { href: '/admin/whatsapp', label: copy.nav.whatsapp, feature: 'whatsAppAiAssistant' },
    { href: '/admin/users', label: copy.nav.users },
    { href: '/admin/features', label: copy.nav.features },
  ].filter((link) => !link.feature || features[link.feature]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface-alt flex">
      <OfficeSidebar label={copy.navLabel} links={links} />
      <div className="min-w-0 flex-1">
        <Container className="py-4 lg:py-6">{children}</Container>
      </div>
    </div>
  );
}
