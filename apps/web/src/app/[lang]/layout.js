import { Cormorant_Garamond, Inter, Noto_Sans_Devanagari } from 'next/font/google';
import { notFound } from 'next/navigation';
import { ViewTransition } from 'react';
import { getDictionary, getMobileTabs, getPrimaryCta, getServerFeatures, isSupportedLocale, LOCALE_TAGS, SUPPORTED_LOCALES } from '@/brand';
import { LocaleProvider } from '@/brand/localeProviders';
import { FeaturesProvider } from '@/components/featuresProvider';
import { HideOnOffice, OfficeHeader } from '@/components/officeChrome';
import { MobileTabBar } from '@/components/mobileTabBar';
import { PromoStrip } from '@/components/promoStrip';
import { ScrollChrome } from '@/components/scrollChrome';
import { SiteFooter } from '@/components/siteFooter';
import { SiteHeader } from '@/components/siteHeader';
import { StickyActionBar } from '@/components/stickyActionBar';
import { HideOnTask, TaskFooter, TaskHeader } from '@/components/taskChrome';
import { WhatsAppButton } from '@/components/whatsAppButton';
import { deriveWhatsAppHref } from '@/lib/publicContact';
import '../globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Wordmark serif, matched to the logo lettering
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

// Only downloaded when Devanagari glyphs are on the page
const devanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-devanagari',
  display: 'swap',
  preload: false,
});

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((lang) => ({ lang }));
}

export const dynamicParams = false;

/*
  Feature switches are read from the API database on every request (the owner's kill-switch at
  /admin/features), so nothing under this layout can be statically prerendered.
*/
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const brand = getDictionary(lang).common.brand;
  return {
    title: { default: brand.metaTitle, template: '%s | LexBridge Consultants' },
    description: brand.metaDescription,
    alternates: { languages: Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [LOCALE_TAGS[locale], `/${locale}`])) },
  };
}

export const viewport = {
  themeColor: '#12141b',
  viewportFit: 'cover',
};

export default async function RootLayout({ children, params }) {
  const { lang } = await params;
  if (!isSupportedLocale(lang)) notFound();
  const dictionary = getDictionary(lang);
  const features = await getServerFeatures();
  const primaryCta = getPrimaryCta(dictionary, features);

  return (
    <html lang={LOCALE_TAGS[lang]} className={`${inter.variable} ${cormorant.variable} ${devanagari.variable} antialiased`}>
      <body className="flex min-h-screen flex-col">
        {/* Each language provider ships only its own dictionary to the browser */}
        <LocaleProvider locale={lang}>
          <FeaturesProvider features={features}>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
            >
              {dictionary.common.skipToContent}
            </a>
            <HideOnOffice><HideOnTask><PromoStrip promo={dictionary.common.promo} /></HideOnTask></HideOnOffice>
            <ScrollChrome label={dictionary.common.scrollTop} />
            <HideOnOffice><HideOnTask><SiteHeader dictionary={dictionary} locale={lang} /></HideOnTask></HideOnOffice>
            <TaskHeader />
            <OfficeHeader />
            {/* Quiet cross-fade between pages (Next View Transitions; RM-disabled in globals.css) */}
            <ViewTransition>
              <main id="main" tabIndex={-1} className="flex-1 outline-none">
                {children}
              </main>
            </ViewTransition>
            <HideOnOffice><HideOnTask><SiteFooter dictionary={dictionary} /></HideOnTask></HideOnOffice>
            <TaskFooter />
            <HideOnOffice><StickyActionBar
              cta={primaryCta}
              label={dictionary.common.stickyBar.label}
              title={dictionary.common.stickyBar.title}
              note={primaryCta.note}
              hasCallback={Boolean(features.callbackRequests)}
            /></HideOnOffice>
            <HideOnOffice><MobileTabBar tabs={getMobileTabs(dictionary, features)} label={dictionary.common.tabs.label} /></HideOnOffice>
            <HideOnOffice><HideOnTask>
            {features.whatsAppChatButton && (
              <WhatsAppButton
                href={deriveWhatsAppHref(dictionary.whatsapp.greeting)}
                label={dictionary.whatsapp.button.label}
                text={dictionary.whatsapp.button.text}
              />
            )}
            </HideOnTask></HideOnOffice>
          </FeaturesProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
