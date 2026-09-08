import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import Container from '../components/ui/Container'
import Reveal from '../components/ui/Reveal'
import ImageReveal from '../components/ui/ImageReveal'
import Button from '../components/ui/Button'
import { usePageSeo } from '../hooks/usePageTitle'
import { useRestaurant } from '../contexts/RestaurantContext'
import { SITE_CONFIG } from '../config/site'
import { IMAGES } from '../utils/constants'
import { GALLERY_IMAGES, gallerySrc, gallerySrcSet } from '../utils/galleryImages'

const EASE = [0.22, 1, 0.36, 1] as const

const HERO_IMAGE = IMAGES.hero
const CHEF_IMAGE = IMAGES.chef
const INGREDIENTS_IMAGE = IMAGES.ingredients
const EXPERIENCE_IMAGE = IMAGES.experience
const ROOM_IMAGE = IMAGES.intro
const CRAFT_PASTA = GALLERY_IMAGES[4]
const CANDLELIGHT = GALLERY_IMAGES[6]

export default function AboutPage() {
  const { t } = useTranslation()
  const { restaurant } = useRestaurant()
  usePageSeo({ titleKey: 'pageTitles.about', descriptionKey: 'meta.about' })

  const placeName = restaurant?.name ?? SITE_CONFIG.brandName

  return (
    <>
      {/* 1 — Cinematic story opening */}
      <section className="relative flex min-h-[86vh] items-center overflow-hidden bg-charcoal text-cream">
        <motion.img
          src={HERO_IMAGE}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          sizes="100vw"
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.8, ease: EASE }}
          className="absolute inset-0 h-full w-full object-cover object-[center_40%]"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-charcoal/45 via-charcoal/40 to-charcoal/95"
          aria-hidden="true"
        />
        <div
          className="absolute inset-y-0 left-0 w-[42%] max-w-[46rem] bg-gradient-to-r from-charcoal/85 to-transparent"
          aria-hidden="true"
        />
        <Container className="relative z-10 py-28 md:py-32">
          <div className="max-w-2xl">
            <Reveal>
              <div className="inline-flex items-center gap-3">
                <span className="h-px w-10 bg-gold/50" aria-hidden="true" />
                <p className="label-micro-light">{t('about.heroSubtitle')}</p>
                <span className="h-px w-10 bg-gold/50" aria-hidden="true" />
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="headline-hero mt-7">{t('about.heroTitle')}</h1>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="mt-8 flex items-center gap-5">
                <span className="h-px w-16 bg-gold/60" aria-hidden="true" />
                <p className="max-w-md text-[1.05rem] leading-[1.8] text-cream/85">
                  {t('about.subtitle')}
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.28}>
              <div className="mt-14 flex items-center gap-3 text-cream/60">
                <span className="text-[10px] uppercase tracking-[0.3em]">{t('about.scroll')}</span>
                <ChevronDown size={16} strokeWidth={1.25} aria-hidden="true" />
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* 2 — The story, unbound */}
      <section className="py-24 md:py-36">
        <Container>
          <div className="lg:grid lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <Reveal>
                <div className="flex items-center gap-3">
                  <span className="h-px w-10 bg-gold/50" aria-hidden="true" />
                  <p className="label-micro">{t('about.story.kicker')}</p>
                </div>
              </Reveal>
              <Reveal delay={0.08}>
                <p className="mt-7 text-[1.15rem] leading-[1.85] text-stone first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-6xl first-letter:font-medium first-letter:leading-[0.8] first-letter:text-wine">
                  {t('about.story.p1')}
                </p>
              </Reveal>
              <Reveal delay={0.16}>
                <p className="mt-6 text-[1.15rem] leading-[1.85] text-stone">{t('about.story.p2')}</p>
              </Reveal>
            </div>
            <div className="lg:col-span-5 lg:col-start-9 lg:pt-16">
              <Reveal delay={0.22}>
                <figure>
                  <span className="h-px w-12 bg-gold/60" aria-hidden="true" />
                  <blockquote className="mt-6 font-display text-[1.75rem] italic leading-[1.35] text-charcoal-light md:text-[2.1rem]">
                    {t('about.story.pull')}
                  </blockquote>
                  <figcaption className="mt-5 text-[10px] uppercase tracking-[0.26em] text-stone">
                    {placeName}
                  </figcaption>
                </figure>
              </Reveal>
            </div>
          </div>
        </Container>
      </section>

      {/* 3 — The chef */}
      <section className="bg-cream-dark py-24 md:py-36">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-20">
            <div className="lg:col-span-6 lg:col-start-7">
              <Reveal>
                <p className="label-micro">{t('about.chef.subtitle')}</p>
              </Reveal>
              <Reveal delay={0.08}>
                <h2 className="headline-section mt-4">{t('about.chef.title')}</h2>
              </Reveal>
              <span className="mt-6 block h-px w-12 bg-gold/60" aria-hidden="true" />
              <Reveal delay={0.16}>
                <p className="lead mt-7">{t('about.chef.p1')}</p>
              </Reveal>
              <Reveal delay={0.22}>
                <p className="mt-6 text-[1.0625rem] italic leading-[1.8] text-stone">
                  {t('about.chef.p2')}
                </p>
              </Reveal>
            </div>
            <div className="lg:col-span-6 lg:col-start-1 lg:row-start-1">
              <Reveal delay={0.1}>
                <ImageReveal
                  src={CHEF_IMAGE}
                  alt={t('about.chef.imageAlt')}
                  aspect="aspect-[4/5]"
                  objectPosition="center 55%"
                />
              </Reveal>
            </div>
          </div>
        </Container>
      </section>

      {/* 4 — Ingredients & craft */}
      <section className="py-24 md:py-36">
        <Container>
          <Reveal>
            <p className="label-micro">{t('about.approach.subtitle')}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="headline-section mt-4">{t('about.approach.title')}</h2>
          </Reveal>
          <div className="mt-14 grid items-center gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-7">
              <Reveal delay={0.1}>
                <ImageReveal
                  src={INGREDIENTS_IMAGE}
                  alt={t('about.approach.imageAlt')}
                  aspect="aspect-[4/3]"
                />
              </Reveal>
            </div>
            <div className="md:col-span-5 md:mt-10">
              <Reveal delay={0.16}>
                <p className="lead">{t('about.approach.p1')}</p>
              </Reveal>
              <Reveal delay={0.22}>
                <p className="lead mt-6">{t('about.approach.p2')}</p>
              </Reveal>
            </div>
          </div>
          <div className="mt-20 grid items-center gap-10 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-5">
              <Reveal delay={0.1}>
                <ImageReveal
                  src={gallerySrc(CRAFT_PASTA, 900)}
                  srcSet={gallerySrcSet(CRAFT_PASTA)}
                  alt={t('about.approach.imageAlt2')}
                  aspect="aspect-[4/5]"
                  objectPosition="center"
                  sizes="(min-width: 768px) 40vw, 96vw"
                />
              </Reveal>
            </div>
            <div className="md:col-span-6 md:col-start-7">
              <Reveal delay={0.18}>
                <span className="font-display text-[clamp(4rem,8vw,7rem)] leading-none text-gold-deep" aria-hidden="true">
                  04
                </span>
              </Reveal>
              <span className="mt-6 block h-px w-12 bg-gold/60" aria-hidden="true" />
              <Reveal delay={0.24}>
                <p className="mt-6 font-display text-[1.5rem] italic leading-[1.45] text-charcoal-light md:text-[1.8rem]">
                  {t('gallery.captions.g05')}
                </p>
              </Reveal>
            </div>
          </div>
        </Container>
      </section>

      {/* 5 — Philosophy */}
      <section className="relative overflow-hidden bg-charcoal py-24 md:py-36">
        <img
          src={gallerySrc(CANDLELIGHT, 1600)}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          sizes="100vw"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-25"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-charcoal/80 via-charcoal/60 to-charcoal/90"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(50rem_at_50%_0%,rgba(92,25,31,0.5),transparent_65%)]"
          aria-hidden="true"
        />
        <Container className="relative z-10">
          <h2 className="sr-only">{t('about.philosophy.kicker')}</h2>
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <p className="label-micro-light">{t('about.philosophy.kicker')}</p>
            </Reveal>
            <Reveal delay={0.1}>
              <blockquote className="mt-8 font-display text-[clamp(1.9rem,4.2vw,3.3rem)] italic leading-[1.35] text-cream">
                {t('about.chef.p2')}
              </blockquote>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="mt-10 flex flex-col items-center gap-4">
                <span className="h-px w-12 bg-gold/60" aria-hidden="true" />
                <p className="text-[10px] uppercase tracking-[0.28em] text-gold-light">
                  {t('about.chef.attribution')}
                </p>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* 6 — The evening */}
      <section className="py-24 md:py-36">
        <Container>
          <Reveal>
            <p className="label-micro">{t('about.experience.kicker')}</p>
          </Reveal>
          <h2 className="sr-only">{t('about.experience.kicker')}</h2>
          <div className="mt-14 grid items-end gap-10 md:grid-cols-12 md:gap-14">
            <Reveal className="md:col-span-7" delay={0.1}>
              <ImageReveal
                src={EXPERIENCE_IMAGE}
                alt={t('about.experience.captionOne')}
                aspect="aspect-[3/2]"
                objectPosition="center 40%"
              />
            </Reveal>
            <Reveal className="md:col-span-4 md:col-start-9 md:pb-16" delay={0.18}>
              <p className="lead">{t('about.experience.captionOne')}</p>
              <span className="mt-6 block h-px w-12 bg-gold/60" aria-hidden="true" />
              <p className="mt-6 text-[1.0625rem] italic leading-[1.8] text-stone">
                {t('about.experience.captionTwo')}
              </p>
            </Reveal>
          </div>
          <Reveal className="mt-16 md:mt-24" delay={0.1}>
            <ImageReveal
              src={ROOM_IMAGE}
              alt=""
              aspect="aspect-[21/9]"
              objectPosition="center 45%"
            />
            <p className="mt-4 text-center text-sm italic text-stone">
              {t('gallery.captions.g01')}
            </p>
          </Reveal>
        </Container>
      </section>

      {/* 7 — Closing invitation */}
      <section className="border-t border-charcoal/10 bg-ivory">
        <Container>
          <Reveal className="py-16 md:py-20">
            <div className="grid items-center gap-8 md:grid-cols-12 md:gap-12">
              <div className="md:col-span-7">
                <Reveal>
                  <p className="label-micro">{placeName}</p>
                </Reveal>
                <Reveal delay={0.08}>
                  <h2 className="headline-section mt-4">{t('about.cta.title')}</h2>
                </Reveal>
                <Reveal delay={0.16}>
                  <p className="lead mt-6">
                    {t('about.cta.description', { name: placeName })}
                  </p>
                </Reveal>
              </div>
              <div className="md:col-span-5 md:justify-self-end">
                <Reveal delay={0.2}>
                  <div className="inline-flex flex-wrap items-center gap-4">
                    <Button to="/reservations" variant="gold">
                      {t('nav.reserveTable')}
                    </Button>
                    <Button to="/menu" variant="secondary">
                      {t('nav.menu')}
                    </Button>
                  </div>
                </Reveal>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  )
}