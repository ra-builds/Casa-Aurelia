import { useTranslation } from 'react-i18next'
import Button from '../ui/Button'
import SectionHeading from '../ui/SectionHeading'
import { IMAGES } from '../../utils/constants'

export default function ExperienceSection() {
  const { t } = useTranslation()

  return (
    <section className="relative py-20 md:py-28">
      <div
        className="absolute inset-0 bg-cover bg-center md:bg-fixed"
        style={{ backgroundImage: `url(${IMAGES.experience})` }}
      />
      <div className="absolute inset-0 bg-charcoal/80" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <SectionHeading
          title={t('home.experience.title')}
          subtitle={t('home.experience.subtitle')}
          light
        />
        <p className="mt-6 text-cream/80 max-w-2xl mx-auto leading-relaxed">
          {t('home.experience.paragraph')}
        </p>
        <div className="mt-10">
          <Button to="/gallery" variant="gold">{t('home.experience.viewGallery')}</Button>
        </div>
      </div>
    </section>
  )
}
