import { Inter, Noto_Sans_Devanagari, Plus_Jakarta_Sans } from 'next/font/google';
import { notFound } from 'next/navigation';
import { getDictionary, getMobileTabs, getPrimaryCta, isFeatureEnabled, isSupportedLocale, LOCALE_TAGS, SUPPORTED_LOCALES } from '@/brand';
import { LocaleProvider } from '@/brand/localeProviders';
import { MobileTabBar } from '@/components/mobileTabBar';
import { PromoStrip } from '@/components/promoStrip';
import { ScrollChrome } from '@/components/scrollChrome';
import { SiteFooter } from '@/components/siteFooter';
import { SiteHeader } from '@/components/siteHeader';
import { StickyActionBar } from '@/components/stickyActionBar';
import { WhatsAppButton } from '@/components/whatsAppButton';
import { deriveWhatsAppHref } from '@/lib/publicContact';
import '../globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
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

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const brand = getDictionary(lang).common.brand;
  return {
    title: { default: brand.metaTitle, template: '%s | LexBridge' },
    description: brand.metaDescription,
    alternates: { languages: Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [LOCALE_TAGS[locale], `/${locale}`])) },
  };
}

export const viewport = {
  themeColor: '#2e0716',
  viewportFit: 'cover',
};

export default async function RootLayout({ children, params }) {
  const { lang } = await params;
  if (!isSupportedLocale(lang)) notFound();
  const dictionary = getDictionary(lang);
  const primaryCta = getPrimaryCta(dictionary);

  return (
    <html lang={LOCALE_TAGS[lang]} className={`${jakarta.variable} ${inter.variable} ${devanagari.variable} antialiased`}>
      <body className="flex min-h-screen flex-col">
        {/* Each language provider ships only its own dictionary to the browser */}
        <LocaleProvider locale={lang}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
          >
            {dictionary.common.skipToContent}
          </a>
          <PromoStrip promo={dictionary.common.promo} />
          <ScrollChrome label={dictionary.common.scrollTop} />
          <SiteHeader dictionary={dictionary} locale={lang} />
          <main id="main" tabIndex={-1} className="flex-1 outline-none">
            {children}
          </main>
          <SiteFooter dictionary={dictionary} />
          <StickyActionBar
            cta={primaryCta}
            label={dictionary.common.stickyBar.label}
            title={dictionary.common.stickyBar.title}
            note={primaryCta.note}
            hasCallback={isFeatureEnabled('callbackRequests')}
          />
          <MobileTabBar tabs={getMobileTabs(dictionary)} label={dictionary.common.tabs.label} />
          {isFeatureEnabled('whatsAppChatButton') && (
            <WhatsAppButton
              href={deriveWhatsAppHref(dictionary.whatsapp.greeting)}
              label={dictionary.whatsapp.button.label}
              text={dictionary.whatsapp.button.text}
            />
          )}
        </LocaleProvider>
      </body>
    </html>
  );
}
