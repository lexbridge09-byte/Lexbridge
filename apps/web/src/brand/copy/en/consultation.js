export const consultation = {
  metadata: {
    title: 'Book a consultation',
    description: 'Talk to a qualified legal professional by phone or video.',
  },
  header: {
    title: 'Book a consultation',
    lead: 'Talk to a legal professional by phone or video.',
  },

  sections: {
    type: 'Consultation type',
    mode: 'Phone or video',
    slot: 'Date and time',
    details: 'Your details',
  },

  timeZoneNote: 'Times are in IST.',

  slots: {
    loading: 'Loading times…',
    datesLabel: 'Dates',
    timesLabel: 'Available times',
    durationForScreenReaders: (minutes) => `, ${minutes} minutes`,
    emptyBefore: 'No times open right now.',
    emptyLink: 'Send your requirement',
    emptyAfter: 'and we’ll arrange one.',
    taken: 'That time was just booked. Please pick another.',
    retry: 'Try again',
  },

  fields: {
    phoneLabel: 'Phone',
    phonePlaceholder: '+91',
    phoneHint: 'We’ll call this number for phone consultations.',
    descriptionLabel: 'What do you want to discuss?',
    descriptionHint: 'Mention any deadline or hearing date.',
  },

  validation: {
    type: 'Choose a consultation type.',
    mode: 'Choose phone or video.',
    slot: 'Choose a date and time.',
    consent: 'Please accept to continue.',
  },

  consent: {
    before: 'I agree to the ',
    link: 'privacy policy',
    after: '. LexBridge is not a law firm.',
  },

  summaryTitle: 'Your booking',
  summary: (typeLabel, modeLabel, dayLabel, timeLabel) => `${typeLabel}, ${modeLabel}, ${dayLabel} at ${timeLabel} IST`,
  signInNote: 'You’ll confirm with a code sent to your email.',
  submit: {
    idle: 'Confirm booking',
    busy: 'Booking…',
    signIn: 'Continue',
  },
  feeNote: 'Fee confirmed before your consultation.',

  success: {
    title: 'Consultation booked',
    referenceLabel: 'Reference',
    consultationLabel: 'Type',
    whenLabel: 'When',
    modeLabel: 'Mode',
    whenValue: (dayLabel, timeLabel) => `${dayLabel} at ${timeLabel} IST`,
    nextTitle: 'Next steps',
    nextVideo: 'Your video link will appear in My LexBridge.',
    nextPhone: (phone) => (phone ? `We’ll call ${phone} at the scheduled time.` : 'We’ll call you at the scheduled time.'),
    nextDocuments: 'Keep your documents ready.',
    viewCta: 'View booking',
    uploadCta: 'Upload documents',
  },

  preparation: {
    title: 'Before you talk',
    tips: ['Keep notices, agreements and receipts ready.', 'Note key dates and deadlines.', 'List your top questions.', 'For video, find a quiet spot.'],
  },

  steps: {
    title: "How it works",
    items: [
      { title: "Choose a time", description: "Pick phone or video and a slot that suits you." },
      { title: "Confirm by email", description: "Sign in with a one-time code. No password." },
      { title: "Share your matter", description: "Add a short note and upload documents." },
      { title: "Talk to a professional", description: "Get clear next steps on the call." },
    ],
  },

  advantages: {
    title: "Why consult with LexBridge",
    items: [
      { icon: "language", title: "Talk in your language", description: "Hindi or English, whichever you prefer." },
      { icon: "confidential", title: "Private and secure", description: "Your matter is shared only with your professional." },
      { icon: "qualified", title: "In-house legal team", description: "Matched to the kind of matter you have." },
    ],
  },

  faq: {
    title: 'Questions',
    ids: ['consultation', 'cost', 'privacy'],
  },
};
