import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import LoadingSpinner from '../ui/LoadingSpinner'
import ErrorMessage from '../ui/ErrorMessage'
import SuccessMessage from '../ui/SuccessMessage'
import { adminCategoryApi } from '../../services/api'
import type { CategoryInput, MenuCategory } from '../../types'

const EMPTY_FORM: CategoryInput = {
  name: '',
  slug: '',
  sort_order: 0,
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function previewSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function CategoryManager() {
  const { t } = useTranslation()
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<CategoryInput>(EMPTY_FORM)
  const [slugEdited, setSlugEdited] = useState(false)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      setCategories(await adminCategoryApi.getAll())
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.menu.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setSlugEdited(false)
    setFormError('')
    setFormOpen(true)
    setSavedMessage('')
  }

  const openEdit = (category: MenuCategory) => {
    setEditingId(category.id)
    setForm({ name: category.name, slug: category.slug, sort_order: category.sort_order })
    setSlugEdited(true)
    setFormError('')
    setFormOpen(true)
    setSavedMessage('')
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setFormError('')
  }

  const handleNameChange = (name: string) => {
    setForm((prev) => ({ ...prev, name, slug: slugEdited ? prev.slug : previewSlug(name) }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    if (form.slug && !SLUG_PATTERN.test(form.slug)) {
      setFormError(t('admin.menu.invalidSlug'))
      return
    }
    setSaving(true)
    setFormError('')
    try {
      const payload: Partial<CategoryInput> = {
        name: form.name,
        sort_order: form.sort_order,
      }
      if (form.slug) payload.slug = form.slug
      else if (editingId !== null) payload.slug = null
      if (editingId === null) {
        await adminCategoryApi.create(payload as CategoryInput)
      } else {
        await adminCategoryApi.update(editingId, payload)
      }
      closeForm()
      setSavedMessage(t('admin.menu.saved'))
      await loadData()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('admin.menu.categoryCreateFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (category: MenuCategory) => {
    if (!window.confirm(t('admin.menu.categoryDeleteConfirm', { name: category.name }))) return
    setActionLoading(category.id)
    setError('')
    try {
      await adminCategoryApi.delete(category.id)
      setSavedMessage(t('admin.menu.saved'))
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.menu.categoryDeleteFailed'))
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) return <LoadingSpinner className="py-20" />

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <p className="label-micro">{t('admin.tab.items')}</p>
          <h2 className="mt-2 font-display text-2xl font-medium text-charcoal-light">{t('admin.menu.categories')}</h2>
        </div>
        <button type="button" onClick={openCreate} className="btn-gold flex items-center gap-2">
          <Plus size={16} />
          {t('admin.menu.addCategory')}
        </button>
      </div>

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} />
          <button
            type="button"
            onClick={loadData}
            className="btn-link mt-3 text-wine"
          >
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
            <h3 className="font-display text-xl font-medium text-charcoal-light">
              {editingId === null ? t('admin.menu.addCategory') : t('admin.menu.editCategory')}
            </h3>
          </div>
          {formError && <div className="mt-5 mb-4"><ErrorMessage message={formError} /></div>}
          <form onSubmit={handleSubmit} className="mt-6 grid md:grid-cols-3 gap-5" noValidate={false}>
            <div>
              <label htmlFor="cat-name" className="label-field">{t('admin.menu.categoryName')}</label>
              <input
                id="cat-name"
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="input-field"
                maxLength={100}
                required
              />
            </div>
            <div>
              <label htmlFor="cat-slug" className="label-field">{t('admin.menu.categorySlug')}</label>
              <input
                id="cat-slug"
                type="text"
                value={form.slug ?? ''}
                onChange={(e) => {
                  setSlugEdited(true)
                  setForm((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }))
                }}
                className="input-field font-mono text-sm"
                placeholder="seasonal-specials"
                maxLength={100}
              />
            </div>
            <div>
              <label htmlFor="cat-sort" className="label-field">{t('admin.menu.categorySortOrder')}</label>
              <input
                id="cat-sort"
                type="number"
                min="0"
                value={form.sort_order}
                onChange={(e) => setForm((prev) => ({ ...prev, sort_order: Number(e.target.value) }))}
                className="input-field"
              />
            </div>
            <div className="md:col-span-3 flex gap-3 pt-4 border-t border-charcoal/10">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? t('admin.menu.saving') : t('admin.menu.save')}
              </button>
              <button type="button" onClick={closeForm} className="btn-secondary" disabled={saving}>
                {t('admin.menu.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="card p-12 text-center text-stone">{t('admin.menu.empty')}</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-charcoal/10 text-left">
                <th className="p-4 font-medium text-stone uppercase text-xs tracking-wider">{t('admin.menu.categoryName')}</th>
                <th className="p-4 font-medium text-stone uppercase text-xs tracking-wider">{t('admin.menu.categorySlug')}</th>
                <th className="p-4 font-medium text-stone uppercase text-xs tracking-wider">{t('admin.menu.categorySortOrder')}</th>
                <th className="p-4 font-medium text-stone uppercase text-xs tracking-wider">{t('admin.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-b border-charcoal/5 hover:bg-ivory/50">
                  <td className="p-4 font-medium">{category.name}</td>
                  <td className="p-4 font-mono text-xs text-stone">{category.slug}</td>
                  <td className="p-4">{category.sort_order}</td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(category)}
                        disabled={actionLoading === category.id}
                        className="p-2 text-stone hover:bg-charcoal/10 hover:text-charcoal rounded-md transition-colors"
                        title={t('admin.menu.editCategory')}
                        aria-label={t('admin.menu.editCategoryFor', { name: category.name })}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(category)}
                        disabled={actionLoading === category.id}
                        className="p-2 text-stone hover:bg-rose-50 hover:text-rose-600 rounded-md transition-colors"
                        title={t('admin.menu.deleteCategory')}
                        aria-label={t('admin.menu.deleteCategoryFor', { name: category.name })}
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
    </div>
  )
}