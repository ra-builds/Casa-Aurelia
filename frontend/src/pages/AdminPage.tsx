import { useState, useEffect, type FormEvent, type ElementType } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Calendar,
  Users,
  Clock,
  Search,
  LogOut,
  CheckCircle,
  XCircle,
  Trash2,
} from 'lucide-react'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorMessage from '../components/ui/ErrorMessage'
import MenuManager from '../components/admin/MenuManager'
import CategoryManager from '../components/admin/CategoryManager'
import { useAuth } from '../hooks/useAuth'
import { usePageTitle } from '../hooks/usePageTitle'
import { reservationApi } from '../services/api'
import { formatDate } from '../utils/helpers'
import type { Reservation, ReservationStats } from '../types'

function LoginForm() {
  const { login } = useAuth()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="card p-8 md:p-10 w-full max-w-md">
        <h1 className="font-display text-3xl font-semibold text-center mb-2">{t('admin.loginTitle')}</h1>
        <p className="text-stone text-sm text-center mb-8">{t('admin.loginSubtitle')}</p>
        {error && <div className="mb-4"><ErrorMessage message={error} /></div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="admin-email" className="label-field">{t('admin.email')}</label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="label-field">{t('admin.password')}</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? t('admin.signingIn') : t('admin.signIn')}
          </button>
        </form>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: ElementType }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-stone text-xs uppercase tracking-wider">{label}</p>
          <p className="font-display text-3xl font-semibold mt-1">{value}</p>
        </div>
        <Icon className="text-wine/40" size={28} />
      </div>
    </div>
  )
}

