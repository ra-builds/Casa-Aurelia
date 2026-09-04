import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react'
import PageHero from '../components/ui/PageHero'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import ErrorMessage from '../components/ui/ErrorMessage'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Reveal from '../components/ui/Reveal'
import { usePageSeo } from '../hooks/usePageTitle'
import { useRestaurant } from '../contexts/RestaurantContext'
import { reservationApi } from '../services/api'
import { TIME_SLOT_GROUPS } from '../utils/constants'
import { getMinDate, validateEmail, validatePhone, formatDate, resolveDayKey } from '../utils/helpers'
import { getWeekdayFromDateOnly } from '../utils/date'
import { GALLERY_CLOSING_IMAGE, gallerySrc } from '../utils/galleryImages'
import type { ReservationFormData } from '../types'

const WEEKDAY_INDEX: Record<string, number> = {
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3,
  friday: 4, saturday: 5, sunday: 6,
}

const TOTAL_STEPS = 5

const STEP_INTRO_KEYS = [
  'reservation.step.dateIntro',
  'reservation.step.guestsIntro',
  'reservation.step.timeIntro',
  'reservation.step.detailsIntro',
  'reservation.step.reviewIntro',
] as const

function isClosedDay(dateStr: string, closedDay: string): boolean {
  if (!dateStr || !closedDay) return false
  const idx = WEEKDAY_INDEX[closedDay.trim().toLowerCase()]
  if (idx === undefined) return false
  return getWeekdayFromDateOnly(dateStr) === idx
}

interface Availability {
  checked: boolean
  available: boolean
  message: string
}

