import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import Container from '../components/ui/Container'
import Reveal from '../components/ui/Reveal'
import MenuImage from '../components/ui/MenuImage'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorMessage from '../components/ui/ErrorMessage'
import { usePageSeo } from '../hooks/usePageTitle'
import { useRestaurant } from '../contexts/RestaurantContext'
import { SITE_CONFIG } from '../config/site'
import { useFeaturedDishes, type FeaturedDish } from '../hooks/useFeaturedDishes'
import { formatPrice } from '../utils/helpers'
import { IMAGES } from '../utils/constants'
import { GALLERY_IMAGES, gallerySrc } from '../utils/galleryImages'

const EASE = [0.22, 1, 0.36, 1] as const

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']

const EVENING_GLASS = GALLERY_IMAGES[14]

interface SpreadSpec {
  image: string
  text: string
  aspect: string
  objectPosition?: string
  watermark?: boolean
  sizes?: string
}

const SPREADS: SpreadSpec[] = [
  {
    image: 'lg:col-span-7',
    text: 'lg:col-span-4 lg:col-start-9',
    aspect: 'aspect-[3/2]',
    sizes: '(min-width: 1024px) 58vw, 92vw',
  },
  {
    image: 'lg:col-span-6 lg:col-start-7 lg:mt-24',
    text: 'lg:col-span-5 lg:col-start-1',
    aspect: 'aspect-[4/5]',
    objectPosition: 'center 35%',
    sizes: '(min-width: 1024px) 50vw, 92vw',
  },
  {
    image: 'lg:col-span-5 lg:col-start-1',
    text: 'lg:col-span-5 lg:col-start-7 lg:mt-8',
    aspect: 'aspect-square',
    watermark: true,
    sizes: '(min-width: 1024px) 42vw, 92vw',
  },
  {
    text: 'lg:col-span-4 lg:col-start-1 lg:mt-12',
    image: 'lg:col-span-6 lg:col-start-6',
    aspect: 'aspect-[3/4]',
    objectPosition: 'center 40%',
    sizes: '(min-width: 1024px) 50vw, 92vw',
  },
  {
    image: 'lg:col-span-6 lg:col-start-1',
    text: 'lg:col-span-5 lg:col-start-8',
    aspect: 'aspect-[4/3]',
    sizes: '(min-width: 1024px) 50vw, 92vw',
  },
  {
    image: 'lg:col-span-5 lg:col-start-1',
    text: 'lg:col-span-5 lg:col-start-7 lg:mt-20',
    aspect: 'aspect-[4/5]',
    objectPosition: 'center 45%',
    watermark: true,
    sizes: '(min-width: 1024px) 42vw, 92vw',
  },
  {
    text: 'lg:col-span-5 lg:col-start-1',
    image: 'lg:col-span-5 lg:col-start-7 lg:mt-24',
    aspect: 'aspect-square',
    sizes: '(min-width: 1024px) 42vw, 92vw',
  },
  {
    image: 'lg:col-span-6 lg:col-start-1',
    text: 'lg:col-span-4 lg:col-start-8 lg:mt-10',
    aspect: 'aspect-[3/4]',
    objectPosition: 'center 55%',
    sizes: '(min-width: 1024px) 50vw, 92vw',
  },
  {
    image: 'lg:col-span-7 lg:col-start-6',
    text: 'lg:col-span-5 lg:col-start-1 lg:pt-16',
    aspect: 'aspect-[3/2]',
    sizes: '(min-width: 1024px) 58vw, 92vw',
  },
]

interface DishSpreadProps {
  dish: FeaturedDish
  spec: SpreadSpec
  roman: string
  t: (key: string) => string
  currency?: string
}

