export const faq = {
  metadata: {
    title: 'FAQ',
    description: 'Answers to common questions about LexBridge.',
  },
  header: {
    title: 'Frequently asked questions',
    lead: 'Quick answers before you get started.',
  },

  // `feature` hides an answer while that feature flag is off. Values fill the {placeholders}.
  items: [
    {
      id: 'law-firm',
      question: 'Is LexBridge a law firm?',
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
      answer: 'Sign in to My LexBridge with the same email to see status and updates.',
    },
  ],
};
