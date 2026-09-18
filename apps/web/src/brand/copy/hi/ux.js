// समस्या के टाइल, खोज, खाता मेन्यू, प्रगति के चरण और बुकिंग सार
export const ux = {
  problems: {
    title: 'आपको किस बात में मदद चाहिए?',
    items: {
      'cheque-bounce': {
        label: 'चेक बाउंस हो गया?',
        concern: 'मुझे दिया गया चेक बाउंस हो गया और मुझे पैसे वापस चाहिए।',
        keywords: 'चेक बाउंस पैसा वसूली cheque bounce 138',
      },
      'legal-notice': {
        label: 'लीगल नोटिस मिला है?',
        concern: 'मुझे लीगल नोटिस मिला है और जवाब देने में मदद चाहिए।',
        keywords: 'नोटिस जवाब वकील notice reply',
      },
      'rent-agreement': {
        label: 'घर किराए पर दे/ले रहे हैं?',
        concern: 'मुझे फ़्लैट या घर के लिए रेंट एग्रीमेंट चाहिए।',
        keywords: 'किराया रेंट एग्रीमेंट किरायेदार मकान मालिक rent lease',
      },
      'family-matter': {
        label: 'शादी या परिवार से जुड़ी परेशानी?',
        concern: 'मुझे शादी या परिवार से जुड़े मामले में सलाह चाहिए।',
        keywords: 'तलाक शादी बच्चे गुज़ारा परिवार divorce custody',
      },
      'property-dispute': {
        label: 'ज़मीन या फ़्लैट का विवाद?',
        concern: 'मेरा ज़मीन या फ़्लैट को लेकर विवाद है।',
        keywords: 'ज़मीन मकान फ़्लैट कब्ज़ा property land',
      },
      'consumer-complaint': {
        label: 'दुकानदार या कंपनी ने धोखा दिया?',
        concern: 'दुकानदार या कंपनी ने खराब सामान या सेवा दी और ठीक नहीं कर रहे।',
        keywords: 'उपभोक्ता रिफंड शिकायत खराब सामान consumer refund',
      },
      'police-case': {
        label: 'पुलिस केस या FIR?',
        concern: 'मुझे पुलिस केस या FIR में मदद चाहिए।',
        keywords: 'पुलिस FIR जमानत bail शिकायत',
      },
      'online-fraud': {
        label: 'ऑनलाइन पैसे चले गए?',
        concern: 'ऑनलाइन धोखे या स्कैम में मेरे पैसे चले गए।',
        keywords: 'ऑनलाइन धोखा स्कैम साइबर UPI fraud',
      },
      'salary-unpaid': {
        label: 'सैलरी नहीं मिली?',
        concern: 'मेरी कंपनी ने सैलरी या बकाया पैसा नहीं दिया।',
        keywords: 'सैलरी बकाया कंपनी वेतन salary dues',
      },
    },
  },

  search: {
    label: 'कानूनी सेवाएँ खोजें',
    placeholder: 'जैसे “रेंट एग्रीमेंट” या “नोटिस”',
    suggestions: 'लोकप्रिय',
    results: (count) => `${count} नतीजे`,
    describe: (query) => `“${query}” के बारे में बताएँ और मदद पाएँ`,
    kinds: {
      problem: 'आम समस्या',
      service: 'सेवा',
      product: 'तय कीमत',
    },
  },

  account: {
    menuLabel: 'खाता मेन्यू',
    dashboard: 'डैशबोर्ड',
    orders: 'ऑर्डर',
    documents: 'दस्तावेज़',
    documentReviews: 'दस्तावेज़ जाँच',
    admin: 'एडमिन',
    signOut: 'साइन आउट',
    signingOut: 'साइन आउट हो रहा है…',
  },

  steps: {
    label: 'प्रगति',
    checkout: ['जानकारी', 'भुगतान', 'पूरा'],
    booking: ["सलाह", "तारीख और समय", "जानकारी"],
  },

  checkoutTrust: {
    secure: 'Razorpay से सुरक्षित भुगतान',
    refundPolicy: 'रिफंड नीति',
  },

  bookingSummary: {
    title: 'आपकी बुकिंग',
    type: 'प्रकार',
    mode: 'तरीका',
    when: 'तारीख और समय',
    notSelected: 'नहीं चुना',
    fee: 'फ़ीस',
    feeValue: 'कॉल से पहले बताई जाएगी',
    faqLink: 'सवाल हैं? FAQ देखें',
  },
};
