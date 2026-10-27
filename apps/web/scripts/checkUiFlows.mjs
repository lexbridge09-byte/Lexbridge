// Dependency-free component/handler regressions using the installed Next compiler.
// This exercises source modules, not source-text patterns. Browser layout needs a separate smoke pass.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const { transformSync } = require('next/dist/build/swc');
let checkCount = 0;

// motion/react under the hook harness: motion.div → 'div', presence is a passthrough, motion is reduced
const MOTION_MOCK = {
  motion: new Proxy({}, { get: (_target, tag) => tag }),
  AnimatePresence: 'AnimatePresence',
  useReducedMotion: () => true,
};

function loadSource(relativePath, mocks = {}, globals = {}) {
  const filename = new URL(`../src/${relativePath}`, import.meta.url);
  const source = process.argv.includes('--baseline')
    ? execFileSync('git', ['show', `HEAD:apps/web/src/${relativePath}`], { encoding: 'utf8' })
    : readFileSync(filename, 'utf8');
  const { code } = transformSync(source, {
    filename: filename.pathname,
    jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } },
    module: { type: 'commonjs' },
  });
  const loadedModule = { exports: {} };
  const loadDependency = (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
  new Function('require', 'module', 'exports', ...Object.keys(globals), code)(
    loadDependency, loadedModule, loadedModule.exports, ...Object.values(globals),
  );
  return loadedModule.exports;
}

function createHookHarness() {
  const values = [];
  const effects = [];
  let cursor = 0;
  let hasRenderUpdate = false;
  let pendingEffects = [];
  const hasSameDeps = (left, right) => left && right && left.length === right.length && left.every((value, i) => Object.is(value, right[i]));
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial;
      return [values[index], (update) => {
        const next = typeof update === 'function' ? update(values[index]) : update;
        if (!Object.is(next, values[index])) { values[index] = next; hasRenderUpdate = true; }
      }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in values)) values[index] = { current: initial };
      return values[index];
    },
    useCallback(callback, deps) {
      const index = cursor++;
      if (!hasSameDeps(values[index]?.deps, deps)) values[index] = { callback, deps };
      return values[index].callback;
    },
    useMemo(factory, deps) {
      const index = cursor++;
      if (!hasSameDeps(values[index]?.deps, deps)) values[index] = { value: factory(), deps };
      return values[index].value;
    },
    useEffect(callback, deps) {
      const index = cursor++;
      if (!hasSameDeps(effects[index]?.deps, deps)) pendingEffects.push({ index, callback, deps });
    },
    useEffectEvent(callback) {
      const ref = react.useRef(callback);
      ref.current = callback;
      return react.useCallback((...args) => ref.current(...args), []);
    },
    useId() { return react.useRef(`test-id-${cursor}`).current; },
  };
  return {
    react,
    render(component, beforeEffects = () => {}) {
      let output;
      let attempts = 0;
      do {
        cursor = 0;
        hasRenderUpdate = false;
        pendingEffects = [];
        output = component();
        assert.ok(++attempts < 20, 'render updates must settle');
      } while (hasRenderUpdate);
      beforeEffects(output);
      for (const { index, callback, deps } of pendingEffects) {
        effects[index]?.cleanup?.();
        effects[index] = { deps, cleanup: callback() };
      }
      return output;
    },
    unmount() { effects.forEach((effect) => effect?.cleanup?.()); },
  };
}

function findNode(tree, predicate) {
  if (!tree || typeof tree !== 'object') return null;
  if (Array.isArray(tree)) return tree.map((child) => findNode(child, predicate)).find(Boolean) ?? null;
  if (predicate(tree)) return tree;
  return findNode(tree.props?.children, predicate);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));
function pass(name) { console.log(`PASS ${name}`); checkCount += 1; }

// All link variants must keep their labels; an internal CTA without children looks like a broken button.
const { Button, ButtonLink } = loadSource('components/ui/button.js', {
  '@/components/localeLink': { LocaleLink: ({ href, ...props }) => createElement('a', { href: `/en${href}`, ...props }) },
});
for (const props of [{ href: '/services' }, { href: '#details' }, { href: 'https://example.test', isExternal: true }]) {
  const html = renderToStaticMarkup(createElement(ButtonLink, props, 'Continue'));
  assert.match(html, />Continue<\/a>/);
}
assert.match(renderToStaticMarkup(createElement(Button, null, 'Back')), /type="button"/);
assert.match(renderToStaticMarkup(createElement(Button, { isLoading: true }, 'Save')), /aria-busy="true"/);
pass('internal, hash and external button links retain labels; actions do not submit by default');

