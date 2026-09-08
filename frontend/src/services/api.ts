import type {
  AuthUser,
  AvailabilityResponse,
  CategoryInput,
  Closure,
  ClosureInput,
  ContactFormData,
  ContactMessage,
  ContactSubmitResponse,
  MenuItem,
  MenuItemInput,
  MenuCategory,
  MenuResponse,
  PaginatedReservations,
  Reservation,
  ReservationFormData,
  ReservationStats,
  Restaurant,
  RestaurantUpdate,
} from '../types'
import { apiRequest } from '../utils/helpers'
import { setAccessToken } from '../utils/authToken'

export const restaurantApi = {
  getRestaurant: () => apiRequest<Restaurant>('/api/restaurant'),
}

export const adminRestaurantApi = {
  get: () => apiRequest<Restaurant>('/api/admin/restaurant'),
  update: (data: RestaurantUpdate) =>
    apiRequest<Restaurant>('/api/admin/restaurant', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}

export const menuApi = {
  getMenu: () => apiRequest<MenuResponse>('/api/menu'),
}

export const adminMenuApi = {
  getAll: () => apiRequest<MenuResponse>('/api/admin/menu'),
  getAllergens: () => apiRequest<{ code: string; name: string }[]>('/api/admin/menu/allergens'),
  create: (data: MenuItemInput) =>
    apiRequest<MenuItem>('/api/admin/menu', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<MenuItemInput>) =>
    apiRequest<MenuItem>(`/api/admin/menu/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiRequest<void>(`/api/admin/menu/${id}`, { method: 'DELETE' }),
  uploadImage: (id: number, file: File) => {
    const data = new FormData()
    data.append('image', file)
    return apiRequest<MenuItem>(`/api/admin/menu/${id}/image`, {
      method: 'POST',
      body: data,
    })
  },
  removeImage: (id: number) =>
    apiRequest<MenuItem>(`/api/admin/menu/${id}/image`, { method: 'DELETE' }),
}

export const adminCategoryApi = {
  getAll: () => apiRequest<MenuCategory[]>('/api/admin/menu/categories'),
  create: (data: CategoryInput) =>
    apiRequest<MenuCategory>('/api/admin/menu/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<CategoryInput>) =>
    apiRequest<MenuCategory>(`/api/admin/menu/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiRequest<void>(`/api/admin/menu/categories/${id}`, { method: 'DELETE' }),
}

export const reservationApi = {
  checkAvailability: (date: string, time: string, guests: number) =>
    apiRequest<AvailabilityResponse>(
      `/api/reservations/availability?date=${date}&time=${time}&guests=${guests}`,
    ),

  create: (data: ReservationFormData) =>
    apiRequest<Reservation>('/api/reservations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAll: (params?: { search?: string; status?: string; date?: string; page?: number; page_size?: number }) => {
    const query = new URLSearchParams()
    if (params?.search) query.set('search', params.search)
    if (params?.status) query.set('status', params.status)
    if (params?.date) query.set('date', params.date)
    if (params?.page) query.set('page', String(params.page))
    if (params?.page_size) query.set('page_size', String(params.page_size))
    const qs = query.toString()
    return apiRequest<PaginatedReservations>(`/api/reservations${qs ? `?${qs}` : ''}`)
  },

  getStats: () => apiRequest<ReservationStats>('/api/reservations/stats'),

  update: (id: number, data: { status?: string }) =>
    apiRequest<Reservation>(`/api/reservations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiRequest<void>(`/api/reservations/${id}`, { method: 'DELETE' }),

  lookup: (reference_code: string, email: string) =>
    apiRequest<Reservation>('/api/reservations/lookup', {
      method: 'POST',
      body: JSON.stringify({ reference_code, email }),
    }),

  customerCancel: (reference_code: string, email: string) =>
    apiRequest<Reservation>('/api/reservations/customer/cancel', {
      method: 'POST',
      body: JSON.stringify({ reference_code, email }),
    }),
}

export const authApi = {
  login: async (email: string, password: string) => {
    const data = await apiRequest<{ access_token: string; token_type: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setAccessToken(data.access_token)
    return data
  },
  // Restores a session on page load by exchanging the HttpOnly refresh cookie
  // for a fresh in-memory access token.
  refresh: async () => {
    const data = await apiRequest<{ access_token: string; token_type: string }>('/api/auth/refresh', {
      method: 'POST',
    })
    setAccessToken(data.access_token)
    return data
  },
  logout: () => apiRequest<void>('/api/auth/logout', { method: 'POST' }),
  me: () => apiRequest<AuthUser>('/api/auth/me'),
}

export const healthApi = {
  check: () => apiRequest<{ status: string }>('/api/health'),
}

export const contactApi = {
  submit: (data: ContactFormData) =>
    apiRequest<ContactSubmitResponse>('/api/contact', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

export const adminMessageApi = {
  getAll: () => apiRequest<ContactMessage[]>('/api/contact/messages'),
}

export const closureApi = {
  getAll: () => apiRequest<Closure[]>('/api/closures'),
}

export const adminClosureApi = {
  getAll: () => apiRequest<Closure[]>('/api/admin/closures'),
  create: (data: ClosureInput) =>
    apiRequest<Closure>('/api/admin/closures', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    apiRequest<void>(`/api/admin/closures/${id}`, { method: 'DELETE' }),
}
