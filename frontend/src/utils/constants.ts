export const TIME_SLOTS = [
  '12:00', '12:30', '13:00', '13:30',
  '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
] as const

export const NAV_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'Menu', path: '/menu' },
  { label: 'About', path: '/about' },
  { label: 'Gallery', path: '/gallery' },
  { label: 'Reservations', path: '/reservations' },
  { label: 'Contact', path: '/contact' },
] as const

export const IMAGES = {
  hero: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=80',
  intro: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
  philosophy: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80',
  experience: 'https://images.unsplash.com/photo-1552566626-aa0b0a0b0b0b?w=800&q=80',
  chef: 'https://images.unsplash.com/photo-1577210060566-8e0b4e4a6a6a?w=800&q=80',
  aboutHero: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80',
  ingredients: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&q=80',
} as const

export const SIGNATURE_DISHES = [
  { name: 'Burrata Pugliese', image: 'https://images.unsplash.com/photo-1608897010299-5840464779?w=600&q=80' },
  { name: 'Tagliatelle al Tartufo', image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d89a?w=600&q=80' },
  { name: 'Branzino al Limone', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b4a2?w=600&q=80' },
] as const

export const GALLERY_IMAGES = [
  { id: '1', src: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80', alt: 'Elegant dining room at Casa Aurelia', category: 'interior' as const },
  { id: '2', src: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', alt: 'Artfully plated pasta dish', category: 'food' as const },
  { id: '3', src: 'https://images.unsplash.com/photo-1577210060566-8e0b4e4a6a6a?w=800&q=80', alt: 'Chef preparing fresh ingredients', category: 'chef' as const },
  { id: '4', src: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80', alt: 'Wine selection and bar area', category: 'interior' as const },
  { id: '5', src: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b4a2?w=800&q=80', alt: 'Grilled sea bass with lemon', category: 'food' as const },
  { id: '6', src: 'https://images.unsplash.com/photo-1552566626-aa0b0a0b0b0b?w=800&q=80', alt: 'Private dining event setup', category: 'events' as const },
  { id: '7', src: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&q=80', alt: 'Fresh seasonal ingredients', category: 'food' as const },
  { id: '8', src: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80', alt: 'Restaurant terrace at sunset', category: 'events' as const },
  { id: '9', src: 'https://images.unsplash.com/photo-1608897010299-5840464779?w=800&q=80', alt: 'Burrata with heirloom tomatoes', category: 'food' as const },
  { id: '10', src: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80', alt: 'Warm ambient interior lighting', category: 'interior' as const },
  { id: '11', src: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d89a?w=800&q=80', alt: 'Handmade tagliatelle with truffle', category: 'food' as const },
  { id: '12', src: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&q=80', alt: 'Wine tasting evening event', category: 'events' as const },
] as const