export default function ReservationsPage() {
  usePageSeo({ titleKey: 'pageTitles.reservations', descriptionKey: 'meta.reservations' })

  const { t } = useTranslation()
  const navigate = useNavigate()
  const { restaurant } = useRestaurant()

  const closedDayKey = restaurant ? resolveDayKey(restaurant.closed_day) : null
  const closedDayLabel = closedDayKey ? t(closedDayKey) : restaurant?.closed_day ?? ''

  const [step, setStep] = useState(0)
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
  const [checking, setChecking] = useState(false)
  const [availability, setAvailability] = useState<Availability | null>(null)

  useEffect(() => {
    if (step !== 2 || !form.reservation_date || !form.reservation_time) {
      setAvailability(null)
      return
    }

    const timer = setTimeout(async () => {
      setChecking(true)
      setAvailability(null)
      try {
        const result = await reservationApi.checkAvailability(
          form.reservation_date,
          form.reservation_time,
          form.guests,
        )
        setAvailability({ checked: true, available: result.available, message: result.message })
      } catch {
        setAvailability(null)
      } finally {
        setChecking(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [form.reservation_date, form.reservation_time, form.guests, step])

  const validateStep = (s: number) => {
    const newErrors: Record<string, string> = {}
    if (s === 0) {
      if (!form.reservation_date) newErrors.reservation_date = t('reservation.validation.dateRequired')
      else if (form.reservation_date < getMinDate()) newErrors.reservation_date = t('reservation.validation.datePast')
      else if (isClosedDay(form.reservation_date, restaurant?.closed_day ?? ''))
        newErrors.reservation_date = t('reservation.validation.dateClosed', { day: closedDayLabel })
    } else if (s === 1) {
      if (form.guests < 1 || form.guests > 12) newErrors.guests = t('reservation.validation.guestsRange')
    } else if (s === 2) {
      if (!form.reservation_time) newErrors.reservation_time = t('reservation.validation.timeRequired')
    } else if (s === 3) {
      if (!form.first_name.trim()) newErrors.first_name = t('reservation.validation.firstNameRequired')
      if (!form.last_name.trim()) newErrors.last_name = t('reservation.validation.lastNameRequired')
      if (!form.email.trim()) newErrors.email = t('reservation.validation.emailRequired')
      else if (!validateEmail(form.email)) newErrors.email = t('reservation.validation.emailInvalid')
      if (!form.phone.trim()) newErrors.phone = t('reservation.validation.phoneRequired')
      else if (!validatePhone(form.phone)) newErrors.phone = t('reservation.validation.phoneInvalid')
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (!validateStep(step)) return
    if (step === 2 && availability && !availability.available) {
      setSubmitError(t('reservation.timeUnavailable'))
      return
    }
    setSubmitError('')
    setStep(step + 1)
  }

  const handleBack = () => {
    setSubmitError('')
    setErrors({})
    setStep((s) => Math.max(0, s - 1))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    if (submitting) return

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

  const nextDisabled = checking || (step === 2 && availability !== null && !availability.available)

  const closedDayOnDate = form.reservation_date
    ? isClosedDay(form.reservation_date, restaurant?.closed_day ?? '')
    : false

  return (
    <>
      <PageHero
        label={t('reservation.heroSubtitle')}
        title={t('reservation.heroTitle')}
        intro={t('reservation.intro')}
        align="center"
        image={gallerySrc(GALLERY_CLOSING_IMAGE, 1920)}
        imagePosition="center 38%"
      />

      <section className="py-24 md:py-32">
        <Container>
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="label-micro">{t('reservation.journeyLabel')}</p>
              <h2 className="headline-section mt-5">{t('reservation.journeyTitle')}</h2>
              <div className="mx-auto mt-7 h-px w-16 bg-gold/40" aria-hidden="true" />
              <p className="lead mt-7">{t('reservation.journeyBody')}</p>
            </div>
          </Reveal>
        </Container>
      </section>

      <section id="reserve" className="scroll-mt-28 pb-24 md:pb-32">
        <Container>
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-x-12">
            <div className="lg:col-span-7">
              <div className="card p-8 md:p-12">
                {submitError && <div className="mb-8"><ErrorMessage message={submitError} /></div>}

                <form onSubmit={step === 4 ? handleSubmit : (e) => { e.preventDefault(); handleNext() }} noValidate>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="label-micro">
                        {t('reservation.step.label', { current: step + 1, total: TOTAL_STEPS })}
                      </p>
                      <h2 className="mt-3 font-display text-3xl font-medium text-charcoal-light md:text-4xl">
                        {t(`reservation.step.${['date', 'guests', 'time', 'details', 'review'][step]}`)}
                      </h2>
                    </div>
                  </div>

                  <div className="mt-5 h-px w-full bg-charcoal/10" role="presentation">
                    <div
                      className="h-px bg-gold transition-all duration-500"
                      style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
                    />
                  </div>

                  <p className="lead mt-7">{t(STEP_INTRO_KEYS[step])}</p>

                  <div className="mt-8">
                    {step === 0 && (
                      <div>
                        <label htmlFor="date" className="label-field">{t('reservation.date')}</label>
                        <input
                          id="date"
                          type="date"
                          min={getMinDate()}
                          value={form.reservation_date}
                          onChange={(e) => setForm({ ...form, reservation_date: e.target.value })}
                          className="input-field"
                          aria-invalid={!!errors.reservation_date}
                          aria-describedby={[
                            errors.reservation_date ? 'date-error' : null,
                            closedDayOnDate ? 'date-closed-note' : null,
                          ].filter(Boolean).join(' ') || undefined}
                        />
                        {errors.reservation_date && (
                          <p id="date-error" role="alert" className="text-red-600 text-xs mt-2">{errors.reservation_date}</p>
                        )}
                        {closedDayOnDate && (
                          <p id="date-closed-note" className="text-red-600 text-xs mt-2">
                            {t('reservation.closedDayNote', { day: closedDayLabel })}
                          </p>
                        )}
                      </div>
                    )}

                    {step === 1 && (
                      <div>
                        <div
                          className="grid grid-cols-4 gap-3 sm:grid-cols-6"
                          aria-describedby={errors.guests ? 'guests-error' : undefined}
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                            <button
                              key={n}
                              type="button"
                              aria-pressed={form.guests === n}
                              onClick={() => setForm({ ...form, guests: n })}
                              className={`cursor-pointer border py-3.5 font-display text-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine focus-visible:ring-offset-2 focus-visible:ring-offset-cream ${
                                form.guests === n
                                  ? 'border-wine bg-wine text-cream'
                                  : 'border-charcoal/20 text-charcoal-light hover:border-wine hover:text-wine'
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                        <p className="mt-4 text-sm text-stone">
                          {form.guests} {form.guests === 1 ? t('common.guest') : t('common.guests')}
                        </p>
                        {errors.guests && (
                          <p id="guests-error" role="alert" className="text-red-600 text-xs mt-2">{errors.guests}</p>
                        )}
                      </div>
                    )}

                    {step === 2 && (
                      <div>
                        <div
                          className="space-y-5"
                          aria-describedby={errors.reservation_time ? 'time-error' : undefined}
                        >
                          {TIME_SLOT_GROUPS.map((group) => (
                            <fieldset key={group.label}>
                              <legend className="label-field">
                                {group.label === 'lunch' ? t('reservation.lunchLabel') : t('reservation.dinnerLabel')}
                              </legend>
                              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                                {group.slots.map((slot) => (
                                  <button
                                    key={slot}
                                    type="button"
                                    aria-pressed={form.reservation_time === slot}
                                    onClick={() => setForm({ ...form, reservation_time: slot })}
                                    className={`cursor-pointer border py-3 font-display text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine focus-visible:ring-offset-2 focus-visible:ring-offset-cream ${
                                      form.reservation_time === slot
                                        ? 'border-wine bg-wine text-cream'
                                        : 'border-charcoal/20 text-charcoal-light hover:border-wine hover:text-wine'
                                    }`}
                                  >
                                    {slot}
                                  </button>
                                ))}
                              </div>
                            </fieldset>
                          ))}
                        </div>
                        {errors.reservation_time && (
                          <p id="time-error" role="alert" className="text-red-600 text-xs mt-2">{errors.reservation_time}</p>
                        )}
                        {checking && (
                          <div className="mt-5 flex items-center gap-2 text-sm text-stone" role="status">
                            <LoadingSpinner className="!justify-start" />
                            {t('reservation.step.checkingTimes')}
                          </div>
                        )}
                        {!checking && availability && !availability.available && (
                          <div role="status" className="mt-5 border-l-2 border-red-500 bg-red-50 p-4 text-sm text-red-800">
                            <p className="flex items-center gap-2 font-medium uppercase tracking-wider text-xs">
                              <AlertCircle size={14} aria-hidden="true" />
                              {t('reservation.step.unavailable')}
                            </p>
                            <p className="mt-1">{availability.message}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {step === 3 && (
                      <div className="space-y-6">
                        <div className="grid gap-5 sm:grid-cols-2">
                          <div>
                            <label htmlFor="first_name" className="label-field">{t('reservation.firstName')}</label>
                            <input
                              id="first_name"
                              type="text"
                              autoComplete="given-name"
                              value={form.first_name}
                              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                              className="input-field"
                              aria-invalid={!!errors.first_name}
                              aria-describedby={errors.first_name ? 'first_name-error' : undefined}
                            />
                            {errors.first_name && (
                              <p id="first_name-error" role="alert" className="text-red-600 text-xs mt-1">{errors.first_name}</p>
                            )}
                          </div>
                          <div>
                            <label htmlFor="last_name" className="label-field">{t('reservation.lastName')}</label>
                            <input
                              id="last_name"
                              type="text"
                              autoComplete="family-name"
                              value={form.last_name}
                              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                              className="input-field"
                              aria-invalid={!!errors.last_name}
                              aria-describedby={errors.last_name ? 'last_name-error' : undefined}
                            />
                            {errors.last_name && (
                              <p id="last_name-error" role="alert" className="text-red-600 text-xs mt-1">{errors.last_name}</p>
                            )}
                          </div>
                        </div>
                        <div className="grid gap-5 sm:grid-cols-2">
                          <div>
                            <label htmlFor="email" className="label-field">{t('reservation.email')}</label>
                            <input
                              id="email"
                              type="email"
                              autoComplete="email"
                              value={form.email}
                              onChange={(e) => setForm({ ...form, email: e.target.value })}
                              className="input-field"
                              aria-invalid={!!errors.email}
                              aria-describedby={errors.email ? 'email-error' : undefined}
                            />
                            {errors.email && (
                              <p id="email-error" role="alert" className="text-red-600 text-xs mt-1">{errors.email}</p>
                            )}
                          </div>
                          <div>
                            <label htmlFor="phone" className="label-field">{t('reservation.phone')}</label>
                            <input
                              id="phone"
                              type="tel"
                              autoComplete="tel"
                              value={form.phone}
                              onChange={(e) => setForm({ ...form, phone: e.target.value })}
                              className="input-field"
                              placeholder={t('reservation.phonePlaceholder')}
                              aria-invalid={!!errors.phone}
                              aria-describedby={errors.phone ? 'phone-error' : undefined}
                            />
                            {errors.phone && (
                              <p id="phone-error" role="alert" className="text-red-600 text-xs mt-1">{errors.phone}</p>
                            )}
                          </div>
                        </div>
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
                      </div>
                    )}

                    {step === 4 && (
                      <div className="border-y border-charcoal/10">
                        <dl className="divide-y divide-charcoal/10 text-sm">
                          <div className="flex justify-between gap-6 py-4">
                            <dt className="shrink-0 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-stone">{t('confirmation.guest')}</dt>
                            <dd className="text-right font-display text-base text-charcoal-light">{form.first_name} {form.last_name}</dd>
                          </div>
                          <div className="flex justify-between gap-6 py-4">
                            <dt className="shrink-0 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-stone">{t('reservation.date')}</dt>
                            <dd className="text-right font-display text-base text-charcoal-light">{formatDate(form.reservation_date)}</dd>
                          </div>
                          <div className="flex justify-between gap-6 py-4">
                            <dt className="shrink-0 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-stone">{t('reservation.time')}</dt>
                            <dd className="text-right font-display text-base text-charcoal-light">{form.reservation_time}</dd>
                          </div>
                          <div className="flex justify-between gap-6 py-4">
                            <dt className="shrink-0 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-stone">{t('reservation.guests')}</dt>
                            <dd className="text-right font-display text-base text-charcoal-light">{form.guests}</dd>
                          </div>
                          <div className="flex justify-between gap-6 py-4">
                            <dt className="shrink-0 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-stone">{t('reservation.email')}</dt>
                            <dd className="text-right font-display text-base text-charcoal-light">{form.email}</dd>
                          </div>
                          <div className="flex justify-between gap-6 py-4">
                            <dt className="shrink-0 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-stone">{t('reservation.phone')}</dt>
                            <dd className="text-right font-display text-base text-charcoal-light">{form.phone}</dd>
                          </div>
                          {form.special_requests && (
                            <div className="flex justify-between gap-6 py-4">
                              <dt className="shrink-0 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-stone">{t('reservation.specialRequests')}</dt>
                              <dd className="text-right font-display text-base text-charcoal-light">{form.special_requests}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    )}
                  </div>

                  <div className="mt-10 flex flex-col-reverse items-stretch justify-between gap-4 sm:flex-row sm:items-center">
                    {step > 0 && (
                      <button
                        type="button"
                        onClick={handleBack}
                        className="btn-secondary sm:px-6"
                      >
                        <ArrowLeft size={16} aria-hidden="true" />
                        {t('reservation.step.back')}
                      </button>
                    )}
                    <div className="sm:ml-auto">
                      {step < TOTAL_STEPS - 1 ? (
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={nextDisabled}
                          className="w-full sm:w-auto"
                        >
                          {t('reservation.step.next')} <ArrowRight size={16} aria-hidden="true" />
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          variant="gold"
                          disabled={submitting}
                          className="w-full sm:w-auto"
                        >
                          {submitting ? t('reservation.submitting') : t('reservation.step.confirmAction')}
                        </Button>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            </div>

            <aside className="lg:col-span-4 lg:col-start-9">
              <div className="lg:sticky lg:top-28">
                <Reveal>
                  <p className="label-micro">{t('reservation.atlasLabel')}</p>
                </Reveal>
                <Reveal delay={0.08}>
                  <dl className="mt-6 border-y border-charcoal/10">
                    <div className="flex items-baseline justify-between gap-6 py-4">
                      <dt className="label-micro-muted">{t('reservation.lunchLabel')}</dt>
                      <dd className="font-display text-sm text-charcoal-light">{restaurant?.lunch_hours ?? ''}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-6 py-4">
                      <dt className="label-micro-muted">{t('reservation.dinnerLabel')}</dt>
                      <dd className="font-display text-sm text-charcoal-light">{restaurant?.dinner_hours ?? ''}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-6 py-4">
                      <dt className="label-micro-muted">{t('reservation.closedLabel')}</dt>
                      <dd className="font-display text-sm text-stone">{closedDayLabel}</dd>
                    </div>
                  </dl>
                </Reveal>
                <Reveal delay={0.14}>
                  <p className="mt-8 text-sm leading-[1.8] text-stone">
                    {t('reservation.capacityNote', { count: restaurant?.capacity ?? 0 })}
                  </p>
                </Reveal>
                <Reveal delay={0.2}>
                  <p className="mt-6 text-sm leading-[1.8] text-stone">{t('reservation.diningNote')}</p>
                </Reveal>
                <Reveal delay={0.26}>
                  <div className="mt-8 flex flex-col gap-5 border-t border-charcoal/10 pt-8">
                    {restaurant?.phone && (
                      <a href={`tel:${restaurant.phone}`} className="btn-link text-wine">
                        {t('contact.phoneLabel')}: {restaurant.phone}
                      </a>
                    )}
                    <Link to="/reservation-lookup" className="btn-link text-charcoal-light">
                      {t('reservation.lookup.title')}
                      <ArrowUpRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </Reveal>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      <section className="bg-charcoal py-20 text-cream md:py-24">
        <Container>
          <div className="flex flex-col items-start justify-between gap-9 md:flex-row md:items-end">
            <Reveal>
              <div className="max-w-xl">
                <p className="label-micro-light">{t('reservation.closingLabel')}</p>
                <h2 className="mt-5 font-display font-medium leading-[1.06] tracking-[-0.015em] text-[clamp(1.9rem,3.6vw,3.1rem)]">
                  {t('reservation.closingTitle')}
                </h2>
                <p className="mt-5 text-[1.0625rem] leading-[1.8] text-cream/80">{t('home.cta.description')}</p>
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <a href="#reserve" className="btn-gold whitespace-nowrap">{t('nav.reserveTable')}</a>
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  )
}