export const solutionFinder = {
  metadata: {
    title: 'Find my legal solution',
    description: 'Describe your problem and find the legal help that fits.',
  },
  header: {
    title: 'Find my legal solution',
    lead: 'Describe your problem. We’ll point you to the right help.',
  },

  form: {
    label: 'What happened?',
    placeholder: 'Describe your situation…',
    examplesLabel: 'Try an example',
    examples: ['I paid for a service that was never delivered.', 'I received a legal notice. What should I do?'],
    submit: 'Find my solution',
    busy: 'Finding help…',
    busyForScreenReaders: 'Finding the right help for your concern',
    tooShort: 'Please add a little more detail.',
    privacyNote: 'Used only to suggest services, and to contact you if you ask.',
    // Plain strings: the finder is a client component
    moreDetail: 'Add a little more detail',
    enoughDetail: 'Good, that’s enough to start',
    shortcut: 'Ctrl + Enter to send',
    eyebrow: 'Free · about 1 minute',
    loadingSteps: ['Reading your situation', 'Finding the area of law', 'Checking how urgent it is', 'Matching the right services'],
    nextTitle: 'What happens next',
    commonTitle: 'Common problems',
    commonHint: 'Pick one to go straight there.',
    nextSteps: ['We suggest services that fit', 'You see the fee before paying', 'A professional takes it from there'],
  },

  urgency: {
    urgent: 'Urgent',
    'time-sensitive': 'Time-sensitive',
    routine: 'Routine',
    emergency: 'In danger right now? Call 112.',
  },

  result: {
    title: 'Where to start',
    servicesTitle: 'Suggested services',
    questionsTitle: 'Details that help',
    fallbackTitle: 'Send it to our team',
    fallbackNote: 'Your description is filled in below. Add your details and we’ll point you to the right help.',
    edit: 'Edit description',
    disclaimer: 'General guidance, not legal advice.',
  },

  request: {
    title: 'Get help with this',
    description: 'Your description is already filled in.',
    descriptionLabel: 'Your concern',
    submitLabel: 'Send to LexBridge Consultants',
  },
};
