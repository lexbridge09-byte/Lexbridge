// Languages a client can ask to be served in. `key` values are stored in the DB.
export const SUPPORTED_LANGUAGES = [
  { key: 'en', label: 'English', nativeLabel: 'English' },
  { key: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { key: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
  { key: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { key: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { key: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
  { key: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી' },
  { key: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
  { key: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം' },
  { key: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ' },
];

export const SUPPORTED_LANGUAGE_KEYS = SUPPORTED_LANGUAGES.map((language) => language.key);

export const DEFAULT_LANGUAGE_KEY = 'en';
