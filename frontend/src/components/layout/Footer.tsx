import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useRestaurant } from '../../contexts/RestaurantContext'
import { NAV_LINKS } from '../../utils/constants'

export default function Footer() {
  const { t } = useTranslation()
  const { restaurant } = useRestaurant()

  return (
    <footer className="bg-charcoal text-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Link to="/" className="font-display text-2xl font-semibold text-gold">
              {restaurant?.name ?? ''}
            </Link>
            <p className="mt-4 text-stone-light text-sm leading-relaxed">
              {t('footer.description')}
            </p>
          </div>

          <div>
            <h3 className="text-gold text-sm uppercase tracking-widest mb-4">{t('footer.navigate')}</h3>
            <ul className="space-y-2">
              {NAV_LINKS.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-stone-light hover:text-cream transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-gold text-sm uppercase tracking-widest mb-4">{t('footer.contact')}</h3>
            <address className="not-italic text-stone-light text-sm space-y-2">
              <p>{restaurant?.address ?? ''}</p>
              <p>
                <a href={`tel:${restaurant?.phone ?? ''}`} className="hover:text-cream transition-colors">
                  {restaurant?.phone ?? ''}
                </a>
              </p>
              <p>
                <a href={`mailto:${restaurant?.email ?? ''}`} className="hover:text-cream transition-colors">
                  {restaurant?.email ?? ''}
                </a>
              </p>
            </address>
          </div>

          <div>
            <h3 className="text-gold text-sm uppercase tracking-widest mb-4">{t('footer.hours')}</h3>
            <div className="text-stone-light text-sm space-y-1">
              <p>{t('footer.lunch')}: {restaurant?.lunch_hours ?? ''}</p>
              <p>{t('footer.dinner')}: {restaurant?.dinner_hours ?? ''}</p>
              <p className="text-stone">{t('footer.closed')}: {restaurant?.closed_day ?? ''}</p>
            </div>
            <div className="mt-6 flex gap-4">
              {restaurant?.social_links?.instagram && (
                <a
                  href={restaurant.social_links.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-light hover:text-gold transition-colors text-xs uppercase tracking-wider"
                >
                  Instagram
                </a>
              )}
              {restaurant?.social_links?.facebook && (
                <a
                  href={restaurant.social_links.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-light hover:text-gold transition-colors text-xs uppercase tracking-wider"
                >
                  Facebook
                </a>
              )}
              {restaurant?.social_links?.tripadvisor && (
                <a
                  href={restaurant.social_links.tripadvisor}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-light hover:text-gold transition-colors text-xs uppercase tracking-wider"
                >
                  TripAdvisor
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-charcoal-light/30 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-stone text-xs">
            &copy; {new Date().getFullYear()} {restaurant?.name ?? ''}. {t('footer.allRightsReserved')}
          </p>
          <Link to="/admin" className="text-stone text-xs hover:text-stone-light transition-colors">
            {t('footer.staffLogin')}
          </Link>
        </div>
      </div>
    </footer>
  )
}
