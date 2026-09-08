import { useTranslation } from 'react-i18next'
import Container from '../ui/Container'
import Reveal from '../ui/Reveal'
import { Star } from 'lucide-react'

const TESTIMONIAL_KEYS = ['elena', 'marco', 'sophie'] as const

export default function TestimonialsSection() {
  const { t } = useTranslation()

  return (
    <section className="py-24 md:py-36">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <p className="label-micro">{t('home.testimonials.subtitle')}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="headline-section mt-4">{t('home.testimonials.title')}</h2>
          </Reveal>
        </div>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {TESTIMONIAL_KEYS.map((key, i) => {
            const rating = Number(t(`home.testimonials.items.${key}.rating`))
            return (
              <Reveal key={key} delay={i * 0.12}>
                <figure className="card flex h-full flex-col p-9">
                  <div className="flex gap-1" aria-hidden="true">
                    {Array.from({ length: rating }).map((_, s) => (
                      <Star key={s} size={15} className="fill-gold text-gold" />
                    ))}
                  </div>
                  <span className="sr-only">{t('home.testimonials.rating', { rating })}</span>
                  <blockquote className="mt-6 flex-1">
                    <p className="font-display text-lg italic leading-relaxed text-stone">
                      &ldquo;{t(`home.testimonials.items.${key}.text`)}&rdquo;
                    </p>
                  </blockquote>
                  <figcaption className="mt-7 border-t border-charcoal/10 pt-6 text-[11px] font-medium uppercase tracking-[0.2em] text-stone">
                    {t(`home.testimonials.items.${key}.name`)}
                  </figcaption>
                </figure>
              </Reveal>
            )
          })}
        </div>
      </Container>
    </section>
  )
}