// Data must survive a same-resource refresh, never a route or disabled-resource boundary.
{
  const hooks = createHookHarness();
  const requests = [];
  const { useApiData } = loadSource('lib/useApiData.js', {
    react: hooks.react,
    '@/brand/locales': { DEFAULT_LOCALE: 'en', getLocaleFromPathname: () => 'en' },
    '@/lib/safeRedirect': { deriveLoginHref: (path) => `/en/login?next=${path}` },
    '@/lib/apiClient': { requestApi: (path) => { const request = deferred(); requests.push({ path, ...request }); return request.promise; } },
  });
  const render = (path) => hooks.render(() => useApiData(path));
  assert.equal(render('/orders/A').isLoading, true);
  requests[0].resolve({ id: 'A' });
  await flush();
  let state = render('/orders/A');
  assert.equal(state.data.id, 'A');
  state.reload();
  state = render('/orders/A');
  assert.equal(state.data.id, 'A');
  assert.equal(state.isLoading, true);
  assert.equal(render('/orders/B').data, null);
  requests[1].resolve({ id: 'late A' });
  await flush();
  assert.equal(render('/orders/B').data, null);
  requests[2].resolve({ id: 'B' });
  await flush();
  assert.equal(render('/orders/B').data.id, 'B');
  assert.equal(render(null).data, null);
  assert.equal(render('/orders/B').data, null);
  requests[3].reject(Object.assign(new Error('Offline'), { status: 0 }));
  await flush();
  state = render('/orders/B');
  assert.equal(state.isLoading, false);
  assert.equal(state.error.status, 0);
  state.reload();
  assert.equal(render('/orders/B').error, null);
  hooks.unmount();
  pass('resource changes, disabled requests, out-of-order responses, refresh and retry states');
}

// Execute the real checkout handlers with deferred auth and mocked payment/API boundaries.
{
  const hooks = createHookHarness();
  const auth = deferred();
  const { commerce } = loadSource('brand/copy/en/commerce.js');
  const dictionary = { commerce, ux: { steps: { label: 'Progress', checkout: ['Details', 'Pay', 'Done'] }, checkoutTrust: {} } };
  const calls = [];
  const destinations = [];
  let paymentCount = 0;
  let hasVerificationFailed = false;
  const payment = { order: { ReferenceCode: 'TEST-ORDER' }, checkout: { razorpayOrderId: 'order_test' } };
  const signedResponse = { razorpay_order_id: 'order_test', razorpay_payment_id: 'pay_test', razorpay_signature: 'test-only' };
  const { CheckoutForm } = loadSource('components/commerce/checkoutForm.js', {
    react: hooks.react,
    'next/navigation': { useRouter: () => ({ push: (href) => destinations.push(href) }) },
    '@/brand/localeContext': { useDictionary: () => dictionary, useLocalizedHref: () => (href) => `/en${href}` },
    '@/components/formFields': { TextField: 'TextField', TextAreaField: 'TextAreaField', CheckboxField: 'CheckboxField' },
    '@/components/languageSelectField': { LanguageSelectField: 'LanguageSelectField' },
    '@/components/localeLink': { LocaleLink: 'LocaleLink' },
    '@/components/ui': { Button: 'Button', Card: 'Card', InlineAlert: 'InlineAlert', StepIndicator: 'StepIndicator' },
    '@/components/whatsAppOptInField': { WhatsAppOptInField: 'WhatsAppOptInField' },
    '@/components/featuresProvider': { useIsFeatureEnabled: () => false },
    '@/lib/apiErrors': { localizeApiError: (error) => error.message, localizeFieldErrors: () => ({}) },
    '@/lib/localeTools': { useFormatters: () => ({ rupees: (paise) => `INR ${paise / 100}` }) },
    '@/lib/apiClient': { requestApi: async (path, options) => {
      if (path === '/auth/me') return auth.promise;
      calls.push({ path, options });
      if (path === '/checkout/orders') return payment;
      if (path === '/checkout/verify') {
        if (!hasVerificationFailed) { hasVerificationFailed = true; throw new Error('Offline'); }
        return { order: payment.order };
      }
      throw new Error(`Unexpected API call: ${path}`);
    } },
    '@/lib/razorpay': { openRazorpayCheckout: async () => {
      paymentCount += 1;
      return paymentCount === 1 ? { outcome: 'dismissed' } : { outcome: 'paid', response: signedResponse };
    } },
  }, { FormData: class { constructor(form) { this.form = form; } get(key) { return this.form[key] ?? null; } } });
  const render = () => hooks.render(() => CheckoutForm({ product: { Slug: 'rent-agreement', Title: 'Rent agreement', PricePaise: 49900 } }));
  let tree = render();
  findNode(tree, (node) => node.props?.name === 'FullName').props.onChange({ target: { name: 'FullName', value: 'Typed name' } });
  auth.resolve({ user: { FullName: 'Account name', Email: 'client@example.test', Phone: '+919999999999' } });
  await flush();
  tree = render();
  assert.equal(findNode(tree, (node) => node.props?.name === 'FullName').props.value, 'Typed name');
  assert.equal(findNode(tree, (node) => node.props?.name === 'Email').props.value, 'client@example.test');
  const event = { preventDefault() {}, currentTarget: { ConsentGiven: 'on', FullName: 'Typed name', Email: 'client@example.test' } };
  const submit = findNode(tree, (node) => node.type === 'form').props.onSubmit;
  await Promise.all([submit(event), submit(event)]);
  assert.equal(calls.filter((call) => call.path === '/checkout/orders').length, 1);
  tree = render();
  assert.equal(findNode(tree, (node) => node.type === 'fieldset').props.disabled, true);
  await findNode(tree, (node) => node.type === 'form').props.onSubmit(event);
  assert.equal(paymentCount, 2);
  tree = render();
  assert.equal(findNode(tree, (node) => node.type === 'Button' && node.props.type === 'submit').props.children, commerce.checkout.verifyPayment);
  await findNode(tree, (node) => node.type === 'form').props.onSubmit(event);
  assert.equal(paymentCount, 2, 'verification retry must not reopen payment');
  assert.equal(calls.filter((call) => call.path === '/checkout/orders').length, 1);
  assert.equal(calls.filter((call) => call.path === '/checkout/verify').length, 2);
  assert.deepEqual(destinations, ['/en/checkout/success?reference=TEST-ORDER']);
  hooks.unmount();
  pass('checkout preserves typed details, deduplicates submits, reuses orders and retries verification without charging again');
}

