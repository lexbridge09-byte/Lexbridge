export const consultation = {
  metadata: {
    title: 'सलाह बुक करें',
    description: 'फ़ोन या वीडियो पर योग्य कानूनी विशेषज्ञ से बात करें।',
  },
  header: {
    title: 'सलाह के लिए समय तय करें',
    lead: 'अपनी ज़रूरत बताएँ। उपलब्ध समय चुनें, या समय तय करने के लिए हमारी टीम को अनुरोध भेजें।',
  },

  sections: {
    type: 'सलाह का प्रकार',
    mode: 'फ़ोन या वीडियो',
    slot: 'तारीख और समय',
    details: 'आपकी जानकारी',
  },

  timeZoneNote: 'समय IST में है।',

  wizard: {
    steps: ['परामर्श', 'आपका मामला', 'समय', 'आपकी जानकारी'],
    requestSteps: ['परामर्श', 'आपका मामला', 'आपकी जानकारी'],
    stepOf: '{current}/{total}',
    titles: {
      choice: 'मदद चुनें',
      matter: 'आपका मामला',
      time: 'समय चुनें',
      details: 'आपकी जानकारी',
    },
    subtitles: {
      choice: 'परामर्श और फ़ोन या वीडियो चुनें।',
      matter: 'वैकल्पिक। सही वकील चुनने में मदद करता है।',
      time: 'भारतीय समय (IST)।',
      details: 'सिर्फ़ इसी परामर्श के लिए।',
    },
  },

  slots: {
    loading: 'समय लोड हो रहे हैं…',
    datesLabel: 'तारीखें',
    timesCount: '{count} समय',
    periods: { morning: 'सुबह', afternoon: 'दोपहर', evening: 'शाम' },
    timesLabel: 'खाली समय',
    durationForScreenReaders: (minutes) => `, ${minutes} मिनट`,
    emptyBefore: 'अभी कोई समय खाली नहीं है।',
    emptyLink: 'अपनी ज़रूरत भेजें',
    emptyAfter: 'और हम समय तय करेंगे।',
    taken: 'यह समय अभी बुक हो गया। हम बाकी उपलब्ध समय जाँच रहे हैं। आपकी जानकारी सुरक्षित है।',
    retry: 'फिर कोशिश करें',
    available: 'समय उपलब्ध हैं। नीचे सलाह का प्रकार चुनें, फिर तारीख और समय चुनें।',
    errorTitle: 'उपलब्ध समय की जानकारी नहीं मिल पाई',
    errorBody: 'आपके चुने हुए विकल्प सुरक्षित हैं। आगे बढ़ने से पहले दोबारा जाँच करें।',
  },

  fields: {
    phoneLabel: 'फ़ोन',
    phonePlaceholder: '+91',
    phoneHint: 'आपकी कॉल के लिए।',
    descriptionLabel: 'आपका मामला',
    descriptionHint: 'कोई डेडलाइन या सुनवाई की तारीख लिखें।',
  },

  validation: {
    type: 'सलाह का प्रकार चुनें।',
    mode: 'फ़ोन या वीडियो चुनें।',
    slot: 'तारीख और समय चुनें।',
    consent: 'आगे बढ़ने के लिए सहमति दें।',
    phone: 'सही फ़ोन नंबर डालें।',
    description: 'कम से कम 10 अक्षरों में बताएँ कि आप किस बारे में बात करना चाहते हैं।',
  },

  request: {
    steps: ['सलाह', 'संपर्क और ज़रूरत'],
    title: 'सलाह का अनुरोध',
    noticeTitle: 'हम आपके लिए समय निकालेंगे',
    noticeBody: 'अपना मामला बताएँ, हम कॉल करके आपकी सुविधा का समय तय करेंगे। अभी कोई भुगतान नहीं।',
    checkAgain: 'खाली समय देखें',
    fullName: 'पूरा नाम',
    email: 'ईमेल',
    phoneHint: 'समय तय करने के लिए हम कॉल करेंगे।',
    descriptionHint: 'सुविधाजनक दिन और कोई डेडलाइन लिखें।',
    nameError: 'अपना पूरा नाम डालें।',
    emailError: 'सही ईमेल पता डालें।',
    descriptionError: 'कम से कम 20 अक्षरों में अपनी ज़रूरत बताएँ।',
    timePending: 'आपके साथ तय किया जाएगा',
    submit: 'सलाह का अनुरोध भेजें',
    busy: 'अनुरोध भेज रहे हैं…',
    successTitle: 'सलाह का अनुरोध मिल गया',
    successBody: 'अभी कोई अपॉइंटमेंट बुक नहीं हुआ है। हमारी टीम आपकी ज़रूरत, समय और फ़ीस के बारे में आपसे संपर्क करेगी। यह रेफ़रेंस रखें; अनुरोध देखने के लिए इसी ईमेल से साइन इन करें।',
    viewRequest: 'मेरा अनुरोध देखें',
  },

  consent: {
    before: 'मैं ',
    link: 'प्राइवेसी पॉलिसी',
    after: ' से सहमत हूँ। LexBridge Consultants लॉ फ़र्म नहीं है।',
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
    nextVideo: 'वीडियो लिंक My LexBridge Consultants में दिखेगा।',
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
    title: "LexBridge Consultants से सलाह क्यों लें",
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
