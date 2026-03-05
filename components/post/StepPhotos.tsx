'use client'

import { useCallback, useState } from 'react'
import Image from 'next/image'
import { Upload, X, GripVertical, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface PhotoItem {
  file?: File
  url: string
  uploading?: boolean
  storagePath?: string
}

interface StepPhotosProps {
  photos: PhotoItem[]
  onChange: (photos: PhotoItem[]) => void
  error?: string
}

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

export function StepPhotos({ photos, onChange, error }: StepPhotosProps) {
  const [uploadError, setUploadError] = useState('')

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setUploadError('')
    const validFiles: File[] = []

    for (const f of Array.from(files)) {
      if (!ACCEPTED.includes(f.type)) {
        setUploadError('Only JPEG, PNG, and WebP images are allowed.')
        continue
      }
      if (f.size > MAX_SIZE) {
        setUploadError('Each image must be under 5 MB.')
        continue
      }
      validFiles.push(f)
    }

    if (validFiles.length === 0) return

    // Add placeholders
    const placeholders: PhotoItem[] = validFiles.map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
      uploading: true,
    }))
    const updated = [...photos, ...placeholders]
    onChange(updated)

    // Upload each to Supabase Storage
    const supabase = createClient()
    const results: PhotoItem[] = [...photos]

    for (const placeholder of placeholders) {
      const file = placeholder.file!
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${crypto.randomUUID()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('listing-photos')
        .upload(path, file, { contentType: file.type, upsert: false })

      if (upErr) {
        setUploadError(`Upload failed: ${upErr.message}`)
        continue
      }

      const { data: publicData } = supabase.storage
        .from('listing-photos')
        .getPublicUrl(path)

      results.push({
        url: publicData.publicUrl,
        storagePath: path,
        uploading: false,
      })
    }

    onChange(results)
  }, [photos, onChange])

  function removePhoto(index: number) {
    onChange(photos.filter((_, i) => i !== index))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
  }

  const allDone = photos.every((p) => !p.uploading)

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-5">
      <h2 className="text-xl font-semibold text-gray-900">Photos</h2>
      <p className="text-sm text-gray-500 -mt-3">
        Upload at least 3 photos. First photo is the thumbnail. Listings with 6+ photos get 3× more inquiries.
      </p>

      {/* Drop zone */}
      <label
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="flex flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-gray-300 hover:border-primary-400 bg-gray-50 hover:bg-primary-50/30 transition-colors cursor-pointer py-10 px-4"
      >
        <Upload className="w-8 h-8 text-gray-400" />
        <p className="text-sm text-gray-600 font-medium">Drag & drop photos or click to browse</p>
        <p className="text-xs text-gray-400">JPEG, PNG, or WebP · Max 5 MB each</p>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </label>

      {(uploadError || error) && (
        <div className="flex items-center gap-2 text-sm text-error">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {uploadError || error}
        </div>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {photos.map((photo, i) => (
            <div key={photo.url + i} className="relative aspect-square rounded-button overflow-hidden bg-gray-100 group">
              <Image
                src={photo.url}
                alt={`Upload ${i + 1}`}
                fill
                className="object-cover"
                sizes="120px"
              />
              {photo.uploading && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {/* Primary badge */}
              {i === 0 && !photo.uploading && (
                <span className="absolute bottom-1 left-1 text-[10px] bg-primary-600 text-white px-1.5 py-0.5 rounded font-medium">
                  Cover
                </span>
              )}
              {/* Remove */}
              <button
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        {photos.length} of 3 minimum photos uploaded
        {photos.length >= 3 && ' ✓'}
      </p>
    </div>
  )
}
