import { usePageSeo } from '../hooks/usePageTitle'
import { MotionConfig } from 'framer-motion'
import { useRestaurant } from '../contexts/RestaurantContext'
import HeroSection from '../components/home/HeroSection'
import RestaurantIntroSection from '../components/home/RestaurantIntroSection'
import SignatureDishesSection from '../components/home/SignatureDishesSection'
import StorySection from '../components/home/StorySection'
import PhilosophySection from '../components/home/PhilosophySection'
import ExperienceSection from '../components/home/ExperienceSection'
import TestimonialsSection from '../components/home/TestimonialsSection'
import HoursLocationSection from '../components/home/HoursLocationSection'
import ReservationCtaSection from '../components/home/ReservationCtaSection'

export default function HomePage() {
  const { restaurant } = useRestaurant()
  usePageSeo({ titleKey: '', descriptionKey: 'meta.home' })

  return (
    <MotionConfig reducedMotion="user">
      <HeroSection restaurant={restaurant} />
      <RestaurantIntroSection />
      <SignatureDishesSection />
      <StorySection />
      <PhilosophySection />
      <ExperienceSection />
      <TestimonialsSection />
      <HoursLocationSection restaurant={restaurant} />
      <ReservationCtaSection />
    </MotionConfig>
  )
}
