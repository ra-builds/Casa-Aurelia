import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import LoadingSpinner from '../ui/LoadingSpinner'
import ErrorMessage from '../ui/ErrorMessage'
import SuccessMessage from '../ui/SuccessMessage'
import { adminRestaurantApi } from '../../services/api'
import { useRestaurant } from '../../contexts/RestaurantContext'
import type { Restaurant, RestaurantUpdate } from '../../types'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface RestaurantForm {
  name: string
  tagline: string
  address: string
  city: string
  country: string
  phone: string
  email: string
  currency: string
  lunch_hours: string
  dinner_hours: string
  closed_day: string
  capacity: string
  instagram: string
  facebook: string
  tripadvisor: string
  logo_url: string
}

function toForm(restaurant: Restaurant): RestaurantForm {
  return {
    name: restaurant.name,
    tagline: restaurant.tagline ?? '',
    address: restaurant.address,
    city: restaurant.city,
    country: restaurant.country,
    phone: restaurant.phone,
    email: restaurant.email,
    currency: restaurant.currency,
    lunch_hours: restaurant.lunch_hours,
    dinner_hours: restaurant.dinner_hours,
    closed_day: restaurant.closed_day,
    capacity: String(restaurant.capacity),
    instagram: restaurant.social_links?.instagram ?? '',
    facebook: restaurant.social_links?.facebook ?? '',
    tripadvisor: restaurant.social_links?.tripadvisor ?? '',
    logo_url: restaurant.logo_url ?? '',
  }
}

function toPayload(form: RestaurantForm): RestaurantUpdate {
  return {
    name: form.name.trim(),
    tagline: form.tagline.trim() || null,
    address: form.address.trim(),
    city: form.city.trim(),
    country: form.country.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    currency: form.currency.trim().toUpperCase(),
    lunch_hours: form.lunch_hours.trim(),
    dinner_hours: form.dinner_hours.trim(),
    closed_day: form.closed_day,
    capacity: Number(form.capacity),
    social_links: {
      instagram: form.instagram.trim() || null,
      facebook: form.facebook.trim() || null,
      tripadvisor: form.tripadvisor.trim() || null,
    },
    logo_url: form.logo_url.trim() || null,
  }
}

