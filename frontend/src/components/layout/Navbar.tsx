import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, X } from 'lucide-react'
import LanguageSelector from '../LanguageSelector'
import { motion, AnimatePresence } from 'framer-motion'
import { useRestaurant } from '../../contexts/RestaurantContext'
import { NAV_LINKS } from '../../utils/constants'

export default function Navbar() {
  const { t } = useTranslation()
  const { restaurant } = useRestaurant()
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isHome = location.pathname === '/'
  const navBg = scrolled || !isHome
    ? 'bg-charcoal/95 backdrop-blur-md shadow-lg'
    : 'bg-transparent'

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${navBg}`}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="font-display text-2xl font-semibold text-gold tracking-wide">
            {restaurant?.name ?? ''}
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((link) => {
              const navKey = link.path === '/' ? 'home' : link.path.slice(1)
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm uppercase tracking-wider transition-colors ${
                    location.pathname === link.path
                      ? 'text-gold'
                      : 'text-cream/80 hover:text-cream'
                  }`}
                >
                  {t(`nav.${navKey}`)}
                </Link>
              )
            })}
            <LanguageSelector />
            <Link to="/reservations" className="btn-gold text-xs py-2.5 px-5">
              {t('nav.reserveTable')}
            </Link>
          </div>

          <div className="flex items-center gap-3 lg:hidden">
            <LanguageSelector />
            <button
              type="button"
              className="text-cream p-2"
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
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-charcoal border-t border-charcoal-light/30 overflow-hidden"
          >
            <div className="px-4 py-6 space-y-1">
              {NAV_LINKS.map((link) => {
                const navKey = link.path === '/' ? 'home' : link.path.slice(1)
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`block py-3 text-sm uppercase tracking-wider ${
                      location.pathname === link.path ? 'text-gold' : 'text-cream/80'
                    }`}
                  >
                    {t(`nav.${navKey}`)}
                  </Link>
                )
              })}
              <Link to="/reservations" className="btn-gold w-full mt-4 text-center">
                {t('nav.reserveTable')}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
