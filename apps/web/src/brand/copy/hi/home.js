export const home = {
  hero: {
    title: 'आज ही साफ़ कानूनी मदद पाएँ',
    subtitle: 'फ़ोन या वीडियो पर योग्य कानूनी विशेषज्ञ से बात करें। पैसे देने से पहले फ़ीस देखें।',
    trustLabel: 'LexBridge क्यों',
    trust: {
      qualified: 'योग्य विशेषज्ञ',
      confidential: 'निजी और सुरक्षित',
      fee: 'पैसे देने से पहले फ़ीस',
    },
    priceFrom: (priceLabel) => `तय कीमत वाली सेवाएँ ${priceLabel} से`,
    mockup: {
      title: 'आपका मामला',
      category: 'प्रॉपर्टी विवाद',
      status: 'काम जारी',
      steps: ['शिकायत मिली', 'सही सेवा चुनी गई', 'सलाह का समय तय'],
      nextLabel: 'अगला कदम',
      nextValue: 'वीडियो कॉल',
      documentsLabel: 'दस्तावेज़',
      documentsValue: 'सुरक्षित भेजे गए',
      assignedLabel: 'विशेषज्ञ तय हो गए',
    },
  },

  situations: {
    title: 'अपनी स्थिति से मदद खोजें',
    description: 'जो सबसे करीब हो, वह चुनें। आगे हम बताएँगे।',
  },

  products: {
    title: 'तय कीमत वाली लोकप्रिय सेवाएँ',
    description: 'कीमत और समय पहले से साफ़।',
    viewAll: 'सभी सेवाएँ देखें',
  },

  steps: {
    title: 'यह कैसे काम करता है',
    description: 'तीन आसान कदम। कानूनी भाषा ज़रूरी नहीं।',
    items: [
      { title: 'बताइए क्या हुआ', description: 'अपने शब्दों में। लगभग 2 मिनट लगते हैं।' },
      { title: 'सही सेवा और फ़ीस देखें', description: 'हम सही सेवा सुझाते हैं। फ़ीस पहले दिखती है।' },
      { title: 'विशेषज्ञ से बात करें', description: 'फ़ोन या वीडियो पर। हर अपडेट ऑनलाइन देखें।' },
    ],
    value: {
      title: 'एक फ़ॉर्म। एक कॉल। हर अपडेट ऑनलाइन।',
      description: 'कोई छुपा चार्ज नहीं। कॉल से 2 घंटे पहले तक कैंसिल करें।',
      cta: 'अभी शुरू करें',
    },
  },

  aiReview: {
    pill: 'AI दस्तावेज़ जाँच',
    title: 'साइन करने से पहले दस्तावेज़ जाँचें',
    description: 'एग्रीमेंट या नोटिस की PDF डालें। आसान सारांश और ज़रूरी बातें देखें।',
    points: ['आसान भाषा में सारांश', 'ध्यान देने लायक clauses', 'ज़रूरत हो तो वकील से जाँच'],
    cta: 'मेरा दस्तावेज़ जाँचें',
    note: 'सामान्य जानकारी, कानूनी सलाह नहीं।',
    mockup: {
      fileName: 'rent-agreement.pdf',
      status: 'सारांश तैयार',
      rows: ['किराया और डिपॉज़िट की शर्तें मिलीं', 'नोटिस अवधि: 1 महीना', 'lock-in clause देख लें'],
      riskLabel: 'ध्यान से देखने लायक',
    },
  },

  trust: {
    title: 'लोग LexBridge क्यों चुनते हैं',
    items: [
      { icon: 'qualified', title: 'योग्य विशेषज्ञ', description: 'आपका मामला ऐसे विशेषज्ञ को जाता है जो ऐसे मामले देखते हैं।' },
      { icon: 'confidential', title: 'निजी और सुरक्षित', description: 'आपकी जानकारी और फ़ाइलें सिर्फ़ आपके मामले के लिए हैं।' },
      { icon: 'fee', title: 'पैसे देने से पहले फ़ीस', description: 'फ़ीस पहले दिखती है। कोई छुपा चार्ज नहीं।' },
      { icon: 'refund', title: 'साफ़ रिफंड नीति', description: 'प्लान बदले तो क्या होगा, पहले से जानें।' },
    ],
    refundLink: 'रिफंड नीति पढ़ें',
    contactTitle: 'पहले बात करना चाहते हैं?',
    contactBody: 'कॉल बैक माँगें, हम आपको फ़ोन करेंगे।',
  },

  guides: {
    title: 'कानूनी गाइड',
    description: 'आम कानूनी सवालों के आसान जवाब।',
    viewAll: 'सभी गाइड',
  },

  stats: {
    label: 'LexBridge आँकड़ों में',
    requestsResolved: 'सुलझाए गए अनुरोध',
    consultationsCompleted: 'पूरी हुई सलाह',
    documentsReviewed: 'जाँचे गए दस्तावेज़',
  },

  testimonials: {
    title: 'लोग क्या कहते हैं',
  },

  faq: {
    title: 'आम सवाल',
    viewAll: 'सभी सवाल देखें',
  },
};
