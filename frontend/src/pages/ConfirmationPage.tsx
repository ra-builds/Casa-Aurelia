import { useLocation, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle, CalendarPlus } from 'lucide-react'
import { motion } from 'framer-motion'
import Button from '../components/ui/Button'
import { usePageSeo } from '../hooks/usePageTitle'
import { useRestaurant } from '../contexts/RestaurantContext'
import { SITE_CONFIG } from '../config/site'
import { formatDate, generateCalendarLink } from '../utils/helpers'
import type { Reservation } from '../types'

export default function ConfirmationPage() {
  usePageSeo({ titleKey: 'pageTitles.confirmation', noindex: true })

  const location = useLocation()
  const { t } = useTranslation()
  const { restaurant } = useRestaurant()
  const reservation = location.state?.reservation as Reservation | undefined

  if (!reservation) {
    return <Navigate to="/reservations" replace />
  }

  const calendarLink = generateCalendarLink(
    t('confirmation.calendarTitle', { name: restaurant?.name ?? SITE_CONFIG.brandName }),
    reservation.reservation_date,
    reservation.reservation_time,
    t('confirmation.calendarDescription', { code: reservation.reference_code, guests: reservation.guests }),
    restaurant?.address,
  )

  return (
    <section className="min-h-screen px-5 pb-24 pt-36 flex items-center md:pt-44">
      <div className="mx-auto max-w-lg text-center sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="inline-flex h-20 w-20 items-center justify-center rounded-full border border-gold/50 bg-ivory/70">
            <CheckCircle size={40} className="text-gold" aria-hidden="true" />
          </span>
          <h1 className="mt-8 font-display font-medium leading-[1.05] tracking-[-0.015em] text-[clamp(2.4rem,5vw,3.8rem)] text-charcoal-light">
            {t('confirmation.headline')}
          </h1>
          <p className="mt-5 text-stone">
            {reservation.email_sent
              ? t('confirmation.messageEmailSent')
              : t('confirmation.messageNoEmail')}
          </p>

          <div className="card mt-10 p-8 text-left">
            <div className="border-b border-charcoal/10 pb-5 text-center">
              <p className="mb-1 text-xs uppercase tracking-[0.2em] text-stone">{t('confirmation.reference')}</p>
              <p className="font-display text-2xl font-semibold text-wine">{reservation.reference_code}</p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider text-stone">{t('confirmation.guest')}</p>
                <p className="mt-1 font-medium">{reservation.first_name} {reservation.last_name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-stone">{t('confirmation.guests')}</p>
                <p className="mt-1 font-medium">{reservation.guests}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-stone">{t('confirmation.date')}</p>
                <p className="mt-1 font-medium">{formatDate(reservation.reservation_date)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-stone">{t('confirmation.time')}</p>
                <p className="mt-1 font-medium">{reservation.reservation_time}</p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row sm:flex-wrap gap-4 justify-center">
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