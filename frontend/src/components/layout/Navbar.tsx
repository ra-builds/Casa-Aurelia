import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X, ArrowRight } from 'lucide-react'
import LanguageSelector from '../LanguageSelector'
import { motion, AnimatePresence } from 'framer-motion'
import { useRestaurant } from '../../contexts/RestaurantContext'
import { SITE_CONFIG } from '../../config/site'
import { NAV_LINKS } from '../../utils/constants'

const EASE = [0.22, 1, 0.36, 1] as const

const DARK_TOP_ROUTES = new Set([
  '/', '/menu', '/about', '/signatures', '/gallery', '/reservations', '/contact',
])

export default function Navbar() {
  const { t } = useTranslation()
  const { restaurant } = useRestaurant()
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  const darkTop = DARK_TOP_ROUTES.has(location.pathname)
  const solid = scrolled || !darkTop

  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const solidText = solid ? 'text-charcoal hover:text-wine' : 'text-cream/85 hover:text-cream'
  const activeText = solid ? 'text-wine' : 'text-gold-light'
  const markText = solid ? 'text-charcoal' : 'text-cream'
  const barColor = solid ? 'bg-ivory/95 backdrop-blur-md border-b border-charcoal/10 shadow-card' : 'bg-transparent'

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${barColor}`}>
      <nav className="container-site" aria-label={t('nav.mainNavigation')}>
        <div className="flex items-center justify-between py-4 md:py-5">
          <Link
            to="/"
            className={`group flex flex-col items-start rounded-sm transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${markText}`}
          >
            <span className="font-display text-[1.35rem] font-semibold leading-none tracking-[0.18em] uppercase sm:text-[1.6rem]">
              {restaurant?.name ?? ''}
            </span>
            {restaurant?.city && (
              <span className={`mt-1.5 text-[10px] font-medium uppercase tracking-[0.32em] ${solid ? 'text-stone' : 'text-gold-light'}`}>
                {SITE_CONFIG.businessTypeLabel} · {restaurant.city}
              </span>
            )}
          </Link>

          <div className="hidden xl:flex items-center gap-9">
            {NAV_LINKS.map((link) => {
              const active = location.pathname === link.path
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative py-1.5 text-[11px] font-medium uppercase tracking-[0.26em] transition-colors duration-300 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                    active ? activeText : solidText
                  }`}
                >
                  {t(link.labelKey)}
                  <span
                    className={`absolute -bottom-0.5 left-0 right-0 h-px bg-current transition-transform duration-500 origin-left ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                    }`}
                  />
                </Link>
              )
            })}
            <LanguageSelector tone={solid ? 'charcoal' : 'cream'} />
            <Link to="/reservations" className="btn-gold !px-6 !py-3">
              {t('nav.reserveTable')}
            </Link>
          </div>

          <div className="flex items-center gap-4 xl:hidden">
            <LanguageSelector tone={solid ? 'charcoal' : 'cream'} />
            <button
              type="button"
              className={`p-2.5 rounded-sm transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${markText}`}
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              aria-expanded={isOpen}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="xl:hidden fixed inset-0 z-50 flex flex-col bg-charcoal text-cream"
          >
            <div className="container-site flex items-center justify-between py-4 md:py-5">
              <span className="font-display text-[1.35rem] font-semibold leading-none tracking-[0.18em] uppercase text-cream">
                {restaurant?.name ?? ''}
              </span>
              <button
                type="button"
                className="p-2.5 rounded-sm text-cream transition-colors hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                onClick={() => setIsOpen(false)}
                aria-label={t('nav.closeMenu')}
              >
                <X size={24} />
              </button>
            </div>

            <motion.nav
              className="container-site flex flex-1 flex-col justify-center"
              aria-label={t('nav.mainNavigation')}
            >
              <ul className="space-y-1">
                {NAV_LINKS.map((link, index) => {
                  const active = location.pathname === link.path
                  return (
                    <motion.li
                      key={link.path}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.06 * index + 0.1, duration: 0.5, ease: EASE }}
                    >
                      <Link
                        to={link.path}
                        aria-current={active ? 'page' : undefined}
                        className={`group flex items-baseline gap-4 py-2.5 font-display text-3xl font-medium tracking-wide transition-colors duration-300 sm:text-4xl rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                          active ? 'text-gold-light' : 'text-cream/90 hover:text-gold-light'
                        }`}
                      >
                        <span className="text-xs font-body tracking-[0.3em] text-stone-light group-hover:text-gold-light transition-colors">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        {t(link.labelKey)}
                      </Link>
                    </motion.li>
                  )
                })}
              </ul>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.5, ease: EASE }}
                className="mt-12 border-t border-cream/15 pt-10"
              >
                <Link to="/reservations" className="btn-gold w-full justify-between sm:w-auto sm:px-10">
                  {t('nav.reserveTable')}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </motion.div>
            </motion.nav>

            <div className="container-site pb-10">
              <p className={`label-micro-muted ${solid ? '' : ''}`}>
                {restaurant ? `${restaurant.city}, ${restaurant.country}` : ''}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}