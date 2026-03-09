'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Trash2, Users, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'

interface Admin {
  id: string
  email: string
  added_by: string | null
  created_at: string
}

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const fetchAdmins = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/admins')
    if (res.ok) {
      const data = await res.json()
      setAdmins(data.admins)
      setNames(data.names)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAdmins()
  }, [fetchAdmins])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setAdding(true)
    setError(null)

    const res = await fetch('/api/admin/admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    })

    if (res.ok) {
      setEmail('')
      fetchAdmins()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to add admin')
    }
    setAdding(false)
  }

  async function handleRemove(id: string) {
    if (!confirm('Remove this admin? They will lose admin access immediately.')) return
    setRemoving(id)
    const res = await fetch(`/api/admin/admins/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setAdmins((prev) => prev.filter((a) => a.id !== id))
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? 'Failed to remove admin')
    }
    setRemoving(null)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-gray-900">Manage Admins</h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? 'Loading...' : `${admins.length} admin${admins.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchAdmins} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Add admin form */}
      <div className="bg-white rounded-card shadow-card p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Add Admin
        </h2>
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            type="email"
            placeholder="Enter user's email address..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 max-w-sm px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Button type="submit" size="sm" disabled={adding || !email.trim()}>
            {adding ? 'Adding...' : 'Add Admin'}
          </Button>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <p className="text-xs text-gray-400 mt-2">The user must have a SubletBuff account first.</p>
      </div>

      {/* Admin list */}
      {admins.length > 0 && (
        <div className="bg-white rounded-card shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Added</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Added By</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-gray-900">{admin.email}</td>
                  <td className="px-4 py-3 text-gray-600">{names[admin.id] || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-500">
                    {formatDate(admin.created_at.split('T')[0])}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-500">
                    {admin.added_by ? (names[admin.added_by] || admin.added_by.slice(0, 8) + '...') : 'System'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRemove(admin.id)}
                      disabled={removing === admin.id}
                      className="p-1.5 rounded hover:bg-red-100 text-red-500 transition-colors disabled:opacity-50"
                      title="Remove admin"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && admins.length === 0 && (
        <div className="bg-white rounded-card shadow-card p-12 text-center">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">No admins found</h2>
          <p className="text-sm text-gray-500">Add the first admin above.</p>
        </div>
      )}
    </div>
  )
}
