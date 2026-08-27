import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageIcon, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import LoadingSpinner from '../ui/LoadingSpinner'
import ErrorMessage from '../ui/ErrorMessage'
import { adminMenuApi } from '../../services/api'
import { formatPrice } from '../../utils/helpers'
import type { MenuItem, MenuItemInput, MenuCategory } from '../../types'

const MAX_IMAGE_MB = 5
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const EMPTY_FORM: MenuItemInput = {
  name: '',
  description: '',
  price: 0,
  category_id: 0,
  dietary_info: null,
  is_available: true,
  is_featured: false,
  sort_order: 0,
  allergen_codes: [],
}

export default function MenuManager() {
  const { t } = useTranslation()
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [allergenCatalog, setAllergenCatalog] = useState<{ code: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<MenuItemInput>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [removingImage, setRemovingImage] = useState(false)

  const resetImageState = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  const toggleAllergen = (code: string) => {
    setForm((prev) => ({
      ...prev,
      allergen_codes: prev.allergen_codes.includes(code)
        ? prev.allergen_codes.filter((c) => c !== code)
        : [...prev.allergen_codes, code],
    }))
  }

  const handleImageSelect = (file: File | undefined) => {
    if (!file) return
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setFormError(t('admin.menu.invalidType'))
      return
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setFormError(t('admin.menu.tooLarge', { size: MAX_IMAGE_MB }))
      return
    }
    setFormError('')
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleRemoveImage = async () => {
    if (editingId === null) {
      resetImageState()
      return
    }
    setRemovingImage(true)
    setFormError('')
    try {
      await adminMenuApi.removeImage(editingId)
      resetImageState()
      await loadData()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('admin.menu.removeFailed'))
    } finally {
      setRemovingImage(false)
    }
  }

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [data, catalog] = await Promise.all([adminMenuApi.getAll(), adminMenuApi.getAllergens()])
      setCategories(data.categories)
      setItems(data.items)
      setAllergenCatalog(catalog)
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
    setForm({ ...EMPTY_FORM, category_id: categories[0]?.id ?? 0, allergen_codes: [] })
    resetImageState()
    setFormError('')
    setFormOpen(true)
    setSavedMessage('')
  }

  const openEdit = (item: MenuItem) => {
    setEditingId(item.id)
    setForm({
      name: item.name,
      description: item.description,
      price: item.price,
      category_id: item.category_id,
      dietary_info: item.dietary_info,
      is_available: item.is_available,
      is_featured: item.is_featured,
      sort_order: item.sort_order,
      allergen_codes: (item.allergens ?? []).map((a) => a.code),
    })
    setImageFile(null)
    setImagePreview(item.image_url)
    setFormError('')
    setFormOpen(true)
    setSavedMessage('')
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setFormError('')
    resetImageState()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.category_id) {
      setFormError(t('admin.menu.categoryRequired'))
      return
    }
    setSaving(true)
    setFormError('')
    try {
      let savedItemId = editingId
      if (editingId === null) {
        const created = await adminMenuApi.create(form)
        savedItemId = created.id
      } else {
        await adminMenuApi.update(editingId, form)
      }
      if (imageFile && savedItemId !== null) {
        await adminMenuApi.uploadImage(savedItemId, imageFile)
      }
      closeForm()
      setSavedMessage(t('admin.menu.saved'))
      await loadData()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('admin.menu.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (item: MenuItem, field: 'is_available' | 'is_featured') => {
    setActionLoading(item.id)
    setError('')
    try {
      await adminMenuApi.update(item.id, { [field]: !item[field] })
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.menu.saveFailed'))
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (item: MenuItem) => {
    if (!window.confirm(t('admin.menu.deleteConfirm', { name: item.name }))) return
    setActionLoading(item.id)
    setError('')
    try {
      await adminMenuApi.delete(item.id)
      setSavedMessage(t('admin.menu.deleted'))
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.menu.deleteFailed'))
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) return <LoadingSpinner className="py-20" />

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="font-display text-2xl font-semibold">{t('admin.menu.title')}</h2>
        <button type="button" onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          {t('admin.menu.addItem')}
        </button>
      </div>

      {error && <div className="mb-6"><ErrorMessage message={error} /></div>}
      {!error && savedMessage && (
        <div role="status" className="mb-6 px-4 py-3 bg-green-50 text-green-800 border border-green-200 text-sm">
          {savedMessage}
        </div>
      )}

      {formOpen && (
        <div className="card p-6 mb-8">
          <h3 className="font-display text-xl font-semibold mb-6">
            {editingId === null ? t('admin.menu.addItem') : t('admin.menu.editItem')}
          </h3>
          {formError && <div className="mb-4"><ErrorMessage message={formError} /></div>}
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-5" noValidate={false}>
            <div>
              <label htmlFor="menu-name" className="label-field">{t('admin.menu.name')}</label>
              <input
                id="menu-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field"
                maxLength={200}
                required
              />
            </div>
            <div>
              <label htmlFor="menu-category" className="label-field">{t('admin.menu.category')}</label>
              <select
                id="menu-category"
                value={form.category_id || ''}
                onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })}
                className="input-field"
                required
              >
                <option value="" disabled>—</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="menu-description" className="label-field">{t('admin.menu.description')}</label>
              <textarea
                id="menu-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-field min-h-[80px]"
                maxLength={2000}
                required
              />
            </div>
            <div>
              <label htmlFor="menu-price" className="label-field">{t('admin.menu.price')}</label>
              <input
                id="menu-price"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label htmlFor="menu-dietary" className="label-field">{t('admin.menu.dietaryInfo')}</label>
              <input
                id="menu-dietary"
                type="text"
                value={form.dietary_info ?? ''}
                onChange={(e) => setForm({ ...form, dietary_info: e.target.value.trim() || null })}
                className="input-field"
                placeholder="Vegetarian, Gluten-Free, Vegan…"
                maxLength={100}
              />
            </div>
            <div>
              <label htmlFor="menu-sort" className="label-field">{t('admin.menu.sortOrder')}</label>
              <input
                id="menu-sort"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                className="input-field"
              />
            </div>
            <div className="flex items-end gap-6 pb-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_available}
                  onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
                  className="w-4 h-4 accent-wine"
                />
                {t('admin.menu.available')}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                  className="w-4 h-4 accent-wine"
                />
                {t('admin.menu.featured')}
              </label>
            </div>
            <div className="md:col-span-2 pt-2 border-t border-cream-dark">
              <span className="label-field">{t('admin.menu.image')}</span>
              <div className="flex flex-wrap items-center gap-4">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt={form.name || t('admin.menu.image')}
                    className="h-24 w-24 rounded-md object-cover border border-cream-dark"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-md border border-dashed border-stone-light/50 flex flex-col items-center justify-center gap-1 text-stone-light" aria-hidden="true">
                    <ImageIcon size={20} />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="btn-secondary inline-flex items-center gap-2 cursor-pointer">
                    {imagePreview ? t('admin.menu.replaceImage') : t('admin.menu.uploadImage')}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(e) => {
                        handleImageSelect(e.target.files?.[0])
                        e.target.value = ''
                      }}
                    />
                  </label>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={saving || removingImage}
                      className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50 text-left"
                    >
                      {t('admin.menu.removeImage')}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="md:col-span-2 pt-2 border-t border-cream-dark">
              <span className="label-field">{t('admin.menu.allergens')}</span>
              {allergenCatalog.length === 0 ? (
                <p className="text-sm text-stone">{t('admin.menu.empty')}</p>
              ) : (
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {allergenCatalog.map((allergen) => (
                    <label key={allergen.code} className="flex items-center gap-2 text-sm cursor-pointer" title={allergen.name}>
                      <input
                        type="checkbox"
                        checked={form.allergen_codes.includes(allergen.code)}
                        onChange={() => toggleAllergen(allergen.code)}
                        className="w-4 h-4 accent-wine"
                      />
                      {t(`allergenLabels.${allergen.code.toLowerCase()}`)}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-2 flex gap-3 pt-2 border-t border-cream-dark">
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

      {items.length === 0 ? (
        <div className="card p-12 text-center text-stone">{t('admin.menu.empty')}</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cream-dark text-left">
                <th className="p-4 font-medium text-stone uppercase text-xs tracking-wider">{t('admin.menu.name')}</th>
                <th className="p-4 font-medium text-stone uppercase text-xs tracking-wider">{t('admin.menu.category')}</th>
                <th className="p-4 font-medium text-stone uppercase text-xs tracking-wider">{t('admin.menu.price')}</th>
                <th className="p-4 font-medium text-stone uppercase text-xs tracking-wider hidden md:table-cell">{t('admin.menu.dietaryInfo')}</th>
                <th className="p-4 font-medium text-stone uppercase text-xs tracking-wider">{t('admin.menu.featured')}</th>
                <th className="p-4 font-medium text-stone uppercase text-xs tracking-wider">{t('admin.menu.available')}</th>
                <th className="p-4 font-medium text-stone uppercase text-xs tracking-wider hidden lg:table-cell">{t('admin.menu.sortOrder')}</th>
                <th className="p-4 font-medium text-stone uppercase text-xs tracking-wider">{t('admin.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className={`border-b border-cream-dark/50 hover:bg-cream/50 ${item.is_available ? '' : 'opacity-60'}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          loading="lazy"
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded object-cover shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-stone text-xs max-w-[220px] truncate">{item.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 whitespace-nowrap">{item.category?.name ?? `#${item.category_id}`}</td>
                  <td className="p-4 whitespace-nowrap">{formatPrice(item.price, 'EUR')}</td>
                  <td className="p-4 hidden md:table-cell">
                    {item.dietary_info ? (
                      <span className="text-xs uppercase tracking-wider text-gold border border-gold/30 px-2 py-0.5">
                        {item.dietary_info}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() => handleToggle(item, 'is_featured')}
                      disabled={actionLoading === item.id}
                      aria-pressed={item.is_featured}
                      title={t('admin.menu.featured')}
                      className={`p-1.5 rounded transition-colors ${item.is_featured ? 'text-gold' : 'text-stone-light hover:text-gold'}`}
                    >
                      <Star size={16} className={item.is_featured ? 'fill-gold' : ''} />
                    </button>
                  </td>
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() => handleToggle(item, 'is_available')}
                      disabled={actionLoading === item.id}
                      aria-pressed={item.is_available}
                      className={`px-2 py-1 text-xs uppercase tracking-wider rounded-full transition-colors ${
                        item.is_available ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {item.is_available ? t('admin.menu.available') : t('menu.unavailable')}
                    </button>
                  </td>
                  <td className="p-4 hidden lg:table-cell">{item.sort_order}</td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        disabled={actionLoading === item.id}
                        className="p-1.5 text-stone hover:bg-cream-dark hover:text-charcoal rounded transition-colors"
                        title={t('admin.menu.edit')}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={actionLoading === item.id}
                        className="p-1.5 text-stone hover:bg-red-50 hover:text-red-600 rounded transition-colors"
                        title={t('admin.menu.delete')}
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
