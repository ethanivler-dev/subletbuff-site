'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { EmptyState } from './EmptyState'

export interface TransferRequest {
  id: string
  listing_id: string
  landlord_id: string
  applicant_name: string
  applicant_email: string
  unit: string | null
  status: 'pending' | 'approved' | 'denied'
  created_at: string
}

interface TransferTableProps {
  initialRequests: TransferRequest[]
}

function StatusBadge({ status }: { status: TransferRequest['status'] }) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    denied: 'bg-red-100 text-red-800',
  }

  return (
    <span className={['inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-badge capitalize', styles[status]].join(' ')}>
      {status}
    </span>
  )
}

export function TransferTable({ initialRequests }: TransferTableProps) {
  const [requests, setRequests] = useState(initialRequests)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  if (requests.length === 0) {
    return <EmptyState />
  }

  async function updateStatus(id: string, newStatus: 'approved' | 'denied') {
    setUpdatingId(id)

    // Optimistic update
    const previous = requests
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    )

    const supabase = createClient()
    const { error } = await supabase
      .from('transfer_requests')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      // Revert on failure
      setRequests(previous)
    }

    setUpdatingId(null)
  }

  return (
    <div className="bg-white rounded-card border border-gray-200 shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Transfer Requests</h3>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-5 py-3 font-medium text-gray-500">Applicant</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Email</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Unit</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Date Submitted</th>
              <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
              <th className="text-right px-5 py-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {requests.map((req) => (
              <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3.5 font-medium text-gray-900">{req.applicant_name}</td>
                <td className="px-5 py-3.5 text-gray-600">{req.applicant_email}</td>
                <td className="px-5 py-3.5 text-gray-600">{req.unit || '—'}</td>
                <td className="px-5 py-3.5 text-gray-600">
                  {new Date(req.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={req.status} />
                </td>
                <td className="px-5 py-3.5 text-right">
                  {req.status === 'pending' ? (
                    <div className="flex items-center justify-end gap-2">
                      {updatingId === req.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : (
                        <>
                          <button
                            onClick={() => updateStatus(req.id, 'approved')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-button bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => updateStatus(req.id, 'denied')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-button bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Deny
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="md:hidden divide-y divide-gray-100">
        {requests.map((req) => (
          <div key={req.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900">{req.applicant_name}</p>
                <p className="text-sm text-gray-500">{req.applicant_email}</p>
              </div>
              <StatusBadge status={req.status} />
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {req.unit && <span>Unit: {req.unit}</span>}
              <span>
                {new Date(req.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            {req.status === 'pending' && (
              <div className="flex items-center gap-2 pt-1">
                {updatingId === req.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                ) : (
                  <>
                    <button
                      onClick={() => updateStatus(req.id, 'approved')}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium rounded-button bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      onClick={() => updateStatus(req.id, 'denied')}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium rounded-button bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Deny
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function TransferTableSkeleton() {
  return (
    <div className="bg-white rounded-card border border-gray-200 shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="divide-y divide-gray-100">
        {[1, 2, 3].map((i) => (
          <div key={i} className="px-5 py-4 flex items-center gap-6 animate-pulse">
            <div className="h-4 w-28 bg-gray-200 rounded" />
            <div className="h-4 w-36 bg-gray-200 rounded" />
            <div className="h-4 w-16 bg-gray-200 rounded" />
            <div className="h-4 w-20 bg-gray-200 rounded" />
            <div className="h-5 w-16 bg-gray-200 rounded-badge" />
            <div className="ml-auto flex gap-2">
              <div className="h-7 w-20 bg-gray-200 rounded-button" />
              <div className="h-7 w-16 bg-gray-200 rounded-button" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
