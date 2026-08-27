import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, ChevronDown } from 'lucide-react'
import { SUPPORTED_LANGUAGES } from '../i18n'

const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  en: 'English',
  it: 'Italiano',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
}

export default function LanguageSelector() {
  const { i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const currentLang = i18n.language

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleLanguageChange = useCallback(
    (lng: string) => {
      i18n.changeLanguage(lng)
      close()
      buttonRef.current?.focus()
    },
    [i18n, close],
  )

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, close])

  const handleButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsOpen(true)
      requestAnimationFrame(() => {
        const selected = listRef.current?.querySelector('[aria-selected="true"]')
        ;(selected as HTMLElement)?.focus()
      })
    }
  }

  const handleOptionKeyDown = (
    e: React.KeyboardEvent,
    lng: string,
    index: number,
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleLanguageChange(lng)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const options = listRef.current?.querySelectorAll('[role="option"]')
      const next = options?.[(index + 1) % options.length] as HTMLElement
      next?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const options = listRef.current?.querySelectorAll('[role="option"]')
      const prev = options?.[(index - 1 + options.length) % options.length] as HTMLElement
      prev?.focus()
    } else if (e.key === 'Tab') {
      close()
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleButtonKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select language"
        className="flex items-center gap-1.5 text-sm text-cream/80 hover:text-cream transition-colors py-1"
      >
        <Globe size={16} aria-hidden="true" />
        <span className="uppercase tracking-wider">
          {currentLang}
        </span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label="Available languages"
          className="absolute right-0 mt-2 w-40 bg-charcoal border border-charcoal-light/30 shadow-lg z-50 py-1"
        >
          {SUPPORTED_LANGUAGES.map((lng, index) => (
            <li
              key={lng}
              role="option"
              aria-selected={lng === currentLang}
              tabIndex={-1}
              onClick={() => handleLanguageChange(lng)}
              onKeyDown={(e) => handleOptionKeyDown(e, lng, index)}
              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors outline-none ${
                lng === currentLang
                  ? 'text-gold bg-charcoal-light/50'
                  : 'text-cream/80 hover:text-cream hover:bg-charcoal-light/30'
              }`}
            >
              {LANGUAGE_DISPLAY_NAMES[lng]}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
