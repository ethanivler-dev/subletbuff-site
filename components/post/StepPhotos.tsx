'use client'

import { useCallback, useState, useRef } from 'react'
import Image from 'next/image'
import { Upload, X, GripVertical, AlertCircle, RotateCw, RotateCcw, FlipVertical2, Crop as CropIcon, Loader2 } from 'lucide-react'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { rotateImage } from '@/lib/image-rotate'
import { Modal } from '@/components/ui/Modal'

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
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

export function isHeic(file: File): boolean {
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.(heic|heif)$/i.test(file.name)
  )
}

export function StepPhotos({ photos, onChange, error }: StepPhotosProps) {
  const [uploadError, setUploadError] = useState('')
  const [rotatingIndex, setRotatingIndex] = useState<number | null>(null)
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  // Crop state
  const [cropPhotoIndex, setCropPhotoIndex] = useState<number | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [cropAspect, setCropAspect] = useState<number | undefined>(undefined)
  const cropImgRef = useRef<HTMLImageElement>(null)
  const [croppingInProgress, setCroppingInProgress] = useState(false)

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setUploadError('')
    const validFiles: File[] = []

    const fileArray = Array.from(files)

    for (const f of fileArray) {
      if (isHeic(f)) {
        setUploadError('HEIC files are not supported. Please convert to JPEG, PNG, or WebP before uploading.')
        continue
      }
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

    // Upload each via server-side API route
    const results: PhotoItem[] = [...photos]

    for (const placeholder of placeholders) {
      const file = placeholder.file!
      const formData = new FormData()
      formData.append('file', file)

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const data = await res.json()

        if (!res.ok) {
          setUploadError(`Upload failed: ${data.error || res.statusText}`)
          continue
        }

        results.push({
          url: data.url,
          storagePath: data.storage_path,
          uploading: false,
        })
      } catch {
        setUploadError('Upload failed: network error')
        continue
      }
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

  async function handleRotate(index: number, degrees: 90 | -90 | 180) {
    const photo = photos[index]
    if (!photo || photo.uploading || rotatingIndex !== null) return

    setRotatingIndex(index)
    try {
      const blob = await rotateImage(photo.url, degrees)

      // Revoke old blob URL if applicable
      if (photo.url.startsWith('blob:')) {
        URL.revokeObjectURL(photo.url)
      }

      const newUrl = URL.createObjectURL(blob)
      const newFile = new File([blob], 'rotated.jpg', { type: 'image/jpeg' })

      let updatedPhoto: PhotoItem = { ...photo, url: newUrl, file: newFile }

      // If already uploaded to Supabase, re-upload the rotated version
      if (photo.storagePath) {
        updatedPhoto = { ...updatedPhoto, uploading: true }
        onChange(photos.map((p, i) => (i === index ? updatedPhoto : p)))

        const formData = new FormData()
        formData.append('file', newFile)
        formData.append('storagePath', photo.storagePath)

        try {
          const res = await fetch('/api/upload', { method: 'POST', body: formData })
          const data = await res.json()
          if (res.ok) {
            updatedPhoto = {
              ...updatedPhoto,
              url: data.url,
              storagePath: data.storage_path,
              uploading: false,
            }
          } else {
            updatedPhoto = { ...updatedPhoto, uploading: false }
            setUploadError(`Re-upload failed: ${data.error || res.statusText}`)
          }
        } catch {
          updatedPhoto = { ...updatedPhoto, uploading: false }
          setUploadError('Re-upload failed: network error')
        }
      }

      onChange(photos.map((p, i) => (i === index ? updatedPhoto : p)))
    } catch {
      setUploadError('Failed to rotate image')
    } finally {
      setRotatingIndex(null)
    }
  }

  function openCrop(index: number) {
    const photo = photos[index]
    if (!photo || photo.uploading) return
    setCropPhotoIndex(index)
    setCrop(undefined)
    setCompletedCrop(undefined)
    setCropAspect(undefined)
  }

  async function applyCrop() {
    if (cropPhotoIndex === null || !completedCrop || !cropImgRef.current) return
    setCroppingInProgress(true)
    const photo = photos[cropPhotoIndex]
    try {
      const image = cropImgRef.current
      const canvas = document.createElement('canvas')
      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height
      canvas.width = completedCrop.width * scaleX
      canvas.height = completedCrop.height * scaleY
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image,
        completedCrop.x * scaleX, completedCrop.y * scaleY,
        completedCrop.width * scaleX, completedCrop.height * scaleY,
        0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/jpeg', 0.92)
      })
      if (photo.url.startsWith('blob:')) URL.revokeObjectURL(photo.url)
      const newUrl = URL.createObjectURL(blob)
      const newFile = new File([blob], 'cropped.jpg', { type: 'image/jpeg' })
      let updatedPhoto: PhotoItem = { ...photo, url: newUrl, file: newFile }
      if (photo.storagePath) {
        updatedPhoto = { ...updatedPhoto, uploading: true }
        onChange(photos.map((p, i) => (i === cropPhotoIndex ? updatedPhoto : p)))
        const formData = new FormData()
        formData.append('file', newFile)
        formData.append('storagePath', photo.storagePath)
        try {
          const res = await fetch('/api/upload', { method: 'POST', body: formData })
          const data = await res.json()
          if (res.ok) {
            updatedPhoto = { ...updatedPhoto, url: data.url, storagePath: data.storage_path, uploading: false }
          } else {
            updatedPhoto = { ...updatedPhoto, uploading: false }
            setUploadError(`Re-upload failed: ${data.error || res.statusText}`)
          }
        } catch {
          updatedPhoto = { ...updatedPhoto, uploading: false }
          setUploadError('Re-upload failed: network error')
        }
      }
      onChange(photos.map((p, i) => (i === cropPhotoIndex ? updatedPhoto : p)))
      setCropPhotoIndex(null)
    } catch {
      setUploadError('Failed to crop image')
    } finally {
      setCroppingInProgress(false)
    }
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
                {/* Crop & Rotate buttons */}
                {!photo.uploading && rotatingIndex !== i && (
                  <div className="absolute bottom-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); openCrop(i) }}
                      className="bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
                      aria-label="Crop photo"
                    >
                      <CropIcon className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRotate(i, -90) }}
                      className="bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
                      aria-label="Rotate counter-clockwise"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRotate(i, 90) }}
                      className="bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
                      aria-label="Rotate clockwise"
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRotate(i, 180) }}
                      className="bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
                      aria-label="Rotate 180 degrees"
                    >
                      <FlipVertical2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {/* Rotating spinner */}
                {rotatingIndex === i && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
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

      <Modal open={cropPhotoIndex !== null} onClose={() => setCropPhotoIndex(null)} title="Crop Photo">
        {cropPhotoIndex !== null && photos[cropPhotoIndex] && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              {[
                { label: 'Free', value: undefined },
                { label: '4:3', value: 4 / 3 },
                { label: '16:9', value: 16 / 9 },
                { label: '1:1', value: 1 },
              ].map((preset) => (
                <button key={preset.label} onClick={() => { setCropAspect(preset.value); setCrop(undefined); setCompletedCrop(undefined) }}
                  className={['px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                    cropAspect === preset.value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:border-gray-400'].join(' ')}>
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="max-h-[60vh] overflow-auto">
              <ReactCrop crop={crop} onChange={(c) => setCrop(c)} onComplete={(c) => setCompletedCrop(c)} aspect={cropAspect}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img ref={cropImgRef} src={photos[cropPhotoIndex].url} alt="Crop preview" className="max-w-full" crossOrigin="anonymous" />
              </ReactCrop>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button onClick={() => setCropPhotoIndex(null)} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={applyCrop} disabled={!completedCrop || croppingInProgress}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2">
                {croppingInProgress && <Loader2 className="w-4 h-4 animate-spin" />}
                Apply Crop
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
