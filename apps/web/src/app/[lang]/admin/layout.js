import { getDictionary, getServerFeatures } from '@/brand';
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
  const features = await getServerFeatures();
  const copy = dictionary.admin;
  const commerceNav = dictionary.adminCommerce.nav;
  const links = [
    { href: '/admin', label: copy.nav.overview, exact: true, roles: ['owner'] },
    { href: '/admin/requests', label: copy.nav.requests, roles: ['owner', 'manager'] },
    { href: '/admin/orders', label: commerceNav.orders, feature: 'onlinePayments', roles: ['owner'] },
    { href: '/admin/callbacks', label: commerceNav.callbacks, feature: 'callbackRequests', roles: ['owner'] },
    { href: '/admin/consultations', label: copy.nav.consultations, feature: 'consultationBooking', roles: ['owner'] },
    { href: '/admin/slots', label: copy.nav.slots, feature: 'consultationBooking', roles: ['owner'] },
    { href: '/admin/products', label: commerceNav.products, feature: 'serviceCatalog', roles: ['owner'] },
    { href: '/admin/coupons', label: commerceNav.coupons, feature: 'coupons', roles: ['owner'] },
    { href: '/admin/document-reviews', label: commerceNav.documentReviews, feature: 'aiDocumentReview', roles: ['owner'] },
    { href: '/admin/articles', label: copy.nav.articles, feature: 'legalInsights', roles: ['owner'] },
    { href: '/admin/whatsapp', label: copy.nav.whatsapp, feature: 'whatsAppAiAssistant', roles: ['owner'] },
    { href: '/admin/users', label: copy.nav.users, roles: ['owner'] },
    { href: '/admin/features', label: copy.nav.features, roles: ['owner'] },
  ].filter((link) => (!link.feature || features[link.feature]) && (!link.roles || link.roles.length > 0));

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
