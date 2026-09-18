import { notFound } from 'next/navigation';
import { getDictionary, requireFeaturePage } from '@/brand';
import { CheckoutForm } from '@/components/commerce/checkoutForm';
import { LocaleLink } from '@/components/localeLink';
import { Section } from '@/components/ui';
import { loadPublicApi } from '@/lib/serverApi';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return { title: getDictionary(lang).commerce.checkout.metadata.title, robots: { index: false, follow: false } };
}

export default async function CheckoutPage({ params }) {
  requireFeaturePage('onlinePayments');
  const { lang, slug } = await params;
  const copy = getDictionary(lang).commerce.checkout;
  const { status, data } = await loadPublicApi(`/products/${encodeURIComponent(slug)}`);
  if (status === 404) notFound();
  const product = data?.product;
  if (!product) throw new Error(`Product ${slug} could not be loaded (status ${status})`);

  return (
    <Section tone="alt" size="sm">
      <LocaleLink href={`/services/${product.Slug}`} className="text-sm font-semibold text-primary hover:underline">
        ← {copy.backToService}
      </LocaleLink>
      <h1 className="mb-5 mt-2 text-h2 text-ink">{copy.title}</h1>
      <CheckoutForm product={product} />
    </Section>
  );
}
