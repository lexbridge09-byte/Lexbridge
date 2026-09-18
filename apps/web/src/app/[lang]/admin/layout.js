import { getDictionary, isFeatureEnabled } from '@/brand';
import { SectionNav } from '@/components/sectionNav';
import { SignOutButton } from '@/components/signOutButton';
import { Container } from '@/components/ui';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const title = getDictionary(lang).admin.metadataTitle;
  return { title: { default: title, template: `%s | LexBridge ${title}` }, robots: { index: false, follow: false } };
}

export default async function AdminLayout({ children, params }) {
  const { lang } = await params;
  const dictionary = getDictionary(lang);
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
  ].filter((link) => !link.feature || isFeatureEnabled(link.feature));

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
