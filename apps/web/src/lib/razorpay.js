// Razorpay Standard Checkout. The script is added only when a checkout actually starts.
const CHECKOUT_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptPromise = null;

export function loadRazorpayScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Razorpay needs a browser'));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CHECKOUT_SCRIPT_URL;
      script.async = true;
      script.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error('Razorpay did not load')));
      script.onerror = () => {
        script.remove();
        scriptPromise = null;
        reject(new Error('Razorpay script failed to load'));
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

/*
  Opens the payment window for a `checkout` object from POST /api/checkout/orders.
  Resolves with { outcome: 'paid', response } | { outcome: 'dismissed' } | { outcome: 'failed' }.
  `response` holds the three razorpay_* fields for POST /api/checkout/verify.
*/
export async function openRazorpayCheckout(checkout, themeColor) {
  const Razorpay = await loadRazorpayScript();
  return new Promise((resolve) => {
    // Razorpay keeps its window open after a failed attempt so the customer can retry inside it,
    // so a failure is only reported once they close the window without paying
    let hasFailedAttempt = false;
    const paymentWindow = new Razorpay({
      key: checkout.keyId,
      order_id: checkout.razorpayOrderId,
      amount: checkout.amountPaise,
      currency: checkout.currency,
      name: checkout.name,
      description: checkout.description,
      prefill: checkout.prefill,
      notes: checkout.notes,
      theme: { color: themeColor },
      handler: (response) => resolve({ outcome: 'paid', response }),
      modal: { ondismiss: () => resolve({ outcome: hasFailedAttempt ? 'failed' : 'dismissed' }) },
    });
    paymentWindow.on('payment.failed', () => {
      hasFailedAttempt = true;
    });
    paymentWindow.open();
  });
}
