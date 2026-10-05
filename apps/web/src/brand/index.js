/*
  Brand folder: everything that makes the website "LexBridge" lives here.

  - brandConfig.js       Language-neutral settings: trust claims, company details, problems, situations, thresholds
  - copy/en, copy/hi     Every user-facing string, one module per area, identical shapes per language
                         (checked by `pnpm --filter @lexbridge/web check:i18n`)
  - locales.js           Locale constants and path helpers (client-safe, no dictionaries)
  - i18n.js              getDictionary(locale) for server components (loads every language)
  - serverI18n.js        getRequestLocale() / getRequestDictionary() for server components (not exported here)
  - localeContext.js     useLocale(), useDictionary() for client components (not exported here)
  - localeProviderEn/Hi  Per-language providers so the browser only downloads the active language
  - navigation.js        Menus, mega menu situations, tabs, footer links and primary actions (feature-flag aware)
  - faq.js               FAQ selection with feature filtering
  - runtimeFlags.js      Per-request runtime feature switches fetched from the API (server components)
  - feature flags        Static build defaults re-exported from @lexbridge/shared; the runtime switches
                         live in the API's database and are toggled by the owner at /admin/features

  Client components must import from '@/brand/locales', '@/brand/navigation', '@/brand/brandConfig',
  '@/components/featuresProvider' or '@lexbridge/shared' directly, never from this barrel (it exports
  the server dictionary lookup).
  To change a build default, flip it in packages/shared/src/brand/featureFlags.js.
*/
export { BRAND } from './brandConfig.js';
export { FEATURE_FLAGS, FEATURE_FLAG_KEYS, FEATURE_DEPENDENCIES, isFeatureEnabled, getEnabledFeatures } from '@lexbridge/shared';
export { getServerFeatures } from './runtimeFlags.js';
export { requireFeaturePage } from './requireFeaturePage.js';
export { getFaqItems } from './faq.js';
export { getDictionary } from './i18n.js';
export {
  DEFAULT_LOCALE,
  getLocaleFromPathname,
  getLocaleTag,
  isSupportedLocale,
  LOCALE_COOKIE_NAME,
  LOCALE_LABELS,
  LOCALE_TAGS,
  localizedHref,
  stripLocale,
  SUPPORTED_LOCALES,
} from './locales.js';
export {
  deriveProblemHref,
  deriveServiceHref,
  getAccountLink,
  getFooterGroups,
  getLegalLinks,
  getMobileTabs,
  getPrimaryCta,
  getPrimaryNav,
  getProblemShortcuts,
  getSecondaryCta,
  getServiceMenuItems,
  getSituationGroups,
  SERVICE_DISPLAY_ORDER,
} from './navigation.js';
