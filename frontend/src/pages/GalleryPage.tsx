import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import { ChevronLeft, ChevronRight, Image as ImageIcon, X } from 'lucide-react'
import Container from '../components/ui/Container'
import Reveal from '../components/ui/Reveal'
import MenuImage from '../components/ui/MenuImage'
import Button from '../components/ui/Button'
import { usePageSeo } from '../hooks/usePageTitle'
import { useRestaurant } from '../contexts/RestaurantContext'
import { SITE_CONFIG } from '../config/site'
import {
  GALLERY_IMAGES,
  GALLERY_CLOSING_IMAGE,
  gallerySrc,
  gallerySrcSet,
} from '../utils/galleryImages'
import type { GalleryCategory, GalleryImage } from '../utils/galleryImages'

const CATEGORY_KEYS: ('all' | GalleryCategory)[] = ['all', 'food', 'interior', 'chef', 'events']

const EASE = [0.22, 1, 0.36, 1] as const

const slideVariants = {
  enter: (dir: number) => ({ x: dir >= 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir >= 0 ? -48 : 48, opacity: 0 }),
}

function GalleryTab({
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

function GalleryTile({
  image,
  onOpen,
  delay = 0,
  priority = false,
}: {
  image: GalleryImage
  onOpen: () => void
  delay?: number
  priority?: boolean
}) {
  const { t } = useTranslation()
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      onClick={onOpen}
      aria-label={t('gallery.viewImage', { alt: image.alt })}
      className="group relative block w-full cursor-pointer break-inside-avoid text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
    >
      <div className="relative overflow-hidden bg-parchment">
        <div className="motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-[1.035]">
          <MenuImage
            src={gallerySrc(image, 900)}
            alt={image.alt}
            aspect={image.aspect}
            objectPosition={image.objectPosition}
            priority={priority}
            sizes="(min-width: 1280px) 33vw, (min-width: 1024px) 50vw, (min-width: 640px) 50vw, 100vw"
          />
        </div>
        <div
          className="pointer-events-none absolute inset-0 border border-charcoal/15"
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-charcoal/70 via-charcoal/10 to-transparent p-5 opacity-0 transition-opacity duration-500 group-hover:opacity-100 md:p-6">
          <p className="text-[10px] uppercase tracking-[0.32em] text-gold-light">
            {t(`gallery.categories.${image.category}`)}
          </p>
          <span className="mt-2 block h-px w-10 bg-gold/60" aria-hidden="true" />
          <p className="mt-2 font-display text-[0.95rem] italic leading-snug text-cream/90">
            {t(image.captionKey)}
          </p>
        </div>
      </div>
    </motion.button>
  )
}

function LightboxDialog({
  images,
  index,
  onClose,
  onNav,
}: {
  images: GalleryImage[]
  index: number
  onClose: () => void
  onNav: (next: number) => void
}) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [direction, setDirection] = useState(0)
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')

  const image = images[index]

  useEffect(() => {
    setStatus('loading')
    setDirection(0)
  }, [index])

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    closeRef.current?.focus()

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setDirection(-1)
        onNav((index + images.length - 1) % images.length)
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setDirection(1)
        onNav((index + 1) % images.length)
        return
      }
      if (e.key === 'Tab') {
        const focusables = el.querySelectorAll<HTMLElement>('button')
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
  }, [index, images.length, onClose, onNav])

  const goPrev = () => {
    setDirection(-1)
    onNav((index + images.length - 1) % images.length)
  }
  const goNext = () => {
    setDirection(1)
    onNav((index + 1) % images.length)
  }

  const handlePanEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 64) {
      if (info.offset.x > 0) goPrev()
      else goNext()
    }
  }

  return (
    <motion.div
      ref={dialogRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="fixed inset-0 z-[100] bg-charcoal/[0.97] select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('gallery.lightbox.ariaLabel')}
    >
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-5 md:px-8 md:pt-7">
        <p className="text-[11px] uppercase tracking-[0.3em] text-cream/70">
          {t('gallery.lightbox.counter', { current: index + 1, total: images.length })}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="absolute right-1 top-1 flex items-center justify-center text-cream/80 transition-colors hover:text-gold focus-visible:ring-cream rounded-sm p-2 focus-visible:outline-none focus-visible:ring-2"
          aria-label={t('gallery.lightbox.closeLabel')}
        >
          <X size={28} />
        </button>
      </div>

      <motion.div
        className="absolute inset-0 flex items-center justify-center px-16 md:px-28"
        style={{ touchAction: 'pan-y' }}
        onPanEnd={handlePanEnd}
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={image.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.42, ease: EASE }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {status === 'error' ? (
              <div className="flex flex-col items-center gap-3 text-center text-cream/40">
                <span className="font-display text-3xl tracking-[0.4em] md:text-4xl">
                  CASA AURELIA
                </span>
                <span className="h-px w-10 bg-gold/40" aria-hidden="true" />
              </div>
            ) : (
              <motion.img
                src={gallerySrc(image, 1600)}
                srcSet={gallerySrcSet(image)}
                sizes="90vw"
                alt={image.alt}
                onLoad={() => setStatus('loaded')}
                onError={() => setStatus('error')}
                onClick={(e) => e.stopPropagation()}
                animate={{ opacity: status === 'loaded' ? 1 : 0 }}
                transition={{ duration: 0.6, ease: EASE }}
                className="max-h-[72vh] max-w-[90vw] object-contain md:max-h-[76vh]"
                draggable={false}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          goPrev()
        }}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-sm p-3 text-cream/80 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold md:left-5 md:p-4"
        aria-label={t('gallery.lightbox.previous')}
      >
        <ChevronLeft size={32} />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          goNext()
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-3 text-cream/80 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold md:right-5 md:p-4"
        aria-label={t('gallery.lightbox.next')}
      >
        <ChevronRight size={32} />
      </button>

      <div
        className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-2 px-6 pb-6 text-center md:pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[10px] uppercase tracking-[0.32em] text-gold-light">
          {t(`gallery.categories.${image.category}`)}
        </p>
        <p className="max-w-xl font-display text-base italic leading-snug text-cream/90 md:text-lg">
          {t(image.captionKey)}
        </p>
        <span className="h-px w-10 bg-gold/40" aria-hidden="true" />
      </div>

      <p className="sr-only" aria-live="polite">
        {t('gallery.lightbox.liveStatus', {
          current: index + 1,
          total: images.length,
          caption: t(image.captionKey),
        })}
      </p>
    </motion.div>
  )
}

