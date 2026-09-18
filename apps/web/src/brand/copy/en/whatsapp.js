export const whatsapp = {
  greeting: 'Hello LexBridge, I need help with a legal matter.',

  button: {
    label: 'Chat with LexBridge on WhatsApp (opens in a new tab)',
    text: 'WhatsApp us',
  },

  optIn: 'Send me updates on WhatsApp.',

  assistant: {
    title: 'Ask on WhatsApp',
    body: 'Quick answers to general legal questions.',
    freeQuestions: (count) => `First ${count} questions free.`,
    pack: (priceLabel, count) => `Then ${priceLabel} for ${count} more.`,
    human: 'Reply HUMAN to reach our team.',
    privacyBefore: 'Not legal advice. See our ',
    privacyLink: 'privacy policy',
    privacyAfter: '.',
    cta: 'Chat on WhatsApp',
  },
};
