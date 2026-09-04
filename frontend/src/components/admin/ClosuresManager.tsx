import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import LoadingSpinner from '../ui/LoadingSpinner'
import ErrorMessage from '../ui/ErrorMessage'
import SuccessMessage from '../ui/SuccessMessage'
import { adminClosureApi } from '../../services/api'
import { formatDate } from '../../utils/helpers'
import type { Closure, ClosureInput } from '../../types'

export default function ClosuresManager() {
  const { t } = useTranslation()
  const [closures, setClosures] = useState<Closure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<ClosureInput>({ closure_date: '', reason: '' })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      setClosures(await adminClosureApi.getAll())
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.closures.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openCreate = () => {
    setForm({ closure_date: '', reason: '' })
    setFormError('')
    setSavedMessage('')
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setFormError('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.closure_date) return
    setSaving(true)
    setFormError('')
    try {
      await adminClosureApi.create({
        closure_date: form.closure_date,
        reason: form.reason?.trim() ? form.reason.trim() : null,
      })
      closeForm()
      setSavedMessage(t('admin.closures.saved'))
      await loadData()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('admin.closures.createFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (closure: Closure) => {
    if (!window.confirm(t('admin.closures.deleteConfirm', { date: closure.closure_date }))) return
    setActionLoading(closure.id)
    setError('')
    try {
      await adminClosureApi.delete(closure.id)
      setSavedMessage(t('admin.closures.saved'))
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.closures.deleteFailed'))
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) return <LoadingSpinner className="py-20" />

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <p className="label-micro">{t('admin.closures.kicker')}</p>
          <h2 className="mt-2 font-display text-2xl font-medium text-charcoal-light">{t('admin.closures.title')}</h2>
          <p className="mt-1 text-stone text-sm">{t('admin.closures.subtitle')}</p>
        </div>
        <button type="button" onClick={openCreate} className="btn-gold flex items-center gap-2">
          <Plus size={16} />
          {t('admin.closures.add')}
        </button>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} />
          <button type="button" onClick={loadData} className="btn-link mt-3 text-wine">
            {t('admin.retry')}
          </button>
        </div>
      )}
      {!error && savedMessage && (
        <div className="mb-6">
          <SuccessMessage message={savedMessage} />
        </div>
      )}

      {formOpen && (
        <div className="card p-6 md:p-8 mb-8">
          <div className="flex items-center gap-5">
            <span className="h-px w-10 bg-gold/60" aria-hidden="true" />
            <h3 className="font-display text-xl font-medium text-charcoal-light">{t('admin.closures.addTitle')}</h3>
          </div>
          {formError && <div className="mt-5 mb-4"><ErrorMessage message={formError} /></div>}
          <form onSubmit={handleSubmit} className="mt-6 grid md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="closure-date" className="label-field">{t('admin.closures.date')}</label>
              <input
                id="closure-date"
                type="date"
                value={form.closure_date}
                onChange={(e) => setForm((prev) => ({ ...prev, closure_date: e.target.value }))}
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="closure-reason" className="label-field">{t('admin.closures.reason')}</label>
              <input
                id="closure-reason"
                type="text"
                value={form.reason ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                className="input-field"
                maxLength={200}
                placeholder={t('admin.closures.reasonPlaceholder')}
              />
            </div>
            <div className="md:col-span-2 flex gap-3 pt-4 border-t border-charcoal/10">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? t('admin.closures.saving') : t('admin.closures.save')}
              </button>
              <button type="button" onClick={closeForm} className="btn-secondary" disabled={saving}>
                {t('admin.closures.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {closures.length === 0 ? (
        <div className="card p-12 text-center text-stone">{t('admin.closures.empty')}</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-charcoal/10 text-left">
                <th className="p-4 font-medium text-stone uppercase text-xs tracking-wider">{t('admin.closures.date')}</th>
                <th className="p-4 font-medium text-stone uppercase text-xs tracking-wider">{t('admin.closures.reason')}</th>
                <th className="p-4 font-medium text-stone uppercase text-xs tracking-wider">{t('admin.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {closures.map((closure) => (
                <tr key={closure.id} className="border-b border-charcoal/5 hover:bg-ivory/50">
                  <td className="p-4 font-medium whitespace-nowrap">{formatDate(closure.closure_date)}</td>
                  <td className="p-4 text-stone">{closure.reason || '—'}</td>
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() => handleDelete(closure)}
                      disabled={actionLoading === closure.id}
                      className="p-2 text-stone hover:bg-rose-50 hover:text-rose-600 rounded-md transition-colors"
                      title={t('admin.closures.delete')}
                      aria-label={t('admin.closures.deleteFor', { date: closure.closure_date })}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
