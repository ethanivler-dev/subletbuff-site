'use client'

import { useState, useRef } from 'react'
import { Upload, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

interface LeaseUploadProps {
  userId: string
  currentStatus: string
  currentPath?: string
  onUploadComplete: (path: string) => void
}

export function LeaseUpload({ userId, currentStatus, currentPath, onUploadComplete }: LeaseUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Invalid file type. Allowed: PDF, JPEG, PNG')
      e.target.value = ''
      return
    }

    if (file.size > MAX_SIZE) {
      setError('File too large. Max size: 10MB')
      e.target.value = ''
      return
    }

    setUploading(true)

    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'pdf'
      const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('lease-documents')
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        setError(uploadError.message)
        return
      }

      onUploadComplete(path)
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // Pending review state
  if (currentStatus === 'pending' && currentPath) {
    return (
      <div className="rounded-card border border-yellow-200 bg-yellow-50 p-4 flex items-start gap-3">
        <Clock className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-900">Lease Pending Review</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Your lease document has been uploaded and is awaiting manual review.
          </p>
        </div>
      </div>
    )
  }

  // Verified state
  if (currentStatus === 'verified') {
    return (
      <div className="rounded-card border border-green-200 bg-green-50 p-4 flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-900">Lease Verified</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Your lease has been verified. This listing displays a trust badge.
          </p>
        </div>
      </div>
    )
  }

  // Rejected state — allow re-upload
  if (currentStatus === 'rejected') {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-card border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900">Lease Rejected</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Your lease document was not accepted. Please upload a clearer copy.
            </p>
          </div>
        </div>
        <UploadButton
          inputRef={inputRef}
          uploading={uploading}
          error={error}
          onFileChange={handleFileChange}
        />
      </div>
    )
  }

  // Default: no lease uploaded — show upload button
  return (
    <UploadButton
      inputRef={inputRef}
      uploading={uploading}
      error={error}
      onFileChange={handleFileChange}
    />
  )
}

function UploadButton({
  inputRef,
  uploading,
  error,
  onFileChange,
}: {
  inputRef: React.RefObject<HTMLInputElement>
  uploading: boolean
  error: string
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={onFileChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full rounded-card border-2 border-dashed border-gray-300 hover:border-primary-400 p-6 flex flex-col items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
        ) : (
          <Upload className="w-6 h-6 text-gray-400" />
        )}
        <span className="text-sm font-medium text-gray-700">
          {uploading ? 'Uploading...' : 'Upload Lease Document'}
        </span>
        <span className="text-xs text-gray-400">PDF, JPEG, or PNG — max 10MB</span>
      </button>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
