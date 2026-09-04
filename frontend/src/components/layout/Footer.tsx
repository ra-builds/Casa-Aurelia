import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Phone, Mail, MapPin, ArrowUpRight } from 'lucide-react'
import { useRestaurant } from '../../contexts/RestaurantContext'
import { SITE_CONFIG } from '../../config/site'
import { NAV_LINKS } from '../../utils/constants'
import { formatNumber, resolveDayKey } from '../../utils/helpers'
import Container from '../ui/Container'
import Reveal from '../ui/Reveal'

export default function Footer() {
  const { t } = useTranslation()
  const { restaurant } = useRestaurant()
  const month = new Date().getFullYear()

  const closedDayKey = restaurant ? resolveDayKey(restaurant.closed_day) : null
  const closedDayLabel = closedDayKey ? t(closedDayKey) : restaurant?.closed_day ?? ''

  return (
    <footer className="bg-charcoal text-cream">
      <Container className="pt-24 pb-10 md:pt-32">
        <Reveal>
          <div className="border-y border-cream/12 py-14 md:py-20">
            <p className="label-micro-light">{t('footer.cta1')}</p>
            <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <h2 className="headline-section !text-cream max-w-2xl">
                {t('footer.cta2')}
              </h2>
              <Link to="/reservations" className="btn-gold shrink-0 w-full sm:w-auto lg:mb-2">
                {t('nav.reserveTable')}
              </Link>
            </div>
          </div>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Link to="/" className="group inline-flex flex-col rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
              <span className="font-display text-3xl font-semibold tracking-[0.18em] uppercase text-cream transition-colors group-hover:text-gold-light">
                {restaurant?.name ?? ''}
              </span>
              {restaurant?.city && (
                <span className="mt-2 text-[10px] font-medium uppercase tracking-[0.32em] text-gold-light">
                  {SITE_CONFIG.businessTypeLabel} · {restaurant.city}
                </span>
              )}
            </Link>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-stone-light">
              {t('footer.description')}
            </p>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
              {restaurant?.social_links?.instagram && (
                <a href={restaurant.social_links.instagram} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-1 text-xs uppercase tracking-[0.22em] text-stone-light transition-colors hover:text-gold-light">
                  Instagram
                  <ArrowUpRight size={13} aria-hidden="true" />
                </a>
              )}
              {restaurant?.social_links?.facebook && (
                <a href={restaurant.social_links.facebook} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-1 text-xs uppercase tracking-[0.22em] text-stone-light transition-colors hover:text-gold-light">
                  Facebook
                  <ArrowUpRight size={13} aria-hidden="true" />
                </a>
              )}
              {restaurant?.social_links?.tripadvisor && (
                <a href={restaurant.social_links.tripadvisor} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-1 text-xs uppercase tracking-[0.22em] text-stone-light transition-colors hover:text-gold-light">
                  TripAdvisor
                  <ArrowUpRight size={13} aria-hidden="true" />
                </a>
              )}
            </div>
          </div>

          <div className="lg:col-span-3">
            <h3 className="label-micro-light">{t('footer.navigate')}</h3>
            <ul className="mt-7 space-y-3">
              {NAV_LINKS.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-stone-light transition-colors hover:text-gold-light rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/reservation-lookup"
                  className="text-sm text-stone-light transition-colors hover:text-gold-light rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  {t('reservation.lookup.title')}
                </Link>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h3 className="label-micro-light">{t('footer.contact')}</h3>
            <address className="mt-7 space-y-4 text-sm not-italic text-stone-light">
              <p className="flex items-start gap-3">
                <MapPin size={15} className="mt-0.5 shrink-0 text-gold/80" aria-hidden="true" />
                <span>{restaurant?.address ?? ''}</span>
              </p>
              <p className="flex items-center gap-3">
                <Phone size={15} className="shrink-0 text-gold" aria-hidden="true" />
                <a href={`tel:${restaurant?.phone ?? ''}`} className="transition-colors hover:text-gold-light">{restaurant?.phone ?? ''}</a>
              </p>
              <p className="flex items-center gap-3">
                <Mail size={15} className="shrink-0 text-gold" aria-hidden="true" />
                <a href={`mailto:${restaurant?.email ?? ''}`} className="transition-colors hover:text-gold-light">{restaurant?.email ?? ''}</a>
              </p>
            </address>
          </div>

          <div className="lg:col-span-2">
            <h3 className="label-micro-light">{t('footer.hours')}</h3>
            <div className="mt-7 space-y-3 text-sm text-stone-light">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-stone">{t('footer.lunch')}</p>
                <p className="mt-1">{restaurant?.lunch_hours ?? ''}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-stone">{t('footer.dinner')}</p>
                <p className="mt-1">{restaurant?.dinner_hours ?? ''}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-stone">{t('footer.closed')}</p>
                <p className="mt-1">{closedDayLabel}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="hairline-light mt-16" />
        <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-stone">
            &copy; {formatNumber(month)} {restaurant?.name ?? ''}. {t('footer.allRightsReserved')}
          </p>
          <Link to="/admin" className="text-xs text-stone transition-colors hover:text-stone-light rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
            {t('footer.staffLogin')}
          </Link>
        </div>
      </Container>
    </footer>
  )
}