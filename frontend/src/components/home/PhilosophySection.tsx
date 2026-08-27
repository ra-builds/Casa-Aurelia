import { useTranslation } from 'react-i18next'
import SectionHeading from '../ui/SectionHeading'
import { IMAGES } from '../../utils/constants'

export default function PhilosophySection() {
  const { t } = useTranslation()

  return (
    <section className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <img
            src={IMAGES.philosophy}
            alt={t('home.philosophy.imageAlt')}
            className="w-full h-[450px] object-cover order-2 lg:order-1"
            loading="lazy"
          />
          <div className="order-1 lg:order-2">
            <SectionHeading title={t('home.philosophy.title')} subtitle={t('home.philosophy.subtitle')} centered={false} />
            <p className="mt-6 text-stone leading-relaxed">
              {t('home.philosophy.paragraph1')}
            </p>
            <p className="mt-4 text-stone leading-relaxed">
              {t('home.philosophy.paragraph2')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
