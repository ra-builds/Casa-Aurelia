import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, XCircle } from 'lucide-react'
import SectionHeading from '../components/ui/SectionHeading'
import Button from '../components/ui/Button'
import ErrorMessage from '../components/ui/ErrorMessage'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { usePageTitle, useMetaDescription } from '../hooks/usePageTitle'
import { reservationApi } from '../services/api'
import { formatDate, validateEmail } from '../utils/helpers'
import type { Reservation } from '../types'

export default function ReservationLookupPage() {
  usePageTitle('pageTitles.reservationLookup')
  useMetaDescription('meta.reservationLookup')

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

  return (
    <>
      <section className="pt-32 pb-16 bg-charcoal text-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <SectionHeading title={t('reservation.lookup.title')} subtitle={t('reservation.lookup.subtitle')} light />
          <p className="mt-4 text-cream/70 max-w-xl mx-auto">
            {t('reservation.lookup.intro')}
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card p-8 md:p-10">
            {error && <div className="mb-6"><ErrorMessage message={error} /></div>}

            {!reservation && (
              <form onSubmit={handleLookup} className="space-y-6">
                <div>
                  <label htmlFor="reference_code" className="label-field">{t('reservation.lookup.referenceCode')}</label>
                  <input
                    id="reference_code"
                    type="text"
                    value={referenceCode}
                    onChange={(e) => setReferenceCode(e.target.value)}
                    className="input-field"
                    placeholder="CASA-XXXXXXXX"
                    aria-invalid={!!errors.reference_code}
                  />
                  {errors.reference_code && <p className="text-red-600 text-xs mt-1">{errors.reference_code}</p>}
                </div>

                <div>
                  <label htmlFor="lookup-email" className="label-field">{t('reservation.email')}</label>
                  <input
                    id="lookup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
                </div>

                <div className="pt-2">
                  <Button type="submit" variant="primary" disabled={loading} className="w-full sm:w-auto">
                    {loading ? (
                      <span className="flex items-center gap-2"><LoadingSpinner className="!inline-block" /> {t('reservation.lookup.searching')}</span>
                    ) : (
                      <span className="flex items-center gap-2"><Search size={18} /> {t('reservation.lookup.findButton')}</span>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {reservation && (
              <div className="space-y-6">
                <div className="text-center pb-4 border-b border-cream-dark">
                  <p className="text-xs uppercase tracking-widest text-stone mb-1">{t('confirmation.reference')}</p>
                  <p className="font-display text-2xl font-semibold text-wine">
                    {reservation.reference_code}
                  </p>
                  <span className={`inline-block mt-2 px-3 py-1 text-xs uppercase tracking-wider rounded-full ${
                    reservation.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    reservation.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {t(`admin.status.${reservation.status}`)}
                  </span>
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

                {cancelSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm">
                    {t('reservation.lookup.cancelSuccess')}
                  </div>
                )}

                {reservation.status === 'cancelled' && !cancelSuccess && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
                    {t('reservation.lookup.alreadyCancelled')}
                  </div>
                )}

                {canCancel && !cancelConfirm && (
                  <div className="pt-2">
                    <Button variant="secondary" onClick={() => setCancelConfirm(true)} className="w-full sm:w-auto text-red-600 border-red-300 hover:bg-red-50">
                      <span className="flex items-center gap-2"><XCircle size={18} /> {t('reservation.lookup.cancelButton')}</span>
                    </Button>
                  </div>
                )}

                {cancelConfirm && (
                  <div className="bg-cream border border-cream-dark rounded-lg p-6 space-y-4">
                    <p className="text-sm font-medium">{t('reservation.lookup.cancelConfirmMessage')}</p>
                    <div className="flex gap-3">
                      <Button variant="secondary" disabled={cancelling} onClick={() => setCancelConfirm(false)} className="flex-1">
                        {t('reservation.lookup.keepButton')}
                      </Button>
                      <button
                        type="button"
                        disabled={cancelling}
                        onClick={handleCancel}
                        className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {cancelling ? t('reservation.lookup.cancelling') : t('reservation.lookup.confirmCancelButton')}
                      </button>
                    </div>
                  </div>
                )}

                {!cancelSuccess && reservation.status !== 'cancelled' && (
                  <div className="pt-4 border-t border-cream-dark">
                    <Button variant="secondary" onClick={() => { setReservation(null); setReferenceCode(''); setEmail(''); setError(''); setCancelConfirm(false) }} className="w-full sm:w-auto">
                      {t('reservation.lookup.lookupAnother')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
