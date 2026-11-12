import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';

// All supported languages with native names
export const LANGUAGES: Record<string, { name: string; nativeName: string; dir?: 'rtl' }> = {
  en: { name: 'English', nativeName: 'English' },
  // EU Official Languages (24)
  bg: { name: 'Bulgarian', nativeName: 'Български' },
  cs: { name: 'Czech', nativeName: 'Čeština' },
  da: { name: 'Danish', nativeName: 'Dansk' },
  de: { name: 'German', nativeName: 'Deutsch' },
  el: { name: 'Greek', nativeName: 'Ελληνικά' },
  es: { name: 'Spanish', nativeName: 'Español' },
  et: { name: 'Estonian', nativeName: 'Eesti' },
  fi: { name: 'Finnish', nativeName: 'Suomi' },
  fr: { name: 'French', nativeName: 'Français' },
  ga: { name: 'Irish', nativeName: 'Gaeilge' },
  hr: { name: 'Croatian', nativeName: 'Hrvatski' },
  hu: { name: 'Hungarian', nativeName: 'Magyar' },
  it: { name: 'Italian', nativeName: 'Italiano' },
  lt: { name: 'Lithuanian', nativeName: 'Lietuvių' },
  lv: { name: 'Latvian', nativeName: 'Latviešu' },
  mt: { name: 'Maltese', nativeName: 'Malti' },
  nl: { name: 'Dutch', nativeName: 'Nederlands' },
  pl: { name: 'Polish', nativeName: 'Polski' },
  pt: { name: 'Portuguese', nativeName: 'Português' },
  ro: { name: 'Romanian', nativeName: 'Română' },
  sk: { name: 'Slovak', nativeName: 'Slovenčina' },
  sl: { name: 'Slovenian', nativeName: 'Slovenščina' },
  sv: { name: 'Swedish', nativeName: 'Svenska' },
  // Major Asian Languages
  zh: { name: 'Chinese (Simplified)', nativeName: '中文(简体)' },
  'zh-TW': { name: 'Chinese (Traditional)', nativeName: '中文(繁體)' },
  ja: { name: 'Japanese', nativeName: '日本語' },
  ko: { name: 'Korean', nativeName: '한국어' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी' },
  bn: { name: 'Bengali', nativeName: 'বাংলা' },
  th: { name: 'Thai', nativeName: 'ไทย' },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  ms: { name: 'Malay', nativeName: 'Bahasa Melayu' },
  tl: { name: 'Filipino', nativeName: 'Filipino' },
  my: { name: 'Burmese', nativeName: 'မြန်မာ' },
  km: { name: 'Khmer', nativeName: 'ភាសាខ្មែរ' },
  // Middle Eastern & Central Asian
  ar: { name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  fa: { name: 'Persian', nativeName: 'فارسی', dir: 'rtl' },
  he: { name: 'Hebrew', nativeName: 'עברית', dir: 'rtl' },
  tr: { name: 'Turkish', nativeName: 'Türkçe' },
  ur: { name: 'Urdu', nativeName: 'اردو', dir: 'rtl' },
  kk: { name: 'Kazakh', nativeName: 'Қазақша' },
  uz: { name: 'Uzbek', nativeName: 'Oʻzbekcha' },
  // African Languages
  sw: { name: 'Swahili', nativeName: 'Kiswahili' },
  am: { name: 'Amharic', nativeName: 'አማርኛ' },
  ha: { name: 'Hausa', nativeName: 'Hausa' },
  yo: { name: 'Yoruba', nativeName: 'Yorùbá' },
  zu: { name: 'Zulu', nativeName: 'isiZulu' },
  af: { name: 'Afrikaans', nativeName: 'Afrikaans' },
  // Other Major Languages
  ru: { name: 'Russian', nativeName: 'Русский' },
  uk: { name: 'Ukrainian', nativeName: 'Українська' },
  ka: { name: 'Georgian', nativeName: 'ქართული' },
  hy: { name: 'Armenian', nativeName: 'Հայերեն' },
  ne: { name: 'Nepali', nativeName: 'नेपाली' },
  si: { name: 'Sinhala', nativeName: 'සිංහල' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்' },
  te: { name: 'Telugu', nativeName: 'తెలుగు' },
  ml: { name: 'Malayalam', nativeName: 'മലയാളം' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  mr: { name: 'Marathi', nativeName: 'मराठी' },
  gu: { name: 'Gujarati', nativeName: 'ગુજરાતી' },
  pa: { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  // Americas
  'pt-BR': { name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)' },
  'es-MX': { name: 'Spanish (Mexico)', nativeName: 'Español (México)' },
};

// Translation cache
const translationCache: Record<string, any> = {};

// Lazy-load translations from backend
const loadTranslation = async (lang: string): Promise<any> => {
  if (lang === 'en') return en;
  if (translationCache[lang]) return translationCache[lang];

  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'qhtntebpcribjiwrdtdd';
    const resp = await fetch(`https://${projectId}.supabase.co/functions/v1/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_lang: lang }),
    });

    if (!resp.ok) {
      throw new Error(`Translation API returned ${resp.status}`);
    }

    const data = await resp.json();
    if (data.translations) {
      translationCache[lang] = data.translations;
      return data.translations;
    }
    throw new Error('No translations in response');
  } catch (e) {
    console.warn(`[i18n] Failed to load ${lang}:`, e);
    throw e; // Re-throw so changeLanguage can handle it
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', ...Object.keys(LANGUAGES).filter(k => k !== 'en')],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

// Dynamic language loading
export async function changeLanguage(lang: string) {
  if (lang === 'en') {
    i18n.changeLanguage('en');
    document.documentElement.dir = 'ltr';
    return;
  }

  try {
    const translations = await loadTranslation(lang);
    i18n.addResourceBundle(lang, 'translation', translations, true, true);
    i18n.changeLanguage(lang);

    // Set text direction for RTL languages
    const langConfig = LANGUAGES[lang];
    document.documentElement.dir = langConfig?.dir === 'rtl' ? 'rtl' : 'ltr';
  } catch (e) {
    // Fall back to English on failure but still notify user
    console.error(`[i18n] Translation failed for ${lang}, staying on current language`);
    throw new Error(`Translation to ${LANGUAGES[lang]?.name || lang} is temporarily unavailable. Please try again later.`);
  }
}

export default i18n;
