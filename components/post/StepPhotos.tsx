'use client'

import { useCallback, useState, useRef } from 'react'
import Image from 'next/image'
import { Upload, X, GripVertical, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface PhotoItem {
  file?: File
  url: string
  uploading?: boolean
  storagePath?: string
  caption?: string
}

interface StepPhotosProps {
  photos: PhotoItem[]
  onChange: (photos: PhotoItem[]) => void
  error?: string
}

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

function isHeic(file: File): boolean {
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.(heic|heif)$/i.test(file.name)
  )
}

type Heic2AnyFn = (opts: { blob: Blob; toType: string; quality: number }) => Promise<Blob | Blob[]>

async function convertHeicToJpeg(file: File): Promise<File> {
  try {
    const mod = await import('heic2any')
    // heic2any may be the function directly (CJS) or under .default (ESM)
    const modRecord = mod as Record<string, unknown>
    const fn = (typeof modRecord['default'] === 'function'
      ? modRecord['default']
      : mod) as Heic2AnyFn
    const result = await fn({ blob: file, toType: 'image/jpeg', quality: 0.9 })
    const blob = Array.isArray(result) ? result[0] : result
    const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg') || 'photo.jpg'
    return new File([blob], newName, { type: 'image/jpeg' })
  } catch (err) {
    console.error('HEIC conversion failed:', err)
    throw err
  }
}

export function StepPhotos({ photos, onChange, error }: StepPhotosProps) {
  const [uploadError, setUploadError] = useState('')
  const [converting, setConverting] = useState(false)
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setUploadError('')
    const validFiles: File[] = []

    const fileArray = Array.from(files)
    if (fileArray.some(isHeic)) setConverting(true)

    for (const raw of fileArray) {
      let f = raw
      if (isHeic(f)) {
        try {
          f = await convertHeicToJpeg(f)
        } catch {
          setUploadError('Failed to convert HEIC image. Try exporting as JPEG first.')
          setConverting(false)
          return
        }
      } else if (!ACCEPTED.includes(f.type)) {
        setUploadError('Only JPEG, PNG, WebP, and HEIC images are allowed.')
        continue
      }
      if (f.size > MAX_SIZE) {
        setUploadError('Each image must be under 5 MB.')
        continue
      }
      validFiles.push(f)
    }
    setConverting(false)

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

  function updateCaption(index: number, caption: string) {
    const updated = photos.map((p, i) => i === index ? { ...p, caption } : p)
    onChange(updated)
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
  }

  /* --- Drag-to-reorder handlers --- */
  function handleDragStart(e: React.DragEvent, index: number) {
    dragIndexRef.current = index
    e.dataTransfer.effectAllowed = 'move'
    // Make the drag image slightly transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5'
    }
  }

  function handleDragEnd(e: React.DragEvent) {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
    dragIndexRef.current = null
    setDragOverIndex(null)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragIndexRef.current !== null && dragIndexRef.current !== index) {
      setDragOverIndex(index)
    }
  }

  function handleReorderDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault()
    e.stopPropagation()
    setDragOverIndex(null)
    const fromIndex = dragIndexRef.current
    if (fromIndex === null || fromIndex === dropIndex) return

    const reordered = [...photos]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(dropIndex, 0, moved)
    onChange(reordered)
    dragIndexRef.current = null
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-5">
      <h2 className="text-xl font-semibold text-gray-900">Photos</h2>
      <p className="text-sm text-gray-500 -mt-3">
        Upload at least 3 photos. Drag to reorder — first photo is the cover. Listings with 6+ photos get 3× more inquiries.
      </p>

      {/* Drop zone */}
      <label
        onDrop={handleFileDrop}
        onDragOver={(e) => e.preventDefault()}
        className="flex flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-gray-300 hover:border-primary-400 bg-gray-50 hover:bg-primary-50/30 transition-colors cursor-pointer py-10 px-4"
      >
        {converting ? (
          <>
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600 font-medium">Converting HEIC…</p>
          </>
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-400" />
            <p className="text-sm text-gray-600 font-medium">Drag & drop photos or click to browse</p>
            <p className="text-xs text-gray-400">JPEG, PNG, WebP, or HEIC · Max 5 MB each</p>
          </>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
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

      {/* Photo grid — drag to reorder */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {photos.map((photo, i) => (
            <div
              key={photo.url + i}
              draggable={!photo.uploading}
              onDragStart={(e) => handleDragStart(e, i)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={(e) => handleReorderDrop(e, i)}
              className={[
                'flex flex-col gap-1.5 transition-all',
                dragOverIndex === i ? 'ring-2 ring-primary-400 ring-offset-2 rounded-button' : '',
              ].join(' ')}
            >
              <div className="relative aspect-square rounded-button overflow-hidden bg-gray-100 group cursor-grab active:cursor-grabbing">
                <Image
                  src={photo.url}
                  alt={`Upload ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="180px"
                />
                {photo.uploading && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {/* Drag handle */}
                {!photo.uploading && (
                  <div className="absolute top-1 left-1 bg-black/50 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-3.5 h-3.5" />
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
              {/* Caption input */}
              {!photo.uploading && (
                <textarea
                  placeholder="Add a note…"
                  value={photo.caption ?? ''}
                  onChange={(e) => updateCaption(i, e.target.value)}
                  onInput={(e) => {
                    const el = e.currentTarget
                    el.style.height = 'auto'
                    el.style.height = el.scrollHeight + 'px'
                  }}
                  maxLength={120}
                  rows={1}
                  className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-button bg-white text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none overflow-hidden"
                />
              )}
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