function Dashboard() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const [tab, setTab] = useState<'reservations' | 'menu'>('reservations')
  const [menuTab, setMenuTab] = useState<'categories' | 'items'>('items')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [stats, setStats] = useState<ReservationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const PAGE_SIZE = 20

  const loadData = async (currentPage: number) => {
    setLoading(true)
    setError('')
    try {
      const [resData, statsData] = await Promise.all([
        reservationApi.getAll({
          search: search || undefined,
          status: statusFilter || undefined,
          date: dateFilter || undefined,
          page: currentPage,
          page_size: PAGE_SIZE,
        }),
        reservationApi.getStats(),
      ])
      setReservations(resData.items)
      setTotalPages(resData.total_pages)
      setTotal(resData.total)
      setStats(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.loadDataFailed'))
    } finally {
      setLoading(false)
    }
  }

  const prevFilters = `${search}|${statusFilter}|${dateFilter}`
  const [prevFiltersKey, setPrevFiltersKey] = useState(prevFilters)

  useEffect(() => {
    if (prevFilters !== prevFiltersKey) {
      setPrevFiltersKey(prevFilters)
      setPage(1)
    } else {
      loadData(page)
    }
  }, [page, prevFilters, prevFiltersKey])

  const handleStatusUpdate = async (id: number, status: string) => {
    setActionLoading(id)
    try {
      await reservationApi.update(id, { status })
      await loadData(page)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.actionFailed'))
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('admin.deleteConfirm'))) return
    setActionLoading(id)
    try {
      await reservationApi.delete(id)
      await loadData(page)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.deleteFailed'))
    } finally {
      setActionLoading(null)
    }
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-charcoal text-cream py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold">{t('admin.dashboardTitle')}</h1>
            <p className="text-stone-light text-xs mt-0.5">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 text-sm text-stone-light hover:text-cream transition-colors"
          >
            <LogOut size={16} />
            {t('admin.logout')}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {error && <div className="mb-6"><ErrorMessage message={error} /></div>}

        <div className="flex gap-1 mb-8 border-b border-cream-dark" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'reservations'}
            onClick={() => setTab('reservations')}
            className={`px-5 py-3 text-sm uppercase tracking-wider transition-colors border-b-2 -mb-px ${
              tab === 'reservations' ? 'border-wine text-wine font-medium' : 'border-transparent text-stone hover:text-charcoal-light'
            }`}
          >
            {t('admin.tab.reservations')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'menu'}
            onClick={() => setTab('menu')}
            className={`px-5 py-3 text-sm uppercase tracking-wider transition-colors border-b-2 -mb-px ${
              tab === 'menu' ? 'border-wine text-wine font-medium' : 'border-transparent text-stone hover:text-charcoal-light'
            }`}
          >
            {t('admin.tab.menu')}
          </button>
        </div>

        {tab === 'menu' && (
          <div>
            <div className="flex gap-4 mb-6" role="tablist" aria-label={t('admin.tab.menu')}>
              {(['categories', 'items'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={menuTab === key}
                  onClick={() => setMenuTab(key)}
                  className={`px-4 py-2 text-sm uppercase tracking-wider transition-colors border-b-2 -mb-px ${
                    menuTab === key
                      ? 'border-gold text-charcoal font-medium'
                      : 'border-transparent text-stone hover:text-charcoal-light'
                  }`}
                >
                  {key === 'categories' ? t('admin.menu.categories') : t('admin.tab.items')}
                </button>
              ))}
            </div>
            {menuTab === 'categories' ? <CategoryManager /> : <MenuManager />}
          </div>
        )}

        {tab === 'reservations' && (
          <>
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label={t('admin.stats.totalReservations')} value={stats.total} icon={Calendar} />
            <StatCard label={t('admin.stats.today')} value={stats.today_count} icon={Clock} />
            <StatCard label={t('admin.stats.guestsToday')} value={stats.today_guests} icon={Users} />
            <StatCard label={t('admin.stats.upcoming')} value={stats.upcoming} icon={Calendar} />
          </div>
        )}

        {stats && (
          <div className="flex flex-wrap gap-4 mb-8 text-sm">
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">
              {t('admin.status.pending')}: {stats.pending}
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full">
              {t('admin.status.confirmed')}: {stats.confirmed}
            </span>
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full">
              {t('admin.status.cancelled')}: {stats.cancelled}
            </span>
          </div>
        )}

        <div className="card p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
              <input
                type="text"
                placeholder={t('admin.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field sm:w-40"
            >
              <option value="">{t('admin.status.allStatuses')}</option>
              <option value="pending">{t('admin.status.pending')}</option>
              <option value="confirmed">{t('admin.status.confirmed')}</option>
              <option value="cancelled">{t('admin.status.cancelled')}</option>
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="input-field sm:w-44"
            />
          </div>
        </div>

        {loading ? (
          <LoadingSpinner className="py-20" />
        ) : reservations.length === 0 ? (
          <div className="card p-12 text-center text-stone">
            {t('admin.empty')}
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-dark text-left">
                  <th className="p-4 font-medium text-stone uppercase text-xs tracking-wider">{t('admin.table.customer')}</th>
                  <th className="p-4 font-medium text-stone uppercase text-xs tracking-wider">{t('admin.table.date')}</th>
                  <th className="p-4 font-medium text-stone uppercase text-xs tracking-wider">{t('admin.table.time')}</th>
                  <th className="p-4 font-medium text-stone uppercase text-xs tracking-wider">{t('admin.table.guests')}</th>
                  <th className="p-4 font-medium text-stone uppercase text-xs tracking-wider hidden md:table-cell">{t('admin.table.phone')}</th>
                  <th className="p-4 font-medium text-stone uppercase text-xs tracking-wider">{t('admin.table.status')}</th>
                  <th className="p-4 font-medium text-stone uppercase text-xs tracking-wider hidden lg:table-cell">{t('admin.table.requests')}</th>
                  <th className="p-4 font-medium text-stone uppercase text-xs tracking-wider">{t('admin.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={r.id} className="border-b border-cream-dark/50 hover:bg-cream/50">
                    <td className="p-4">
                      <p className="font-medium">{r.first_name} {r.last_name}</p>
                      <p className="text-stone text-xs">{r.reference_code}</p>
                    </td>
                    <td className="p-4 whitespace-nowrap">{formatDate(r.reservation_date)}</td>
                    <td className="p-4">{r.reservation_time}</td>
                    <td className="p-4">{r.guests}</td>
                    <td className="p-4 hidden md:table-cell">{r.phone}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs uppercase tracking-wider rounded-full ${statusColors[r.status]}`}>
                        {t(`admin.status.${r.status}`)}
                      </span>
                    </td>
                    <td className="p-4 hidden lg:table-cell text-stone max-w-[200px] truncate">
                      {r.special_requests || '—'}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        {r.status !== 'confirmed' && (
                          <button
                            type="button"
                            onClick={() => handleStatusUpdate(r.id, 'confirmed')}
                            disabled={actionLoading === r.id}
                            className="p-1.5 text-green-700 hover:bg-green-50 rounded transition-colors"
                            title={t('admin.action.confirm')}
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        {r.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => handleStatusUpdate(r.id, 'cancelled')}
                            disabled={actionLoading === r.id}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title={t('admin.action.cancel')}
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          disabled={actionLoading === r.id}
                          className="p-1.5 text-stone hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                          title={t('admin.action.delete')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-1">
            <p className="text-sm text-stone">
              {t('admin.pagination.showing', {
                from: Math.min((page - 1) * PAGE_SIZE + 1, total),
                to: Math.min(page * PAGE_SIZE, total),
                total,
              })}
            </p>
            <nav className="flex items-center gap-1" aria-label={t('admin.pagination.label')}>
              <button
                type="button"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm rounded border border-cream-dark hover:bg-cream disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label={t('admin.pagination.previous')}
              >
                {t('admin.pagination.previousShort')}
              </button>
              <span className="px-3 py-1.5 text-sm text-stone">
                {t('admin.pagination.pageOf', { page, totalPages })}
              </span>
              <button
                type="button"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm rounded border border-cream-dark hover:bg-cream disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label={t('admin.pagination.next')}
              >
                {t('admin.pagination.nextShort')}
              </button>
            </nav>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  )
}

export default function AdminPage() {
  usePageTitle('pageTitles.admin')
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginForm />
  }

  return <Dashboard />
}
