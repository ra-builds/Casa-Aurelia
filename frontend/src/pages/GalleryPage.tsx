import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import SectionHeading from '../components/ui/SectionHeading'
import { usePageTitle, useMetaDescription } from '../hooks/usePageTitle'
import { GALLERY_IMAGES } from '../utils/constants'
import type { GalleryImage } from '../types'

const CATEGORY_KEYS = ['all', 'food', 'interior', 'chef', 'events'] as const

export default function GalleryPage() {
  const { t } = useTranslation()
  usePageTitle('pageTitles.gallery')
  useMetaDescription('meta.gallery')

  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null)

  const filtered =
    activeCategory === 'all'
      ? GALLERY_IMAGES
      : GALLERY_IMAGES.filter((img) => img.category === activeCategory)

  return (
    <>
      <section className="pt-32 pb-16 bg-charcoal text-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <SectionHeading title={t('gallery.title')} subtitle={t('gallery.subtitle')} light />
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {CATEGORY_KEYS.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 text-sm uppercase tracking-wider transition-colors ${
                  activeCategory === cat
                    ? 'bg-wine text-cream'
                    : 'bg-cream-dark text-stone hover:text-charcoal-light'
                }`}
              >
                {t(`gallery.categories.${cat}`)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((image, i) => (
              <motion.button
                key={image.id}
                type="button"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setLightboxImage(image)}
                className="relative aspect-[4/3] overflow-hidden group cursor-pointer"
                aria-label={t('gallery.viewImage', { alt: image.alt })}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/30 transition-colors" />
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-charcoal/95 flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
            role="dialog"
            aria-label={t('gallery.lightbox.ariaLabel')}
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-6 right-6 text-cream hover:text-gold transition-colors"
              aria-label={t('gallery.lightbox.closeLabel')}
            >
              <X size={32} />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={lightboxImage.src}
              alt={lightboxImage.alt}
              className="max-w-full max-h-[85vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
