import i18n from '../i18n'

const LOCALE_MAP: Record<string, string> = {
  en: 'en-GB',
  it: 'it-IT',
  fr: 'fr-FR',
  de: 'de-DE',
  es: 'es-ES',
}

export function getCurrentLocale(): string {
  return LOCALE_MAP[i18n.language] || 'en-GB'
}
