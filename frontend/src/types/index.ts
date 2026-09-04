export interface MenuCategory {
  id: number
  name: string
  slug: string
  sort_order: number
}

export interface CategoryInput {
  name: string
  slug: string | null
  sort_order: number
}

export interface Allergen {
  code: string
  name: string
}

export interface MenuItem {
  id: number
  category_id: number
  name: string
  description: string
  price: number
  dietary_info: string | null
  image_url: string | null
  is_featured: boolean
  is_available: boolean
  sort_order: number
  category?: MenuCategory
  allergens?: Allergen[]
}

export interface MenuItemInput {
  name: string
  description: string
  price: number
  category_id: number
  dietary_info: string | null
  is_available: boolean
  is_featured: boolean
  sort_order: number
  allergen_codes: string[]
}

export interface MenuResponse {
  categories: MenuCategory[]
  items: MenuItem[]
}

export interface ReservationFormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  reservation_date: string
  reservation_time: string
  guests: number
  special_requests?: string
}

export interface Reservation {
  id: number
  reference_code: string
  first_name: string
  last_name: string
  email: string
  phone: string
  reservation_date: string
  reservation_time: string
  guests: number
  special_requests: string | null
  status: 'pending' | 'confirmed' | 'cancelled'
  created_at: string
  updated_at: string
  email_sent?: boolean
  email_reason?: string | null
}

export interface ContactFormData {
  name: string
  email: string
  subject: string
  message: string
}

export interface ContactSubmitResponse {
  id: number
  stored: boolean
  email_sent: boolean
}

export interface AvailabilityResponse {
  available: boolean
  remaining_capacity: number
  message: string
}

export interface ReservationStats {
  total: number
  today_count: number
  today_guests: number
  upcoming: number
  pending: number
  confirmed: number
  cancelled: number
}

export interface PaginatedReservations {
  items: Reservation[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface AuthUser {
  id: number
  email: string
  full_name: string
}

export interface Closure {
  id: number
  closure_date: string
  reason: string | null
  created_at: string
}

export interface ClosureInput {
  closure_date: string
  reason?: string | null
}

export interface ApiError {
  detail: string | { msg: string }[]
}

export interface GalleryImage {
  id: string
  src: string
  alt: string
  category: 'food' | 'interior' | 'chef' | 'events'
}

export interface SocialLinks {
  instagram: string | null
  facebook: string | null
  tripadvisor: string | null
}

export interface Restaurant {
  id: number
  name: string
  tagline: string | null
  address: string
  city: string
  country: string
  phone: string
  email: string
  currency: string
  lunch_hours: string
  dinner_hours: string
  closed_day: string
  capacity: number
  social_links: SocialLinks | null
  logo_url: string | null
}
