export const catalog = {
  services: {
    'legal-consultation': { label: 'कानूनी सलाह', summary: 'अपनी स्थिति और विकल्प समझें।' },
    'legal-drafting': { label: 'कानूनी ड्राफ्टिंग', summary: 'नोटिस, एग्रीमेंट और एफ़िडेविट।' },
    'contract-review': { label: 'कॉन्ट्रैक्ट रिव्यू', summary: 'साइन से पहले कॉन्ट्रैक्ट जाँचें।' },
    'criminal-law': { label: 'आपराधिक कानून', summary: 'FIR, शिकायत और जमानत पर मार्गदर्शन।' },
    'civil-property': { label: 'सिविल और प्रॉपर्टी', summary: 'प्रॉपर्टी विवाद और पैसे की वसूली।' },
    'consumer-matters': { label: 'उपभोक्ता मामले', summary: 'रिफ़ंड, खराब सामान और खराब सेवा।' },
    'business-corporate': { label: 'बिज़नेस और कॉर्पोरेट', summary: 'एग्रीमेंट और बिज़नेस के कागज़ात।' },
    other: { label: 'अन्य', summary: 'कुछ और।' },
  },

  requestStatuses: {
    submitted: 'भेजा गया',
    'under-review': 'जाँच में',
    'in-progress': 'काम जारी',
    'awaiting-client': 'आपके जवाब का इंतज़ार',
    completed: 'पूरा हुआ',
    closed: 'बंद',
  },

  consultationTypes: {
    quick: { label: 'छोटी सलाह', summary: 'एक खास सवाल।' },
    detailed: { label: 'विस्तृत सलाह', summary: 'जटिल मामलों के लिए ज़्यादा समय।' },
    document: { label: 'दस्तावेज़ पर सलाह', summary: 'नोटिस या एग्रीमेंट पर बात।' },
  },

  consultationModes: {
    phone: { label: 'फ़ोन', summary: 'हम आपको कॉल करेंगे।' },
    video: { label: 'वीडियो', summary: 'कॉल से पहले लिंक भेजा जाएगा।' },
  },

  consultationStatuses: {
    scheduled: 'तय',
    completed: 'पूरी हुई',
    cancelled: 'कैंसिल',
    'no-show': 'छूट गई',
  },

  slotStatuses: {
    open: 'खाली',
    booked: 'बुक',
    blocked: 'रोका गया',
  },

  articleTopics: {
    'criminal-law': { label: 'आपराधिक कानून', summary: 'FIR, जमानत और प्रक्रिया।' },
    'civil-law': { label: 'सिविल कानून', summary: 'रोज़मर्रा के विवाद और उपाय।' },
    'consumer-law': { label: 'उपभोक्ता कानून', summary: 'खरीदार के रूप में आपके अधिकार।' },
    'property-law': { label: 'प्रॉपर्टी कानून', summary: 'खरीद, किराया और विवाद।' },
    contracts: { label: 'कॉन्ट्रैक्ट', summary: 'साइन से पहले क्या देखें।' },
    'business-law': { label: 'बिज़नेस कानून', summary: 'बिज़नेस के लिए कानून की बुनियादी बातें।' },
  },

  articleStatuses: {
    published: 'प्रकाशित',
    draft: 'ड्राफ़्ट',
  },

  roles: {
    admin: 'एडमिन',
    client: 'क्लाइंट',
  },

  requestSources: {
    'contact-form': 'संपर्क फ़ॉर्म',
    'drafting-form': 'ड्राफ्टिंग अनुरोध',
    'contract-review-form': 'कॉन्ट्रैक्ट रिव्यू अनुरोध',
    'business-services-form': 'बिज़नेस अनुरोध',
    'solution-finder': 'समाधान खोजें',
    'whatsapp-agent': 'WhatsApp असिस्टेंट',
    'catalog-order': 'ऑनलाइन ऑर्डर',
    'document-review': 'दस्तावेज़ रिव्यू',
  },

  whatsAppMessageKinds: {
    user: 'सवाल',
    assistant: 'असिस्टेंट का जवाब',
    notice: 'प्राइवेसी सूचना',
    'payment-link': 'पेमेंट लिंक',
    handoff: 'टीम को सौंपा गया',
    system: 'कमांड या सिस्टम संदेश',
  },

  whatsAppCharges: {
    free: 'मुफ़्त सवाल',
    paid: 'पेड सवाल',
    refunded: 'गिना नहीं गया',
  },

  whatsAppPaymentStatuses: {
    created: 'पेमेंट बाकी',
    paid: 'पेमेंट हो गया',
    expired: 'समय खत्म',
    cancelled: 'कैंसिल',
  },
};
