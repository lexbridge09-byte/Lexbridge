export const consultation = {
  metadata: {
    title: 'सलाह बुक करें',
    description: 'फ़ोन या वीडियो पर योग्य कानूनी विशेषज्ञ से बात करें।',
  },
  header: {
    title: 'सलाह बुक करें',
    lead: 'फ़ोन या वीडियो पर कानूनी विशेषज्ञ से बात करें।',
  },

  sections: {
    type: 'सलाह का प्रकार',
    mode: 'फ़ोन या वीडियो',
    slot: 'तारीख और समय',
    details: 'आपकी जानकारी',
  },

  timeZoneNote: 'समय IST में है।',

  slots: {
    loading: 'समय लोड हो रहे हैं…',
    datesLabel: 'तारीखें',
    timesLabel: 'खाली समय',
    durationForScreenReaders: (minutes) => `, ${minutes} मिनट`,
    emptyBefore: 'अभी कोई समय खाली नहीं है।',
    emptyLink: 'अपनी ज़रूरत भेजें',
    emptyAfter: 'और हम समय तय करेंगे।',
    taken: 'यह समय अभी बुक हो गया। कोई दूसरा चुनें।',
    retry: 'फिर कोशिश करें',
  },

  fields: {
    phoneLabel: 'फ़ोन',
    phonePlaceholder: '+91',
    phoneHint: 'फ़ोन पर सलाह के लिए हम इसी नंबर पर कॉल करेंगे।',
    descriptionLabel: 'आप किस बारे में बात करना चाहते हैं?',
    descriptionHint: 'कोई डेडलाइन या सुनवाई की तारीख हो तो लिखें।',
  },

  validation: {
    type: 'सलाह का प्रकार चुनें।',
    mode: 'फ़ोन या वीडियो चुनें।',
    slot: 'तारीख और समय चुनें।',
    consent: 'आगे बढ़ने के लिए सहमति दें।',
  },

  consent: {
    before: 'मैं ',
    link: 'प्राइवेसी पॉलिसी',
    after: ' से सहमत हूँ। LexBridge लॉ फ़र्म नहीं है।',
  },

  summaryTitle: 'आपकी बुकिंग',
  summary: (typeLabel, modeLabel, dayLabel, timeLabel) => `${typeLabel}, ${modeLabel}, ${dayLabel} को ${timeLabel} IST`,
  signInNote: 'ईमेल पर आए कोड से बुकिंग पक्की करें।',
  submit: {
    idle: 'बुकिंग पक्की करें',
    busy: 'बुक हो रहा है…',
    signIn: 'आगे बढ़ें',
  },
  feeNote: 'सलाह से पहले फ़ीस तय होगी।',

  success: {
    title: 'सलाह बुक हो गई',
    referenceLabel: 'रेफ़रेंस',
    consultationLabel: 'प्रकार',
    whenLabel: 'कब',
    modeLabel: 'माध्यम',
    whenValue: (dayLabel, timeLabel) => `${dayLabel} को ${timeLabel} IST`,
    nextTitle: 'आगे क्या होगा',
    nextVideo: 'वीडियो लिंक My LexBridge में दिखेगा।',
    nextPhone: (phone) => (phone ? `तय समय पर हम ${phone} पर कॉल करेंगे।` : 'तय समय पर हम आपको कॉल करेंगे।'),
    nextDocuments: 'अपने दस्तावेज़ तैयार रखें।',
    viewCta: 'बुकिंग देखें',
    uploadCta: 'दस्तावेज़ अपलोड करें',
  },

  preparation: {
    title: 'बात करने से पहले',
    tips: ['नोटिस, एग्रीमेंट और रसीदें तैयार रखें।', 'ज़रूरी तारीखें और डेडलाइन नोट करें।', 'अपने मुख्य सवाल लिख लें।', 'वीडियो कॉल के लिए शांत जगह चुनें।'],
  },

  steps: {
    title: "यह कैसे काम करता है",
    items: [
      { title: "समय चुनें", description: "फ़ोन या वीडियो और सुविधाजनक समय चुनें।" },
      { title: "ईमेल से पुष्टि करें", description: "एक बार के कोड से साइन इन करें। पासवर्ड नहीं।" },
      { title: "मामला बताएँ", description: "छोटा नोट लिखें और दस्तावेज़ अपलोड करें।" },
      { title: "प्रोफ़ेशनल से बात करें", description: "कॉल पर आगे के साफ़ कदम जानें।" },
    ],
  },

  advantages: {
    title: "LexBridge से सलाह क्यों लें",
    items: [
      { icon: "language", title: "अपनी भाषा में बात करें", description: "हिंदी या अंग्रेज़ी, जो आपको सहज लगे।" },
      { icon: "confidential", title: "निजी और सुरक्षित", description: "आपका मामला सिर्फ़ आपके प्रोफ़ेशनल से साझा होता है।" },
      { icon: "qualified", title: "इन-हाउस लीगल टीम", description: "आपके मामले के प्रकार के अनुसार विशेषज्ञ।" },
    ],
  },

  faq: {
    title: 'सवाल',
    ids: ['consultation', 'cost', 'privacy'],
  },
};