// A changing parent callback must not close/reopen a dialog or reset focus mid-edit.
{
  const hooks = createHookHarness();
  let openCount = 0;
  let closeCount = 0;
  let focusCount = 0;
  let oldCallbackCount = 0;
  let newCallbackCount = 0;
  const listeners = {};
  const dialog = {
    open: false,
    showModal() { this.open = true; openCount += 1; },
    close() { this.open = false; closeCount += 1; },
    addEventListener(name, callback) { listeners[name] = callback; },
    removeEventListener(name) { delete listeners[name]; },
  };
  const document = { body: { style: { overflow: 'auto' } }, activeElement: { isConnected: true, focus() { focusCount += 1; } } };
  const { Modal } = loadSource('components/ui/modal.js', {
    react: hooks.react,
    '@/brand/localeContext': { useDictionary: () => ({ common: { close: 'Close' } }) },
  }, { document });
  const render = (onClose) => hooks.render(() => Modal({ title: 'Upload a document', onClose, children: 'Content' }), (tree) => { tree.props.ref.current = dialog; });
  let tree = render(() => { oldCallbackCount += 1; });
  tree = render(() => { newCallbackCount += 1; });
  assert.equal(openCount, 1);
  assert.equal(closeCount, 0);
  assert.equal(document.body.style.overflow, 'hidden');
  assert.equal(tree.props['aria-labelledby'], findNode(tree, (node) => node.type === 'h2').props.id);
  listeners.cancel({ preventDefault() {} });
  assert.equal(oldCallbackCount, 0);
  assert.equal(newCallbackCount, 1);
  hooks.unmount();
  assert.equal(closeCount, 1);
  assert.equal(focusCount, 1);
  assert.equal(document.body.style.overflow, 'auto');
  pass('modal keeps focus across parent updates, uses latest close callback and restores focus/scroll on unmount');
}

// The native disclosure is keyed by pathname: listeners must follow the new DOM node.
{
  const hooks = createHookHarness();
  const listeners = {};
  let pathname = '/en';
  let focusCount = 0;
  const document = {
    addEventListener(name, callback) { listeners[name] = callback; },
    removeEventListener(name) { delete listeners[name]; },
  };
  const createMenu = () => ({ open: true, contains: () => false, querySelector: () => ({ focus() { focusCount += 1; } }) });
  let menu = createMenu();
  const { MobileMenu } = loadSource('components/mobileMenu.js', {
    react: hooks.react,
    'next/navigation': { usePathname: () => pathname },
    '@/components/languageSwitcher': { LanguageSwitcher: 'LanguageSwitcher' },
    '@/components/localeLink': { LocaleLink: 'LocaleLink' },
    '@/components/ui': { ButtonLink: 'ButtonLink' },
  }, { document });
  const render = () => hooks.render(() => MobileMenu({ navItems: [], primaryCta: { href: '/consultation', label: 'Book' }, copy: {} }), (tree) => { tree.props.ref.current = menu; });
  render();
  listeners.keydown({ key: 'Escape' });
  assert.equal(menu.open, false);
  assert.equal(focusCount, 1);
  pathname = '/en/services';
  menu = createMenu();
  const tree = render();
  listeners.pointerdown({ target: {} });
  assert.equal(menu.open, false);
  menu.open = true;
  findNode(tree, (node) => node.type === 'div' && node.props.onClick).props.onClick({ target: { closest: () => ({}) } });
  assert.equal(menu.open, false);
  hooks.unmount();
  assert.equal(Object.keys(listeners).length, 0);
  pass('mobile menu dismissal survives route changes and includes primary CTA links');
}

// A denied localStorage read/write must not blank the entire staff/customer workspace.
{
  let notified = false;
  const { OfficeSidebar } = loadSource('components/officeSidebar.js', {
    react: {
      useCallback: (callback) => callback,
      useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
    },
    'next/navigation': { usePathname: () => '/en/dashboard' },
    '@/brand/locales': { stripLocale: () => '/dashboard' },
    '@/brand/localeContext': { useDictionary: () => ({ common: { expandSidebar: 'Expand', collapseSidebar: 'Collapse' } }) },
    '@/components/localeLink': { LocaleLink: 'LocaleLink' },
    '@/lib/session': { useSession: () => ({ status: 'signedOut' }) },
  }, {
    localStorage: { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); } },
    window: { innerWidth: 1200, dispatchEvent() { notified = true; } },
  });
  let tree = OfficeSidebar({ label: 'Account', links: [{ href: '/dashboard', label: 'Overview', exact: true }] });
  assert.ok(findNode(tree, (node) => node.type === 'details'));
  assert.equal(findNode(tree, (node) => node.type === 'summary').props.children[0], 'Overview');
  assert.equal(findNode(tree, (node) => node.type === 'LocaleLink').props['aria-current'], 'page');
  findNode(tree, (node) => node.type === 'button').props.onClick();
  assert.equal(notified, true);
  tree = OfficeSidebar({ label: 'Account', links: [] });
  assert.equal(findNode(tree, (node) => node.type === 'button').props['aria-expanded'], false);
  assert.match(findNode(tree, (node) => node.type === 'aside').props.className, /hidden.*md:flex/);
  pass('sidebar works without storage and provides separate mobile navigation');
}

