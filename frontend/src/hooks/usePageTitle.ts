import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export function usePageTitle(titleKey?: string) {
  const { t } = useTranslation()

  useEffect(() => {
    const prev = document.title
    const title = titleKey ? t(titleKey) : t('pageTitles.home')
    document.title = title || 'Casa Aurelia | Modern Italian Restaurant in Novara'
    return () => {
      document.title = prev
    }
  }, [titleKey, t])
}

export function useMetaDescription(descriptionKey: string) {
  const { t } = useTranslation()

  useEffect(() => {
    let meta = document.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', t(descriptionKey))
  }, [descriptionKey, t])
}
