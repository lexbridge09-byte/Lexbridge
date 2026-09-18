export const whatsapp = {
  greeting: 'नमस्ते LexBridge, मुझे एक कानूनी मामले में मदद चाहिए।',

  button: {
    label: 'WhatsApp पर LexBridge से चैट करें (नए टैब में खुलेगा)',
    text: 'WhatsApp करें',
  },

  optIn: 'मुझे WhatsApp पर अपडेट भेजें।',

  assistant: {
    title: 'WhatsApp पर पूछें',
    body: 'आम कानूनी सवालों के जल्दी जवाब।',
    freeQuestions: (count) => `पहले ${count} सवाल मुफ़्त।`,
    pack: (priceLabel, count) => `फिर ${priceLabel} में ${count} और सवाल।`,
    human: 'टीम से बात के लिए HUMAN लिखें।',
    privacyBefore: 'यह कानूनी सलाह नहीं है। देखें हमारी ',
    privacyLink: 'प्राइवेसी पॉलिसी',
    privacyAfter: '।',
    cta: 'WhatsApp पर चैट करें',
  },
};
