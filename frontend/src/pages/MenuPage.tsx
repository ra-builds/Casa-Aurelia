import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import SectionHeading from '../components/ui/SectionHeading'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorMessage from '../components/ui/ErrorMessage'
import { usePageTitle, useMetaDescription } from '../hooks/usePageTitle'
import { useRestaurant } from '../contexts/RestaurantContext'
import { menuApi } from '../services/api'
import { formatPrice } from '../utils/helpers'
import type { MenuCategory, MenuItem } from '../types'

export default function MenuPage() {
  const { t } = useTranslation()
  const { restaurant } = useRestaurant()
  usePageTitle('pageTitles.menu')
  useMetaDescription('meta.menu')

  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    menuApi
      .getMenu()
      .then((data) => {
        setCategories(data.categories)
        setItems(data.items)
      })
      .catch(() => setError(t('menu.loadError')))
      .finally(() => setLoading(false))
  }, [t])

  const filteredItems =
    activeCategory === 'all'
      ? items
      : items.filter((item) => {
          const cat = categories.find((c) => c.id === item.category_id)
          return cat?.slug === activeCategory
        })

  return (
    <>
      <section className="pt-32 pb-16 bg-charcoal text-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <SectionHeading title={t('menu.title')} subtitle={restaurant?.name ?? 'Casa Aurelia'} light />
          <p className="mt-4 text-cream/70 max-w-xl mx-auto">
            {t('menu.description')}
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading && <LoadingSpinner className="py-20" />}
          {error && <ErrorMessage message={error} />}

          {!loading && !error && (
            <>
              <div className="flex flex-wrap justify-center gap-2 mb-12">
                <button
                  type="button"
                  aria-pressed={activeCategory === 'all'}
                  onClick={() => setActiveCategory('all')}
                  className={`px-5 py-2 text-sm uppercase tracking-wider transition-colors ${
                    activeCategory === 'all'
                      ? 'bg-wine text-cream'
                      : 'bg-cream-dark text-stone hover:text-charcoal-light'
                  }`}
                >
                  {t('menu.all')}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.slug}
                    type="button"
                    aria-pressed={activeCategory === cat.slug}
                    onClick={() => setActiveCategory(cat.slug)}
                    className={`px-5 py-2 text-sm uppercase tracking-wider transition-colors ${
                      activeCategory === cat.slug
                        ? 'bg-wine text-cream'
                        : 'bg-cream-dark text-stone hover:text-charcoal-light'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {filteredItems.length === 0 ? (
                <p className="text-center text-stone py-12">{t('menu.empty')}</p>
              ) : (
                <div className="space-y-0">
                  {filteredItems.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className={`py-6 border-b border-cream-dark group ${item.is_available ? '' : 'opacity-60'}`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            width={96}
                            height={96}
                            loading="lazy"
                            className="h-20 w-20 sm:h-24 sm:w-24 rounded-md object-cover shrink-0"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-display text-xl font-semibold group-hover:text-wine transition-colors">
                              {item.name}
                            </h3>
                            {item.dietary_info && (
                              <span className="text-xs uppercase tracking-wider text-gold border border-gold/30 px-2 py-0.5">
                                {item.dietary_info}
                              </span>
                            )}
                            {item.is_featured && (
                              <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-wine">
                                <Star size={12} className="fill-gold text-gold" aria-hidden="true" />
                                {t('menu.signature')}
                              </span>
                            )}
                            {(item.allergens ?? []).map((allergen) => (
                              <span
                                key={allergen.code}
                                className="text-xs text-stone border border-stone/20 px-1.5 py-0.5"
                              >
                                {t(`allergenLabels.${allergen.code.toLowerCase()}`)}
                              </span>
                            ))}
                          </div>
                          <p className="mt-2 text-stone text-sm leading-relaxed max-w-lg">
                            {item.description}
                          </p>
                        </div>
                        {item.is_available ? (
                          <span className="font-display text-lg font-semibold text-wine whitespace-nowrap">
                            {formatPrice(item.price, restaurant?.currency)}
                          </span>
                        ) : (
                          <span className="text-xs uppercase tracking-wider text-stone whitespace-nowrap">
                            {t('menu.unavailable')}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  )
}
