import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, PenLine, Star } from 'lucide-react'
import Container from '../components/ui/Container'
import Reveal from '../components/ui/Reveal'
import MenuImage from '../components/ui/MenuImage'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorMessage from '../components/ui/ErrorMessage'
import { usePageSeo } from '../hooks/usePageTitle'
import { useRestaurant } from '../contexts/RestaurantContext'
import { SITE_CONFIG } from '../config/site'
import { menuApi } from '../services/api'
import { formatPrice } from '../utils/helpers'
import { GALLERY_IMAGES, gallerySrc } from '../utils/galleryImages'
import type { MenuCategory, MenuItem } from '../types'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']

const TAGLIATELLE = GALLERY_IMAGES[4]

function CategoryTab({
  label,
  active,
  onSelect,
}: {
  label: string
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={`relative shrink-0 px-5 py-2.5 text-sm uppercase tracking-wider transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ivory ${
        active ? 'text-wine' : 'text-stone hover:text-charcoal-light'
      }`}
    >
      {label}
      <span
        aria-hidden="true"
        className={`absolute inset-x-5 bottom-0.5 h-px bg-gold transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          active ? 'scale-x-100' : 'scale-x-0'
        }`}
      />
    </button>
  )
}

function DishRow({
  item,
  t,
  currency,
}: {
  item: MenuItem
  t: (key: string) => string
  currency?: string
}) {
  const allergens = (item.allergens ?? [])
    .map((a) => t(`allergenLabels.${a.code.toLowerCase()}`))
    .join(' · ')

  return (
    <div className={`group ${item.is_available ? '' : 'opacity-70'}`}>
      <div className="flex items-start gap-5 sm:gap-6">
        <MenuImage
          src={item.image_url}
          alt={item.name}
          aspect="aspect-square"
          className="w-28 shrink-0 sm:w-32"
          objectPosition="center 60%"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <h3 className="font-display text-lg leading-snug text-charcoal-light transition-colors duration-300 group-hover:text-wine sm:text-xl">
              {item.name}
            </h3>
            {item.is_featured && (
              <Star
                size={13}
                strokeWidth={1.5}
                className="shrink-0 fill-gold text-gold"
                aria-hidden="true"
              />
            )}
            <span
              aria-hidden="true"
              className={`mb-1.5 flex-1 border-b border-dotted border-charcoal/25 transition-colors duration-300 ${
                item.is_available ? 'group-hover:border-gold/60' : ''
              }`}
            />
            {item.is_available ? (
              <span className="whitespace-nowrap font-display text-lg text-wine sm:text-xl">
                {formatPrice(item.price, currency)}
              </span>
            ) : (
              <span className="whitespace-nowrap text-[10px] uppercase tracking-[0.18em] text-stone">
                {t('menu.unavailable')}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm leading-[1.7] text-stone">{item.description}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1">
            {item.dietary_info && (
              <span className="text-[10px] uppercase tracking-[0.18em] text-gold-deep">
                {item.dietary_info}
              </span>
            )}
            {item.is_featured && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-wine">
                <Star
                  size={11}
                  strokeWidth={1.5}
                  className="fill-gold text-gold"
                  aria-hidden="true"
                />
                {t('menu.signature')}
              </span>
            )}
            {allergens && (
              <span className="text-[10px] tracking-[0.06em] text-stone-light">{allergens}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function LeadPlate({
  item,
  category,
  aspect,
  reversed,
  priority,
  t,
  currency,
}: {
  item: MenuItem
  category: string
  aspect: string
  reversed: boolean
  priority: boolean
  t: (key: string) => string
  currency?: string
}) {
  const allergens = (item.allergens ?? [])
    .map((a) => t(`allergenLabels.${a.code.toLowerCase()}`))
    .join(' · ')

  return (
    <article className="grid items-center gap-9 lg:grid-cols-12 lg:gap-16">
      <div className={`lg:col-span-7 ${reversed ? 'lg:order-2' : ''}`}>
        <Reveal delay={0.1}>
          <MenuImage src={item.image_url} alt={item.name} aspect={aspect} priority={priority} />
        </Reveal>
      </div>
      <div className={`lg:col-span-5 ${reversed ? 'lg:order-1' : ''}`}>
        <Reveal>
          {item.is_featured ? (
            <p className="label-micro">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rotate-45 bg-gold/70" aria-hidden="true" />
              {t('menu.signature')}
            </p>
          ) : (
            <p className="label-micro">{category}</p>
          )}
        </Reveal>
        <Reveal delay={0.08}>
          <h3 className="mt-4 font-display font-medium leading-[1.06] tracking-[-0.015em] text-[clamp(2rem,3.5vw,2.9rem)] text-charcoal-light">
            {item.name}
          </h3>
        </Reveal>
        <Reveal delay={0.14}>
          <span className="mt-6 block h-px w-12 bg-gold/60" aria-hidden="true" />
        </Reveal>
        <Reveal delay={0.18}>
          <p className="lead mt-6 max-w-lg">{item.description}</p>
        </Reveal>
        <Reveal delay={0.24}>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-t border-charcoal/10 pt-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
                {item.dietary_info && (
                  <span className="text-[10px] uppercase tracking-[0.18em] text-gold-deep">
                    {item.dietary_info}
                  </span>
                )}
                {allergens && (
                  <span className="text-[10px] tracking-[0.06em] text-stone-light">{allergens}</span>
                )}
              </div>
            </div>
            {item.is_available ? (
              <span className="whitespace-nowrap font-display text-3xl leading-none text-wine">
                {formatPrice(item.price, currency)}
              </span>
            ) : (
              <span className="whitespace-nowrap text-[11px] uppercase tracking-[0.18em] text-stone">
                {t('menu.unavailable')}
              </span>
            )}
          </div>
        </Reveal>
        {item.is_featured && item.is_available && (
          <Reveal delay={0.3}>
            <div className="mt-6">
              <Link
                to="/signatures"
                className="btn-link text-wine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-sm"
              >
                {t('nav.signatures')}
                <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
              </Link>
            </div>
          </Reveal>
        )}
      </div>
    </article>
  )
}

export default function MenuPage() {
  const { t } = useTranslation()
  const { restaurant } = useRestaurant()
  usePageSeo({ titleKey: 'pageTitles.menu', descriptionKey: 'meta.menu' })

  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [activeCategory, setActiveCategory] = useState('all')
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

  const placeName = restaurant?.name ?? SITE_CONFIG.brandName

  const visibleCategories = categories.filter((cat) =>
    activeCategory === 'all'
      ? items.some((i) => i.category_id === cat.id)
      : cat.slug === activeCategory && items.some((i) => i.category_id === cat.id),
  )

  const itemsFor = (catId: number) =>
    items
      .filter((i) => i.category_id === catId)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)

  const totalItems = visibleCategories.reduce((n, cat) => n + itemsFor(cat.id).length, 0)

  return (
    <>
      {/* 1 — Editorial menu hero */}
      <section className="relative overflow-hidden bg-ivory pt-28 pb-14 md:pt-40 md:pb-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex select-none items-center justify-center"
        >
          <span className="font-display text-[clamp(12rem,30vw,26rem)] leading-none text-parchment/70">
            A
          </span>
        </div>
        <Container className="relative">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <div className="inline-flex items-center gap-3">
                <span className="h-px w-10 bg-gold/50" aria-hidden="true" />
                <p className="label-micro">
                  {placeName} — {t('menu.label')}
                </p>
                <span className="h-px w-10 bg-gold/50" aria-hidden="true" />
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-8 font-display font-medium leading-[1.02] tracking-[-0.02em] text-[clamp(2.9rem,7.5vw,6.5rem)] text-charcoal-light">
                {t('menu.writtenDaily')}
              </h1>
            </Reveal>
            <Reveal delay={0.18}>
              <p className="mx-auto mt-6 max-w-xl text-[1.05rem] leading-[1.8] text-stone">
                {t('menu.heroCopy')}
              </p>
            </Reveal>
            <Reveal delay={0.26}>
              <div className="mx-auto mt-10 flex items-center justify-center gap-4" aria-hidden="true">
                <span className="h-px w-16 bg-gold/60" />
                <span className="font-display text-lg italic text-gold-deep">{placeName}</span>
                <span className="h-px w-16 bg-gold/60" />
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* 2 — Category index */}
      <section className="border-y border-charcoal/10 bg-ivory">
        <Container>
          <Reveal className="pt-7 pb-6 md:pt-9 md:pb-7">
            <div className="flex items-end justify-between gap-6">
              <p className="inline-flex items-center gap-2.5 text-[10px] uppercase tracking-[0.24em] text-gold-deep">
                <PenLine size={13} strokeWidth={1.5} aria-hidden="true" />
                {t('menu.writtenDailyTag')}
              </p>
              <span className="hidden font-display text-lg italic text-stone sm:block" aria-hidden="true">
                {placeName}
              </span>
            </div>
            <div
              role="group"
              aria-label={t('menu.title')}
              className="no-scrollbar -mx-5 mt-4 flex items-center gap-1 overflow-x-auto px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:overflow-visible lg:px-0"
            >
              <CategoryTab
                label={t('menu.all')}
                active={activeCategory === 'all'}
                onSelect={() => setActiveCategory('all')}
              />
              {categories.map((cat) => (
                <CategoryTab
                  key={cat.slug}
                  label={cat.name}
                  active={activeCategory === cat.slug}
                  onSelect={() => setActiveCategory(cat.slug)}
                />
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      {/* 3 — Menu chapters */}
      <section className="py-16 md:py-24">
        <Container>
          {loading && <LoadingSpinner className="py-20" />}
          {error && <ErrorMessage message={error} />}

          {!loading && !error && (
            <>
              {totalItems === 0 && (
                <Reveal>
                  <p className="py-12 text-center text-stone">{t('menu.empty')}</p>
                </Reveal>
              )}

              {visibleCategories.map((cat, ci) => {
                const dishes = itemsFor(cat.id)
                if (dishes.length === 0) return null
                const lead = dishes.find((d) => d.is_featured) ?? dishes[0]
                const others = dishes.filter((d) => d.id !== lead.id)
                const reversed = ci % 2 === 1

                return (
                  <div key={cat.id}>
                    {ci > 0 && <div className="mt-20 md:mt-28" aria-hidden="true" />}
                    <section aria-labelledby={`menu-cat-${cat.slug}`}>
                      <div className="mb-10 flex items-end gap-6 md:mb-12">
                        <span
                          className="hidden font-display text-4xl text-gold-deep sm:block md:text-5xl"
                          aria-hidden="true"
                        >
                          {ROMAN[ci] ?? ci + 1}
                        </span>
                        <div>
                          <h2
                            id={`menu-cat-${cat.slug}`}
                            className="font-display text-[1.7rem] font-medium uppercase tracking-[0.14em] text-charcoal-light md:text-3xl"
                          >
                            {cat.name}
                          </h2>
                          <span className="mt-3 block h-px w-12 bg-gold/60" aria-hidden="true" />
                        </div>
                        <span className="hairline mb-1.5 flex-1" aria-hidden="true" />
                      </div>

                      <LeadPlate
                        item={lead}
                        category={cat.name}
                        aspect={ci % 2 === 0 ? 'aspect-[3/2]' : 'aspect-[4/5]'}
                        reversed={reversed}
                        priority={ci === 0}
                        t={t}
                        currency={restaurant?.currency}
                      />

                      {others.length > 0 && (
                        <div className="mt-14 grid gap-x-12 gap-y-12 md:mt-20 md:grid-cols-2 md:gap-y-14 lg:gap-x-16">
                          {others.map((item) => (
                            <Reveal key={item.id} delay={0.06}>
                              <DishRow item={item} t={t} currency={restaurant?.currency} />
                            </Reveal>
                          ))}
                        </div>
                      )}
                    </section>

                    {ci === 1 && visibleCategories.length > 2 && (
                      <div className="relative mt-20 overflow-hidden bg-charcoal md:mt-32">
                        <img
                          src={gallerySrc(TAGLIATELLE, 1920)}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          decoding="async"
                          sizes="100vw"
                          className="absolute inset-0 h-full w-full object-cover object-center opacity-55"
                        />
                        <div
                          className="absolute inset-0 bg-gradient-to-b from-charcoal/55 via-charcoal/35 to-charcoal/70"
                          aria-hidden="true"
                        />
                        <Container>
                          <div className="py-24 text-center md:py-32">
                            <p className="label-micro-light">{t('menu.writtenDailyTag')}</p>
                            <p className="mx-auto mt-4 max-w-xl font-display text-[clamp(1.8rem,4vw,3rem)] italic leading-[1.15] text-cream">
                              {t('menu.writtenDaily')}
                            </p>
                            <span
                              className="mx-auto mt-7 block h-px w-14 bg-gold/60"
                              aria-hidden="true"
                            />
                          </div>
                        </Container>
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </Container>
      </section>

      {/* 4 — Reservation invitation */}
      <section className="border-t border-charcoal/10 bg-ivory/60 py-16 md:py-20">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <p className="label-micro">{t('menu.label')}</p>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="headline-section mt-4">{t('menu.ctaTitle')}</h2>
            </Reveal>
            <Reveal delay={0.16}>
              <div className="mt-8">
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