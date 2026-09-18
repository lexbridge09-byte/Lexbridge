export const drafting = {
  metadata: {
    title: 'कानूनी ड्राफ्टिंग',
    description: 'लीगल नोटिस, एग्रीमेंट, एफ़िडेविट, आवेदन और शिकायत।',
  },
  header: {
    title: 'कानूनी ड्राफ्टिंग',
    lead: 'अपनी स्थिति के हिसाब से कानूनी दस्तावेज़ तैयार करवाएँ।',
  },

  documentTypes: {
    title: 'हम ये दस्तावेज़ बनाते हैं',
    items: [
      { icon: 'notice', title: 'लीगल नोटिस', description: 'औपचारिक माँग या जवाब।' },
      { icon: 'agreement', title: 'एग्रीमेंट', description: 'दोनों पक्षों के अधिकार और ज़िम्मेदारियाँ।' },
      { icon: 'affidavit', title: 'एफ़िडेविट', description: 'शपथ पत्र और घोषणाएँ।' },
      { icon: 'application', title: 'आवेदन', description: 'अधिकारियों को औपचारिक पत्र।' },
      { icon: 'complaint', title: 'शिकायत', description: 'साफ़ और व्यवस्थित शिकायत।' },
      { icon: 'other', title: 'दूसरे दस्तावेज़', description: 'बताइए आपको क्या चाहिए।' },
    ],
  },

  steps: {
    title: "यह कैसे काम करता है",
    items: [
      { title: "जानकारी दें", description: "बताएँ कि दस्तावेज़ में क्या चाहिए।" },
      { title: "काम और फीस", description: "शुरू करने से पहले दोनों तय होते हैं।" },
      { title: "ड्राफ्टिंग और बदलाव", description: "हम तैयार करते हैं। ज़रूरत हो तो बदलाव माँगें।" },
      { title: "डिलीवरी", description: "अंतिम दस्तावेज़ पाएँ।" },
    ],
  },

  request: {
    title: 'दस्तावेज़ बनवाएँ',
    note: 'शुरू करने से पहले काम और फ़ीस तय होगी।',
    subtypeLabel: 'दस्तावेज़ का प्रकार',
    descriptionLabel: 'इसमें क्या-क्या होना चाहिए?',
    submitLabel: 'अनुरोध भेजें',
  },
};
