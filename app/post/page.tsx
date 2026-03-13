'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { StepIndicator } from '@/components/post/StepIndicator'
import { StepBasicInfo, type BasicInfoData } from '@/components/post/StepBasicInfo'
import { StepPhotos, type PhotoItem } from '@/components/post/StepPhotos'
import { StepDetails, type DetailsData } from '@/components/post/StepDetails'
import { StepVerification } from '@/components/post/StepVerification'
import { StepReview } from '@/components/post/StepReview'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { isStagingEnvironment } from '@/lib/appEnv'
import { CheckCircle, Trash2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

const STEPS = ['Basic Info', 'Photos', 'Details', 'Verify', 'Review']
const DRAFT_KEY = 'subletbuff_draft_listing'

const INITIAL_BASIC: BasicInfoData = {
  title: '',
  address: '',
  unit_number: '',
  neighborhood: '',
  latitude: '',
  longitude: '',
  room_type: '',
  bedrooms: '1',
  bathrooms: '1',
  rent_monthly: '',
  deposit: '',
  available_from: '',
  available_to: '',
  min_stay: '1m',
  auto_reduce_enabled: false,
  auto_reduce_amount: '',
  auto_reduce_interval_days: '14',
  auto_reduce_max_times: '3',
  private_bathroom: false,
  management_company: 'None / Self-managed',
  management_company_custom: '',
}

const INITIAL_DETAILS: DetailsData = {
  description: '',
  furnished: false,
  furnished_details: '',
  amenities: [],
  utilities_included: false,
  utilities_estimate: '',
  house_rules: '',
  roommate_info: '',
  is_intern_friendly: false,
  immediate_movein: false,
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

/** Compute and set date errors from given data. Returns the errors object. */
function computeDateErrors(
  info: BasicInfoData,
  existing: Partial<Record<keyof BasicInfoData, string>>,
): Partial<Record<keyof BasicInfoData, string>> {
  const errs = { ...existing }
  delete errs.available_from
  delete errs.available_to

  const today = new Date().toISOString().split('T')[0]

  if (!info.available_from) {
    errs.available_from = 'Required'
  } else if (info.available_from < today) {
    errs.available_from = 'Move-in date cannot be in the past'
  }

  if (!info.available_to) {
    errs.available_to = 'Required'
  } else if (info.available_from && info.available_to <= info.available_from) {
    errs.available_to = 'End date must be after start date'
  } else if (info.available_from && info.min_stay !== 'flexible') {
    const months = parseInt(info.min_stay.replace('m', ''))
    const minEnd = addMonths(info.available_from, months)
    if (info.available_to < minEnd) {
      errs.available_to = `Dates must cover at least ${months} month${months > 1 ? 's' : ''} (your minimum stay)`
    }
  }

  return errs
}

export default function PostListingPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [eduEmail, setEduEmail] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [step, setStep] = useState(1)
  const [basicInfo, setBasicInfo] = useState<BasicInfoData>(INITIAL_BASIC)
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [details, setDetails] = useState<DetailsData>(INITIAL_DETAILS)
  const [basicErrors, setBasicErrors] = useState<Partial<Record<keyof BasicInfoData, string>>>({})
  const [detailsErrors, setDetailsErrors] = useState<Partial<Record<keyof DetailsData, string>>>({})
  const [photosError, setPhotosError] = useState('')
  const [leaseDocPath, setLeaseDocPath] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedId, setSubmittedId] = useState<string | null>(null)

  // Auth check + fetch edu_email
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user)
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('edu_email')
          .eq('id', data.user.id)
          .single()
        if (profile?.edu_email) setEduEmail(profile.edu_email)
      }
    })
  }, [])

  // Restore draft from localStorage on mount (data first, then step)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const draft = JSON.parse(saved)
        if (draft.basicInfo) setBasicInfo({ ...INITIAL_BASIC, ...draft.basicInfo })
        if (draft.details) setDetails({ ...INITIAL_DETAILS, ...draft.details })
        if (Array.isArray(draft.photos)) setPhotos(draft.photos)
        if (typeof draft.leaseDocPath === 'string') setLeaseDocPath(draft.leaseDocPath)
        if (typeof draft.step === 'number') setStep(draft.step)
      }
    } catch {}
    setInitialized(true)
  }, [])

  // Save draft to localStorage whenever form state changes
  useEffect(() => {
    if (!initialized) return
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          step,
          basicInfo,
          details,
          leaseDocPath,
          photos: photos
            .filter((p) => !p.uploading)
            .map(({ url, storagePath, caption }) => ({ url, storagePath, caption, uploading: false })),
        }),
      )
    } catch {}
  }, [initialized, step, basicInfo, details, photos, leaseDocPath])

  function clearDraft() {
    const confirmed = window.confirm(
      'Are you sure? This will clear all form data including uploaded photos. This cannot be undone.',
    )
    if (!confirmed) return
    try { localStorage.removeItem(DRAFT_KEY) } catch {}
    setBasicInfo(INITIAL_BASIC)
    setDetails(INITIAL_DETAILS)
    setPhotos([])
    setLeaseDocPath('')
    setStep(1)
    setBasicErrors({})
    setDetailsErrors({})
    setPhotosError('')
  }

  /**
   * Handle BasicInfo changes. When available_from or min_stay change, clear
   * available_to if it's now before the minimum. Also re-validate date errors live.
   */
  function handleBasicInfoChange(newData: BasicInfoData) {
    let updated = newData

    // If available_from or min_stay changed, enforce the Available To minimum
    const fromChanged = newData.available_from !== basicInfo.available_from
    const stayChanged = newData.min_stay !== basicInfo.min_stay

    if ((fromChanged || stayChanged) && newData.available_from && newData.available_to) {
      const months = newData.min_stay === 'flexible' ? 0 : parseInt(newData.min_stay.replace('m', ''))
      if (months > 0) {
        const minEnd = addMonths(newData.available_from, months)
        if (newData.available_to < minEnd) {
          updated = { ...newData, available_to: '' }
        }
      }
    }

    setBasicInfo(updated)

    // Auto-clear immediate_movein if available_from moves beyond 14 days out
    if (fromChanged && updated.available_from && details.immediate_movein) {
      const from = new Date(updated.available_from + 'T00:00:00')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const daysOut = (from.getTime() - today.getTime()) / 86400000
      if (daysOut > 14) {
        setDetails((d) => ({ ...d, immediate_movein: false }))
      }
    }

    // Re-validate date fields live whenever they or min_stay change
    if (fromChanged || stayChanged || newData.available_to !== basicInfo.available_to) {
      const hasDateErrors =
        basicErrors.available_from !== undefined || basicErrors.available_to !== undefined
      if (hasDateErrors || fromChanged || stayChanged) {
        setBasicErrors((prev) => computeDateErrors(updated, prev))
      }
    }
  }

  function validateBasic(): boolean {
    const errs: Partial<Record<keyof BasicInfoData, string>> = {}
    if (!basicInfo.title || basicInfo.title.length < 10) {
      errs.title = 'Title must be at least 10 characters'
    } else if (/^\d+\s/.test(basicInfo.title.trim())) {
      errs.title = 'Looks like an address — try a descriptive title instead (e.g. "Sunny 1BR on The Hill")'
    }
    if (!basicInfo.address) errs.address = 'Address is required'
    if (!basicInfo.neighborhood) errs.neighborhood = 'Neighborhood could not be detected. Try a slightly different address.'
    if (!basicInfo.room_type) errs.room_type = 'Select a room type'
    if (!basicInfo.rent_monthly || parseInt(basicInfo.rent_monthly) <= 0) errs.rent_monthly = 'Enter a valid rent amount'

    const dateErrs = computeDateErrors(basicInfo, {})
    Object.assign(errs, dateErrs)

    setBasicErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validatePhotos(): boolean {
    const uploadedPhotos = photos.filter((p) => !p.uploading)
    if (uploadedPhotos.length < 3) {
      setPhotosError('Please upload at least 3 photos')
      return false
    }
    setPhotosError('')
    return true
  }

  function validateDetails(): boolean {
    const errs: Partial<Record<keyof DetailsData, string>> = {}
    if (!details.description || details.description.length < 100) {
      errs.description = 'Description must be at least 100 characters'
    }
    setDetailsErrors(errs)
    return Object.keys(errs).length === 0
  }

  function nextStep() {
    if (step === 1 && !validateBasic()) return
    if (step === 2 && !validatePhotos()) return
    if (step === 3 && !validateDetails()) return
    setStep((s) => Math.min(s + 1, STEPS.length))
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 1))
  }

  function goToStep(s: number) {
    setStep(s)
  }

  async function handleSubmit() {
    if (!user) return
    setSubmitting(true)

    try {
      const supabase = createClient()

      const baseLat = basicInfo.latitude ? parseFloat(basicInfo.latitude) : 40.0150
      const baseLng = basicInfo.longitude ? parseFloat(basicInfo.longitude) : -105.2705
      const jitterLat = baseLat + (Math.random() - 0.5) * 0.004
      const jitterLng = baseLng + (Math.random() - 0.5) * 0.004

      const uploadedPhotos = photos.filter((p) => !p.uploading)
      const isStaging = isStagingEnvironment()

      const rentNum = parseInt(basicInfo.rent_monthly) || 0
      const depositNum = basicInfo.deposit ? parseInt(basicInfo.deposit) : null
      const minStayMonths = basicInfo.min_stay === 'flexible'
        ? null
        : parseInt(basicInfo.min_stay.replace('m', ''))

      const { data: listing, error: insertError } = await supabase
        .from('listings')
        .insert({
          // === Identity ===
          user_id: user.id,
          lister_id: user.id,
          email: user.email ?? '',
          first_name: user.user_metadata?.full_name?.split(' ')[0] ?? '',
          last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') ?? '',

          // === Location ===
          address: basicInfo.address,
          unit_number: basicInfo.unit_number || null,
          neighborhood: basicInfo.neighborhood,
          lat: baseLat,
          lng: baseLng,
          latitude: baseLat,
          longitude: baseLng,
          public_latitude: jitterLat,
          public_longitude: jitterLng,

          // === Pricing ===
          monthly_rent: rentNum,
          rent_monthly: rentNum,
          security_deposit: depositNum,
          deposit: depositNum,

          // === Dates ===
          start_date: basicInfo.available_from,
          end_date: basicInfo.available_to,
          available_from: basicInfo.available_from,
          available_to: basicInfo.available_to,

          // === Room info ===
          room_type: basicInfo.room_type,
          title: basicInfo.title,
          beds: basicInfo.bedrooms || '1',
          baths: basicInfo.bathrooms || '1',

          // === Stay requirements ===
          min_stay_weeks: minStayMonths ? minStayMonths * 4 : 0,
          min_stay_months: minStayMonths,

          // === Details ===
          description: details.description,
          furnished: details.furnished
            ? (details.furnished_details ? `Yes - ${details.furnished_details}` : 'Yes')
            : 'No',
          amenities: basicInfo.private_bathroom
            ? [...details.amenities.filter(a => a !== 'private_bathroom'), 'private_bathroom']
            : details.amenities.filter(a => a !== 'private_bathroom'),
          utilities_included: details.utilities_included,
          utilities_estimate: details.utilities_estimate ? parseInt(details.utilities_estimate) : null,
          house_rules: details.house_rules || null,
          roommate_info: details.roommate_info || null,
          is_intern_friendly: details.is_intern_friendly,
          immediate_movein: details.immediate_movein,

          // === Auto price reduction ===
          auto_reduce_enabled: basicInfo.auto_reduce_enabled,
          auto_reduce_amount: basicInfo.auto_reduce_enabled && basicInfo.auto_reduce_amount
            ? parseInt(basicInfo.auto_reduce_amount) : null,
          auto_reduce_interval_days: basicInfo.auto_reduce_enabled && basicInfo.auto_reduce_interval_days
            ? parseInt(basicInfo.auto_reduce_interval_days) : null,
          auto_reduce_max_times: basicInfo.auto_reduce_enabled && basicInfo.auto_reduce_max_times
            ? parseInt(basicInfo.auto_reduce_max_times) : null,

          // === Management company ===
          management_company: basicInfo.management_company === 'Other'
            ? (basicInfo.management_company_custom || null)
            : (basicInfo.management_company && basicInfo.management_company !== 'None / Self-managed')
              ? basicInfo.management_company : null,

          // === Lease verification ===
          lease_document_path: leaseDocPath || null,
          lease_status: leaseDocPath ? 'pending' : 'none',

          // === Photos + status ===
          photo_urls: uploadedPhotos.map((p) => p.url),
          test_listing: isStaging,
          status: 'pending',
          paused: false,
          filled: false,
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('Supabase insert error:', insertError.message, insertError.details, insertError.hint, insertError.code)
        throw insertError
      }

      // Move photos to listing-scoped path and insert into listing_photos table
      if (listing && uploadedPhotos.length > 0) {
        const movedPhotos: { url: string; storagePath: string; caption: string | null }[] = []

        for (const p of uploadedPhotos) {
          const oldPath = p.storagePath
          if (oldPath) {
            const filename = oldPath.split('/').pop() ?? oldPath
            const newPath = `listings/${listing.id}/${filename}`

            const { error: moveErr } = await supabase.storage
              .from('listing-photos')
              .move(oldPath, newPath)

            if (!moveErr) {
              const { data: urlData } = supabase.storage
                .from('listing-photos')
                .getPublicUrl(newPath)
              movedPhotos.push({ url: urlData.publicUrl, storagePath: newPath, caption: p.caption || null })
            } else {
              // Fallback: keep original path if move fails
              movedPhotos.push({ url: p.url, storagePath: oldPath, caption: p.caption || null })
            }
          } else {
            movedPhotos.push({ url: p.url, storagePath: '', caption: p.caption || null })
          }
        }

        const photoRows = movedPhotos.map((p, i) => ({
          listing_id: listing.id,
          url: p.url,
          storage_path: p.storagePath,
          display_order: i,
          is_primary: i === 0,
          caption: p.caption,
        }))
        await supabase.from('listing_photos').insert(photoRows)

        // Update photo_urls on the listing with final URLs
        await supabase
          .from('listings')
          .update({ photo_urls: movedPhotos.map((p) => p.url) })
          .eq('id', listing.id)
      }

      try { localStorage.removeItem(DRAFT_KEY) } catch {}
      if (listing) setSubmittedId(listing.id)
      setSubmitted(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Unknown error'
      console.error('Submit error:', err)
      alert(`Something went wrong: ${msg}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pt-16">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h1 className="font-serif text-2xl text-gray-900 mb-2">Listing Submitted!</h1>
          <p className="text-sm text-gray-500 mb-2">
            Your listing has been submitted for review. We&apos;ll approve it within 24 hours, and it&apos;ll go live on the site.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            You&apos;ll get an email when approved.
          </p>
          <div className="flex flex-col gap-3 items-center">
            {submittedId && (
              <Button variant="primary" onClick={() => router.push(`/listings/${submittedId}`)}>
                Preview Your Listing
              </Button>
            )}
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => router.push('/listings')}>
                Browse Listings
              </Button>
              <Button variant="secondary" onClick={() => router.push('/')}>
                Go Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show spinner until localStorage draft is restored
  if (!initialized) {
    return (
      <div className="min-h-screen bg-white pt-16 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pt-16">
      {/* Step indicator + Clear Draft */}
      <div className="border-b border-gray-100 py-6 px-4">
        <div className="relative">
          <StepIndicator currentStep={step} steps={STEPS} />
          <button
            onClick={clearDraft}
            className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors px-2 py-1"
            title="Clear draft & start over"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear Draft</span>
          </button>
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === 1 && (
          <StepBasicInfo data={basicInfo} onChange={handleBasicInfoChange} errors={basicErrors} />
        )}
        {step === 2 && (
          <StepPhotos photos={photos} onChange={setPhotos} error={photosError} />
        )}
        {step === 3 && (
          <StepDetails data={details} onChange={setDetails} errors={detailsErrors} availableFrom={basicInfo.available_from} />
        )}
        {step === 4 && user && (
          <StepVerification
            userId={user.id}
            leaseDocPath={leaseDocPath || undefined}
            eduEmail={eduEmail}
            onLeaseUpload={setLeaseDocPath}
            onEduVerified={setEduEmail}
            onSkip={nextStep}
          />
        )}
        {step === 5 && (
          <StepReview
            basicInfo={basicInfo}
            details={details}
            photos={photos}
            leaseDocPath={leaseDocPath || undefined}
            onEdit={goToStep}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        )}

        {/* Navigation buttons */}
        {step < 5 && (
          <div className="max-w-xl mx-auto flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            {step > 1 ? (
              <Button variant="ghost" onClick={prevStep}>← Back</Button>
            ) : (
              <span />
            )}
            <Button variant="primary" onClick={nextStep}>
              {step === 4 ? 'Continue' : 'Next →'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
