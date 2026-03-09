'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Home, Trash2, MapPin, X } from 'lucide-react'
import { NEIGHBORHOODS } from '@/lib/constants'

interface Property {
  id: string
  address: string
  neighborhood: string | null
  unit_count: number
  subletting_allowed: boolean
  rules_text: string | null
  created_at: string
}

export default function PropertiesPage() {
  const router = useRouter()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    address: '',
    neighborhood: '',
    unit_count: '1',
    rules_text: '',
    subletting_allowed: true,
  })

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/landlords/properties')
      if (res.status === 401) { router.replace('/auth/login?next=/landlords/dashboard/properties'); return }
      if (res.status === 403) { router.replace('/landlords/register'); return }
      if (res.ok) setProperties(await res.json())
      setLoading(false)
    }
    load()
  }, [router])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/landlords/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: form.address,
          neighborhood: form.neighborhood || null,
          unit_count: parseInt(form.unit_count) || 1,
          rules_text: form.rules_text || null,
          subletting_allowed: form.subletting_allowed,
        }),
      })
      if (res.ok) {
        const newProp = await res.json()
        setProperties((prev) => [newProp, ...prev])
        setForm({ address: '', neighborhood: '', unit_count: '1', rules_text: '', subletting_allowed: true })
        setShowForm(false)
      }
    } catch { /* ignore */ }
    setSubmitting(false)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/landlords/properties/${id}`, { method: 'DELETE' })
    if (res.ok) setProperties((prev) => prev.filter((p) => p.id !== id))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <Link href="/landlords/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif text-2xl font-bold text-gray-900">Properties</h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-button bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Property</>}
          </button>
        </div>

        {/* Add property form */}
        {showForm && (
          <form onSubmit={handleAdd} className="bg-white rounded-card shadow-card p-6 mb-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-800">Address *</label>
              <input
                type="text"
                required
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="e.g. 1234 Pearl St, Boulder, CO"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-800">Neighborhood</label>
                <select
                  value={form.neighborhood}
                  onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select</option>
                  {NEIGHBORHOODS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-800">Unit Count</label>
                <input
                  type="number"
                  min="1"
                  value={form.unit_count}
                  onChange={(e) => setForm((f) => ({ ...f, unit_count: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-800">Rules / Notes</label>
              <textarea
                rows={3}
                value={form.rules_text}
                onChange={(e) => setForm((f) => ({ ...f, rules_text: e.target.value }))}
                placeholder="Pet policies, noise rules, parking restrictions, etc."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.subletting_allowed}
                onChange={(e) => setForm((f) => ({ ...f, subletting_allowed: e.target.checked }))}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Subletting allowed
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-2.5 text-sm font-semibold rounded-button bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Adding…' : 'Add Property'}
            </button>
          </form>
        )}

        {/* Property list */}
        {properties.length === 0 ? (
          <div className="bg-white rounded-card shadow-card p-12 text-center">
            <Home className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-1">No properties yet</p>
            <p className="text-xs text-gray-400">Add your first property to start managing sublet requests.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {properties.map((prop) => (
              <div key={prop.id} className="bg-white rounded-card shadow-card p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <Home className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{prop.address}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    {prop.neighborhood && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" /> {prop.neighborhood}
                      </span>
                    )}
                    <span>{prop.unit_count} unit{prop.unit_count !== 1 ? 's' : ''}</span>
                    <span className={prop.subletting_allowed ? 'text-green-600' : 'text-red-500'}>
                      {prop.subletting_allowed ? 'Subletting OK' : 'No subletting'}
                    </span>
                  </div>
                  {prop.rules_text && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{prop.rules_text}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(prop.id)}
                  className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                  title="Delete property"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
