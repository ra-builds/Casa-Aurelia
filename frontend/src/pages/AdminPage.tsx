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
import ClosuresManager from '../components/admin/ClosuresManager'
import MessagesManager from '../components/admin/MessagesManager'
import RestaurantManager from '../components/admin/RestaurantManager'
import { useAuth } from '../hooks/useAuth'
import { usePageSeo } from '../hooks/usePageTitle'
import { reservationApi } from '../services/api'
import { formatDate, formatNumber, getMinDate } from '../utils/helpers'
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
    <div className="min-h-screen flex items-center justify-center bg-cream px-4 py-16">
      <div className="card p-8 md:p-12 w-full max-w-md border-gold/20">
        <p className="label-micro">{t('admin.kicker')}</p>
        <h1 className="mt-4 font-display text-4xl font-medium leading-tight text-charcoal-light">
          {t('admin.loginTitle')}
        </h1>
        <span className="mt-5 block h-px w-12 bg-gold/60" aria-hidden="true" />
        <p className="mt-5 text-stone text-sm">{t('admin.loginSubtitle')}</p>
        {error && <div className="mt-6 mb-4"><ErrorMessage message={error} /></div>}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="admin-email" className="label-field">{t('admin.email')}</label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
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
              autoComplete="current-password"
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
    <div className="card px-6 py-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-stone">{label}</p>
          <p className="mt-2 font-display text-4xl font-medium leading-none text-charcoal-light">
            {value}
          </p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10" aria-hidden="true">
          <Icon size={20} className="text-gold-deep" />
        </span>
      </div>
    </div>
  )
}