const { StepIndicator } = loadSource('components/ui/stepIndicator.js');
const lightStepper = renderToStaticMarkup(createElement(StepIndicator, { label: 'Steps', steps: ['Details', 'Contact'], current: 1, surface: 'light' }));
assert.match(lightStepper, /class="text-ink">Details/);
assert.match(lightStepper, /aria-current="step"/);
pass('service-request step labels use the light-surface text palette');

// Invalid selections must be retryable, and repeated drops must not spend multiple review credits.
{
  const hooks = createHookHarness();
  const upload = deferred();
  const uploads = [];
  const destinations = [];
  const input = { value: 'selected.pdf' };
  const copy = { hint: () => 'PDF only', trust: () => 'Private', tooLarge: () => 'Too large', wrongType: 'Choose PDF', steps: ['Choose PDF', 'About it', 'Review'], uploadingPercent: () => 'Uploading' };
  const { DocumentReviewDropzone } = loadSource('components/documentReview/documentReviewDropzone.js', {
    react: hooks.react,
    '@lexbridge/shared': { DOCUMENT_MAX_BYTES: 1000, getIntakeFields: () => [] },
    'next/navigation': { useRouter: () => ({ push: (href) => destinations.push(href) }) },
    '@/brand/brandConfig': { BRAND: { documentReviewRetentionDays: 30 } },
    '@/brand/localeContext': {
      useLocale: () => 'en', useLocalizedHref: () => (href) => `/en${href}`,
      useDictionary: () => ({ documentReview: { dropzone: copy, list: { allowance: () => '3 remaining' } }, intake: {} }),
    },
    '@/components/formFields': { SelectField: 'SelectField', TextField: 'TextField' },
    '@/components/loadState': { FormMessage: 'FormMessage' },
    '@/components/ui': { Badge: 'Badge', Button: 'Button' },
    '@/lib/apiClient': { requestApi: async () => ({}) },
    '@/lib/apiErrors': { localizeApiError: (error) => error.message },
    '@/lib/localeTools': { useFormatters: () => ({ fileSize: () => '1 KB' }) },
    '@/lib/safeRedirect': { deriveLoginHref: () => '/en/login' },
    '@/lib/session': { useSession: () => ({ status: 'signedIn' }) },
    '@/lib/uploadClient': { uploadApiFile: (_path, form) => { uploads.push(form.entries); return upload.promise; } },
    'motion/react': MOTION_MOCK,
  }, { FormData: class { entries = []; append(key, value) { this.entries.push([key, value]); } } });
  const render = () => hooks.render(() => DocumentReviewDropzone({ allowance: { remaining: 3, limit: 3 } }), (tree) => {
    findNode(tree, (node) => node.type === 'input').props.ref.current = input;
  });
  let tree = render();
  await findNode(tree, (node) => node.type === 'input').props.onChange({ target: { files: [{ name: 'notes.txt', type: 'text/plain', size: 10 }] } });
  assert.equal(input.value, '');
  assert.equal(uploads.length, 0);
  // A valid PDF is held until the form is submitted; a double submit must upload once
  tree = render();
  findNode(tree, (node) => node.type === 'input').props.onChange({ target: { files: [{ name: 'agreement.pdf', type: 'application/pdf', size: 10 }] } });
  assert.equal(uploads.length, 0, 'choosing a file does not upload yet');
  const onSubmit = findNode(render(), (node) => node.type === 'form').props.onSubmit;
  const submitEvent = { preventDefault() {} };
  const firstUpload = onSubmit(submitEvent);
  await onSubmit(submitEvent);
  assert.equal(uploads.length, 1);
  assert.deepEqual(uploads[0].map(([key]) => key), ['IntakeSubtype', 'IntakeDetails', 'file']);
  upload.resolve({ review: { ReferenceCode: 'REVIEW-TEST' } });
  await firstUpload;
  assert.deepEqual(destinations, ['/en/dashboard/document-reviews/REVIEW-TEST']);
  hooks.unmount();
  pass('document review rejects wrong types for retry, uploads once on double submit and sends intake metadata before the file');
}

