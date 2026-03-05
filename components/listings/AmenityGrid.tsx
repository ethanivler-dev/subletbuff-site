import {
  Wifi, Car, WashingMachine, AirVent, PawPrint, CookingPot,
  Bath, Bike, Dumbbell, Waves, Fence, Trees,
} from 'lucide-react'
import { AMENITY_LABELS } from '@/lib/constants'

const AMENITY_ICONS: Record<string, typeof Wifi> = {
  wifi: Wifi,
  parking: Car,
  laundry_in_unit: WashingMachine,
  laundry_in_building: WashingMachine,
  ac: AirVent,
  pets_allowed: PawPrint,
  kitchen_access: CookingPot,
  private_bathroom: Bath,
  bike_storage: Bike,
  gym: Dumbbell,
  pool: Waves,
  balcony: Fence,
  yard: Trees,
}

interface AmenityGridProps {
  amenities: string[]
}

export function AmenityGrid({ amenities }: AmenityGridProps) {
  if (!amenities || amenities.length === 0) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {amenities.map((key) => {
        const Icon = AMENITY_ICONS[key]
        const label = AMENITY_LABELS[key] ?? key.replace(/_/g, ' ')
        return (
          <div
            key={key}
            className="flex items-center gap-3 p-3 rounded-button bg-gray-50 text-gray-700"
          >
            {Icon ? <Icon className="w-5 h-5 text-primary-600 flex-shrink-0" /> : <span className="w-5" />}
            <span className="text-sm">{label}</span>
          </div>
        )
      })}
    </div>
  )
}
