import { useTranslation } from 'react-i18next'
import Button from '../ui/Button'
import Container from '../ui/Container'
import Reveal from '../ui/Reveal'
import MenuImage from '../ui/MenuImage'
import { SIGNATURE_DISHES } from '../../utils/constants'

export default function SignatureDishesSection() {
  const { t } = useTranslation()

  return (
    <section className="bg-cream-dark py-24 md:py-36">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <p className="label-micro">{t('home.signatureDishes.subtitle')}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="headline-section mt-4">{t('home.signatureDishes.title')}</h2>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
          {SIGNATURE_DISHES.map((dish, i) => (
            <Reveal key={dish.name} delay={i * 0.12} className="group text-center">
              <MenuImage
                src={dish.image}
                alt={dish.name}
                aspect="aspect-[3/4]"
                className="transition-transform duration-700 motion-safe:group-hover:scale-[1.03]"
              />
              <h3 className="mt-7 font-display text-2xl font-medium text-charcoal-light">
                {dish.name}
              </h3>
              <span className="mx-auto mt-4 block h-px w-10 bg-gold/60" aria-hidden="true" />
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1} className="mt-16 text-center">
          <Button to="/menu" variant="primary">{t('home.signatureDishes.exploreMenu')}</Button>
        </Reveal>
      </Container>
    </section>
  )
}