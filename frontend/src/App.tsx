import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { RestaurantProvider } from './contexts/RestaurantContext'
import MainLayout from './layouts/MainLayout'
import HomePage from './pages/HomePage'
import MenuPage from './pages/MenuPage'
import AboutPage from './pages/AboutPage'
import GalleryPage from './pages/GalleryPage'
import ReservationsPage from './pages/ReservationsPage'
import ContactPage from './pages/ContactPage'
import ConfirmationPage from './pages/ConfirmationPage'
import ReservationLookupPage from './pages/ReservationLookupPage'
import NotFoundPage from './pages/NotFoundPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <RestaurantProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<MainLayout />}>
              <Route index element={<HomePage />} />
              <Route path="menu" element={<MenuPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="gallery" element={<GalleryPage />} />
              <Route path="reservations" element={<ReservationsPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="reservation-confirmed" element={<ConfirmationPage />} />
              <Route path="reservation-lookup" element={<ReservationLookupPage />} />
            </Route>
            <Route path="admin" element={<AdminPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </RestaurantProvider>
  )
}
