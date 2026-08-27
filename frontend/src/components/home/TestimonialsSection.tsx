import { useTranslation } from 'react-i18next'
import SectionHeading from '../ui/SectionHeading'
import { Star } from 'lucide-react'

const TESTIMONIAL_KEYS = ['elena', 'marco', 'sophie'] as const

export default function TestimonialsSection() {
  const { t } = useTranslation()

  return (
    <section className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading title={t('home.testimonials.title')} subtitle={t('home.testimonials.subtitle')} />
        <div className="mt-14 grid md:grid-cols-3 gap-8">
          {TESTIMONIAL_KEYS.map((key) => {
            const rating = Number(t(`home.testimonials.items.${key}.rating`))
            return (
              <blockquote key={key} className="card p-8">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: rating }).map((_, i) => (
                    <Star key={i} size={16} className="fill-gold text-gold" aria-hidden="true" />
                  ))}
                  <span className="sr-only">{t('home.testimonials.rating', { rating })}</span>
                </div>
                <p className="text-stone italic leading-relaxed">&ldquo;{t(`home.testimonials.items.${key}.text`)}&rdquo;</p>
                <footer className="mt-6 text-sm font-medium text-charcoal-light">
                  — {t(`home.testimonials.items.${key}.name`)}
                </footer>
              </blockquote>
            )
          })}
        </div>
      </div>
    </section>
  )
}
