import { useLocation, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle, CalendarPlus } from 'lucide-react'
import { motion } from 'framer-motion'
import Button from '../components/ui/Button'
import { usePageTitle } from '../hooks/usePageTitle'
import { useRestaurant } from '../contexts/RestaurantContext'
import { formatDate, generateCalendarLink } from '../utils/helpers'
import type { Reservation } from '../types'

export default function ConfirmationPage() {
  usePageTitle('pageTitles.confirmation')

  const location = useLocation()
  const { t } = useTranslation()
  const { restaurant } = useRestaurant()
  const reservation = location.state?.reservation as Reservation | undefined

  if (!reservation) {
    return <Navigate to="/reservations" replace />
  }

  const calendarLink = generateCalendarLink(
    t('confirmation.calendarTitle', { name: restaurant?.name ?? 'Casa Aurelia' }),
    reservation.reservation_date,
    reservation.reservation_time,
    t('confirmation.calendarDescription', { code: reservation.reference_code, guests: reservation.guests }),
    restaurant?.address,
  )

  return (
    <section className="min-h-screen pt-32 pb-20 flex items-center">
      <div className="max-w-lg mx-auto px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <CheckCircle size={64} className="text-wine mx-auto mb-6" />
          <h1 className="font-display text-4xl md:text-5xl font-semibold mb-4">
            {t('confirmation.title')}
          </h1>
          <p className="text-stone mb-10">
            {t('confirmation.message')}
          </p>

          <div className="card p-8 text-left space-y-4 mb-10">
            <div className="text-center pb-4 border-b border-cream-dark">
              <p className="text-xs uppercase tracking-widest text-stone mb-1">{t('confirmation.reference')}</p>
              <p className="font-display text-2xl font-semibold text-wine">
                {reservation.reference_code}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-stone text-xs uppercase tracking-wider">{t('confirmation.guest')}</p>
                <p className="font-medium mt-1">
                  {reservation.first_name} {reservation.last_name}
                </p>
              </div>
              <div>
                <p className="text-stone text-xs uppercase tracking-wider">{t('confirmation.guests')}</p>
                <p className="font-medium mt-1">{reservation.guests}</p>
              </div>
              <div>
                <p className="text-stone text-xs uppercase tracking-wider">{t('confirmation.date')}</p>
                <p className="font-medium mt-1">{formatDate(reservation.reservation_date)}</p>
              </div>
              <div>
                <p className="text-stone text-xs uppercase tracking-wider">{t('confirmation.time')}</p>
                <p className="font-medium mt-1">{reservation.reservation_time}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={calendarLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary inline-flex items-center justify-center gap-2"
            >
              <CalendarPlus size={18} />
              {t('confirmation.addToCalendar')}
            </a>
            <Button to="/" variant="primary">{t('confirmation.returnHome')}</Button>
            <Button to="/menu" variant="secondary">{t('confirmation.viewMenu')}</Button>
            <Button to="/reservation-lookup" variant="secondaryLight">{t('confirmation.manageReservation')}</Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
