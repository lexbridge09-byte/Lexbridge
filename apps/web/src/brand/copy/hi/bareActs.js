// बेयर एक्ट लाइब्रेरी: भारत के प्रमुख कानून। अधिनियमों के नाम उचित संज्ञाएँ हैं, अंग्रेज़ी में ही रहते हैं;
// समूह शीर्षक, विवरण और सहायक कॉपी अनुवादित हैं। पूरा पाठ यहाँ होस्ट नहीं है — हर अधिनियम सरकारी
// India Code पोर्टल की खोज से जुड़ता है।
export const bareActs = {
  metadataTitle: 'बेयर एक्ट',
  header: {
    title: 'बेयर एक्ट',
    lead: 'भारत के प्रमुख कानूनों का सीधा पाठ — वही कानून जिन पर हर सलाह, नोटिस और ड्राफ्ट टिका होता है।',
  },
  portalNote: 'LexBridge कानूनों का पाठ होस्ट नहीं करता। हर लिंक सरकारी पोर्टल indiacode.nic.in की खोज खोलता है, जहाँ प्रामाणिक PDF मिलती है।',
  portalLabel: 'सरकारी पोर्टल: indiacode.nic.in',
  readLabel: 'पूरा पाठ पढ़ें',
  disclaimer: 'बेयर एक्ट पढ़ना सामान्य जानकारी है, कानूनी सलाह नहीं। कोई धारा उलझी लगे तो सलाह से पता चलेगा कि वह आपके मामले पर कैसे लागू होती है।',

  groups: {
    foundation: {
      label: 'आधार',
      description: 'सर्वोच्च कानून, जिसके आगे हर कानून झुकता है।',
    },
    civil: {
      label: 'सिविल और संपत्ति',
      description: 'अनुबंध, संपत्ति हस्तांतरण, उपचार और समय-सीमाएँ।',
    },
    criminal: {
      label: 'आपराधिक कानून',
      description: 'अपराध, प्रक्रिया और साक्ष्य — 2023 में बदले गए औपनिवेशिक कोड सहित।',
    },
    family: {
      label: 'परिवार और उत्तराधिकार',
      description: 'सब समुदायों में विवाह, तलाक और उत्तराधिकार।',
    },
    business: {
      label: 'व्यापार और वाणिज्यिक',
      description: 'कंपनियाँ, साझेदारी, चेक, स्टाम्प और माल की बिक्री।',
    },
    consumer: {
      label: 'उपभोक्ता और डिजिटल',
      description: 'ख़राब माल, ऑनलाइन अपराध और नियमित रियल एस्टेट।',
    },
  },

  acts: {
    constitution: {
      name: 'Constitution of India',
      year: 1950,
      description: 'सर्वोच्च कानून: मौलिक अधिकार, कर्तव्य और राज्य की संरचना।',
    },
    'contract-act': {
      name: 'Indian Contract Act',
      year: 1872,
      description: 'कौन-सा समझौता कानूनी रूप से बाध्य करता है: प्रस्ताव, स्वीकृति, प्रतिफल और उल्लंघन।',
    },
    'transfer-of-property-act': {
      name: 'Transfer of Property Act',
      year: 1882,
      description: 'बिक्री, बंधक, पट्टा, उपहार और संपत्ति का हस्तांतरण कैसे होता है।',
    },
    'specific-relief-act': {
      name: 'Specific Relief Act',
      year: 1963,
      description: 'निषेधाज्ञा, विशिष्ट निष्पादन और कब्ज़े की वापसी।',
    },
    'limitation-act': {
      name: 'Limitation Act',
      year: 1963,
      description: 'हर मुक़दमे की समय-सीमा — छूट गई तो दावा ख़त्म।',
    },
    'registration-act': {
      name: 'Registration Act',
      year: 1908,
      description: 'कौन-से दस्तावेज़ पंजीकृत कराने ज़रूरी हैं और न कराने पर क्या होता है।',
    },
    'bharatiya-nyaya-sanhita': {
      name: 'Bharatiya Nyaya Sanhita',
      year: 2023,
      description: 'नया सामान्य अपराध संहिता, जिसने जुलाई 2024 से IPC की जगह ली।',
    },
    'bharatiya-nagarik-suraksha-sanhita': {
      name: 'Bharatiya Nagarik Suraksha Sanhita',
      year: 2023,
      description: 'नई आपराधिक प्रक्रिया संहिता: गिरफ़्तारी, ज़मानत, जाँच और मुक़दमा।',
    },
    'bharatiya-sakshya-adhiniyam': {
      name: 'Bharatiya Sakshya Adhiniyam',
      year: 2023,
      description: 'नया साक्ष्य कानून, जिसमें इलेक्ट्रॉनिक रिकॉर्ड और डिजिटल हस्ताक्षर शामिल हैं।',
    },
    'indian-penal-code': {
      name: 'Indian Penal Code',
      year: 1860,
      description: 'जुलाई 2024 से पहले के अपराधों पर अब भी लागू; चालू मामलों के लिए ज़रूरी।',
    },
    'hindu-marriage-act': {
      name: 'Hindu Marriage Act',
      year: 1955,
      description: 'हिंदुओं के बीच विवाह, तलाक, भरण-पोषण और पुनर्स्थापन।',
    },
    'special-marriage-act': {
      name: 'Special Marriage Act',
      year: 1954,
      description: 'धर्म से इतर सिविल विवाह, और उसके अपने तलाक के आधार।',
    },
    'hindu-succession-act': {
      name: 'Hindu Succession Act',
      year: 1956,
      description: 'हिंदुओं में कौन क्या पाएगा, बेटियों के बराबर अधिकार सहित।',
    },
    'shariat-application-act': {
      name: 'Muslim Personal Law (Shariat) Application Act',
      year: 1937,
      description: 'मुस्लिम विवाह, उत्तराधिकार और पारिवारिक मामलों पर शरीयत का लागू होना।',
    },
    'companies-act': {
      name: 'Companies Act',
      year: 2013,
      description: 'कंपनी का गठन, निदेशक, फाइलिंग और कर्तव्य।',
    },
    'indian-partnership-act': {
      name: 'Indian Partnership Act',
      year: 1932,
      description: 'फर्म के साझेदारों के बीच अधिकार और कर्तव्य।',
    },
    'llp-act': {
      name: 'Limited Liability Partnership Act',
      year: 2008,
      description: 'LLP संरचना, जिसका उपयोग छोटी फर्में और पेशेवर करते हैं।',
    },
    'negotiable-instruments-act': {
      name: 'Negotiable Instruments Act',
      year: 1881,
      description: 'धारा 138: चेक बाउंस होने पर आपराधिक उपाय।',
    },
    'sale-of-goods-act': {
      name: 'Sale of Goods Act',
      year: 1930,
      description: 'वारंटी, डिलीवरी और ख़राब माल पर उपाय।',
    },
    'indian-stamp-act': {
      name: 'Indian Stamp Act',
      year: 1899,
      description: 'अनुबंधों और रजिस्ट्री पर स्टाम्प शुल्क; बिना स्टाम्प दस्तावेज़ दिक्कत बनते हैं।',
    },
    'consumer-protection-act': {
      name: 'Consumer Protection Act',
      year: 2019,
      description: 'उपभोक्ता आयोग, ख़राब माल, घटिया सेवा और ई-कॉमर्स नियम।',
    },
    'information-technology-act': {
      name: 'Information Technology Act',
      year: 2000,
      description: 'साइबर अपराध, इलेक्ट्रॉनिक अनुबंध और डिजिटल हस्ताक्षर।',
    },
    rera: {
      name: 'Real Estate (Regulation and Development) Act',
      year: 2016,
      description: 'RERA: प्रोजेक्ट पंजीकरण और देरी पर गृह-ख़रीदारों के उपाय।',
    },
  },
};
