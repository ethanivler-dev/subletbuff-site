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
import { CheckCircle } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

const STEPS = ['Basic Info', 'Photos', 'Details', 'Verify', 'Review']

const INITIAL_BASIC: BasicInfoData = {
  title: '',
  address: '',
  neighborhood: '',
  room_type: '',
  rent_monthly: '',
  deposit: '',
  available_from: '',
  available_to: '',
  min_stay_weeks: '1',
}

const INITIAL_DETAILS: DetailsData = {
  description: '',
  furnished: false,
  amenities: [],
  utilities_included: false,
  utilities_estimate: '',
  house_rules: '',
  roommate_info: '',
  is_intern_friendly: false,
  immediate_movein: false,
}

export default function PostListingPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [step, setStep] = useState(1)
  const [basicInfo, setBasicInfo] = useState<BasicInfoData>(INITIAL_BASIC)
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [details, setDetails] = useState<DetailsData>(INITIAL_DETAILS)
  const [basicErrors, setBasicErrors] = useState<Partial<Record<keyof BasicInfoData, string>>>({})
  const [detailsErrors, setDetailsErrors] = useState<Partial<Record<keyof DetailsData, string>>>({})
  const [photosError, setPhotosError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  function validateBasic(): boolean {
    const errs: Partial<Record<keyof BasicInfoData, string>> = {}
    if (!basicInfo.title || basicInfo.title.length < 10) errs.title = 'Title must be at least 10 characters'
    if (!basicInfo.address) errs.address = 'Address is required'
    if (!basicInfo.neighborhood) errs.neighborhood = 'Select a neighborhood'
    if (!basicInfo.room_type) errs.room_type = 'Select a room type'
    if (!basicInfo.rent_monthly || parseInt(basicInfo.rent_monthly) <= 0) errs.rent_monthly = 'Enter a valid rent amount'
    if (!basicInfo.available_from) errs.available_from = 'Required'
    if (!basicInfo.available_to) errs.available_to = 'Required'
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

      // Jitter coordinates (approximate — actual geocoding is server-side)
      // For now, use Boulder center + jitter. Geocoding Edge Function can update later.
      const baseLat = 40.0150
      const baseLng = -105.2705
      const jitterLat = baseLat + (Math.random() - 0.5) * 0.004
      const jitterLng = baseLng + (Math.random() - 0.5) * 0.004

      const uploadedPhotos = photos.filter((p) => !p.uploading)

      // Dual-write: populate both old and new column names so NOT NULL
      // constraints on the original schema are satisfied.
      const rentNum = parseInt(basicInfo.rent_monthly) || 0
      const depositNum = basicInfo.deposit ? parseInt(basicInfo.deposit) : null

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
          neighborhood: basicInfo.neighborhood,
          lat: baseLat,                          // old column
          lng: baseLng,                          // old column
          latitude: baseLat,                     // new column
          longitude: baseLng,                    // new column
          public_latitude: jitterLat,
          public_longitude: jitterLng,

          // === Pricing (old + new) ===
          monthly_rent: rentNum,                 // old column
          rent_monthly: rentNum,                 // new column
          security_deposit: depositNum,          // old column
          deposit: depositNum,                   // new column

          // === Dates (old + new) ===
          start_date: basicInfo.available_from,  // old column
          end_date: basicInfo.available_to,      // old column
          available_from: basicInfo.available_from,
          available_to: basicInfo.available_to,

          // === Room info (old + new) ===
          room_type: basicInfo.room_type,
          title: basicInfo.title,
          beds: '1',                             // old column
          baths: '1',                            // old column

          // === Details ===
          min_stay_weeks: parseInt(basicInfo.min_stay_weeks) || 1,
          description: details.description,
          furnished: details.furnished ? 'Yes' : 'No',
          amenities: details.amenities,
          utilities_included: details.utilities_included,
          utilities_estimate: details.utilities_estimate ? parseInt(details.utilities_estimate) : null,
          house_rules: details.house_rules || null,
          roommate_info: details.roommate_info || null,
          is_intern_friendly: details.is_intern_friendly,
          immediate_movein: details.immediate_movein,

          // === Photos + status ===
          photo_urls: uploadedPhotos.map((p) => p.url),
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

      // Insert into listing_photos table
      if (listing && uploadedPhotos.length > 0) {
        const photoRows = uploadedPhotos.map((p, i) => ({
          listing_id: listing.id,
          url: p.url,
          storage_path: p.storagePath ?? '',
          display_order: i,
          is_primary: i === 0,
          caption: p.caption || null,
        }))
        await supabase.from('listing_photos').insert(photoRows)
      }

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
          <p className="text-sm text-gray-500 mb-6">
            Your listing has been submitted for review. We&apos;ll approve it within 24 hours, and it&apos;ll go live on the site.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="primary" onClick={() => router.push('/listings')}>
              Browse Listings
            </Button>
            <Button variant="secondary" onClick={() => router.push('/')}>
              Go Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pt-16">
      {/* Step indicator */}
      <div className="border-b border-gray-100 py-6 px-4">
        <StepIndicator currentStep={step} steps={STEPS} />
      </div>

      {/* Step content */}
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {step === 1 && (
          <StepBasicInfo data={basicInfo} onChange={setBasicInfo} errors={basicErrors} />
        )}
        {step === 2 && (
          <StepPhotos photos={photos} onChange={setPhotos} error={photosError} />
        )}
        {step === 3 && (
          <StepDetails data={details} onChange={setDetails} errors={detailsErrors} />
        )}
        {step === 4 && (
          <StepVerification onSkip={nextStep} />
        )}
        {step === 5 && (
          <StepReview
            basicInfo={basicInfo}
            details={details}
            photos={photos}
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
