export const consultation = {
  metadata: {
    title: 'Book a consultation',
    description: 'Talk to a qualified legal professional by phone or video.',
  },
  header: {
    title: 'Arrange a consultation',
    lead: 'Tell us what you need. Choose an available time, or send a request for our team to arrange one.',
  },

  sections: {
    type: 'Consultation type',
    mode: 'Phone or video',
    slot: 'Date and time',
    details: 'Your details',
  },

  timeZoneNote: 'Times are in IST.',

  // Booking wizard: one short screen per step
  wizard: {
    steps: ['Consultation', 'Your matter', 'Time', 'Your details'],
    requestSteps: ['Consultation', 'Your matter', 'Your details'],
    stepOf: '{current}/{total}',
    titles: {
      choice: 'Choose help',
      matter: 'Your matter',
      time: 'Pick a time',
      details: 'Your details',
    },
    subtitles: {
      choice: 'Pick a consultation and phone or video.',
      matter: 'Optional. Helps us match the right lawyer.',
      time: 'India time (IST).',
      details: 'Used only for this consultation.',
    },
  },

  slots: {
    loading: 'Loading times…',
    datesLabel: 'Dates',
    // Plain templates: rendered in a client component
    timesCount: '{count} times',
    periods: { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' },
    timesLabel: 'Available times',
    durationForScreenReaders: (minutes) => `, ${minutes} minutes`,
    emptyBefore: 'No times open right now.',
    emptyLink: 'Send your requirement',
    emptyAfter: 'and we’ll arrange one.',
    taken: 'That time was just booked. We’re checking the remaining availability. Your details are still here.',
    retry: 'Try again',
    available: 'Times are available. Choose your consultation below, then pick a date and time.',
    errorTitle: 'We couldn’t check availability',
    errorBody: 'Your choices are still here. Retry the availability check before continuing.',
  },

  fields: {
    phoneLabel: 'Phone',
    phonePlaceholder: '+91',
    phoneHint: 'For your call.',
    descriptionLabel: 'Your matter',
    descriptionHint: 'Add any deadline or hearing date.',
  },

  validation: {
    type: 'Choose a consultation type.',
    mode: 'Choose phone or video.',
    slot: 'Choose a date and time.',
    consent: 'Please accept to continue.',
    phone: 'Enter a valid phone number.',
    description: 'Describe what you would like to discuss in at least 10 characters.',
  },

  request: {
    steps: ['Consultation', 'Contact & requirement'],
    title: 'Consultation request',
    noticeTitle: 'We’ll fit you in',
    noticeBody: 'Tell us your matter and we’ll call to set a time that suits you. Nothing to pay yet.',
    checkAgain: 'Check for open times',
    fullName: 'Full name',
    email: 'Email',
    phoneHint: 'We call to fix a time.',
    descriptionHint: 'Add preferred days and any deadline.',
    nameError: 'Enter your full name.',
    emailError: 'Enter a valid email address.',
    descriptionError: 'Describe your requirement in at least 20 characters.',
    timePending: 'To be agreed with you',
    submit: 'Send consultation request',
    busy: 'Sending request…',
    successTitle: 'Consultation request received',
    successBody: 'No appointment has been booked yet. Our team will contact you to discuss your requirement, time and fee. Keep this reference; sign in with the same email to track your request.',
    viewRequest: 'Track my request',
  },

  consent: {
    before: 'I agree to the ',
    link: 'privacy policy',
    after: '. LexBridge Consultants is not a law firm.',
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
    nextVideo: 'Your video link will appear in My LexBridge Consultants.',
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
    title: "Why consult with LexBridge Consultants",
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
