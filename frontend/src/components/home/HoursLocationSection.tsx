import { useTranslation } from 'react-i18next'
import { MapPin, Clock, Phone } from 'lucide-react'
import Container from '../ui/Container'
import Reveal from '../ui/Reveal'
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
    <section className="bg-cream-dark py-24 md:py-32">
      <Container>
        <div className="grid gap-10 md:grid-cols-2">
          <Reveal>
            <div className="card h-full p-10 md:p-12">
              <div className="flex items-center gap-4">
                <Clock size={20} className="text-gold" aria-hidden="true" />
                <p className="label-micro">{t('home.hours.title')}</p>
              </div>
              <dl className="mt-8 divide-y divide-charcoal/10">
                <div className="flex items-baseline justify-between gap-6 py-4">
                  <dt className="text-sm text-stone">{t('home.hours.lunch')}</dt>
                  <dd className="whitespace-nowrap font-display text-lg text-charcoal-light">
                    {restaurant?.lunch_hours ?? ''}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-6 py-4">
                  <dt className="text-sm text-stone">{t('home.hours.dinner')}</dt>
                  <dd className="whitespace-nowrap font-display text-lg text-charcoal-light">
                    {restaurant?.dinner_hours ?? ''}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-6 py-4">
                  <dt className="text-sm text-stone">{t('home.hours.closed')}</dt>
                  <dd className="whitespace-nowrap font-display text-lg text-wine">{closedDayLabel}</dd>
                </div>
              </dl>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="card flex h-full flex-col p-10 md:p-12">
              <div className="flex items-center gap-4">
                <MapPin size={20} className="text-gold" aria-hidden="true" />
                <p className="label-micro">{t('home.location.title')}</p>
              </div>
              <p className="lead mt-8">{restaurant?.address ?? ''}</p>
              <a href={telHref} className="btn-link mt-6 text-wine">
                <Phone size={14} aria-hidden="true" /> {restaurant?.phone ?? ''}
              </a>
              <div className="mt-auto pt-9">
                <div className="flex h-40 items-center justify-center border border-charcoal/10 bg-parchment/60 text-sm text-stone-light">
                  {t('home.location.mapLabel')}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  )
}