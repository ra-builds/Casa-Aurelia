import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'
import SectionHeading from '../components/ui/SectionHeading'
import Button from '../components/ui/Button'
import SuccessMessage from '../components/ui/SuccessMessage'
import { usePageTitle, useMetaDescription } from '../hooks/usePageTitle'
import { useRestaurant } from '../contexts/RestaurantContext'
import { validateEmail } from '../utils/helpers'

export default function ContactPage() {
  usePageTitle('pageTitles.contact')
  useMetaDescription('meta.contact')

  const { t } = useTranslation()
  const { restaurant } = useRestaurant()
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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
    // Mock contact form submission
    await new Promise((r) => setTimeout(r, 1000))
    setSubmitted(true)
    setSubmitting(false)
    setForm({ name: '', email: '', subject: '', message: '' })
  }

  return (
    <>
      <section className="pt-32 pb-16 bg-charcoal text-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <SectionHeading title={t('contact.title')} subtitle={t('contact.subtitle')} light />
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
            <div>
              <h2 className="font-display text-2xl font-semibold mb-8">{t('contact.visitUs')}</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <MapPin className="text-wine shrink-0 mt-1" size={20} />
                  <div>
                    <p className="font-medium">{t('contact.addressLabel')}</p>
                    <p className="text-stone mt-1">{restaurant?.address ?? ''}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Phone className="text-wine shrink-0 mt-1" size={20} />
                  <div>
                    <p className="font-medium">{t('contact.phoneLabel')}</p>
                    <a href={`tel:${restaurant?.phone ?? ''}`} className="text-stone hover:text-wine transition-colors mt-1 block">
                      {restaurant?.phone ?? ''}
                    </a>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Mail className="text-wine shrink-0 mt-1" size={20} />
                  <div>
                    <p className="font-medium">{t('contact.emailLabel')}</p>
                    <a href={`mailto:${restaurant?.email ?? ''}`} className="text-stone hover:text-wine transition-colors mt-1 block">
                      {restaurant?.email ?? ''}
                    </a>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Clock className="text-wine shrink-0 mt-1" size={20} />
                  <div>
                    <p className="font-medium">{t('contact.hoursLabel')}</p>
                    <p className="text-stone mt-1">{t('contact.lunchLabel')}: {restaurant?.lunch_hours ?? ''}</p>
                    <p className="text-stone">{t('contact.dinnerLabel')}: {restaurant?.dinner_hours ?? ''}</p>
                    <p className="text-stone text-sm mt-1">{t('contact.closedLabel')}: {restaurant?.closed_day ?? ''}</p>
                  </div>
                </div>
              </div>

              <div className="mt-10 h-56 bg-cream-dark flex items-center justify-center text-stone text-sm">
                {t('contact.mapPlaceholder')}
              </div>

              <div className="mt-8 flex gap-6">
                {restaurant?.social_links?.instagram && (
                  <a
                    href={restaurant.social_links.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm uppercase tracking-wider text-stone hover:text-wine transition-colors"
                  >
                    Instagram
                  </a>
                )}
                {restaurant?.social_links?.facebook && (
                  <a
                    href={restaurant.social_links.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm uppercase tracking-wider text-stone hover:text-wine transition-colors"
                  >
                    Facebook
                  </a>
                )}
                {restaurant?.social_links?.tripadvisor && (
                  <a
                    href={restaurant.social_links.tripadvisor}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm uppercase tracking-wider text-stone hover:text-wine transition-colors"
                  >
                    TripAdvisor
                  </a>
                )}
              </div>
            </div>

            <div>
              <h2 className="font-display text-2xl font-semibold mb-8">{t('contact.sendMessage')}</h2>
              {submitted && (
                <SuccessMessage message={t('contact.successMessage')} />
              )}
              {!submitted && (
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  <div>
                    <label htmlFor="name" className="label-field">{t('contact.name')}</label>
                    <input
                      id="name"
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="input-field"
                      aria-invalid={!!errors.name}
                    />
                    {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <label htmlFor="email" className="label-field">{t('contact.email')}</label>
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
                    <label htmlFor="subject" className="label-field">{t('contact.subject')}</label>
                    <input
                      id="subject"
                      type="text"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="input-field"
                      aria-invalid={!!errors.subject}
                    />
                    {errors.subject && <p className="text-red-600 text-xs mt-1">{errors.subject}</p>}
                  </div>
                  <div>
                    <label htmlFor="message" className="label-field">{t('contact.message')}</label>
                    <textarea
                      id="message"
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="input-field resize-none"
                      aria-invalid={!!errors.message}
                    />
                    {errors.message && <p className="text-red-600 text-xs mt-1">{errors.message}</p>}
                  </div>
                  <Button type="submit" variant="primary" disabled={submitting}>
                    {submitting ? t('contact.sending') : t('contact.send')}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
