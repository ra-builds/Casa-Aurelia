import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SectionHeading from '../ui/SectionHeading'
import { IMAGES } from '../../utils/constants'

export default function RestaurantIntroSection() {
  const { t } = useTranslation()

  return (
    <section className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <SectionHeading
              title={t('home.intro.title')}
              subtitle={t('home.intro.subtitle')}
              centered={false}
            />
            <p className="mt-6 text-stone leading-relaxed">
              {t('home.intro.paragraph1')}
            </p>
            <p className="mt-4 text-stone leading-relaxed">
              {t('home.intro.paragraph2')}
            </p>
            <Link
              to="/about"
              className="inline-block mt-8 text-wine font-medium text-sm uppercase tracking-wider hover:text-wine-dark transition-colors"
            >
              {t('home.intro.ourStory')}
            </Link>
          </div>
          <div className="relative">
            <img
              src={IMAGES.intro}
              alt={t('home.intro.imageAlt')}
              className="w-full h-[400px] md:h-[500px] object-cover shadow-xl"
              loading="lazy"
            />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 border-2 border-gold hidden md:block" />
          </div>
        </div>
      </div>
    </section>
  )
}
