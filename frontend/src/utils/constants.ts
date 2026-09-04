export const TIME_SLOTS = [
  '12:00', '12:30', '13:00', '13:30',
  '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
] as const

export const TIME_SLOT_GROUPS: { label: string; slots: readonly string[] }[] = [
  { label: 'lunch', slots: ['12:00', '12:30', '13:00', '13:30'] },
  { label: 'dinner', slots: ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30'] },
] as const

export const NAV_LINKS = [
  { labelKey: 'nav.about', path: '/about' },
  { labelKey: 'nav.signatures', path: '/signatures' },
  { labelKey: 'nav.menu', path: '/menu' },
  { labelKey: 'nav.gallery', path: '/gallery' },
  { labelKey: 'nav.visit', path: '/contact' },
] as const

export const IMAGES = {
  hero: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=80',
  intro: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1400&q=80',
  philosophy: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1400&q=80',
  experience: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=1600&q=80',
  chef: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1400&q=80',
  aboutHero: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1600&q=80',
  ingredients: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=1400&q=80',
  visit: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80',
} as const

export const SIGNATURE_DISHES = [
  { name: 'Burrata Pugliese', image: 'https://images.unsplash.com/photo-1621072156002-e2fccdc0b176?auto=format&fit=crop&w=1000&q=80' },
  { name: 'Tagliatelle al Tartufo', image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1000&q=80' },
  { name: 'Branzino al Limone', image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1000&q=80' },
] as const