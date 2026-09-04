import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { AuthProvider } from './hooks/useAuth'
import { RestaurantProvider } from './contexts/RestaurantContext'
import MainLayout from './layouts/MainLayout'
import PageLoader from './components/ui/PageLoader'
import HomePage from './pages/HomePage'
import StructuredData from './components/seo/StructuredData'

// Route-level code splitting (Original Phase 15 — Performance).
// HomePage is intentionally kept eager: it is the common entry route and its
// above-the-fold hero content should not wait on a Suspense boundary. All other
// public pages and the standalone admin route are deferred into their own
// chunks, so non-critical JS is not downloaded on initial load.
const MenuPage = lazy(() => import('./pages/MenuPage'))
const SignaturesPage = lazy(() => import('./pages/SignaturesPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const GalleryPage = lazy(() => import('./pages/GalleryPage'))
const ReservationsPage = lazy(() => import('./pages/ReservationsPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const ConfirmationPage = lazy(() => import('./pages/ConfirmationPage'))
const ReservationLookupPage = lazy(() => import('./pages/ReservationLookupPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))

export default function App() {
  return (
    <RestaurantProvider>
      <StructuredData />
      <AuthProvider>
        <MotionConfig reducedMotion="user">
          <BrowserRouter>
            <Routes>
              {/* MainLayout provides its own Suspense around the routed content,
                  keeping the Navbar/Footer visible while lazy pages load. */}
              <Route element={<MainLayout />}>
                <Route index element={<HomePage />} />
                <Route path="menu" element={<MenuPage />} />
                <Route path="signatures" element={<SignaturesPage />} />
                <Route path="about" element={<AboutPage />} />
                <Route path="gallery" element={<GalleryPage />} />
                <Route path="reservations" element={<ReservationsPage />} />
                <Route path="contact" element={<ContactPage />} />
                <Route path="reservation-confirmed" element={<ConfirmationPage />} />
                <Route path="reservation-lookup" element={<ReservationLookupPage />} />
              </Route>
              {/* Standalone admin route sits outside MainLayout, so it needs its
                  own Suspense boundary. */}
              <Route
                path="admin"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <AdminPage />
                  </Suspense>
                }
              />
              <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFoundPage /></Suspense>} />
            </Routes>
          </BrowserRouter>
        </MotionConfig>
      </AuthProvider>
    </RestaurantProvider>
  )
}
