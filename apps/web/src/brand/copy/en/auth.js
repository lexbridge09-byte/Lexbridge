export const auth = {
  metadata: {
    title: 'Sign in',
  },
  title: 'Sign in',
  body: 'Track your requests, consultations and documents.',
  benefits: ['Follow every update', 'Join video consultations', 'Share documents securely'],

  email: {
    label: 'Email',
    hint: 'We’ll email you a 6-digit code.',
    submit: 'Get code',
    busy: 'Sending…',
  },

  code: {
    label: '6-digit code',
    hint: 'Valid for 10 minutes.',
    submit: 'Sign in',
    busy: 'Signing in…',
    sent: (email) => `Code sent to ${email}.`,
    resend: 'Resend code',
    resendIn: (seconds) => `Resend in ${seconds}s`,
    differentEmail: 'Change email',
  },
};