function DishSpread({ dish, spec, roman, t, currency }: DishSpreadProps) {
  const allergens = (dish.allergens ?? [])
    .map((a) => t(`allergenLabels.${a.code.toLowerCase()}`))
    .join(' · ')

  return (
    <article className="grid items-start gap-10 lg:grid-cols-12 lg:gap-x-8">
      <div className={spec.image}>
        <Reveal delay={0.1}>
          <MenuImage
            src={dish.image}
            alt={dish.name}
            aspect={spec.aspect}
            objectPosition={spec.objectPosition}
            sizes={spec.sizes}
          />
        </Reveal>
      </div>

      <div className={`relative ${spec.text}`}>
        {spec.watermark && (
          <p
            aria-hidden="true"
            className="pointer-events-none absolute -top-4 right-0 hidden select-none font-display text-[clamp(5rem,14vw,11rem)] leading-none text-gold/10 lg:block"
          >
            {roman}
          </p>
        )}
        <div className="relative">
          <Reveal>
            <p
              aria-hidden="true"
              className={`font-display text-[clamp(2.4rem,4vw,3.75rem)] leading-none text-gold/40 ${
                spec.watermark ? 'lg:hidden' : ''
              }`}
            >
              {roman}
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="headline-section mt-4">{dish.name}</h2>
          </Reveal>
          <Reveal delay={0.14}>
            <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-2">
              {dish.category?.name && (
                <span className="font-display text-sm italic text-stone">{dish.category.name}</span>
              )}
              {dish.dietary_info && (
                <span className="label-micro-muted">{dish.dietary_info}</span>
              )}
              {dish.is_featured && (
                <span className="label-micro-muted font-medium text-wine">
                  <Star
                    size={11}
                    strokeWidth={1.5}
                    className="mr-1 -mt-px inline fill-gold text-gold"
                    aria-hidden="true"
                  />
                  {t('menu.signature')}
                </span>
              )}
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="lead mt-6 max-w-lg">{dish.description}</p>
          </Reveal>
          <Reveal delay={0.26}>
            <div className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-t border-charcoal/15 pt-6">
              <span className="font-display text-[1.75rem] leading-none text-wine">
                {formatPrice(dish.price, currency)}
              </span>
              {allergens && (
                <p className="max-w-[16rem] text-right text-[10px] uppercase tracking-[0.14em] text-stone-light">
                  {allergens}
                </p>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </article>
  )
}

export default function SignaturesPage() {
  usePageSeo({ titleKey: 'pageTitles.signatures', descriptionKey: 'meta.signatures' })

  const { t } = useTranslation()
  const { restaurant } = useRestaurant()
  const { dishes, loading, error } = useFeaturedDishes(9)

  const renderSpread = (index: number) => (
    <DishSpread
      key={dishes[index].id}
      dish={dishes[index]}
      spec={SPREADS[index % SPREADS.length] ?? SPREADS[SPREADS.length - 1]}
      roman={ROMAN[index] ?? '—'}
      t={t}
      currency={restaurant?.currency}
    />
  )

  return (
    <>
      {/* 1 — Cinematic journal hero */}
      <section className="relative overflow-hidden bg-charcoal text-cream">
        <motion.img
          src={IMAGES.hero}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          sizes="100vw"
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.9, ease: EASE }}
          className="absolute inset-0 h-full w-full object-cover object-center opacity-70"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-charcoal/90 via-charcoal/60 to-charcoal/25"
          aria-hidden="true"
        />
        <div
          className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-charcoal/90 to-transparent"
          aria-hidden="true"
        />

        <Container className="relative z-10 flex min-h-[88vh] flex-col justify-center pt-36 pb-28 md:pt-44 md:pb-32">
          <Reveal>
            <div className="inline-flex items-center gap-3">
              <span className="h-px w-10 bg-gold/50" aria-hidden="true" />
              <p className="label-micro-light">{t('signatures.heroKicker')}</p>
              <span className="h-px w-10 bg-gold/50" aria-hidden="true" />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="headline-hero mt-7 max-w-4xl">
              {t('signatures.heroTitle1')}
              <br />
              <span className="italic text-gold-light">{t('signatures.heroTitle2')}</span>
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="mt-9 flex items-center gap-5">
              <span className="h-px w-16 bg-gold/60" aria-hidden="true" />
              <p className="lead-light max-w-md">{t('signatures.heroCopy')}</p>
            </div>
          </Reveal>
          <Reveal delay={0.28}>
            <p className="mt-16 inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-cream/60">
              {t('home.hero.scroll')}
              <span className="relative h-px w-14 bg-cream/40" aria-hidden="true">
                <span className="absolute -top-px left-0 h-px w-4 bg-gold" />
              </span>
            </p>
          </Reveal>
        </Container>
      </section>

      {/* 2 — Manifesto */}
      <section className="bg-ivory py-24 md:py-36">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <p className="label-micro">{t('signatures.manifestoLabel')}</p>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="headline-section mt-5">{t('signatures.manifestoTitle')}</h2>
            </Reveal>
            <span className="mx-auto mt-9 block h-px w-14 bg-gold/50" aria-hidden="true" />
            <Reveal delay={0.16}>
              <p className="lead mt-7">{t('signatures.manifestoBody')}</p>
            </Reveal>
            <Reveal delay={0.24}>
              <div
                className="mt-10 flex items-center justify-center gap-3"
                aria-hidden="true"
              >
                <span className="h-px w-10 bg-gold/40" />
                <span className="block h-1.5 w-1.5 rotate-45 bg-gold/60" />
                <span className="h-px w-10 bg-gold/40" />
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* 3 — The signatures (journal) */}
      <section className="py-24 md:py-36">
        <Container>
          {loading && <LoadingSpinner className="py-32" />}

          {!loading && error && (
            <Reveal>
              <div className="mx-auto max-w-xl">
                <ErrorMessage message={t('signatures.loadError')} />
              </div>
            </Reveal>
          )}

          {!loading && !error && dishes.length === 0 && (
            <Reveal>
              <p className="lead mx-auto max-w-xl text-center">{t('signatures.empty')}</p>
            </Reveal>
          )}
        </Container>

        {!loading && !error && dishes.length > 0 && (
          <>
            <Container className="flex flex-col gap-24 md:gap-36">
              {dishes.slice(0, 4).map((_, i) => renderSpread(i))}
            </Container>

            {/* 4 — Culinary statement */}
            <section className="bg-charcoal py-24 text-cream md:py-36">
              <Container>
                <div className="mx-auto max-w-3xl text-center">
                  <Reveal>
                    <div className="inline-flex items-center gap-3">
                      <span className="h-px w-10 bg-gold/50" aria-hidden="true" />
                      <p className="label-micro-light">{t('signatures.statementLabel')}</p>
                      <span className="h-px w-10 bg-gold/50" aria-hidden="true" />
                    </div>
                  </Reveal>
                  <Reveal delay={0.1}>
                    <p className="mt-8 font-display text-[clamp(1.9rem,4.5vw,3.3rem)] font-medium italic leading-[1.18] text-cream">
                      {t('signatures.statementText')}
                    </p>
                  </Reveal>
                  <span className="mx-auto mt-10 block h-px w-14 bg-gold/50" aria-hidden="true" />
                  <Reveal delay={0.18}>
                    <p className="lead-light mx-auto mt-8 max-w-md">
                      {t('signatures.statementSupport')}
                    </p>
                  </Reveal>
                </div>
              </Container>
            </section>

            <Container className="pt-24 md:pt-36">
              <div className="flex flex-col gap-24 md:gap-36">
                {dishes.slice(4).map((_, i) => renderSpread(4 + i))}
              </div>
            </Container>
          </>
        )}
      </section>

      {/* 5 — Reservation */}
      <section className="relative overflow-hidden bg-charcoal py-24 md:py-36">
        <img
          src={gallerySrc(EVENING_GLASS, 1920)}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          sizes="100vw"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-30"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-charcoal/80 via-charcoal/85 to-charcoal/95"
          aria-hidden="true"
        />
        <Container className="relative z-10">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <div className="inline-flex items-center gap-3">
                <span className="h-px w-10 bg-gold/50" aria-hidden="true" />
                <p className="label-micro-light">{restaurant?.name ?? SITE_CONFIG.brandName}</p>
                <span className="h-px w-10 bg-gold/50" aria-hidden="true" />
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-7 font-display text-[clamp(2.2rem,5.5vw,4rem)] font-medium italic leading-[1.08] text-cream">
                {t('signatures.reserveTitle')}
              </h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="lead-light mx-auto mt-7 max-w-md">{t('signatures.reserveBody')}</p>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="mt-11 flex flex-col items-center justify-center gap-5 sm:flex-row sm:gap-8">
                <Button to="/reservations" variant="gold">
                  {t('signatures.reserve')}
                </Button>
                <Button to="/menu" variant="secondaryLight">
                  {t('signatures.viewMenu')}
                </Button>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  )
}