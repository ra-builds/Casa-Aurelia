import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle, Search, XCircle, ArrowUpRight } from 'lucide-react'
import PageHero from '../components/ui/PageHero'
import Container from '../components/ui/Container'
import Reveal from '../components/ui/Reveal'
import Button from '../components/ui/Button'
import ErrorMessage from '../components/ui/ErrorMessage'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { usePageSeo } from '../hooks/usePageTitle'
import { reservationApi } from '../services/api'
import { formatDate, validateEmail } from '../utils/helpers'
import { GALLERY_IMAGES, GALLERY_CLOSING_IMAGE, gallerySrc } from '../utils/galleryImages'
import type { Reservation } from '../types'

const QUIET_TABLE = GALLERY_IMAGES.find((i) => i.id === 'g16') ?? GALLERY_CLOSING_IMAGE

export default function ReservationLookupPage() {
  usePageSeo({ titleKey: 'pageTitles.reservationLookup', descriptionKey: 'meta.reservationLookup', noindex: true })

  const { t } = useTranslation()
  const [referenceCode, setReferenceCode] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelSuccess, setCancelSuccess] = useState(false)

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!referenceCode.trim()) newErrors.reference_code = t('reservation.lookup.validation.referenceRequired')
    if (!email.trim()) newErrors.email = t('reservation.lookup.validation.emailRequired')
    else if (!validateEmail(email)) newErrors.email = t('reservation.lookup.validation.emailInvalid')
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleLookup = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setReservation(null)
    setCancelConfirm(false)
    setCancelSuccess(false)
    if (!validate()) return

    setLoading(true)
    try {
      const result = await reservationApi.lookup(referenceCode.trim(), email.trim())
      setReservation(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('reservation.lookup.notFound'))
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!reservation) return
    setCancelling(true)
    try {
      const result = await reservationApi.customerCancel(referenceCode.trim(), email.trim())
      setReservation(result)
      setCancelSuccess(true)
      setCancelConfirm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('reservation.lookup.cancelFailed'))
    } finally {
      setCancelling(false)
    }
  }

  const canCancel = reservation && reservation.status !== 'cancelled' && !cancelSuccess

  const resetLedger = () => {
    setReservation(null)
    setReferenceCode('')
    setEmail('')
    setError('')
    setCancelConfirm(false)
  }

  return (
    <>
      <PageHero
        label={t('reservation.lookup.subtitle')}
        title={t('reservation.lookup.title')}
        intro={t('reservation.lookup.intro')}
        align="center"
        image={gallerySrc(QUIET_TABLE, 1920)}
        imagePosition="center 40%"
      />

      <section className="py-20 md:py-28">
        <Container>
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="label-micro">{t('reservation.lookup.editorialKicker')}</p>
              <h2 className="headline-section mt-5">{t('reservation.lookup.editorialTitle')}</h2>
              <div className="mx-auto mt-7 h-px w-16 bg-gold/40" aria-hidden="true" />
              <p className="lead mt-7">{t('reservation.lookup.editorialBody')}</p>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="pb-24 md:pb-32">
        <Container>
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-x-12">
            <aside className="order-2 lg:order-1 lg:col-span-4">
              <div className="lg:sticky lg:top-28">
                <Reveal>
                  <p className="label-micro">{t('reservation.lookup.indexTitle')}</p>
                </Reveal>
                <Reveal delay={0.08}>
                  <ol className="mt-8 space-y-8">
                    {[
                      { n: 'I', text: t('reservation.lookup.indexStep1') },
                      { n: 'II', text: t('reservation.lookup.indexStep2') },
                      { n: 'III', text: t('reservation.lookup.indexStep3') },
                    ].map((s) => (
                      <li key={s.n} className="flex items-start gap-5">
                        <span aria-hidden="true" className="font-display text-[1.6rem] leading-none text-gold/40">{s.n}</span>
                        <span className="mt-1 text-sm leading-[1.6] text-stone">{s.text}</span>
                      </li>
                    ))}
                  </ol>
                </Reveal>
                <Reveal delay={0.16}>
                  <div className="mt-10 border-t border-charcoal/10 pt-8">
                    <Link to="/reservations" className="btn-link text-wine">
                      {t('nav.reserveTable')}
                      <ArrowUpRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                </Reveal>
              </div>
            </aside>

            <div className="order-1 lg:order-2 lg:col-span-7 lg:col-start-6">
              <div className="card p-8 md:p-12">
                {error && <div className="mb-6"><ErrorMessage message={error} /></div>}

                {!reservation && (
                  <form onSubmit={handleLookup} className="space-y-6">
                    <div>
                      <label htmlFor="reference_code" className="label-field">{t('reservation.lookup.referenceCode')}</label>
                      <input
                        id="reference_code"
                        type="text"
                        autoComplete="off"
                        value={referenceCode}
                        onChange={(e) => setReferenceCode(e.target.value)}
                        className="input-field"
                        placeholder="CASA-XXXXXXXX"
                        aria-invalid={!!errors.reference_code}
                        aria-describedby={errors.reference_code ? 'reference_code-error' : undefined}
                      />
                      {errors.reference_code && (
                        <p id="reference_code-error" role="alert" className="text-red-600 text-xs mt-2">{errors.reference_code}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="lookup-email" className="label-field">{t('reservation.email')}</label>
                      <input
                        id="lookup-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-field"
                        aria-invalid={!!errors.email}
                        aria-describedby={errors.email ? 'lookup-email-error' : undefined}
                      />
                      {errors.email && (
                        <p id="lookup-email-error" role="alert" className="text-red-600 text-xs mt-2">{errors.email}</p>
                      )}
                    </div>

                    <div className="pt-3">
                      <Button type="submit" variant="primary" disabled={loading} className="w-full sm:w-auto">
                        {loading ? (
                          <span className="flex items-center gap-2"><LoadingSpinner className="!inline-block" /> {t('reservation.lookup.searching')}</span>
                        ) : (
                          <span className="flex items-center gap-2"><Search size={18} aria-hidden="true" /> {t('reservation.lookup.findButton')}</span>
                        )}
                      </Button>
                    </div>
                  </form>
                )}

                {reservation && (
                  <div className="space-y-8">
                    <h2 className="sr-only">{t('reservation.lookup.title')}</h2>

                    <header className="border-b border-charcoal/10 pb-6 text-center">
                      <p className="label-micro">{t('confirmation.reference')}</p>
                      <p className="mt-2 font-display text-3xl font-semibold tracking-wide text-wine">{reservation.reference_code}</p>
                      <span className={`inline-block mt-3 px-3 py-1 text-xs uppercase tracking-wider rounded-full ${
                        reservation.status === 'cancelled' ? 'bg-wine/10 text-wine-deep' :
                        reservation.status === 'confirmed' ? 'bg-gold/10 text-charcoal-light' :
                        'bg-stone/10 text-stone'
                      }`}>
                        {t(`admin.status.${reservation.status}`)}
                      </span>
                    </header>

                    <dl className="divide-y divide-charcoal/10 border-y border-charcoal/10 text-sm">
                      <div className="flex justify-between gap-6 py-4">
                        <dt className="shrink-0 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-stone">{t('confirmation.guest')}</dt>
                        <dd className="text-right font-display text-base text-charcoal-light">{reservation.first_name} {reservation.last_name}</dd>
                      </div>
                      <div className="flex justify-between gap-6 py-4">
                        <dt className="shrink-0 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-stone">{t('confirmation.guests')}</dt>
                        <dd className="text-right font-display text-base text-charcoal-light">{reservation.guests}</dd>
                      </div>
                      <div className="flex justify-between gap-6 py-4">
                        <dt className="shrink-0 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-stone">{t('confirmation.date')}</dt>
                        <dd className="text-right font-display text-base text-charcoal-light">{formatDate(reservation.reservation_date)}</dd>
                      </div>
                      <div className="flex justify-between gap-6 py-4">
                        <dt className="shrink-0 font-body text-[11px] font-medium uppercase tracking-[0.16em] text-stone">{t('confirmation.time')}</dt>
                        <dd className="text-right font-display text-base text-charcoal-light">{reservation.reservation_time}</dd>
                      </div>
                    </dl>

                    {cancelSuccess && (
                      <div role="status" className="flex items-start gap-3 border-l-2 border-gold bg-gold/5 p-5 text-sm text-charcoal-light">
                        <CheckCircle size={18} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
                        <p>{t('reservation.lookup.cancelSuccess')}</p>
                      </div>
                    )}

                    {reservation.status === 'cancelled' && !cancelSuccess && (
                      <div role="status" className="border-l-2 border-wine/50 bg-wine/5 p-4 text-sm text-wine-deep">
                        {t('reservation.lookup.alreadyCancelled')}
                      </div>
                    )}

                    {canCancel && !cancelConfirm && (
                      <div className="pt-2">
                        <Button variant="secondary" onClick={() => setCancelConfirm(true)} className="w-full sm:w-auto border-wine/50 text-wine-deep hover:bg-wine hover:text-cream sm:px-6">
                          <span className="flex items-center gap-2"><XCircle size={18} aria-hidden="true" /> {t('reservation.lookup.cancelButton')}</span>
                        </Button>
                      </div>
                    )}

                    {cancelConfirm && (
                      <div className="space-y-5 border-l-2 border-wine/50 bg-wine/5 p-6">
                        <p className="text-sm font-medium text-charcoal-light">{t('reservation.lookup.cancelConfirmMessage')}</p>
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <Button variant="secondary" disabled={cancelling} onClick={() => setCancelConfirm(false)} className="flex-1">
                            {t('reservation.lookup.keepButton')}
                          </Button>
                          <button
                            type="button"
                            disabled={cancelling}
                            onClick={handleCancel}
                            className="flex-1 rounded-none bg-wine px-5 py-3.5 font-body text-[11px] font-medium uppercase tracking-[0.24em] text-cream transition-colors duration-300 hover:bg-wine-deep disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
                          >
                            {cancelling ? t('reservation.lookup.cancelling') : t('reservation.lookup.confirmCancelButton')}
                          </button>
                        </div>
                      </div>
                    )}

                    {!cancelSuccess && reservation.status !== 'cancelled' && (
                      <div className="border-t border-charcoal/10 pt-6">
                        <Button variant="secondary" onClick={resetLedger} className="w-full sm:w-auto sm:px-6">
                          {t('reservation.lookup.lookupAnother')}
                        </Button>
                      </div>
                    )}

                    {cancelSuccess && (
                      <div className="flex flex-col sm:flex-row gap-3 border-t border-charcoal/10 pt-6">
                        <Button to="/reservations" variant="primary" className="sm:flex-1">
                          {t('reservation.lookup.bookAgain')}
                        </Button>
                        <Button variant="secondary" onClick={resetLedger} className="sm:flex-1">
                          {t('reservation.lookup.lookupAnother')}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}