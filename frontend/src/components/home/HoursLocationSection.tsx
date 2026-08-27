import { useTranslation } from 'react-i18next'
import { MapPin, Clock } from 'lucide-react'
import type { Restaurant } from '../../types'

interface Props {
  restaurant: Restaurant | null
}

const WEEKDAY_KEYS: Record<string, string> = {
  monday: 'home.monday',
  tuesday: 'home.tuesday',
  wednesday: 'home.wednesday',
  thursday: 'home.thursday',
  friday: 'home.friday',
  saturday: 'home.saturday',
  sunday: 'home.sunday',
}

function resolveClosedDay(value: string): string | null {
  return WEEKDAY_KEYS[value.trim().toLowerCase()] ?? null
}

export default function HoursLocationSection({ restaurant }: Props) {
  const { t } = useTranslation()

  const closedDayKey = restaurant ? resolveClosedDay(restaurant.closed_day) : null
  const closedDayLabel = closedDayKey ? t(closedDayKey) : restaurant?.closed_day ?? ''
  const telHref = `tel:${restaurant?.phone.replace(/[^\d+]/g, '') ?? ''}`

  return (
    <section className="py-20 bg-cream-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12">
          <div className="card p-8 md:p-10">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="text-wine" size={24} aria-hidden="true" />
              <h3 className="font-display text-2xl font-semibold">{t('home.hours.title')}</h3>
            </div>
            <dl className="space-y-3 text-stone">
              <div className="flex justify-between">
                <dt>{t('home.hours.lunch')}</dt>
                <dd className="font-medium text-charcoal-light">{restaurant?.lunch_hours ?? ''}</dd>
              </div>
              <div className="flex justify-between">
                <dt>{t('home.hours.dinner')}</dt>
                <dd className="font-medium text-charcoal-light">{restaurant?.dinner_hours ?? ''}</dd>
              </div>
              <div className="flex justify-between">
                <dt>{t('home.hours.closed')}</dt>
                <dd className="font-medium text-charcoal-light">{closedDayLabel}</dd>
              </div>
            </dl>
          </div>
          <div className="card p-8 md:p-10">
            <div className="flex items-center gap-3 mb-6">
              <MapPin className="text-wine" size={24} aria-hidden="true" />
              <h3 className="font-display text-2xl font-semibold">{t('home.location.title')}</h3>
            </div>
            <p className="text-stone leading-relaxed">{restaurant?.address ?? ''}</p>
            <p className="mt-4 text-stone">
              <a href={telHref} className="hover:text-wine transition-colors">
                {restaurant?.phone ?? ''}
              </a>
            </p>
            <div className="mt-6 h-48 bg-stone-light/20 flex items-center justify-center text-stone text-sm">
              {t('home.location.mapLabel')}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