function Dashboard() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const [tab, setTab] = useState<'reservations' | 'menu' | 'closures' | 'messages' | 'restaurant'>('reservations')
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
    pending: 'border border-amber-200 bg-amber-50 text-amber-800',
    confirmed: 'border border-emerald-200 bg-emerald-50 text-emerald-800',
    cancelled: 'border border-rose-200 bg-rose-50 text-rose-700',
  }

  const chipClasses: Record<string, string> = {
    pending: 'border border-amber-200 bg-amber-50 text-amber-800',
    confirmed: 'border border-emerald-200 bg-emerald-50 text-emerald-800',
    cancelled: 'border border-rose-200 bg-rose-50 text-rose-700',
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-charcoal text-cream">
        <div className="container-site py-8 flex items-center justify-between gap-6">
          <div>
            <p className="label-micro-light">{t('admin.kicker')}</p>
            <h1 className="mt-2 font-display text-2xl font-medium leading-tight text-cream lg:text-3xl">
              {t('admin.dashboardTitle')}
            </h1>
            <p className="mt-1 text-stone-light text-xs">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 px-2 py-2 -mr-2 text-sm text-stone-light transition-colors hover:text-gold-light focus-visible:text-gold-light"
          >
            <LogOut size={16} />
            {t('admin.logout')}
          </button>
        </div>
        <div className="hairline-light" aria-hidden="true" />
      </header>

      <div className="container-site py-8 lg:py-12">
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} />
            <button
              type="button"
              onClick={() => loadData(page)}
              className="btn-link mt-3 text-wine"
            >
              {t('admin.retry')}
            </button>
          </div>
        )}

        <div className="flex gap-1 mb-8 border-b border-charcoal/10" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'reservations'}
            onClick={() => setTab('reservations')}
            className={`px-5 py-3 text-sm uppercase tracking-wider transition-colors border-b-2 -mb-px ${
              tab === 'reservations' ? 'border-gold text-gold-deep font-medium' : 'border-transparent text-stone hover:text-charcoal-light'
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
              tab === 'menu' ? 'border-gold text-gold-deep font-medium' : 'border-transparent text-stone hover:text-charcoal-light'
            }`}
          >
            {t('admin.tab.menu')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'closures'}
            onClick={() => setTab('closures')}
            className={`px-5 py-3 text-sm uppercase tracking-wider transition-colors border-b-2 -mb-px ${
              tab === 'closures' ? 'border-gold text-gold-deep font-medium' : 'border-transparent text-stone hover:text-charcoal-light'
            }`}
          >
            {t('admin.tab.closures')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'messages'}
            onClick={() => setTab('messages')}
            className={`px-5 py-3 text-sm uppercase tracking-wider transition-colors border-b-2 -mb-px ${
              tab === 'messages' ? 'border-gold text-gold-deep font-medium' : 'border-transparent text-stone hover:text-charcoal-light'
            }`}
          >
            {t('admin.tab.messages')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'restaurant'}
            onClick={() => setTab('restaurant')}
            className={`px-5 py-3 text-sm uppercase tracking-wider transition-colors border-b-2 -mb-px ${
              tab === 'restaurant' ? 'border-gold text-gold-deep font-medium' : 'border-transparent text-stone hover:text-charcoal-light'
            }`}
          >
            {t('admin.tab.restaurant')}
          </button>
        </div>

        {tab === 'closures' && (
          <div>
            <ClosuresManager />
          </div>
        )}

        {tab === 'messages' && (
          <div>
            <MessagesManager />
          </div>
        )}

        {tab === 'restaurant' && (
          <div>
            <RestaurantManager />
          </div>
        )}

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
          <div className="flex flex-wrap gap-3 mb-8 text-sm">
            <span className={`pill uppercase tracking-wider ${chipClasses.pending}`}>
              {t('admin.status.pending')}: {stats.pending}
            </span>
            <span className={`pill uppercase tracking-wider ${chipClasses.confirmed}`}>
              {t('admin.status.confirmed')}: {stats.confirmed}
            </span>
            <span className={`pill uppercase tracking-wider ${chipClasses.cancelled}`}>
              {t('admin.status.cancelled')}: {stats.cancelled}
            </span>
          </div>
        )}

        <div className="card p-4 sm:p-5 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone" />
              <input
                type="text"
                placeholder={t('admin.searchPlaceholder')}
                aria-label={t('admin.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <select
              value={statusFilter}
              aria-label={t('admin.filter.status')}
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
              aria-label={t('admin.filter.date')}
              onChange={(e) => setDateFilter(e.target.value)}
              className="input-field sm:w-44"
            />
            <button
              type="button"
              onClick={() => setDateFilter(getMinDate())}
              className="btn-secondary whitespace-nowrap"
            >
              {t('admin.filter.today')}
            </button>
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
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-charcoal/10 text-left">
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
                  <tr key={r.id} className="border-b border-charcoal/5 hover:bg-ivory/50">
                    <td className="p-4">
                      <p className="font-medium">{r.first_name} {r.last_name}</p>
                      <p className="text-stone text-xs">{r.reference_code}</p>
                    </td>
                    <td className="p-4 whitespace-nowrap">{formatDate(r.reservation_date)}</td>
                    <td className="p-4">{r.reservation_time}</td>
                    <td className="p-4">{r.guests}</td>
                    <td className="p-4 hidden md:table-cell">{r.phone}</td>
                    <td className="p-4">
                      <span className={`pill uppercase tracking-wider ${statusColors[r.status]}`}>
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
                            className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                            title={t('admin.action.confirm')}
                            aria-label={t('admin.action.confirm')}
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        {r.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => handleStatusUpdate(r.id, 'cancelled')}
                            disabled={actionLoading === r.id}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title={t('admin.action.cancel')}
                            aria-label={t('admin.action.cancel')}
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          disabled={actionLoading === r.id}
                          className="p-2 text-stone hover:bg-rose-50 hover:text-rose-600 rounded-md transition-colors"
                          title={t('admin.action.delete')}
                          aria-label={t('admin.action.delete')}
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
          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 px-1">
            <p className="text-sm text-stone">
              {t('admin.pagination.showing', {
                from: formatNumber(Math.min((page - 1) * PAGE_SIZE + 1, total)),
                to: formatNumber(Math.min(page * PAGE_SIZE, total)),
                total: formatNumber(total),
              })}
            </p>
            <nav className="flex items-center gap-2" aria-label={t('admin.pagination.label')}>
              <button
                type="button"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="px-3 py-2 text-sm rounded-md border border-charcoal/15 hover:border-charcoal hover:bg-charcoal hover:text-cream disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label={t('admin.pagination.previous')}
              >
                {t('admin.pagination.previousShort')}
              </button>
              <span className="px-3 py-1.5 text-sm text-stone" aria-current="page">
                {t('admin.pagination.pageOf', { page: formatNumber(page), totalPages: formatNumber(totalPages) })}
              </span>
              <button
                type="button"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-2 text-sm rounded-md border border-charcoal/15 hover:border-charcoal hover:bg-charcoal hover:text-cream disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
  usePageSeo({ titleKey: 'pageTitles.admin', noindex: true })
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