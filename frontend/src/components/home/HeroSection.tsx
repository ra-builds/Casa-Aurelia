import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import Button from '../ui/Button'
import { IMAGES } from '../../utils/constants'
import type { Restaurant } from '../../types'

const EASE = [0.22, 1, 0.36, 1] as const

interface Props {
  restaurant: Restaurant | null
}

export default function HeroSection({ restaurant }: Props) {
  const { t } = useTranslation()

  const city = restaurant?.city ?? ''
  const country = restaurant?.country ?? ''

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-charcoal">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${IMAGES.hero})` }}
        role="img"
        aria-label={t('home.hero.ariaLabel')}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal/70 via-charcoal/55 to-charcoal/90" />

      <div className="relative z-10 px-5 pb-28 pt-32 text-center sm:px-8 lg:px-14">
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="label-micro-light mb-8"
        >
          {t('home.hero.label', { city, country })}
        </motion.p>

        <h1 className="headline-hero text-cream">
          <motion.span
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.15, ease: EASE }}
            className="block"
          >
            {t('home.hero.headline1')}
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: EASE }}
            className="block italic text-gold-light"
          >
            {t('home.hero.headline2')}
          </motion.span>
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.55, ease: EASE }}
          className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Button to="/reservations" variant="gold">{t('home.bookTable')}</Button>
          <Button to="/menu" variant="secondaryLight">{t('home.viewMenu')}</Button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.1 }}
        aria-hidden="true"
        className="absolute bottom-7 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-cream/70"
      >
        <span className="text-[10px] uppercase tracking-[0.3em]">{t('home.hero.scroll')}</span>
        <ChevronDown size={18} className="animate-bounce" />
      </motion.div>
    </section>
  )
}