export interface ActivityItem {
  id: string;
  title: string;
  category?: 'Sightseeing' | 'Nature' | 'Cultural' | 'Adventure' | 'Relaxation' | 'Heritage' | 'Shopping';
  timing?: 'Morning' | 'Afternoon' | 'Evening' | 'Night' | 'Full Day';
  description?: string;
  isSelected: boolean;
  isCustom?: boolean;
  isVerified?: boolean;
}

export interface AccommodationItem {
  id: string;
  destination: string;
  hotelName: string;
  roomCategory: string;
  checkInDate: string;
  nights: number;
  mealPlan: string;
  status: 'Confirmed' | 'Reserved' | 'Voucher Issued';
  b2bPrice?: number | string; // B2B cost price per stay or per night
  b2bTotal?: number | string;
}

export interface DayItinerary {
  dayNumber: number;
  date: string;
  title: string;
  destination: string;
  overnightStay: string;
  route: string;
  summary: string;
  mealsIncluded: string;
  activities: ActivityItem[];
}

export interface TripDetails {
  id: string;
  voucherNumber: string;
  tripTitle: string;
  guestName: string;
  guestContact: string;
  guestEmail: string;
  agentName?: string;
  agentContact?: string;
  adultsCount: number;
  childrenCount: number;
  childrenAges: string;
  durationDays: number;
  durationNights: number;
  pickupDate: string;
  pickupTime?: string;
  pickupLocation: string;
  dropoffDate: string;
  dropoffTime?: string;
  dropoffLocation: string;
  routeSummary: string;
  vehicleType: string;
  vehicleNotes: string;
  totalPackageCost: string;
  costTerms: string;
  advancePaid?: string;
  balancePayable?: string;
  bookingStatus: 'Confirmed' | 'Draft' | 'Sent to Guest' | 'Under Review';
  inclusions: string[];
  exclusions: string[];
  accommodations: AccommodationItem[];
  days: DayItinerary[];
  specialNotes?: string;
  createdAt?: string;
  updatedAt?: string;

  // B2B Pricing Engine
  vehicleCharge?: number | string;
  marginType?: 'percentage' | 'custom';
  marginPercent?: number;
  marginCustomAmount?: number | string;
  adjustmentAmount?: number | string;
  advancePercentage?: number;
}

export interface DestinationCatalogItem {
  destination: string;
  tagline: string;
  description: string;
  heroImage?: string;
  defaultActivities: Array<Omit<ActivityItem, 'isSelected'>>;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  token?: string;
  isAuthenticated: boolean;
}

export interface PlannerImportPayload {
  guest_name?: string;
  guest_phone?: string;
  guest_email?: string;
  pax_adults?: number;
  pax_children?: number;
  children_ages?: string;
  pickup_date?: string;
  pickup_point?: string;
  drop_date?: string;
  drop_point?: string;
  route?: string;
  vehicle?: string;
  voucher_no?: string;
  total_cost?: string;
  stays?: Array<{
    destination: string;
    hotel: string;
    room_category: string;
    nights: number;
    meal_plan: string;
    check_in?: string;
  }>;
    days?: Array<{
    day: number;
    date?: string;
    title: string;
    destination: string;
    activities?: string[];
  }>;
}

export interface SeasonRateBracket {
  id: string;
  season_name: string; // e.g. "Off-Peak", "Regular Season", "Peak Festive", "High Season"
  date_start?: string;  // e.g. "01-Jun"
  date_end?: string;    // e.g. "30-Sep"
  date_bracket: string; // e.g. "01-Jun to 30-Sep"
  base_rate: number;   // base B2B price for this season
  ep_rate?: number;    // European Plan (Room Only)
  cp_rate?: number;    // Continental Plan (Breakfast)
  map_rate?: number;   // Modified American Plan (Breakfast & Dinner)
  ap_rate?: number;    // American Plan (All Meals)
  extra_adult?: number;// Extra bed adult
  child_with_bed?: number; // Child with bed
  child_no_bed?: number;   // Child without bed
}

export interface RoomModel {
  id: string;
  hotel_id: string;
  room_category: string;
  base_b2b_rate: number; // represents base CP rate per room per night
  max_occupancy?: string; // e.g. "2 Adults + 1 Child"
  total_inventory?: number; // e.g. 10 rooms
  seasons?: SeasonRateBracket[];
}

export interface HotelModel {
  id: string;
  destination: string;
  hotel_name: string;
  star_rating: number | string; // e.g. 3, 4, 5, 'Luxury', 'Heritage'
  status: boolean; // true = Active, false = Inactive
  rooms: RoomModel[];
}

export type MealPlanCode = 'CP' | 'MAP' | 'AP' | 'EP';

export interface MealPlanModifier {
  plan: MealPlanCode;
  label: string;
  rateMultiplier: number;
  flatAddition: number;
}