export default function GalleryPage() {
  const { t } = useTranslation()
  const { restaurant } = useRestaurant()
  usePageSeo({ titleKey: 'pageTitles.gallery', descriptionKey: 'meta.gallery' })

  const [activeCategory, setActiveCategory] = useState<'all' | GalleryCategory>('all')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  const placeName = restaurant?.name ?? SITE_CONFIG.brandName

  const filtered =
    activeCategory === 'all'
      ? GALLERY_IMAGES
      : GALLERY_IMAGES.filter((img) => img.category === activeCategory)

  const lead = filtered[0]
  const second = filtered[1]
  const rest = filtered.slice(2)

  const openAt = (i: number) => {
    openerRef.current = document.activeElement as HTMLElement | null
    setLightboxIndex(i)
  }

  const closeLightbox = () => {
    setLightboxIndex(null)
    requestAnimationFrame(() => openerRef.current?.focus())
  }

  return (
    <>
      {/* Editorial hero — the opening page of a photography book */}
      <section className="relative overflow-hidden bg-ivory pt-28 pb-14 md:pt-40 md:pb-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex select-none items-center justify-center"
        >
          <span className="font-display text-[clamp(12rem,30vw,26rem)] leading-none text-parchment/80">
            A
          </span>
        </div>
        <Container className="relative">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <div className="inline-flex items-center gap-3">
                <span className="h-px w-10 bg-gold/50" aria-hidden="true" />
                <p className="label-micro">{t('gallery.heroLabel')}</p>
                <span className="h-px w-10 bg-gold/50" aria-hidden="true" />
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-8 font-display font-medium leading-[1.02] tracking-[-0.02em] text-[clamp(2.9rem,7.5vw,6.5rem)] text-charcoal-light">
                {t('gallery.heroTitle')}
              </h1>
            </Reveal>
            <Reveal delay={0.18}>
              <p className="mx-auto mt-6 max-w-xl text-[1.05rem] leading-[1.8] text-stone">
                {t('gallery.heroIntro')}
              </p>
            </Reveal>
            <Reveal delay={0.26}>
              <div
                className="mx-auto mt-10 flex items-center justify-center gap-4"
                aria-hidden="true"
              >
                <span className="h-px w-16 bg-gold/60" />
                <span className="font-display text-lg italic text-gold-deep">{placeName}</span>
                <span className="h-px w-16 bg-gold/60" />
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* Editorial category index */}
      <section className="border-y border-charcoal/10 bg-ivory">
        <Container>
          <Reveal className="pt-7 pb-6 md:pt-9 md:pb-7">
            <div className="flex items-end justify-between gap-6">
              <p className="inline-flex items-center gap-2.5 text-[10px] uppercase tracking-[0.24em] text-gold-deep">
                <ImageIcon size={13} strokeWidth={1.5} aria-hidden="true" />
                {t('gallery.subtitle')}
              </p>
              <span
                className="hidden font-display text-lg italic text-stone sm:block"
                aria-hidden="true"
              >
                {placeName}
              </span>
            </div>
            <div
              role="group"
              aria-label={t('gallery.filterLabel')}
              className="no-scrollbar -mx-5 mt-4 flex items-center gap-1 overflow-x-auto px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:overflow-visible lg:px-0"
            >
              {CATEGORY_KEYS.map((cat) => (
                <GalleryTab
                  key={cat}
                  label={t(`gallery.categories.${cat}`)}
                  active={activeCategory === cat}
                  onSelect={() => {
                    setActiveCategory(cat)
                    setLightboxIndex(null)
                  }}
                />
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      {/* The photographic sequence */}
      <section className="py-14 md:py-20">
        <Container>
          {lead && second ? (
            <div className="grid gap-5 md:grid-cols-12 md:gap-7">
              <div className="md:col-span-7">
                <GalleryTile image={lead} onOpen={() => openAt(0)} priority delay={0.05} />
              </div>
              <div className="md:col-span-5 md:mt-14 lg:mt-20">
                <GalleryTile image={second} onOpen={() => openAt(1)} delay={0.14} />
              </div>
            </div>
          ) : (
            lead && (
              <div className="mx-auto max-w-lg">
                <GalleryTile image={lead} onOpen={() => openAt(0)} priority delay={0.05} />
              </div>
            )
          )}

          {rest.length > 0 && (
            <div className="mt-5 columns-1 gap-6 md:mt-7 md:columns-2 md:gap-7 xl:columns-3">
              {rest.map((image, i) => (
                <GalleryTile
                  key={image.id}
                  image={image}
                  onOpen={() => openAt(i + 2)}
                  delay={(i % 4) * 0.05}
                />
              ))}
            </div>
          )}
        </Container>
      </section>

      {/* Cinematic closing moment */}
      <section className="relative bg-charcoal">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={gallerySrc(GALLERY_CLOSING_IMAGE, 1920)}
            alt={GALLERY_CLOSING_IMAGE.alt}
            loading="lazy"
            sizes="100vw"
            className="h-full w-full object-cover object-top"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-charcoal/70 via-charcoal/30 to-charcoal/80"
            aria-hidden="true"
          />
        </div>
        <div className="relative mx-auto flex min-h-[72vh] w-full max-w-3xl flex-col items-center justify-center px-6 py-24 text-center">
          <Reveal>
            <p className="text-[10px] uppercase tracking-[0.32em] text-gold-light">
              {t(`gallery.categories.${GALLERY_CLOSING_IMAGE.category}`)}
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-4 font-display text-xl italic leading-snug text-cream/80">
              {t(GALLERY_CLOSING_IMAGE.captionKey)}
            </p>
          </Reveal>
          <Reveal delay={0.16}>
            <h2 className="mt-6 font-display text-3xl font-medium leading-tight text-cream md:text-5xl">
              {t('gallery.closingTitle')}
            </h2>
          </Reveal>
          <Reveal delay={0.22}>
            <p className="mt-4 max-w-xl text-[0.95rem] leading-[1.8] text-cream/75">
              {t('gallery.closingIntro')}
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="mt-9">
              <Button to="/reservations" variant="gold">
                {t('nav.reserveTable')}
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <AnimatePresence>
        {lightboxIndex !== null && filtered[lightboxIndex] && (
          <LightboxDialog
            images={filtered}
            index={lightboxIndex}
            onClose={closeLightbox}
            onNav={(next) => setLightboxIndex(next)}
          />
        )}
      </AnimatePresence>
    </>
  )
}