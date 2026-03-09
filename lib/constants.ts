export const NEIGHBORHOODS = [
  'The Hill',
  'University Hill',
  'Goss-Grove',
  'Baseline Sub',
  'Chautauqua',
  'Martin Acres',
  'North Boulder',
  'South Boulder',
  'Downtown',
]

export const NEIGHBORHOOD_ALIASES: Record<string, string> = {
  'Lower Chautauqua': 'Chautauqua',
  'Upper Chautauqua': 'Chautauqua',
  'University Hill': 'University Hill',
  'The Hill': 'The Hill',
  'Newlands': 'North Boulder',
  'Goss-Grove': 'Goss-Grove',
  'Whittier': 'North Boulder',
  'Mapleton Hill': 'North Boulder',
  'Downtown Boulder': 'Downtown',
  'Flatirons': 'Chautauqua',
  'South Boulder Creek': 'South Boulder',
  'Baseline': 'Baseline Sub',
  'Table Mesa': 'South Boulder',
  'Pearl Street': 'Downtown',
  'Pearl Street Mall': 'Downtown',
  'Gunbarrel': 'Downtown',
  'Martin Acres': 'Martin Acres',
  'CU Boulder': 'The Hill',
  'University of Colorado': 'The Hill',
  'West Boulder': 'Chautauqua',
  'Near CU Campus': 'The Hill',
}

export const QUICK_FILTERS = [
  { label: 'Short-Term Rentals', param: 'short_term' },
  { label: 'Pet Friendly', param: 'pets' },
  { label: 'Near Campus', param: 'near_campus' },
  { label: 'All Inclusive', param: 'utilities_included' },
]

export const ROOM_TYPES = [
  { value: 'private_room', label: 'Private Room' },
  { value: 'shared_room', label: 'Shared Room' },
  { value: 'full_apartment', label: 'Full Apartment' },
  { value: 'studio', label: 'Studio' },
]

export const AMENITIES = [
  'wifi',
  'parking',
  'laundry_in_unit',
  'laundry_in_building',
  'ac',
  'pets_allowed',
  'kitchen_access',
  'private_bathroom',
  'bike_storage',
  'gym',
  'pool',
  'balcony',
  'yard',
] as const

export const MANAGEMENT_COMPANIES = [
  'None / Self-managed',
  'Four Star Realty',
  'Rent Boulder',
  'Boulder Property Management',
  'Fox-Carskadon',
  'Pedal to Properties',
  'WK Real Estate',
  'Other',
]

export const MANAGEMENT_COMPANY_URLS: Record<string, string> = {
  'Four Star Realty': 'https://fourstarrealty.com/faqs/',
  'Rent Boulder': 'https://www.rentboulder.com/',
  'Boulder Property Management': 'https://www.boulderpropertymanagement.com/',
  'Fox-Carskadon': 'https://foxcarskadon.com/',
  'Pedal to Properties': 'https://pedaltoproperties.com/',
  'WK Real Estate': 'https://wkre.com/',
}

export const AMENITY_LABELS: Record<string, string> = {
  wifi: 'WiFi',
  parking: 'Parking',
  laundry_in_unit: 'In-Unit Laundry',
  laundry_in_building: 'Building Laundry',
  ac: 'A/C',
  pets_allowed: 'Pets Allowed',
  kitchen_access: 'Kitchen',
  private_bathroom: 'Private Bath',
  bike_storage: 'Bike Storage',
  gym: 'Gym',
  pool: 'Pool',
  balcony: 'Balcony',
  yard: 'Yard',
}
