import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import ScrollToTop from '../components/ui/ScrollToTop'
import PageTransition from '../components/ui/PageTransition'
import PageLoader from '../components/ui/PageLoader'

export default function MainLayout() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-sm focus:bg-gold focus:px-5 focus:py-3 focus:text-[11px] focus:font-medium focus:uppercase focus:tracking-[0.24em] focus:text-charcoal"
      >
        {t('nav.skipToMain')}
      </a>
      <ScrollToTop />
      <Navbar />
      <Suspense fallback={<PageLoader />}>
        <PageTransition />
      </Suspense>
      <Footer />
    </div>
  )
}