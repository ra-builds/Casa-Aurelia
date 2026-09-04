import { Suspense } from 'react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import ScrollToTop from '../components/ui/ScrollToTop'
import PageTransition from '../components/ui/PageTransition'
import PageLoader from '../components/ui/PageLoader'

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <Navbar />
      <Suspense fallback={<PageLoader />}>
        <PageTransition />
      </Suspense>
      <Footer />
    </div>
  )
}