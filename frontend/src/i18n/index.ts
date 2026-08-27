import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './translations/en.json'
import it from './translations/it.json'
import fr from './translations/fr.json'
import de from './translations/de.json'
import es from './translations/es.json'

const STORAGE_KEY = 'restaurant_language'
export const SUPPORTED_LANGUAGES = ['en', 'it', 'fr', 'de', 'es'] as const
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

function isSupportedLanguage(lng: string): lng is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lng as SupportedLanguage)
}

function detectLanguage(): SupportedLanguage {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && isSupportedLanguage(saved)) {
    return saved
  }

  const browserLang = navigator.language.split('-')[0]
  if (isSupportedLanguage(browserLang)) {
    return browserLang
  }

  return 'en'
}

const detectedLanguage = detectLanguage()

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    it: { translation: it },
    fr: { translation: fr },
    de: { translation: de },
    es: { translation: es },
  },
  lng: detectedLanguage,
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LANGUAGES],
  interpolation: {
    escapeValue: false,
  },
})

i18n.on('languageChanged', (lng: string) => {
  localStorage.setItem(STORAGE_KEY, lng)
  document.documentElement.lang = lng
})

document.documentElement.lang = detectedLanguage

export default i18n
