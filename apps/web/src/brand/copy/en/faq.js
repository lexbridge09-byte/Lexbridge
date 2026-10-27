export const faq = {
  metadata: {
    title: 'FAQ',
    description: 'Answers to common questions about LexBridge Consultants.',
  },
  header: {
    title: 'Frequently asked questions',
    lead: 'Quick answers before you get started.',
  },

  center: {
    searchLabel: 'Search questions',
    searchPlaceholder: 'Search, e.g. “fee” or “WhatsApp”',
    allTopics: 'All',
    topics: { basics: 'Getting started', booking: 'Booking & tracking', privacy: 'Privacy' },
    // Plain templates (not functions): this copy is passed to a client component
    countAll: '{total} questions',
    countSome: '{shown} of {total} questions',
    emptyTitle: 'No match for that',
    emptyBody: 'Try another word, or ask us directly.',
    clear: 'Clear search',
    askTitle: 'Can’t find your answer?',
    askBody: 'Write to us. A real person replies, usually the same day.',
    askCta: 'Contact us',
  },

  // `feature` hides an answer while that feature flag is off. Values fill the {placeholders}.
  items: [
    {
      id: 'law-firm',
      question: 'Is LexBridge Consultants a law firm?',
      answer: 'No. We’re a legal-services platform. Qualified professionals handle advice and representation.',
    },
    {
      id: 'category',
      question: 'Do I need to know the area of law?',
      answer: 'No. Describe your problem in your own words and we’ll suggest the right service.',
    },
    {
      id: 'consultation',
      feature: 'consultationBooking',
      question: 'How does a consultation work?',
      answer: 'Pick a type, time and phone or video. A legal professional talks you through your matter.',
    },
    {
      id: 'cost',
      question: 'What does it cost?',
      answer: 'It depends on the service. We confirm the fee before any paid work starts.',
    },
    {
      id: 'whatsapp',
      feature: 'whatsAppAiAssistant',
      question: 'Can I ask on WhatsApp?',
      answer: (plan) =>
        `Yes. Your first ${plan.freeMessages} questions are free, then ${plan.priceLabel} for ${plan.packMessages} more. Reply HUMAN anytime to reach our team.`,
    },
    {
      id: 'privacy',
      question: 'Is my information safe?',
      answer: 'We use it only to handle your request. Our privacy policy explains how it’s stored.',
    },
    {
      id: 'progress',
      feature: 'clientAccounts',
      question: 'How do I track my request?',
      answer: 'Sign in to My LexBridge Consultants with the same email to see status and updates.',
    },
  ],
};
