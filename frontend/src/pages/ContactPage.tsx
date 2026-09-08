import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ArrowUpRight, Clock, MapPin } from 'lucide-react'
import Container from '../components/ui/Container'
import Reveal from '../components/ui/Reveal'
import ImageReveal from '../components/ui/ImageReveal'
import Button from '../components/ui/Button'
import SuccessMessage from '../components/ui/SuccessMessage'
import ErrorMessage from '../components/ui/ErrorMessage'
import { usePageSeo } from '../hooks/usePageTitle'
import { useRestaurant } from '../contexts/RestaurantContext'
import { SITE_CONFIG } from '../config/site'
import { validateEmail, resolveDayKey } from '../utils/helpers'
import { IMAGES } from '../utils/constants'
import { GALLERY_IMAGES, gallerySrc, gallerySrcSet } from '../utils/galleryImages'
import { contactApi } from '../services/api'

const EASE = [0.22, 1, 0.36, 1] as const

const CANDLELIGHT = GALLERY_IMAGES[6]
const EVENING_GLASS = GALLERY_IMAGES[14]

export default function ContactPage() {
  usePageSeo({ titleKey: 'pageTitles.contact', descriptionKey: 'meta.contact' })

  const { t } = useTranslation()
  const { restaurant } = useRestaurant()
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const placeName = restaurant?.name ?? SITE_CONFIG.brandName
  const addressLine = [restaurant?.address, restaurant?.city, restaurant?.country]
    .filter(Boolean)
    .join(', ')
  const mapsHref = addressLine
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressLine)}`
    : '#'

  const closedDayKey = restaurant ? resolveDayKey(restaurant.closed_day) : null
  const closedDayLabel = closedDayKey ? t(closedDayKey) : restaurant?.closed_day ?? ''

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!form.name.trim()) newErrors.name = t('contact.validation.nameRequired')
    if (!form.email.trim()) newErrors.email = t('contact.validation.emailRequired')
    else if (!validateEmail(form.email)) newErrors.email = t('contact.validation.emailInvalid')
    if (!form.subject.trim()) newErrors.subject = t('contact.validation.subjectRequired')
    if (!form.message.trim()) newErrors.message = t('contact.validation.messageRequired')
    else if (form.message.length < 10) newErrors.message = t('contact.validation.messageMinLength')
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      await contactApi.submit({
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
      })
      setSubmitted(true)
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch {
      setSubmitError(t('contact.submitFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* 1 — Visit hero */}
      <section className="relative flex min-h-[86vh] items-center overflow-hidden bg-charcoal text-cream">
        <motion.img
          src={IMAGES.visit}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          sizes="100vw"
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.8, ease: EASE }}
          className="absolute inset-0 h-full w-full object-cover object-[center_45%]"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-charcoal/45 via-charcoal/45 to-charcoal/95"
          aria-hidden="true"
        />
        <div
          className="absolute inset-y-0 right-0 w-[40%] max-w-[42rem] bg-gradient-to-l from-charcoal/80 to-transparent"
          aria-hidden="true"
        />
        <Container className="relative z-10 py-28 md:py-32">
          <div className="max-w-2xl">
            <Reveal>
              <div className="inline-flex items-center gap-3">
                <span className="h-px w-10 bg-gold/50" aria-hidden="true" />
                <p className="label-micro-light">{t('contact.heroLabel')}</p>
                <span className="h-px w-10 bg-gold/50" aria-hidden="true" />
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="headline-hero mt-7">
                {t('contact.headline1')}
                <br />
                <span className="italic text-gold-light">{t('contact.headline2')}</span>
              </h1>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="mt-8 flex items-center gap-5">
                <span className="h-px w-16 bg-gold/60" aria-hidden="true" />
                <p className="max-w-md text-[1.05rem] leading-[1.8] text-cream/85">
                  {t('contact.directions')}
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.28}>
              <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
                <Button to="/reservations" variant="gold">
                  {t('nav.reserveTable')}
                </Button>
                <p className="inline-flex items-center gap-2.5 text-[11px] uppercase tracking-[0.28em] text-cream/70">
                  <MapPin size={14} strokeWidth={1.5} aria-hidden="true" />
                  {restaurant?.city ?? ''}
                </p>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* 2 — The arrival */}
      <section className="py-24 md:py-36">
        <Container>
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5 lg:col-start-1 lg:pt-12">
              <Reveal>
                <div className="flex items-center gap-3">
                  <span className="h-px w-10 bg-gold/50" aria-hidden="true" />
                  <p className="label-micro">{t('contact.arrivalLabel')}</p>
                </div>
              </Reveal>
              <Reveal delay={0.08}>
                <h2 className="headline-section mt-5">{t('contact.arrivalTitle')}</h2>
              </Reveal>
              <span className="mt-8 block h-px w-12 bg-gold/60" aria-hidden="true" />
              <Reveal delay={0.16}>
                <p className="lead mt-6">{t('contact.arrivalBody')}</p>
              </Reveal>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <Reveal delay={0.12}>
                <ImageReveal
                  src={gallerySrc(CANDLELIGHT, 1000)}
                  srcSet={gallerySrcSet(CANDLELIGHT)}
                  alt=""
                  aspect="aspect-[4/5]"
                  objectPosition="center"
                  sizes="(min-width: 1024px) 48vw, 96vw"
                />
                <p className="mt-4 text-right text-sm italic text-stone">
                  {placeName} — {t('contact.phoneLabel')}
                </p>
              </Reveal>
            </div>
          </div>
        </Container>
      </section>

      {/* 3 — Information & hours */}
      <section className="bg-cream-dark py-24 md:py-32">
        <Container>
          <Reveal>
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-gold/50" aria-hidden="true" />
              <p className="label-micro">{t('contact.informationTitle')}</p>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-14 lg:grid-cols-12 lg:gap-20">
            <dl className="lg:col-span-6">
              <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-t border-charcoal/15 py-6">
                <dt className="label-micro-muted shrink-0">{t('contact.addressLabel')}</dt>
                <dd className="font-display text-[1.4rem] leading-snug text-charcoal-light">
                  {addressLine}
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-t border-charcoal/15 py-6">
                <dt className="label-micro-muted shrink-0">{t('contact.phoneLabel')}</dt>
                <dd>
                  <a
                    href={`tel:${restaurant?.phone ?? ''}`}
                    className="font-display text-[1.4rem] leading-snug text-charcoal-light transition-colors hover:text-wine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-sm"
                  >
                    {restaurant?.phone ?? ''}
                  </a>
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-t border-charcoal/15 py-6">
                <dt className="label-micro-muted shrink-0">{t('contact.emailLabel')}</dt>
                <dd>
                  <a
                    href={`mailto:${restaurant?.email ?? ''}`}
                    className="font-display text-[1.4rem] leading-snug text-charcoal-light transition-colors hover:text-wine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-sm"
                  >
                    {restaurant?.email ?? ''}
                  </a>
                </dd>
              </div>
              <div className="flex justify-between border-t border-b border-charcoal/15 py-6">
                <dd>
                <a
                  href={mapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-link text-wine"
                  aria-label={`${t('contact.getDirections')} — ${addressLine}`}
                >
                  {t('contact.getDirections')}
                  <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" />
                </a>
                </dd>
              </div>
            </dl>

            <div className="lg:col-span-5 lg:col-start-8">
              <p className="label-micro">{t('contact.hoursLabel')}</p>
              <dl className="mt-6">
                <div className="flex items-baseline justify-between gap-x-8 border-t border-charcoal/15 py-5">
                  <dt className="label-micro-muted shrink-0">{t('contact.lunchLabel')}</dt>
                  <dd className="font-display text-[1.25rem] text-charcoal-light">
                    {restaurant?.lunch_hours ?? ''}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-x-8 border-t border-charcoal/15 py-5">
                  <dt className="label-micro-muted shrink-0">{t('contact.dinnerLabel')}</dt>
                  <dd className="font-display text-[1.25rem] text-charcoal-light">
                    {restaurant?.dinner_hours ?? ''}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-x-8 border-t border-b border-charcoal/15 py-5">
                  <dt className="label-micro-muted shrink-0">
                    <Clock size={13} strokeWidth={1.5} className="mr-2 inline text-gold-deep" aria-hidden="true" />
                    {t('contact.closedLabel')}
                  </dt>
                  <dd className="font-display text-[1.25rem] italic text-stone">
                    {closedDayLabel}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="mt-14 flex flex-col items-start gap-4 border-t border-charcoal/15 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="label-micro-muted">{placeName}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {restaurant?.social_links?.instagram && (
                <a
                  href={restaurant.social_links.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm uppercase tracking-wider text-stone transition-colors hover:text-wine"
                >
                  Instagram
                </a>
              )}
              {restaurant?.social_links?.facebook && (
                <a
                  href={restaurant.social_links.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm uppercase tracking-wider text-stone transition-colors hover:text-wine"
                >
                  Facebook
                </a>
              )}
              {restaurant?.social_links?.tripadvisor && (
                <a
                  href={restaurant.social_links.tripadvisor}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm uppercase tracking-wider text-stone transition-colors hover:text-wine"
                >
                  TripAdvisor
                </a>
              )}
            </div>
          </div>
        </Container>
      </section>

      {/* 4 — Directions */}
      <section className="py-20 md:py-28">
        <Container>
          <div className="grid gap-10 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-7">
              <Reveal>
                <div className="flex items-center gap-3">
                  <span className="h-px w-10 bg-gold/50" aria-hidden="true" />
                  <p className="label-micro">{t('contact.directionsTitle')}</p>
                </div>
              </Reveal>
              <Reveal delay={0.08}>
                <h2 className="headline-section mt-5">{t('contact.directionsTitle')}</h2>
              </Reveal>
              <span className="mt-6 block h-px w-12 bg-gold/60" aria-hidden="true" />
              <Reveal delay={0.16}>
                <p className="lead mt-6">{t('contact.directionsBody')}</p>
              </Reveal>
            </div>
            <div className="flex items-end md:col-span-5 md:justify-self-end">
              <Reveal delay={0.2}>
                <div className="text-right">
                  <p className="font-display text-2xl italic text-charcoal-light">{addressLine}</p>
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-link mt-4 text-wine"
                    aria-label={`${t('contact.getDirections')} — ${addressLine}`}
                  >
                    {t('contact.getDirections')}
                    <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" />
                  </a>
                </div>
              </Reveal>
            </div>
          </div>
        </Container>
      </section>

      {/* 5 — Send a message */}
      <section className="border-t border-charcoal/10 bg-ivory py-20 md:py-28">
        <Container>
          <div className="mx-auto max-w-2xl">
            <Reveal>
              <div className="flex items-center gap-3">
                <span className="h-px w-10 bg-gold/50" aria-hidden="true" />
                <p className="label-micro">{t('contact.sendMessage')}</p>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="headline-section mt-5">{t('contact.sendMessage')}</h2>
            </Reveal>
            {submitted && (
              <div className="mt-8">
                <SuccessMessage message={t('contact.successMessage')} />
              </div>
            )}
            {!submitted && (
              <Reveal delay={0.16}>
                {submitError && (
                  <div className="mt-8">
                    <ErrorMessage message={submitError} />
                  </div>
                )}
                <form onSubmit={handleSubmit} className={submitError ? 'mt-5 space-y-5' : 'mt-10 space-y-5'} noValidate>
                  <div>
                    <label htmlFor="name" className="label-field">{t('contact.name')}</label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="input-field bg-transparent"
                      aria-invalid={!!errors.name}
                      aria-describedby={errors.name ? 'name-error' : undefined}
                    />
                    {errors.name && <p id="name-error" role="alert" className="text-red-600 text-xs mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <label htmlFor="email" className="label-field">{t('contact.email')}</label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="input-field bg-transparent"
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? 'email-error' : undefined}
                    />
                    {errors.email && <p id="email-error" role="alert" className="text-red-600 text-xs mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label htmlFor="subject" className="label-field">{t('contact.subject')}</label>
                    <input
                      id="subject"
                      type="text"
                      required
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="input-field bg-transparent"
                      aria-invalid={!!errors.subject}
                      aria-describedby={errors.subject ? 'subject-error' : undefined}
                    />
                    {errors.subject && <p id="subject-error" role="alert" className="text-red-600 text-xs mt-1">{errors.subject}</p>}
                  </div>
                  <div>
                    <label htmlFor="message" className="label-field">{t('contact.message')}</label>
                    <textarea
                      id="message"
                      rows={5}
                      required
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="input-field resize-none bg-transparent"
                      aria-invalid={!!errors.message}
                      aria-describedby={errors.message ? 'message-error' : undefined}
                    />
                    {errors.message && <p id="message-error" role="alert" className="text-red-600 text-xs mt-1">{errors.message}</p>}
                  </div>
                  <Button type="submit" variant="primary" disabled={submitting}>
                    {submitting ? t('contact.sending') : t('contact.send')}
                  </Button>
                </form>
              </Reveal>
            )}
          </div>
        </Container>
      </section>

      {/* 6 — Reservation CTA */}
      <section className="relative overflow-hidden bg-charcoal py-24 md:py-32">
        <img
          src={gallerySrc(EVENING_GLASS, 1920)}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          sizes="100vw"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-40"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-charcoal/70 via-charcoal/80 to-charcoal/95"
          aria-hidden="true"
        />
        <Container className="relative z-10">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <div className="inline-flex items-center gap-3">
                <span className="h-px w-10 bg-gold/50" aria-hidden="true" />
                <p className="label-micro-light">{placeName}</p>
                <span className="h-px w-10 bg-gold/50" aria-hidden="true" />
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-7 font-display text-[clamp(2rem,5vw,3.6rem)] font-medium leading-[1.1] text-cream">
                {t('contact.reserveTitle')}
              </h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="lead-light mx-auto mt-6 max-w-lg">{t('contact.reserveBody')}</p>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="mt-10">
                <Button to="/reservations" variant="gold">
                  {t('nav.reserveTable')}
                </Button>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  )
}