// Do not cancel a slow review request by polling again before its response arrives.
{
  const hooks = createHookHarness();
  const timers = new Map();
  let timerCount = 0;
  let reloadCount = 0;
  const reload = () => { reloadCount += 1; };
  let state = { data: { review: { Status: 'processing', ReferenceCode: 'REVIEW-TEST', OriginalName: 'Agreement.pdf', createdAt: new Date().toISOString() } }, isLoading: false, error: null, reload };
  const { DocumentReviewDetail } = loadSource('components/documentReview/documentReviewDetail.js', {
    react: hooks.react,
    '@/brand/localeContext': { useDictionary: () => ({ documentReview: { report: { stages: ['Reading', 'Checking', 'Reviewing', 'Preparing'] } } }) },
    '@/components/copyButton': { ReferenceCodeTag: 'ReferenceCodeTag' },
    '@/components/documentReview/documentReviewReport': { DocumentReviewReport: 'DocumentReviewReport' },
    '@/components/formFields': { CheckboxField: 'CheckboxField', TextAreaField: 'TextAreaField', TextField: 'TextField' },
    '@/components/languageSelectField': { LanguageSelectField: 'LanguageSelectField' },
    '@/components/loadState': { ErrorNote: 'ErrorNote', LoadingNote: 'LoadingNote' },
    '@/components/localeLink': { LocaleLink: 'LocaleLink' },
    '@/components/statusBadge': { DocumentReviewStatusBadge: 'DocumentReviewStatusBadge', RiskBadge: 'RiskBadge' },
    '@/components/ui': { Button: 'Button', ButtonLink: 'ButtonLink', Card: 'Card', InlineAlert: 'InlineAlert' },
    '@/components/whatsAppOptInField': { WhatsAppOptInField: 'WhatsAppOptInField' },
    '@/components/featuresProvider': { useIsFeatureEnabled: () => false },
    '@/lib/apiClient': { requestApi: async () => ({}) },
    '@/lib/apiErrors': { localizeApiError: () => '', localizeFieldErrors: () => ({}) },
    '@/lib/localeTools': { useFormatters: () => ({ dateTime: () => 'Today' }) },
    '@/lib/useApiData': { useApiData: () => state, redirectToLogin() {} },
  }, {
    setTimeout(callback) { const id = ++timerCount; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
  });
  const render = () => hooks.render(() => DocumentReviewDetail({ referenceCode: 'REVIEW-TEST' }));
  const tree = render();
  assert.equal(timers.size, 1);
  const progress = findNode(tree, (node) => node.type?.name === 'ReviewProgress');
  assert.equal(findNode(progress.type(progress.props), (node) => node.type === 'ol'), null);
  [...timers.values()][0]();
  assert.equal(reloadCount, 1);
  state = { ...state, isLoading: true };
  render();
  assert.equal(timers.size, 0);
  state = { ...state, isLoading: false };
  render();
  assert.equal(timers.size, 1);
  state = { ...state, data: { review: { ...state.data.review, Status: 'completed' } } };
  render();
  assert.equal(timers.size, 0);
  hooks.unmount();
  pass('document review waits for in-flight requests, stops polling on completion and avoids fabricated completion ticks');
}

// Booking and requirement submission are separate paths, not a dead-end empty calendar.
{
  const flowHelpers = loadSource('lib/consultationSlots.js');
  const base = { step: 1, hasChoice: true, selectedSlot: null, isLoaded: true, error: '', slotCount: 0 };
  // Steps: 1 choice, 2 matter, 3 time, 4 details. The request flow (no open times) skips time.
  assert.equal(flowHelpers.deriveConsultationFlow(base).nextStep, 2);
  assert.equal(flowHelpers.deriveConsultationFlow({ ...base, step: 2 }).nextStep, 4);
  assert.equal(flowHelpers.deriveConsultationFlow({ ...base, step: 4 }).currentStep, 3);
  assert.equal(flowHelpers.deriveConsultationFlow({ ...base, step: 3 }).activeStep, 4);
  assert.equal(flowHelpers.deriveConsultationFlow({ ...base, isLoaded: false }).isRequestFlow, false);
  assert.equal(flowHelpers.deriveConsultationFlow({ ...base, error: 'Offline' }).isAvailabilityReady, false);
  assert.equal(flowHelpers.deriveConsultationFlow({ ...base, step: 2, slotCount: 1 }).nextStep, 3);
  assert.equal(flowHelpers.deriveConsultationFlow({ ...base, step: 4, slotCount: 1 }).activeStep, 3);

  const shared = require('@lexbridge/shared');
  const { consultation } = loadSource('brand/copy/en/consultation.js');
  const { forms } = loadSource('brand/copy/en/forms.js');
  const { ux } = loadSource('brand/copy/en/ux.js');
  const { intake } = loadSource('brand/copy/en/intake.js');
  const dictionary = { consultation, forms, ux, intake };
  const formatValues = loadSource('lib/formatValues.js', { '@/brand/locales': { getLocaleTag: () => 'en-IN' } });
  const slot = { _id: 'test-slot', StartsAt: '2027-01-20T10:00:00.000Z', DurationMinutes: 30 };
  const event = { preventDefault() {} };

  function createBookingScenario({ slots = [], user = null, hasConflict = false, isDeferred = false, hasAvailabilityError = false } = {}) {
    const hooks = createHookHarness();
    const calls = [];
    const availability = deferred();
    let slotRequestCount = 0;
    const { ConsultationBooking } = loadSource('components/consultationBooking.js', {
      react: hooks.react,
      '@/brand/localeContext': { useDictionary: () => dictionary, useLocale: () => 'en' },
      '@/components/formFields': { CheckboxField: 'CheckboxField', FieldError: 'FieldError', SelectField: 'SelectField', TextAreaField: 'TextAreaField', TextField: 'TextField', revealFormTop() {}, STICKY_FORM_ACTIONS_CLASS: '' },
      '@/components/localeLink': { LocaleLink: 'LocaleLink' },
      '@/components/ui': { Button: 'Button', ButtonLink: 'ButtonLink', Card: 'Card', FormSheet: 'FormSheet', InlineAlert: 'InlineAlert', SkeletonList: 'SkeletonList' },
      'motion/react': MOTION_MOCK,
      '@/components/infoTip': { InfoTip: 'InfoTip' },
      '@/components/calendlyEmbed': { CalendlyEmbed: 'CalendlyEmbed' },
      '@/components/whatsAppOptInField': { WhatsAppOptInField: 'WhatsAppOptInField' },
      '@/components/featuresProvider': { useIsFeatureEnabled: () => true },
      '@/lib/apiErrors': { localizeApiError: (error) => error.message, localizeFieldErrors: () => ({}) },
      '@/lib/localeTools': {
        useCatalogLabels: () => ({ consultationType: (key) => key, consultationMode: (key) => key, consultationTypeSummary: () => '', consultationModeSummary: () => '', serviceOptions: [] }),
        useFormatters: () => ({ shortDay: formatValues.formatShortDay, day: formatValues.formatDay, time: formatValues.formatTime }),
      },
      '@/lib/formatValues': formatValues,
      '@/lib/consultationSlots': flowHelpers,
      '@/lib/safeRedirect': { deriveLoginHref: (path) => `/en/login?next=${path}` },
      '@/lib/apiClient': { requestApi: async (path, options) => {
        if (path === '/auth/me') return { user };
        if (path === '/consultations/slots') {
          slotRequestCount += 1;
          if (hasAvailabilityError) throw new Error('Offline');
          if (isDeferred) return availability.promise;
          return { slots: hasConflict && slotRequestCount > 1 ? [] : slots };
        }
        calls.push({ path, body: options.body });
        if (path === '/service-requests') return { ReferenceCode: 'LB-REQUEST-TEST' };
        if (path === '/consultations') {
          if (hasConflict) throw Object.assign(new Error('Taken'), { status: 409 });
          return { consultation: { ...options.body, StartsAt: slot.StartsAt, ReferenceCode: 'LC-BOOKING-TEST' } };
        }
        throw new Error(`Unexpected endpoint: ${path}`);
      } },
    }, {
      window: { sessionStorage: { getItem: () => null, removeItem() {}, setItem() {} }, scrollTo() {}, matchMedia: () => ({ matches: true }), location: { assign() { throw new Error('Unexpected sign-in redirect'); } } },
      requestAnimationFrame: (callback) => callback(),
      document: { getElementById: () => null },
    });
    const render = () => hooks.render(() => ConsultationBooking());
    const change = (name, value) => {
      const node = findNode(render(), (candidate) => candidate.props?.name === name && (candidate.props.value === value || candidate.type !== 'input'));
      assert.ok(node, `field ${name} should exist`);
      node.props.onChange({ target: { value, checked: value } });
    };
    const submit = () => findNode(render(), (node) => node.type === 'form').props.onSubmit(event);
    return { hooks, render, change, submit, calls, availability };
  }

  const wizard = consultation.wizard;
  const stepTitle = (tree) => findNode(tree, (node) => node.type === 'h2' && Object.values(wizard.titles).includes(node.props.children))?.props.children;
  const hasText = (tree, text) => Boolean(findNode(tree, (node) => [].concat(node.props?.children).includes(text)));

  const request = createBookingScenario({ isDeferred: true });
  let tree = request.render();
  assert.equal(findNode(tree, (node) => node.type === 'Button' && node.props.type === 'submit').props.disabled, true);
  request.availability.resolve({ slots: [] });
  await flush();
  tree = request.render();
  assert.equal(stepTitle(tree), wizard.titles.choice);
  assert.ok(hasText(tree, consultation.request.noticeTitle), 'no-slot notice is shown on the first step');
  request.change('ConsultationType', shared.CONSULTATION_TYPES[0].key);
  request.change('Mode', shared.CONSULTATION_MODES[0].key);
  await request.submit();
  assert.equal(stepTitle(request.render()), wizard.titles.matter);
  await request.submit();
  assert.equal(stepTitle(request.render()), wizard.titles.details, 'request flow skips the time step');
  await request.submit();
  assert.equal(request.calls.length, 0, 'missing details must not submit');
  request.change('FullName', 'Test Client');
  request.change('Email', 'client@example.test');
  request.change('Phone', '9876501234');
  request.change('Description', 'Please discuss my rental agreement next week.');
  request.change('ConsentGiven', true);
  await Promise.all([request.submit(), request.submit()]);
  assert.equal(request.calls.length, 1);
  assert.equal(request.calls[0].path, '/service-requests');
  assert.equal(request.calls[0].body.ServiceCategory, 'legal-consultation');
  assert.equal(request.calls[0].body.SlotId, undefined);
  assert.match(request.calls[0].body.Description, /Preferred mode:/);
  assert.ok(findNode(request.render(), (node) => node.type === 'h2' && node.props.children === consultation.request.successTitle));
  request.hooks.unmount();
  pass('no-slot consultation announces the fallback first, skips dates, validates and submits one guest requirement');

  const failed = createBookingScenario({ hasAvailabilityError: true });
  failed.render();
  await flush();
  tree = failed.render();
  assert.ok(findNode(tree, (node) => node.props?.title === consultation.slots.errorTitle));
  assert.equal(hasText(tree, consultation.request.noticeTitle), false);
  assert.equal(findNode(tree, (node) => node.type === 'Button' && node.props.type === 'submit').props.disabled, true);
  failed.hooks.unmount();
  pass('failed availability checks show retry, not a misleading no-slots request flow');

  for (const hasConflict of [false, true]) {
    const booking = createBookingScenario({ slots: [slot], hasConflict, user: { FullName: 'Test Client', Email: 'client@example.test', Phone: '9876501234' } });
    booking.render();
    await flush();
    tree = booking.render(); // Also executes actual IST date grouping (previously a missing import).
    assert.equal(stepTitle(tree), wizard.titles.choice);
    booking.change('ConsultationType', shared.CONSULTATION_TYPES[0].key);
    booking.change('Mode', shared.CONSULTATION_MODES[0].key);
    await booking.submit();
    await booking.submit();
    assert.equal(stepTitle(booking.render()), wizard.titles.time);
    booking.change('SlotId', slot._id);
    await booking.submit();
    booking.change('Description', 'Please discuss my rental agreement next week.');
    booking.change('ConsentGiven', true);
    await booking.submit();
    assert.equal(booking.calls[0].path, '/consultations');
    assert.equal(booking.calls[0].body.IntakeCategory, undefined, 'optional area must not send an invalid empty enum');
    if (hasConflict) {
      booking.render();
      await flush();
      tree = booking.render();
      assert.equal(stepTitle(tree), wizard.titles.details, 'a lost slot lands on the request details step');
      assert.equal(findNode(tree, (node) => node.props?.name === 'Description').props.value, 'Please discuss my rental agreement next week.');
      await booking.submit();
      assert.equal(booking.calls[1].path, '/service-requests');
    } else {
      assert.ok(findNode(booking.render(), (node) => node.type === 'h2' && node.props.children === consultation.success.title));
    }
    booking.hooks.unmount();
  }
  pass('available slots book normally; a lost final slot switches to a request without losing entered details');
}

// A dropdown should use the available side of the viewport, including an on-screen keyboard.
{
  const { deriveOverlayPlacement } = loadSource('lib/overlayPosition.js');
  assert.deepEqual(deriveOverlayPlacement({ top: 200, bottom: 248, viewportHeight: 800 }), { isAbove: false, maxHeight: 384 });
  assert.deepEqual(deriveOverlayPlacement({ top: 700, bottom: 748, viewportHeight: 800 }), { isAbove: true, maxHeight: 384 });
  assert.deepEqual(deriveOverlayPlacement({ top: 330, bottom: 378, viewportHeight: 400 }), { isAbove: true, maxHeight: 322 });
  assert.deepEqual(deriveOverlayPlacement({ top: 260, bottom: 308, viewportTop: 100, viewportHeight: 300 }), { isAbove: true, maxHeight: 152 });
  assert.deepEqual(deriveOverlayPlacement({ top: 0, bottom: 48, viewportHeight: 80 }), { isAbove: false, maxHeight: 24 });
  assert.deepEqual(deriveOverlayPlacement({ top: 0, bottom: 48, viewportHeight: 48 }), { isAbove: false, maxHeight: 0 });
  pass('search placement respects desktop, short viewports and the mobile keyboard');
}

// Desktop disclosures must behave like mobile ones, not depend on hover.
{
  const hooks = createHookHarness();
  const listeners = {};
  let pathname = '/en';
  let focusCount = 0;
  const document = {
    addEventListener(name, callback) { listeners[name] = callback; },
    removeEventListener(name) { delete listeners[name]; },
  };
  // Targets: the visible panel, the empty full-width layer around it (inside <details> but not the panel), and the page
  const panelTarget = { closest: (selector) => (selector === '[data-nav-panel]' ? {} : null) };
  const layerTarget = { closest: () => null };
  const outsideTarget = { closest: () => null };
  const createMenu = () => ({
    open: true,
    contains: (target) => target === panelTarget || target === layerTarget,
    querySelector: () => ({ focus() { focusCount += 1; }, contains: () => false }),
  });
  let menu = createMenu();
  const { NavigationDisclosure } = loadSource('components/navigationDisclosure.js', {
    react: hooks.react,
    'next/navigation': { usePathname: () => pathname },
  }, { document });
  const render = () => hooks.render(() => NavigationDisclosure({ label: 'Services', children: 'Links' }), (tree) => { tree.props.ref.current = menu; });
  let tree = render();
  assert.equal(tree.type, 'details');
  assert.equal(tree.props.name, 'primary-navigation');
  listeners.pointerdown({ target: panelTarget });
  assert.equal(menu.open, true);
  listeners.pointerdown({ target: layerTarget });
  assert.equal(menu.open, false, 'a click beside the panel (on its positioning layer) closes the menu');
  menu.open = true;
  listeners.keydown({ key: 'Escape' });
  assert.equal(menu.open, false);
  assert.equal(focusCount, 1);
  pathname = '/hi/services';
  menu = createMenu();
  tree = render();
  assert.equal(tree.key, pathname);
  listeners.pointerdown({ target: outsideTarget });
  assert.equal(menu.open, false);
  menu.open = true;
  const panel = findNode(tree, (node) => node.type === 'div' && node.props.onClick);
  panel.props.onClick({ target: { closest: () => null } });
  assert.equal(menu.open, true);
  panel.props.onClick({ target: { closest: () => ({}) } });
  assert.equal(menu.open, false);
  hooks.unmount();
  assert.equal(Object.keys(listeners).length, 0);
  pass('desktop disclosures dismiss on Escape, outside clicks (including beside the panel) and link clicks, with current-route listeners');
}

{
  const locales = loadSource('brand/locales.js');
  const routes = loadSource('lib/chromeRoutes.js', { '@/brand/locales': locales });
  for (const locale of ['en', 'hi']) {
    // Checkout and login get the minimal header; tool pages keep the full header but drop competing mobile bars
    for (const path of ['/checkout/rent-agreement', '/login']) {
      const localized = `/${locale}${path}`;
      assert.equal(routes.isFocusedTaskPath(localized), true, localized);
      assert.equal(routes.hasMobileTabBar(localized), false, localized);
      assert.equal(routes.hasStickyActionBar(localized), false, localized);
    }
    for (const path of ['/consultation', '/contact', '/drafting', '/document-review', '/find-my-solution']) {
      const localized = `/${locale}${path}`;
      assert.equal(routes.isFocusedTaskPath(localized), false, localized);
      assert.equal(routes.isToolPath(localized), true, localized);
      assert.equal(routes.hasMobileTabBar(localized), false, localized);
      assert.equal(routes.hasStickyActionBar(localized), false, localized);
    }
    for (const path of ['', '/services', '/consultation-guide', '/document-reviews']) {
      assert.equal(routes.isFocusedTaskPath(`/${locale}${path}`), false);
    }
    assert.equal(routes.hasStickyBuyBar(`/${locale}/services/rent-agreement`), true);
    assert.equal(routes.hasMobileTabBar(`/${locale}/admin/requests`), false);
  }
  pass('checkout/login get minimal chrome, tool pages keep the header without competing mobile bars, in English and Hindi');
}

// Exercise the real combobox handlers and viewport listeners with no real navigation.
{
  const hooks = createHookHarness();
  const destinations = [];
  let isFinderEnabled = true;
  let scrollCount = 0;
  const windowListeners = new Map();
  const viewportListeners = new Map();
  const visualViewport = {
    offsetTop: 0, height: 400,
    addEventListener: (name, callback) => viewportListeners.set(name, callback),
    removeEventListener: (name) => viewportListeners.delete(name),
  };
  const window = {
    visualViewport, innerHeight: 800,
    addEventListener: (name, callback) => windowListeners.set(name, callback),
    removeEventListener: (name) => windowListeners.delete(name),
  };
  const input = { getBoundingClientRect: () => ({ top: 330, bottom: 378 }) };
  const listbox = { querySelector: () => ({ scrollIntoView() { scrollCount += 1; } }) };
  const items = [
    { id: 'rent', kind: 'problem', title: 'Rental agreement', href: '/drafting' },
    { id: 'notice', kind: 'problem', title: 'Reply to a notice', href: '/contact' },
  ];
  const { ServiceSearch } = loadSource('components/serviceSearch.js', {
    react: hooks.react,
    'next/navigation': { useRouter: () => ({ push: (href) => destinations.push(href) }) },
    '@/brand/localeContext': {
      useLocalizedHref: () => (href) => `/hi${href}`,
      useDictionary: () => ({ ux: { search: { label: 'Find help', suggestions: 'Suggestions', placeholder: 'Search', describe: (query) => `Describe ${query}`, results: (count) => `${count} matches` } } }),
    },
    '@/components/featuresProvider': { useIsFeatureEnabled: () => isFinderEnabled },
    '@/lib/overlayPosition': loadSource('lib/overlayPosition.js'),
  }, { window });
  const render = () => hooks.render(() => ServiceSearch({ items }), (tree) => {
    findNode(tree, (node) => node.type === 'input').props.ref.current = input;
    const list = findNode(tree, (node) => node.props?.role === 'listbox');
    if (list) list.props.ref.current = listbox;
  });
  const getInput = () => findNode(render(), (node) => node.type === 'input');
  const key = (value) => getInput().props.onKeyDown({ key: value, preventDefault() {} });
  getInput().props.onFocus();
  render();
  let tree = render();
  assert.equal(findNode(tree, (node) => node.props?.role === 'listbox').props.style.maxHeight, 322);
  assert.match(findNode(tree, (node) => node.props?.role === 'listbox').props.className, /bottom-full/);
  key('ArrowUp');
  assert.match(getInput().props['aria-activedescendant'], /option-1$/);
  assert.ok(scrollCount > 0);
  key('ArrowDown');
  assert.match(getInput().props['aria-activedescendant'], /option-0$/);
  key('Enter');
  assert.deepEqual(destinations, ['/hi/drafting']);
  assert.equal(getInput().props['aria-expanded'], false);
  assert.equal(windowListeners.size, 0);
  assert.equal(viewportListeners.size, 0);
  getInput().props.onChange({ target: { value: 'rent' } });
  render();
  key('End');
  assert.match(getInput().props['aria-activedescendant'], /option-1$/);
  key('Home');
  assert.match(getInput().props['aria-activedescendant'], /option-0$/);
  key('End');
  key('Enter');
  assert.equal(destinations.at(-1), '/hi/find-my-solution?concern=rent');
  getInput().props.onFocus();
  render();
  visualViewport.height = 1000;
  viewportListeners.get('resize')();
  tree = render();
  assert.match(findNode(tree, (node) => node.props?.role === 'listbox').props.className, /top-full/);
  assert.equal(findNode(tree, (node) => node.props?.role === 'listbox').props.style.maxHeight, 384);
  key('Escape');
  assert.equal(getInput().props['aria-expanded'], false);
  assert.equal(getInput().props.value, 'rent');
  key('Escape');
  assert.equal(getInput().props.value, '');
  isFinderEnabled = false;
  getInput().props.onChange({ target: { value: 'Unmatched concern' } });
  key('Enter');
  assert.equal(destinations.at(-1), '/hi/contact');
  getInput().props.onFocus();
  render();
  getInput().props.onBlur();
  assert.equal(getInput().props['aria-expanded'], false);
  hooks.unmount();
  assert.equal(windowListeners.size, 0);
  assert.equal(viewportListeners.size, 0);
  pass('search supports keyboard navigation, localized choices, fallback, dismissal and viewport listener cleanup');
}

console.log(`\nUI regression groups: ${checkCount} passed`);