export default function RestaurantManager() {
  const { t } = useTranslation()
  const { refresh } = useRestaurant()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<RestaurantForm | null>(null)
  const [formError, setFormError] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      setForm(toForm(await adminRestaurantApi.get()))
      setSavedMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.restaurant.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setField = (field: keyof RestaurantForm) => (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm((prev) => (prev ? { ...prev, [field]: e.target.value } : prev))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    setSaving(true)
    setFormError('')
    try {
      const updated = await adminRestaurantApi.update(toPayload(form))
      setForm(toForm(updated))
      setSavedMessage(t('admin.restaurant.saved'))
      await refresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('admin.restaurant.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner className="py-20" />

  return (
    <div>
      <div className="mb-6">
        <p className="label-micro">{t('admin.restaurant.kicker')}</p>
        <h2 className="mt-2 font-display text-2xl font-medium text-charcoal-light">
          {t('admin.restaurant.title')}
        </h2>
        <p className="mt-1 text-stone text-sm">{t('admin.restaurant.subtitle')}</p>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} />
          <button type="button" onClick={loadData} className="btn-link mt-3 text-wine">
            {t('admin.restaurant.retry')}
          </button>
        </div>
      )}
      {!error && savedMessage && (
        <div className="mb-6">
          <SuccessMessage message={savedMessage} />
        </div>
      )}

      {form && (
        <div className="card p-6 md:p-8">
          {formError && (
            <div className="mb-5">
              <ErrorMessage message={formError} />
            </div>
          )}
          <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="restaurant-name" className="label-field">{t('admin.restaurant.name')}</label>
              <input
                id="restaurant-name"
                type="text"
                value={form.name}
                onChange={setField('name')}
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="restaurant-tagline" className="label-field">{t('admin.restaurant.tagline')}</label>
              <input
                id="restaurant-tagline"
                type="text"
                value={form.tagline}
                onChange={setField('tagline')}
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="restaurant-address" className="label-field">{t('admin.restaurant.address')}</label>
              <input
                id="restaurant-address"
                type="text"
                value={form.address}
                onChange={setField('address')}
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="restaurant-city" className="label-field">{t('admin.restaurant.city')}</label>
              <input
                id="restaurant-city"
                type="text"
                value={form.city}
                onChange={setField('city')}
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="restaurant-country" className="label-field">{t('admin.restaurant.country')}</label>
              <input
                id="restaurant-country"
                type="text"
                value={form.country}
                onChange={setField('country')}
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="restaurant-phone" className="label-field">{t('admin.restaurant.phone')}</label>
              <input
                id="restaurant-phone"
                type="tel"
                value={form.phone}
                onChange={setField('phone')}
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="restaurant-email" className="label-field">{t('admin.restaurant.email')}</label>
              <input
                id="restaurant-email"
                type="email"
                value={form.email}
                onChange={setField('email')}
                className="input-field"
                required
              />
              <p className="mt-1 text-stone text-xs">{t('admin.restaurant.emailHint')}</p>
            </div>
            <div>
              <label htmlFor="restaurant-currency" className="label-field">{t('admin.restaurant.currency')}</label>
              <input
                id="restaurant-currency"
                type="text"
                value={form.currency}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, currency: e.target.value.toUpperCase() } : prev))}
                className="input-field uppercase"
                maxLength={3}
                placeholder="EUR"
                required
              />
            </div>
            <div>
              <label htmlFor="restaurant-lunch-hours" className="label-field">{t('admin.restaurant.lunchHours')}</label>
              <input
                id="restaurant-lunch-hours"
                type="text"
                value={form.lunch_hours}
                onChange={setField('lunch_hours')}
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="restaurant-dinner-hours" className="label-field">{t('admin.restaurant.dinnerHours')}</label>
              <input
                id="restaurant-dinner-hours"
                type="text"
                value={form.dinner_hours}
                onChange={setField('dinner_hours')}
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="restaurant-closed-day" className="label-field">{t('admin.restaurant.closedDay')}</label>
              <select
                id="restaurant-closed-day"
                value={form.closed_day}
                onChange={setField('closed_day')}
                className="input-field"
                required
              >
                {WEEKDAYS.map((day) => (
                  <option key={day} value={day}>
                    {t(`home.${day.toLowerCase()}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="restaurant-capacity" className="label-field">{t('admin.restaurant.capacity')}</label>
              <input
                id="restaurant-capacity"
                type="number"
                min={1}
                value={form.capacity}
                onChange={setField('capacity')}
                className="input-field"
                required
              />
            </div>

            <div className="md:col-span-2 mt-2">
              <div className="flex items-center gap-5">
                <span className="h-px w-10 bg-gold/60" aria-hidden="true" />
                <h3 className="font-display text-xl font-medium text-charcoal-light">
                  {t('admin.restaurant.socialLinks')}
                </h3>
              </div>
            </div>
            <div>
              <label htmlFor="restaurant-instagram" className="label-field">{t('admin.restaurant.instagram')}</label>
              <input
                id="restaurant-instagram"
                type="text"
                value={form.instagram}
                onChange={setField('instagram')}
                className="input-field"
                placeholder="https://instagram.com/..."
              />
            </div>
            <div>
              <label htmlFor="restaurant-facebook" className="label-field">{t('admin.restaurant.facebook')}</label>
              <input
                id="restaurant-facebook"
                type="text"
                value={form.facebook}
                onChange={setField('facebook')}
                className="input-field"
                placeholder="https://facebook.com/..."
              />
            </div>
            <div>
              <label htmlFor="restaurant-tripadvisor" className="label-field">{t('admin.restaurant.tripadvisor')}</label>
              <input
                id="restaurant-tripadvisor"
                type="text"
                value={form.tripadvisor}
                onChange={setField('tripadvisor')}
                className="input-field"
                placeholder="https://tripadvisor.com/..."
              />
            </div>
            <div>
              <label htmlFor="restaurant-logo-url" className="label-field">{t('admin.restaurant.logoUrl')}</label>
              <input
                id="restaurant-logo-url"
                type="text"
                value={form.logo_url}
                onChange={setField('logo_url')}
                className="input-field"
              />
              <p className="mt-1 text-stone text-xs">{t('admin.restaurant.logoUrlHint')}</p>
            </div>

            <div className="md:col-span-2 flex gap-3 pt-4 border-t border-charcoal/10">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? t('admin.restaurant.saving') : t('admin.restaurant.save')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}