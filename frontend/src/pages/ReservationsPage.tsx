import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Calendar, Users, Clock } from 'lucide-react'
import SectionHeading from '../components/ui/SectionHeading'
import Button from '../components/ui/Button'
import ErrorMessage from '../components/ui/ErrorMessage'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { usePageTitle, useMetaDescription } from '../hooks/usePageTitle'
import { useRestaurant } from '../contexts/RestaurantContext'
import { reservationApi } from '../services/api'
import { TIME_SLOTS } from '../utils/constants'
import { getMinDate, validateEmail, validatePhone } from '../utils/helpers'
import type { ReservationFormData } from '../types'

const WEEKDAY_INDEX: Record<string, number> = {
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3,
  friday: 4, saturday: 5, sunday: 6,
}

function isClosedDay(dateStr: string, closedDay: string): boolean {
  if (!dateStr || !closedDay) return false
  const idx = WEEKDAY_INDEX[closedDay.trim().toLowerCase()]
  if (idx === undefined) return false
  return new Date(dateStr + 'T00:00:00').getDay() === idx
}

export default function ReservationsPage() {
  usePageTitle('pageTitles.reservations')
  useMetaDescription('meta.reservations')

  const { t } = useTranslation()
  const navigate = useNavigate()
  const { restaurant } = useRestaurant()
  const [form, setForm] = useState<ReservationFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    reservation_date: '',
    reservation_time: '',
    guests: 2,
    special_requests: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [availabilityMsg, setAvailabilityMsg] = useState('')
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    if (!form.reservation_date || !form.reservation_time || !form.guests) {
      setIsAvailable(null)
      setAvailabilityMsg('')
      return
    }

    const timer = setTimeout(async () => {
      setCheckingAvailability(true)
      try {
        const result = await reservationApi.checkAvailability(
          form.reservation_date,
          form.reservation_time,
          form.guests,
        )
        setIsAvailable(result.available)
        setAvailabilityMsg(result.message)
      } catch {
        setIsAvailable(null)
        setAvailabilityMsg('')
      } finally {
        setCheckingAvailability(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [form.reservation_date, form.reservation_time, form.guests])

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!form.first_name.trim()) newErrors.first_name = t('reservation.validation.firstNameRequired')
    if (!form.last_name.trim()) newErrors.last_name = t('reservation.validation.lastNameRequired')
    if (!form.email.trim()) newErrors.email = t('reservation.validation.emailRequired')
    else if (!validateEmail(form.email)) newErrors.email = t('reservation.validation.emailInvalid')
    if (!form.phone.trim()) newErrors.phone = t('reservation.validation.phoneRequired')
    else if (!validatePhone(form.phone)) newErrors.phone = t('reservation.validation.phoneInvalid')
    if (!form.reservation_date) newErrors.reservation_date = t('reservation.validation.dateRequired')
    if (!form.reservation_time) newErrors.reservation_time = t('reservation.validation.timeRequired')
    if (form.guests < 1 || form.guests > 12) newErrors.guests = t('reservation.validation.guestsRange')
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    if (!validate()) return
    if (isAvailable === false) {
      setSubmitError(t('reservation.timeUnavailable'))
      return
    }

    setSubmitting(true)
    try {
      const reservation = await reservationApi.create(form)
      navigate('/reservation-confirmed', { state: { reservation } })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('reservation.createFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <section className="pt-32 pb-16 bg-charcoal text-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <SectionHeading title={t('reservation.heroTitle')} subtitle={t('reservation.heroSubtitle')} light />
          <p className="mt-4 text-cream/70 max-w-xl mx-auto">
            {t('reservation.intro')}
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card p-8 md:p-10">
            {submitError && <div className="mb-6"><ErrorMessage message={submitError} /></div>}

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="first_name" className="label-field">{t('reservation.firstName')}</label>
                  <input
                    id="first_name"
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="input-field"
                    aria-invalid={!!errors.first_name}
                  />
                  {errors.first_name && <p className="text-red-600 text-xs mt-1">{errors.first_name}</p>}
                </div>
                <div>
                  <label htmlFor="last_name" className="label-field">{t('reservation.lastName')}</label>
                  <input
                    id="last_name"
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="input-field"
                    aria-invalid={!!errors.last_name}
                  />
                  {errors.last_name && <p className="text-red-600 text-xs mt-1">{errors.last_name}</p>}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="email" className="label-field">{t('reservation.email')}</label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input-field"
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label htmlFor="phone" className="label-field">{t('reservation.phone')}</label>
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="input-field"
                    placeholder="+39 0321 123 456"
                    aria-invalid={!!errors.phone}
                  />
                  {errors.phone && <p className="text-red-600 text-xs mt-1">{errors.phone}</p>}
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-5">
                <div>
                  <label htmlFor="date" className="label-field">
                    <Calendar size={14} className="inline mr-1" />{t('reservation.date')}
                  </label>
                  <input
                    id="date"
                    type="date"
                    min={getMinDate()}
                    value={form.reservation_date}
                    onChange={(e) => setForm({ ...form, reservation_date: e.target.value })}
                    className="input-field"
                    aria-invalid={!!errors.reservation_date}
                  />
                  {errors.reservation_date && <p className="text-red-600 text-xs mt-1">{errors.reservation_date}</p>}
                  {form.reservation_date && isClosedDay(form.reservation_date, restaurant?.closed_day ?? '') && (
                    <p className="text-red-600 text-xs mt-1">
                      {t('reservation.closedDayNote', { day: restaurant?.closed_day ?? '' })}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="time" className="label-field">
                    <Clock size={14} className="inline mr-1" />{t('reservation.time')}
                  </label>
                  <select
                    id="time"
                    value={form.reservation_time}
                    onChange={(e) => setForm({ ...form, reservation_time: e.target.value })}
                    className="input-field"
                    aria-invalid={!!errors.reservation_time}
                  >
                    <option value="">{t('reservation.selectTime')}</option>
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                  {errors.reservation_time && <p className="text-red-600 text-xs mt-1">{errors.reservation_time}</p>}
                </div>
                <div>
                  <label htmlFor="guests" className="label-field">
                    <Users size={14} className="inline mr-1" />{t('reservation.guests')}
                  </label>
                  <select
                    id="guests"
                    value={form.guests}
                    onChange={(e) => setForm({ ...form, guests: parseInt(e.target.value) })}
                    className="input-field"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n} {n === 1 ? t('common.guest') : t('common.guests')}</option>
                    ))}
                  </select>
                  {errors.guests && <p className="text-red-600 text-xs mt-1">{errors.guests}</p>}
                </div>
              </div>

              {checkingAvailability && (
                <div className="flex items-center gap-2 text-stone text-sm">
                  <LoadingSpinner className="!justify-start" />
                  {t('reservation.checkingAvailability')}
                </div>
              )}
              {!checkingAvailability && availabilityMsg && (
                <p className={`text-sm ${isAvailable ? 'text-green-700' : 'text-red-600'}`}>
                  {availabilityMsg}
                </p>
              )}

              <div>
                <label htmlFor="special_requests" className="label-field">{t('reservation.specialRequestsOptional')}</label>
                <textarea
                  id="special_requests"
                  rows={3}
                  value={form.special_requests}
                  onChange={(e) => setForm({ ...form, special_requests: e.target.value })}
                  className="input-field resize-none"
                  placeholder={t('reservation.specialRequestsPlaceholder')}
                />
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" disabled={submitting || isAvailable === false} className="w-full sm:w-auto">
                  {submitting ? t('reservation.submitting') : t('reservation.confirmButton')}
                </Button>
              </div>
            </form>
          </div>

          <p className="mt-8 text-center text-stone text-sm">
            {t('reservation.lunchLabel')}: {restaurant?.lunch_hours ?? ''} · {t('reservation.dinnerLabel')}: {restaurant?.dinner_hours ?? ''} · {t('reservation.closedLabel')} {restaurant?.closed_day ?? ''}
          </p>
        </div>
      </section>
    </>
  )
}
