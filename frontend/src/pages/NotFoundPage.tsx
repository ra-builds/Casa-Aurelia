import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '../components/ui/Button'
import { usePageSeo } from '../hooks/usePageTitle'
import { SITE_CONFIG } from '../config/site'

export default function NotFoundPage() {
  const { t } = useTranslation()
  usePageSeo({ titleKey: 'pageTitles.notFound', noindex: true })

  return (
    <section className="flex min-h-screen items-center justify-center px-5 py-24">
      <div className="max-w-xl text-center">
        <p className="font-display text-7xl font-medium text-gold md:text-8xl" aria-hidden="true">
          404
        </p>
        <p className="label-micro mt-6">{SITE_CONFIG.brandName}</p>
        <h1 className="mt-4 font-display text-4xl font-medium text-charcoal-light md:text-5xl">
          {t('notFound.title')}
        </h1>
        <p className="lead mx-auto mt-6 max-w-md">{t('notFound.message')}</p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button to="/" variant="primary">{t('notFound.backToHome')}</Button>
          <Link
            to="/menu"
            className="text-sm uppercase tracking-wider text-wine transition-colors hover:text-wine-dark py-3 px-6"
          >
            {t('notFound.viewMenu')}
          </Link>
        </div>
      </div>
    </section>
  )
}