export const faq = {
  metadata: {
    title: 'सवाल-जवाब',
    description: 'LexBridge के बारे में आम सवालों के जवाब।',
  },
  header: {
    title: 'अक्सर पूछे जाने वाले सवाल',
    lead: 'शुरू करने से पहले जल्दी जवाब।',
  },

  items: [
    {
      id: 'law-firm',
      question: 'क्या LexBridge एक लॉ फ़र्म है?',
      answer: 'नहीं। हम एक कानूनी सेवा प्लेटफ़ॉर्म हैं। सलाह और पैरवी योग्य विशेषज्ञ करते हैं।',
    },
    {
      id: 'category',
      question: 'क्या मुझे पता होना चाहिए कि मामला किस कानून का है?',
      answer: 'नहीं। अपनी समस्या अपने शब्दों में बताइए, हम सही सेवा सुझाएँगे।',
    },
    {
      id: 'consultation',
      feature: 'consultationBooking',
      question: 'सलाह कैसे होती है?',
      answer: 'प्रकार, समय और फ़ोन या वीडियो चुनें। कानूनी विशेषज्ञ आपके मामले पर बात करेंगे।',
    },
    {
      id: 'cost',
      question: 'इसका खर्च कितना है?',
      answer: 'यह सेवा पर निर्भर है। कोई भी पेड काम शुरू होने से पहले फ़ीस तय होती है।',
    },
    {
      id: 'whatsapp',
      feature: 'whatsAppAiAssistant',
      question: 'क्या मैं WhatsApp पर पूछ सकता हूँ?',
      answer: (plan) =>
        `हाँ। पहले ${plan.freeMessages} सवाल मुफ़्त हैं, फिर ${plan.priceLabel} में ${plan.packMessages} और। टीम से बात के लिए कभी भी HUMAN लिखें।`,
    },
    {
      id: 'privacy',
      question: 'क्या मेरी जानकारी सुरक्षित है?',
      answer: 'हम इसका इस्तेमाल सिर्फ़ आपके अनुरोध के लिए करते हैं। प्राइवेसी पॉलिसी में पूरी जानकारी है।',
    },
    {
      id: 'progress',
      feature: 'clientAccounts',
      question: 'अपने अनुरोध की स्थिति कैसे देखूँ?',
      answer: 'उसी ईमेल से My LexBridge में साइन इन करें और स्थिति व अपडेट देखें।',
    },
  ],
};
