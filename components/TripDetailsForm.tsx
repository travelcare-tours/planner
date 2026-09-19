'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Calendar, 
  MapPin, 
  Car, 
  CreditCard, 
  Hotel, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Layers, 
  FileText,
  Sparkles,
  Phone,
  Receipt,
  MessageSquare,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Info,
  Check,
  Navigation,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  RefreshCw,
  Route as RouteIcon,
  X,
  Minus,
  Pencil,
  Loader2,
  Search,
  ChevronsUpDown,
  ListOrdered,
  LayoutGrid
} from 'lucide-react';
import { TripDetails, AccommodationItem, DayItinerary } from '@/types/itinerary';
import { INITIAL_DESTINATIONS_CATALOG } from '@/lib/sample-data';
import DatePicker, { parseDateSafe } from '@/components/DatePicker';
import { PREFERRED_STAY_HUBS } from '@/components/WhatsappLeadsView';

interface TripDetailsFormProps {
  trip: TripDetails;
  onUpdateTrip: (updated: TripDetails) => void;
  onLoadPreset?: (presetKey: string) => void;
  onProceedToActivities?: () => void;
  onNavigateToActivities?: () => void;
  onNavigateToPreview?: () => void;
  onNavigateToWhatsappLeads?: () => void;
}

const LOCATION_OPTIONS = [
  'Cochin International Airport (COK)',
  'Thiruvananthapuram International Airport (TRV)',
  'Ernakulam Railway Station',
  'Trivandrum Railway Station',
  'Cochin',
  'Thiruvananthapuram',
];

const VEHICLE_OPTIONS = [
  'Sedan',
  'SUV',
  'Traveller 12 Seat',
];

const MEAL_PLAN_OPTIONS = [
  'EP - Room Only',
  'CP - Room + Breakfast Included',
  'MAP - Room + Breakfast + One Major Meal',
  'AP - Room + Breakfast + Lunch + Dinner',
];

// Popular Kerala Destinations with curated defaults
const POPULAR_DESTINATIONS: { name: string; tag: string; defaultHotel: string; defaultRoom: string; defaultNights: number }[] = [
  { name: 'Munnar', tag: 'Hill Station & Tea Gardens', defaultHotel: 'The Leaf Munnar Resort', defaultRoom: 'Deluxe Green Leaf Room', defaultNights: 2 },
  { name: 'Thekkady', tag: 'Wildlife & Spices', defaultHotel: 'Pepper Vine Hotel', defaultRoom: 'Deluxe Room', defaultNights: 1 },
  { name: 'Alleppey', tag: 'Backwaters & Houseboat', defaultHotel: 'Private Premium AC Houseboat', defaultRoom: '1 Bed Private Houseboat', defaultNights: 1 },
  { name: 'Kovalam', tag: 'Beach & Lighthouse', defaultHotel: 'Uday Samudra Leisure Beach Hotel', defaultRoom: 'Superior Room', defaultNights: 2 },
  { name: 'Cochin', tag: 'Heritage & Airport Hub', defaultHotel: 'Trident Cochin', defaultRoom: 'Deluxe Room', defaultNights: 1 },
  { name: 'Kumarakom', tag: 'Vembanad Lake & Birds', defaultHotel: 'Whispering Palms Lake Resort', defaultRoom: 'Lake View Room', defaultNights: 1 },
  { name: 'Wayanad', tag: 'Waterfalls & Mist', defaultHotel: 'Morickap Resort', defaultRoom: 'Suite Room', defaultNights: 2 },
  { name: 'Kanyakumari', tag: 'Sunrise & Cape Point', defaultHotel: 'Sparsa Resort', defaultRoom: 'Deluxe Room', defaultNights: 1 },
  { name: 'Poovar', tag: 'Golden Beach & Estuary', defaultHotel: 'Poovar Island Resort', defaultRoom: 'Floating Cottage', defaultNights: 1 },
  { name: 'Athirappilly', tag: 'Waterfalls of India', defaultHotel: 'Rainforest Resort', defaultRoom: 'Waterfall Facing Room', defaultNights: 1 },
  { name: 'Varkala', tag: 'Cliff Beach & Sunset', defaultHotel: 'Gateway Hotel Varkala', defaultRoom: 'Sea View Room', defaultNights: 1 },
  { name: 'Marari', tag: 'Serene Beach Retreat', defaultHotel: 'Marari Beach Resort', defaultRoom: 'Garden Villa', defaultNights: 1 },
];

// Pure ID generator for stable component renders
let globalIdCounter = 1000;
function createUniqueId(prefix = 'acc'): string {
  globalIdCounter += 1;
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 7);
  return `${prefix}-${timestamp}-${globalIdCounter}-${randomStr}`;
}

// Helper to parse dates in formats like "19th Sept 2026", "2026-09-19", "19/09/2026"
function parseDateFlexible(dateStr: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  const cleaned = dateStr.replace(/(\d+)(st|nd|rd|th)/gi, '$1').trim();
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) return parsed;

  const parts = cleaned.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);
    if (p2 > 1000) {
      const d = new Date(p2, p1 - 1, p0);
      if (!isNaN(d.getTime())) return d;
    }
    if (p0 > 1000) {
      const d = new Date(p0, p1 - 1, p2);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

// Convert any date string to YYYY-MM-DD for native HTML5 date input
function toDateInputValue(dateStr: string): string {
  if (!dateStr || !dateStr.trim()) return '';
  const matchIso = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchIso) return dateStr.trim();

  const d = parseDateFlexible(dateStr);
  if (!d || isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Format date into human-readable e.g. "19th Sept 2026"
function formatDateDisplay(dateStr: string): string {
  if (!dateStr || !dateStr.trim()) return '';
  const d = parseDateFlexible(dateStr);
  if (!d || isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const suffix = (day === 1 || day === 21 || day === 31) ? 'st' :
                 (day === 2 || day === 22) ? 'nd' :
                 (day === 3 || day === 23) ? 'rd' : 'th';
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day}${suffix} ${month} ${year}`;
}

// Calculate days between two dates
function calculateNightsBetween(pickupStr: string, dropoffStr: string): number | null {
  const d1 = parseDateFlexible(pickupStr);
  const d2 = parseDateFlexible(dropoffStr);
  if (d1 && d2) {
    const diffMs = d2.getTime() - d1.getTime();
    const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (nights > 0 && nights <= 60) return nights;
  }
  return null;
}

// Calculate sequential check-in dates for accommodation items starting from pickupDate
function calculateSequentialCheckInDates(
  pickupDateStr: string,
  accommodations: AccommodationItem[]
): AccommodationItem[] {
  const base = parseDateFlexible(pickupDateStr);
  if (!base) return accommodations;

  let cumulativeDays = 0;
  return accommodations.map((acc) => {
    const d = new Date(base.getTime());
    d.setDate(d.getDate() + cumulativeDays);
    const dateFormatted = formatDateDisplay(d.toISOString().slice(0, 10));
    cumulativeDays += Math.max(1, Number(acc.nights) || 1);
    return {
      ...acc,
      checkInDate: dateFormatted,
    };
  });
}

// Calculate dropoff date from pickup date and total nights
function calculateDropoffFromPickupAndNights(pickupStr: string, nights: number): string {
  const d = parseDateFlexible(pickupStr);
  if (!d) return '';
  d.setDate(d.getDate() + Math.max(1, nights));
  return formatDateDisplay(d.toISOString().slice(0, 10));
}

// Add days to a Date object safely
function addDaysToDate(baseDate: Date, days: number): Date {
  const res = new Date(baseDate.getTime());
  res.setDate(res.getDate() + days);
  return res;
}

// Automatically adjust accommodation stops so the number of accommodation rows exactly reflects the target trip nights
function syncAccommodationsToTargetDuration(
  currentAccs: AccommodationItem[],
  targetNights: number,
  pickupDateStr: string,
  tripMealPlan?: string
): AccommodationItem[] {
  const safeNights = Math.max(1, targetNights);
  const baseDate = parseDateFlexible(pickupDateStr) || new Date();

  // 1. Flatten current accommodations into a night-by-night representation
  const nightUnits: Array<{
    destination: string;
    hotelName: string;
    roomCategory: string;
    mealPlan: string;
    status: 'Confirmed' | 'Reserved' | 'Voucher Issued';
    sourceId?: string;
  }> = [];

  if (currentAccs && currentAccs.length > 0) {
    for (const acc of currentAccs) {
      const nightsCount = Math.max(1, Number(acc.nights) || 1);
      for (let n = 0; n < nightsCount; n++) {
        nightUnits.push({
          destination: acc.destination?.trim() || 'Kerala Stop',
          hotelName: acc.hotelName?.trim() || 'Selected Hotel',
          roomCategory: acc.roomCategory?.trim() || 'Deluxe Room',
          mealPlan: acc.mealPlan?.trim() || tripMealPlan || 'CP - Room + Breakfast Included',
          status: acc.status || 'Confirmed',
          sourceId: n === 0 ? acc.id : undefined,
        });
      }
    }
  }

  // 2. Adjust nightUnits length to exactly match target duration
  const finalUnits: typeof nightUnits = [];

  if (nightUnits.length === 0) {
    for (let i = 0; i < safeNights; i++) {
      const destItem = POPULAR_DESTINATIONS[i % POPULAR_DESTINATIONS.length];
      finalUnits.push({
        destination: destItem.name,
        hotelName: destItem.defaultHotel,
        roomCategory: destItem.defaultRoom,
        mealPlan: tripMealPlan || 'CP - Room + Breakfast Included',
        status: 'Confirmed',
      });
    }
  } else if (nightUnits.length >= safeNights) {
    for (let i = 0; i < safeNights; i++) {
      finalUnits.push(nightUnits[i]);
    }
  } else {
    finalUnits.push(...nightUnits);
    const needed = safeNights - nightUnits.length;
    const lastUnit = nightUnits[nightUnits.length - 1];
    for (let i = 0; i < needed; i++) {
      finalUnits.push({
        destination: lastUnit.destination,
        hotelName: lastUnit.hotelName,
        roomCategory: lastUnit.roomCategory,
        mealPlan: lastUnit.mealPlan || tripMealPlan || 'CP - Room + Breakfast Included',
        status: 'Confirmed',
      });
    }
  }

  // 3. Build sequential AccommodationItems with exact check-in dates and nights: 1
  const usedIds = new Set<string>();
  return finalUnits.map((unit, idx) => {
    const checkIn = addDaysToDate(baseDate, idx);
    const formattedCheckIn = formatDateDisplay(checkIn.toISOString().slice(0, 10));
    let accId = unit.sourceId;
    if (!accId || usedIds.has(accId)) {
      accId = createUniqueId('acc');
    }
    usedIds.add(accId);

    return {
      id: accId,
      destination: unit.destination,
      hotelName: unit.hotelName,
      roomCategory: unit.roomCategory,
      checkInDate: formattedCheckIn,
      nights: 1,
      mealPlan: unit.mealPlan,
      status: unit.status,
    };
  });
}

// Synchronize DayItinerary array with accommodations count and check-in dates
function syncDaysWithAccommodationsAndPickup(
  existingDays: DayItinerary[],
  accommodations: AccommodationItem[],
  pickupDateStr: string,
  dropoffLocation: string
): DayItinerary[] {
  const baseDate = parseDateFlexible(pickupDateStr) || new Date();
  const totalDays = accommodations.length + 1;
  const newDays: DayItinerary[] = [];

  for (let i = 0; i < accommodations.length; i++) {
    const acc = accommodations[i];
    const dayNum = i + 1;
    const dayDate = acc.checkInDate || formatDateDisplay(addDaysToDate(baseDate, i).toISOString().slice(0, 10));
    const existing = existingDays.find(d => d.dayNumber === dayNum);

    const destCatalog = INITIAL_DESTINATIONS_CATALOG.find(
      (c) => c.destination.toLowerCase().includes(acc.destination.toLowerCase()) ||
             acc.destination.toLowerCase().includes(c.destination.toLowerCase())
    );

    const defaultActivities = (destCatalog?.defaultActivities || []).map((act, aIdx) => ({
      ...act,
      isSelected: aIdx < 3,
    }));

    newDays.push({
      dayNumber: dayNum,
      date: dayDate,
      title: existing?.title || (i === 0 ? `Arrival in ${acc.destination} & Scenic Exploration` : `${acc.destination} Sightseeing Circuit & Stay`),
      destination: acc.destination,
      overnightStay: `${acc.destination} (${acc.hotelName})`,
      route: existing?.route || `${acc.destination} Sightseeing Corridor`,
      summary: existing?.summary || `Enjoy scenic experiences, local heritage, and relaxing overnight stay in ${acc.destination}.`,
      mealsIncluded: acc.mealPlan || existing?.mealsIncluded || 'Breakfast & Dinner',
      activities: existing && existing.activities && existing.activities.length > 0 ? existing.activities : defaultActivities,
    });
  }

  // Final Departure Day
  const departureDate = formatDateDisplay(addDaysToDate(baseDate, accommodations.length).toISOString().slice(0, 10));
  const existingDeparture = existingDays.find(d => d.destination?.toLowerCase() === 'departure' || d.dayNumber === totalDays);

  newDays.push({
    dayNumber: totalDays,
    date: departureDate,
    title: existingDeparture?.title || `${dropoffLocation ? dropoffLocation.split('(')[0].trim() : 'Cochin'} Departure Transfer`,
    destination: 'Departure',
    overnightStay: 'Tour Ends with Beautiful Kerala Memories',
    route: existingDeparture?.route || 'Hotel to Airport / Railway Station Drop',
    summary: existingDeparture?.summary || 'After breakfast, check out of your hotel and proceed for your departure transfer with sweet memories of Kerala.',
    mealsIncluded: 'Breakfast',
    activities: existingDeparture?.activities || [
      {
        id: `act-dep-${totalDays}`,
        title: 'Chauffeur airport / railway station departure drop',
        category: 'Sightseeing',
        timing: 'Afternoon',
        description: 'Chauffeur transfer to terminal as per flight / train schedule.',
        isSelected: true,
        isVerified: true,
      },
    ],
  });

  return newDays;
}

// Generate route corridor summary string with consecutive nights grouped
function generateRouteCorridor(
  pickupLoc: string,
  accommodations: AccommodationItem[],
  dropoffLoc: string
): string {
  const pickup = pickupLoc ? pickupLoc.split('(')[0].trim() : 'Cochin';
  const dropoff = dropoffLoc ? dropoffLoc.split('(')[0].trim() : 'Cochin';
  
  const groupedStops: { destination: string; nights: number }[] = [];
  for (const acc of accommodations) {
    const dest = acc.destination?.trim() || 'Kerala';
    const nights = Number(acc.nights) || 1;
    const last = groupedStops[groupedStops.length - 1];
    if (last && last.destination.toLowerCase() === dest.toLowerCase()) {
      last.nights += nights;
    } else {
      groupedStops.push({ destination: dest, nights });
    }
  }

  const stops = groupedStops.map((a) => `${a.destination} (${a.nights}N)`);
  if (stops.length === 0) return `${pickup} → ${dropoff}`;
  return `${pickup} → ${stops.join(' → ')} → ${dropoff}`;
}

// Generate dynamic Inclusions and Exclusions matching Vehicle and Hotels
function generateDynamicInclusionsAndExclusions(
  vehicleType: string,
  accommodations: AccommodationItem[],
  existingInclusions: string[] = [],
  existingExclusions: string[] = []
): { inclusions: string[]; exclusions: string[] } {
  // 1. Vehicle statement
  const rawVeh = (vehicleType || 'Sedan').trim();
  const cleanVeh = rawVeh.replace(/^(01|1)\s*(AC|A\/C)?\s*/i, '').trim() || 'Sedan';
  const vehicleLine = `01 Sanitized AC ${cleanVeh} at disposal as per itinerary from arrival to departure`;

  // 2. Chauffeur & Cab expenses (Tolls excluded from cab charges, fuel and driver bata included)
  const cabLine = 'Chauffeur allowances, driver bata, fuel charges, and parking fees (Tolls payable directly)';

  // 3. Hotel statements - group consecutive nights in the exact same hotel
  const hotelGroups: { destination: string; hotelName: string; roomCategory: string; nights: number }[] = [];
  for (const acc of accommodations) {
    const dest = acc.destination?.trim() || 'Kerala';
    const hotel = acc.hotelName?.trim() || 'Selected Hotel';
    const room = acc.roomCategory?.trim() || 'Deluxe Room';
    const nights = Number(acc.nights) || 1;

    const last = hotelGroups[hotelGroups.length - 1];
    if (
      last &&
      last.destination.toLowerCase() === dest.toLowerCase() &&
      last.hotelName.toLowerCase() === hotel.toLowerCase() &&
      last.roomCategory.toLowerCase() === room.toLowerCase()
    ) {
      last.nights += nights;
    } else {
      hotelGroups.push({ destination: dest, hotelName: hotel, roomCategory: room, nights });
    }
  }

  const hotelLines = hotelGroups.map((g) => {
    const nightPrefix = g.nights > 1 ? `${String(g.nights).padStart(2, '0')} Nights` : '01 Night';
    if (g.hotelName.toLowerCase().includes('houseboat')) {
      return `${nightPrefix} private Premium Houseboat cruise at ${g.destination} with all meals`;
    }
    const roomText = g.roomCategory ? ` (${g.roomCategory})` : '';
    return `${nightPrefix} accommodation at ${g.hotelName} ${g.destination}${roomText}`;
  });

  // 4. Meal Plan Statement
  const uniqueMealPlans = Array.from(new Set(accommodations.map((a) => a.mealPlan?.trim()).filter(Boolean)));
  const mealPlanText = uniqueMealPlans.length > 0 
    ? `Meal Plan: ${uniqueMealPlans.join(' / ')}` 
    : 'Meal Plan: CP - Room + Breakfast Included';

  // 5. Standard hospitality inclusions
  const standardInclusions = [
    'Traditional welcome drink on arrival at all hotels',
    '24/7 dedicated Travel Care Tours customer service helpline & local manager support',
  ];

  // Assemble dynamic core inclusions
  const dynamicInclusionLines = [
    vehicleLine,
    cabLine,
    ...hotelLines,
    mealPlanText,
    ...standardInclusions,
  ];

  // Preserve any custom user items that don't match standard auto-generated templates
  const customInclusions = existingInclusions.filter((item) => {
    const l = item.toLowerCase();
    return !l.includes('at disposal as per itinerary') &&
           !l.includes('driver bata') &&
           !l.includes('chauffeur allowance') &&
           !l.includes('accommodation at') &&
           !l.includes('houseboat cruise') &&
           !l.includes('meal plan:') &&
           !l.includes('welcome drink') &&
           !l.includes('travel care tours customer service');
  });

  // Exclusions: ensure Toll gate charges is the 1st line as instructed
  const standardExclusions = [
    'Toll gate charges (payable directly by guest)',
    'Airfare / Train tickets to and from Kerala',
    'Entry tickets to monuments, Eravikulam National park bus, boat tickets, and elephant activities',
    'Optional activities and entry tickets are payable directly unless specifically included',
    'Personal expenses such as laundry, phone calls, room service, alcoholic beverages, and tips',
    'Extra charges may apply for A/C when running in hill areas or heaters if required',
  ];

  const customExclusions = existingExclusions.filter((item) => {
    const l = item.toLowerCase();
    return !l.includes('toll gate charges') &&
           !l.includes('airfare') &&
           !l.includes('entry tickets') &&
           !l.includes('optional activities') &&
           !l.includes('personal expenses') &&
           !l.includes('extra charges may apply for a/c');
  });

  return {
    inclusions: [...dynamicInclusionLines, ...customInclusions],
    exclusions: [...standardExclusions, ...customExclusions],
  };
}

export const TripDetailsForm: React.FC<TripDetailsFormProps> = ({
  trip,
  onUpdateTrip,
  onLoadPreset,
  onProceedToActivities,
  onNavigateToActivities,
  onNavigateToPreview,
  onNavigateToWhatsappLeads,
}) => {
  const [showAccommodation, setShowAccommodation] = useState<boolean>(true);
  const [showMealPlanCol, setShowMealPlanCol] = useState<boolean>(false);
  const [showStatusCol, setShowStatusCol] = useState<boolean>(false);
  const [selectedTripMealPlan, setSelectedTripMealPlan] = useState<string>('');
  const [customDestinationInput, setCustomDestinationInput] = useState<string>('');
  const [isSuggestingTitle, setIsSuggestingTitle] = useState<boolean>(false);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [showTitleSuggestions, setShowTitleSuggestions] = useState<boolean>(false);
  const [isEditingTopTitle, setIsEditingTopTitle] = useState<boolean>(false);
  const [topTitleDraft, setTopTitleDraft] = useState<string>('');

  // AI Suggest Title handler reflecting the current routes & duration
  const handleSuggestTitle = async (applyFirstImmediately: boolean = true) => {
    setIsSuggestingTitle(true);
    try {
      const destinations = trip.accommodations.map((a) => a.destination).filter(Boolean);
      const res = await fetch('/api/planner/suggest-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinations,
          nights: trip.durationNights,
          days: trip.durationDays,
          currentTitle: trip.tripTitle,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.suggestions && data.suggestions.length > 0) {
          setTitleSuggestions(data.suggestions);
          setShowTitleSuggestions(true);
          const chosen = data.primaryTitle || data.suggestions[0];
          if (applyFirstImmediately && chosen) {
            onUpdateTrip({
              ...trip,
              tripTitle: chosen,
            });
            setTopTitleDraft(chosen);
          }
        }
      }
    } catch (err) {
      console.error('Failed to suggest title using AI:', err);
    } finally {
      setIsSuggestingTitle(false);
    }
  };

  // Default Kerala destinations shown as pills (matching the screenshot)
  const DEFAULT_KERALA_DESTINATIONS = [
    'Munnar',
    'Thekkady',
    'Alleppey',
    'Kovalam',
    'Varkala',
    'Kochi',
    'Vagamon',
    'Kanyakumari',
  ];

  // Check if a destination is selected in the current trip
  const isDestinationSelected = (destName: string) => {
    const norm = destName.toLowerCase().trim();
    return trip.accommodations.some((acc) => {
      const aNorm = (acc.destination || '').toLowerCase().trim();
      if (aNorm === norm) return true;
      if (norm === 'kochi' && (aNorm === 'cochin' || aNorm.includes('kochi') || aNorm.includes('cochin'))) return true;
      if (norm === 'alleppey' && (aNorm === 'alappuzha' || aNorm.includes('alleppey') || aNorm.includes('alappuzha'))) return true;
      if (aNorm.includes(norm) || norm.includes(aNorm)) return true;
      return false;
    });
  };

  // Toggle destination on or off
  const handleToggleDestination = (destName: string) => {
    const isSelected = isDestinationSelected(destName);
    if (isSelected) {
      if (trip.accommodations.length <= 1) return;
      const norm = destName.toLowerCase().trim();
      const updatedAccs = trip.accommodations.filter((acc) => {
        const aNorm = (acc.destination || '').toLowerCase().trim();
        if (aNorm === norm) return false;
        if (norm === 'kochi' && (aNorm === 'cochin' || aNorm.includes('kochi') || aNorm.includes('cochin'))) return false;
        if (norm === 'alleppey' && (aNorm === 'alappuzha' || aNorm.includes('alleppey') || aNorm.includes('alappuzha'))) return false;
        if (aNorm.includes(norm) || norm.includes(aNorm)) return false;
        return true;
      });
      const finalAccs = updatedAccs.length > 0 ? updatedAccs : trip.accommodations.slice(0, 1);
      const targetNights = Math.max(1, finalAccs.length);
      const syncedAccs = syncAccommodationsToTargetDuration(
        finalAccs,
        targetNights,
        trip.pickupDate,
        selectedTripMealPlan
      );
      const newDropoff = calculateDropoffFromPickupAndNights(trip.pickupDate, targetNights);
      const routeCorr = generateRouteCorridor(trip.pickupLocation, syncedAccs, trip.dropoffLocation);
      const syncedDays = syncDaysWithAccommodationsAndPickup(trip.days || [], syncedAccs, trip.pickupDate, trip.dropoffLocation);

      updateTripWithSync({
        ...trip,
        durationNights: targetNights,
        durationDays: targetNights + 1,
        accommodations: syncedAccs,
        days: syncedDays,
        dropoffDate: newDropoff || trip.dropoffDate,
        routeSummary: routeCorr,
      });
    } else {
      handleAddDestinationStop(destName, 1);
    }
  };

  // Add custom place from input
  const handleAddCustomPlace = () => {
    const trimmed = customDestinationInput.trim();
    if (!trimmed) return;
    handleToggleDestination(trimmed);
    setCustomDestinationInput('');
  };

  // Calculate nights based on pickup and drop-off dates
  const calculatedNightsFromDates = calculateNightsBetween(trip.pickupDate, trip.dropoffDate);

  // Derive minimum allowable drop-off date (strictly 1 day after pickup date)
  const minDropoffDate = (() => {
    const d = parseDateFlexible(trip.pickupDate);
    if (!d) return undefined;
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    next.setDate(next.getDate() + 1);
    return next;
  })();

  // Centralized update function that keeps vehicle & hotels synced with Inclusions & Exclusions
  const updateTripWithSync = (updated: TripDetails, forceSyncInclusions: boolean = true) => {
    const seenIds = new Set<string>();
    const safeAccommodations = (updated.accommodations || []).map((acc) => {
      if (!acc.id || seenIds.has(acc.id)) {
        const uniqueId = createUniqueId('acc');
        seenIds.add(uniqueId);
        return { ...acc, id: uniqueId };
      }
      seenIds.add(acc.id);
      return acc;
    });

    const safeUpdated: TripDetails = {
      ...updated,
      accommodations: safeAccommodations,
    };

    if (!forceSyncInclusions) {
      onUpdateTrip(safeUpdated);
      return;
    }
    const { inclusions, exclusions } = generateDynamicInclusionsAndExclusions(
      safeUpdated.vehicleType,
      safeUpdated.accommodations,
      safeUpdated.inclusions,
      safeUpdated.exclusions
    );
    onUpdateTrip({
      ...safeUpdated,
      inclusions,
      exclusions,
    });
  };

  // Auto-sync accommodation rows with calculated duration on mount or date change if out of sync
  useEffect(() => {
    if (calculatedNightsFromDates && calculatedNightsFromDates > 0 && trip.accommodations.length !== calculatedNightsFromDates) {
      const syncedAccs = syncAccommodationsToTargetDuration(
        trip.accommodations,
        calculatedNightsFromDates,
        trip.pickupDate,
        selectedTripMealPlan
      );
      const newDropoff = calculateDropoffFromPickupAndNights(trip.pickupDate, calculatedNightsFromDates);
      const routeCorr = generateRouteCorridor(trip.pickupLocation, syncedAccs, trip.dropoffLocation);
      const syncedDays = syncDaysWithAccommodationsAndPickup(trip.days || [], syncedAccs, trip.pickupDate, trip.dropoffLocation);

      updateTripWithSync({
        ...trip,
        durationNights: calculatedNightsFromDates,
        durationDays: calculatedNightsFromDates + 1,
        accommodations: syncedAccs,
        days: syncedDays,
        dropoffDate: newDropoff || trip.dropoffDate,
        routeSummary: routeCorr,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.pickupDate, trip.dropoffDate]);

  // Adjust total trip nights from top buttons after title (+ and -)
  const handleAdjustTripNights = (delta: number) => {
    const currentNights = trip.accommodations.length || trip.durationNights || 1;
    const targetNights = Math.max(1, currentNights + delta);
    if (targetNights === currentNights) return;

    const syncedAccs = syncAccommodationsToTargetDuration(
      trip.accommodations,
      targetNights,
      trip.pickupDate,
      selectedTripMealPlan
    );
    const newDropoff = calculateDropoffFromPickupAndNights(trip.pickupDate, targetNights);
    const routeCorr = generateRouteCorridor(trip.pickupLocation, syncedAccs, trip.dropoffLocation);
    const syncedDays = syncDaysWithAccommodationsAndPickup(trip.days || [], syncedAccs, trip.pickupDate, trip.dropoffLocation);

    updateTripWithSync({
      ...trip,
      durationNights: targetNights,
      durationDays: targetNights + 1,
      accommodations: syncedAccs,
      days: syncedDays,
      dropoffDate: newDropoff || trip.dropoffDate,
      routeSummary: routeCorr,
    });
  };

  // Stepper for individual destination stop nights (+ and - with value in middle)
  const handleUpdateDestinationNights = (index: number, delta: number) => {
    if (delta > 0) {
      const stop = trip.accommodations[index];
      const newAcc: AccommodationItem = {
        ...stop,
        id: createUniqueId('acc'),
        nights: 1,
      };
      const updated = [...trip.accommodations];
      updated.splice(index + 1, 0, newAcc);
      const targetNights = updated.length;
      const syncedAccs = syncAccommodationsToTargetDuration(updated, targetNights, trip.pickupDate, selectedTripMealPlan);
      const newDropoff = calculateDropoffFromPickupAndNights(trip.pickupDate, targetNights);
      const routeCorr = generateRouteCorridor(trip.pickupLocation, syncedAccs, trip.dropoffLocation);
      const syncedDays = syncDaysWithAccommodationsAndPickup(trip.days || [], syncedAccs, trip.pickupDate, trip.dropoffLocation);

      updateTripWithSync({
        ...trip,
        durationNights: targetNights,
        durationDays: targetNights + 1,
        accommodations: syncedAccs,
        days: syncedDays,
        dropoffDate: newDropoff || trip.dropoffDate,
        routeSummary: routeCorr,
      });
    } else if (delta < 0 && trip.accommodations.length > 1) {
      handleRemoveDestinationStop(index);
    }
  };

  // Update a field in an accommodation item
  const handleUpdateAccommodation = <K extends keyof AccommodationItem>(id: string, field: K, value: AccommodationItem[K]) => {
    const updatedAccs = trip.accommodations.map((acc) => {
      if (acc.id === id) {
        return { ...acc, [field]: value };
      }
      return acc;
    });

    if (field === 'destination') {
      const routeCorr = generateRouteCorridor(trip.pickupLocation, updatedAccs, trip.dropoffLocation);
      updateTripWithSync({
        ...trip,
        accommodations: updatedAccs,
        routeSummary: routeCorr,
      });
    } else {
      updateTripWithSync({
        ...trip,
        accommodations: updatedAccs,
      });
    }
  };

  // Add a destination to the route (adds a scheduled accommodation row)
  const handleAddDestinationStop = (destName?: string, customNights?: number) => {
    const cleanDest = (destName && destName.trim()) ? destName.trim() : 'Kerala Stop';
    const found = POPULAR_DESTINATIONS.find(d => d.name.toLowerCase() === cleanDest.toLowerCase());

    const defaultHotel = found?.defaultHotel || `${cleanDest} Selected Hotel`;
    const defaultRoom = found?.defaultRoom || 'Deluxe Room';

    const newAcc: AccommodationItem = {
      id: createUniqueId('acc'),
      destination: cleanDest,
      hotelName: defaultHotel,
      roomCategory: defaultRoom,
      checkInDate: '',
      nights: 1,
      mealPlan: selectedTripMealPlan || 'CP - Room + Breakfast Included',
      status: 'Confirmed',
    };

    const targetNights = trip.accommodations.length + 1;
    const syncedAccs = syncAccommodationsToTargetDuration(
      [...trip.accommodations, newAcc],
      targetNights,
      trip.pickupDate,
      selectedTripMealPlan
    );
    const newDropoff = calculateDropoffFromPickupAndNights(trip.pickupDate, targetNights);
    const routeCorr = generateRouteCorridor(trip.pickupLocation, syncedAccs, trip.dropoffLocation);
    const syncedDays = syncDaysWithAccommodationsAndPickup(trip.days || [], syncedAccs, trip.pickupDate, trip.dropoffLocation);

    updateTripWithSync({
      ...trip,
      durationNights: targetNights,
      durationDays: targetNights + 1,
      accommodations: syncedAccs,
      days: syncedDays,
      dropoffDate: newDropoff || trip.dropoffDate,
      routeSummary: routeCorr,
    });
    setCustomDestinationInput('');
  };

  // Move destination up or down in the sequence
  const handleMoveDestinationStop = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= trip.accommodations.length) return;

    const updatedAccs = [...trip.accommodations];
    const temp = updatedAccs[index];
    updatedAccs[index] = updatedAccs[targetIndex];
    updatedAccs[targetIndex] = temp;

    const timedAccs = calculateSequentialCheckInDates(trip.pickupDate, updatedAccs);
    const routeCorr = generateRouteCorridor(trip.pickupLocation, timedAccs, trip.dropoffLocation);
    const syncedDays = syncDaysWithAccommodationsAndPickup(trip.days || [], timedAccs, trip.pickupDate, trip.dropoffLocation);

    updateTripWithSync({
      ...trip,
      accommodations: timedAccs,
      days: syncedDays,
      routeSummary: routeCorr,
    });
  };

  // Remove a destination stop from the route
  const handleRemoveDestinationStop = (index: number) => {
    if (trip.accommodations.length <= 1) return;
    const updatedAccs = trip.accommodations.filter((_, i) => i !== index);
    const targetNights = updatedAccs.length;
    const syncedAccs = syncAccommodationsToTargetDuration(
      updatedAccs,
      targetNights,
      trip.pickupDate,
      selectedTripMealPlan
    );
    const newDropoff = calculateDropoffFromPickupAndNights(trip.pickupDate, targetNights);
    const routeCorr = generateRouteCorridor(trip.pickupLocation, syncedAccs, trip.dropoffLocation);
    const syncedDays = syncDaysWithAccommodationsAndPickup(trip.days || [], syncedAccs, trip.pickupDate, trip.dropoffLocation);

    updateTripWithSync({
      ...trip,
      durationNights: targetNights,
      durationDays: targetNights + 1,
      accommodations: syncedAccs,
      days: syncedDays,
      dropoffDate: newDropoff || trip.dropoffDate,
      routeSummary: routeCorr,
    });
  };

  // Vehicle change handler
  const handleVehicleChange = (newVehicle: string) => {
    updateTripWithSync({
      ...trip,
      vehicleType: newVehicle,
    });
  };

  // Pickup Date change handler with robust date picker and automatic accommodation synchronization
  const handlePickupDateChange = (newFormattedDate: string) => {
    // 1. Calculate duration between new pickup date and current dropoff date
    let targetNights = trip.durationNights || trip.accommodations.length || 1;
    let newDropoffDate = trip.dropoffDate;

    const diff = calculateNightsBetween(newFormattedDate, trip.dropoffDate);
    if (diff && diff > 0) {
      // Drop-off date is strictly after new pickup date: calculate duration directly from the dates
      targetNights = diff;
    } else {
      // New pickup date is on or after current dropoff date: push drop-off forward by current duration
      newDropoffDate = calculateDropoffFromPickupAndNights(newFormattedDate, targetNights);
    }

    // 2. Automatically sync accommodation check-in schedule: number of rows reflects targetNights
    const syncedAccs = syncAccommodationsToTargetDuration(
      trip.accommodations,
      targetNights,
      newFormattedDate,
      selectedTripMealPlan
    );

    const routeCorr = generateRouteCorridor(trip.pickupLocation, syncedAccs, trip.dropoffLocation);
    const syncedDays = syncDaysWithAccommodationsAndPickup(trip.days || [], syncedAccs, newFormattedDate, trip.dropoffLocation);

    updateTripWithSync({
      ...trip,
      pickupDate: newFormattedDate,
      dropoffDate: newDropoffDate || trip.dropoffDate,
      durationNights: targetNights,
      durationDays: targetNights + 1,
      accommodations: syncedAccs,
      days: syncedDays,
      routeSummary: routeCorr,
    });
  };

  // Dropoff Date change handler with robust date picker and automatic accommodation synchronization
  const handleDropoffDateChange = (newFormattedDate: string) => {
    // Calculate nights between pickup and dropoff
    const diffNights = calculateNightsBetween(trip.pickupDate, newFormattedDate);
    
    // Ensure the drop-off date is always logically after the pick-up date (at least 1 night)
    if (!diffNights || diffNights <= 0) {
      return;
    }

    // 1. Automatically sync accommodation check-in schedule: number of rows reflects diffNights
    const syncedAccs = syncAccommodationsToTargetDuration(
      trip.accommodations,
      diffNights,
      trip.pickupDate,
      selectedTripMealPlan
    );

    const routeCorr = generateRouteCorridor(trip.pickupLocation, syncedAccs, trip.dropoffLocation);
    const syncedDays = syncDaysWithAccommodationsAndPickup(trip.days || [], syncedAccs, trip.pickupDate, trip.dropoffLocation);

    updateTripWithSync({
      ...trip,
      dropoffDate: newFormattedDate,
      durationNights: diffNights,
      durationDays: diffNights + 1,
      accommodations: syncedAccs,
      days: syncedDays,
      routeSummary: routeCorr,
    });
  };

  // Re-sync all accommodation check-in dates sequentially from the current pickup date
  const handleSyncCheckInDatesWithPickup = () => {
    const targetNights = calculateNightsBetween(trip.pickupDate, trip.dropoffDate) || trip.durationNights || trip.accommodations.length || 1;
    const syncedAccs = syncAccommodationsToTargetDuration(
      trip.accommodations,
      targetNights,
      trip.pickupDate,
      selectedTripMealPlan
    );
    const newDropoff = calculateDropoffFromPickupAndNights(trip.pickupDate, targetNights);
    const routeCorr = generateRouteCorridor(trip.pickupLocation, syncedAccs, trip.dropoffLocation);
    const syncedDays = syncDaysWithAccommodationsAndPickup(trip.days || [], syncedAccs, trip.pickupDate, trip.dropoffLocation);

    updateTripWithSync({
      ...trip,
      accommodations: syncedAccs,
      dropoffDate: newDropoff || trip.dropoffDate,
      durationNights: targetNights,
      durationDays: targetNights + 1,
      days: syncedDays,
      routeSummary: routeCorr,
    });
  };

  // Apply single meal plan for the entire trip
  const handleApplyTripMealPlan = (plan: string) => {
    setSelectedTripMealPlan(plan);
    if (!plan) return;
    const updated = trip.accommodations.map((acc) => ({
      ...acc,
      mealPlan: plan,
    }));
    updateTripWithSync({
      ...trip,
      accommodations: updated,
    });
  };

  // Manual Re-sync button for Inclusions & Exclusions
  const handleManualResyncInclusions = () => {
    const { inclusions, exclusions } = generateDynamicInclusionsAndExclusions(
      trip.vehicleType,
      trip.accommodations,
      [], // Reset to pristine defaults
      []
    );
    onUpdateTrip({
      ...trip,
      inclusions,
      exclusions,
    });
  };

  // Inclusions/Exclusions manual item additions
  const handleAddInclusion = () => {
    const text = prompt('Enter new inclusion item:');
    if (text?.trim()) {
      onUpdateTrip({ ...trip, inclusions: [...trip.inclusions, text.trim()] });
    }
  };

  const handleRemoveInclusion = (idx: number) => {
    const updated = [...trip.inclusions];
    updated.splice(idx, 1);
    onUpdateTrip({ ...trip, inclusions: updated });
  };

  const handleAddExclusion = () => {
    const text = prompt('Enter new exclusion item:');
    if (text?.trim()) {
      onUpdateTrip({ ...trip, exclusions: [...trip.exclusions, text.trim()] });
    }
  };

  const handleRemoveExclusion = (idx: number) => {
    const updated = [...trip.exclusions];
    updated.splice(idx, 1);
    onUpdateTrip({ ...trip, exclusions: updated });
  };

  return (
    <div className="space-y-7 sm:space-y-8">
      {/* V1 TRIP PAGE SEPARATE HEADER BANNER */}
      <div className="bg-gradient-to-r from-[#0B2545] to-[#133E68] text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-300/30 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">V1 Trip Page</h2>
              <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                Detailed Builder
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Full multi-section tour parameters, accommodation grid, pricing calculator, and day-by-day notes.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToWhatsappLeads && (
            <button
              type="button"
              onClick={onNavigateToWhatsappLeads}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Whatsapp Leads</span>
            </button>
          )}
          {(onNavigateToActivities || onProceedToActivities) && (
            <button
              type="button"
              onClick={onNavigateToActivities || onProceedToActivities}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20"
            >
              <CheckSquare className="w-3.5 h-3.5 text-teal-300" />
              <span>Activity Selection</span>
            </button>
          )}
          {onNavigateToPreview && (
            <button
              type="button"
              onClick={onNavigateToPreview}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>PDF Preview</span>
            </button>
          )}
        </div>
      </div>

      {/* TOP TOUR HEADER & OVERVIEW BAR (With AI Title Suggestion and + / - duration buttons) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
        <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-emerald-800 flex items-center justify-center text-white shadow-xs shrink-0 mt-0.5 sm:mt-0">
            <Calendar className="w-6 h-6 text-emerald-100" />
          </div>
          <div className="flex-1 min-w-0">
            {/* Title Display or Inline Editor */}
            {isEditingTopTitle ? (
              <div className="flex items-center gap-2 max-w-xl mb-1.5">
                <input
                  type="text"
                  value={topTitleDraft}
                  onChange={(e) => setTopTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onUpdateTrip({ ...trip, tripTitle: topTitleDraft.trim() });
                      setIsEditingTopTitle(false);
                    } else if (e.key === 'Escape') {
                      setTopTitleDraft(trip.tripTitle || '');
                      setIsEditingTopTitle(false);
                    }
                  }}
                  autoFocus
                  className="w-full text-base sm:text-lg font-bold px-3 py-1.5 border border-emerald-500 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                  placeholder="Enter Tour Title / Heading..."
                />
                <button
                  type="button"
                  onClick={() => {
                    onUpdateTrip({ ...trip, tripTitle: topTitleDraft.trim() });
                    setIsEditingTopTitle(false);
                  }}
                  className="px-3 py-1.5 bg-emerald-800 text-white rounded-xl text-xs font-bold shrink-0 hover:bg-emerald-900"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTopTitleDraft(trip.tripTitle || '');
                    setIsEditingTopTitle(false);
                  }}
                  className="px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold shrink-0 hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 group">
                  <span>{trip.tripTitle || 'Kerala Scenic Escape'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTopTitleDraft(trip.tripTitle || '');
                      setIsEditingTopTitle(true);
                    }}
                    className="opacity-60 hover:opacity-100 p-1 text-slate-400 hover:text-emerald-700 transition-opacity"
                    title="Edit Tour Title"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </h1>

                {/* AI Suggest Title Button on Top */}
                <div className="relative inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSuggestTitle(true)}
                    disabled={isSuggestingTitle}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-xl bg-linear-to-r from-emerald-700 to-teal-700 text-white shadow-xs hover:from-emerald-800 hover:to-teal-800 transition-all disabled:opacity-50"
                    title="Automatically suggest an attractive tour title matching the route stops using AI"
                  >
                    {isSuggestingTitle ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    )}
                    <span>{isSuggestingTitle ? 'Generating...' : 'AI Suggest Title'}</span>
                  </button>

                  {titleSuggestions.length > 0 && !showTitleSuggestions && (
                    <button
                      type="button"
                      onClick={() => setShowTitleSuggestions(true)}
                      className="text-[11px] font-semibold text-emerald-800 hover:underline cursor-pointer"
                    >
                      (Options)
                    </button>
                  )}
                </div>

                {/* Duration Stepper directly after the title (+ and -) */}
                <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                  <span className="text-sm sm:text-base font-extrabold text-emerald-950 whitespace-nowrap">
                    {trip.durationNights} Nights and {trip.durationDays} Days
                  </span>
                  <div className="inline-flex items-center bg-white border border-emerald-300 rounded-lg overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => handleAdjustTripNights(-1)}
                      disabled={trip.durationNights <= 1}
                      className="px-2.5 py-1 text-sm font-black text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 border-r border-slate-200 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Subtract 1 Night (-)"
                    >
                      –
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustTripNights(1)}
                      className="px-2.5 py-1 text-sm font-black text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors"
                      title="Add 1 Night (+)"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AI Title Suggestions Popover / Alternative Picks */}
            {showTitleSuggestions && titleSuggestions.length > 0 && (
              <div className="mt-2 mb-2 p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                    AI Route-Reflected Title Suggestions (Click to apply):
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowTitleSuggestions(false)}
                    className="text-slate-400 hover:text-slate-700 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {titleSuggestions.map((st, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => {
                        onUpdateTrip({ ...trip, tripTitle: st });
                        setTopTitleDraft(st);
                        setShowTitleSuggestions(false);
                      }}
                      className={`text-left text-xs px-3 py-2 rounded-lg border transition-all ${
                        trip.tripTitle === st
                          ? 'bg-emerald-800 text-white border-emerald-800 font-bold'
                          : 'bg-white text-slate-800 hover:bg-emerald-100/60 border-slate-200 hover:border-emerald-300 font-medium'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Voucher: <span className="font-mono font-bold text-slate-700">{trip.voucherNumber}</span> • Guest: <span className="font-semibold text-slate-800">{trip.guestName || 'Guest Name'}</span> • Vehicle: <span className="font-semibold text-slate-800">{trip.vehicleType}</span>
            </p>
          </div>
        </div>
      </div>

      {/* CHOOSE KERALA DESTINATIONS (MATCHING SCREENSHOT) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
        {/* Section Header with Green Map Pin */}
        <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-xs sm:text-sm tracking-wider uppercase">
          <MapPin className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
          <span>CHOOSE KERALA DESTINATIONS</span>
        </div>

        {/* Destination Pills */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {Array.from(
            new Set([
              ...DEFAULT_KERALA_DESTINATIONS,
              ...trip.accommodations.map((a) => a.destination.trim()).filter(Boolean),
            ])
          ).map((dest) => {
            const isSelected = isDestinationSelected(dest);
            return (
              <button
                key={dest}
                type="button"
                onClick={() => handleToggleDestination(dest)}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-[#0B2545] hover:bg-[#07192F] text-white shadow-xs'
                    : 'bg-[#F0F4F8] hover:bg-[#E2E8F0] text-slate-800'
                }`}
              >
                {isSelected && (
                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                )}
                <span>{dest}</span>
              </button>
            );
          })}
        </div>

        {/* Add More Places Input Row */}
        <div className="space-y-2 pt-1">
          <label className="block text-sm sm:text-base font-bold text-slate-900">
            Add More Places or Offbeat Stops:
          </label>
          <div className="flex items-center gap-2.5">
            <input
              type="text"
              value={customDestinationInput}
              onChange={(e) => setCustomDestinationInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomPlace();
                }
              }}
              placeholder="Type a town, beach, or attraction..."
              className="flex-1 bg-white border border-slate-200/90 rounded-xl px-4 py-2.5 sm:py-3 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] focus:border-transparent transition-all shadow-2xs"
            />
            <button
              type="button"
              onClick={handleAddCustomPlace}
              className="bg-[#0B2545] hover:bg-[#07192F] text-white font-bold text-sm sm:text-base px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-xs"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Place</span>
            </button>
          </div>
        </div>

        {/* Places included counter & examples */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
            <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
            <span>
              {Array.from(new Set(trip.accommodations.map((a) => a.destination.trim()).filter(Boolean))).length} places included
            </span>
          </div>
          <div className="text-slate-400 text-xs sm:text-sm">
            e.g. Kumarakom, Jatayu Rock, Marari, Bekal
          </div>
        </div>
      </div>





      {/* Preset Quick-Load Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-bold text-slate-800 uppercase tracking-wide">Quick Preset Packages:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onLoadPreset?.('munnar-thekkady-alleppey')}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors shadow-2xs"
          >
            7D/6N Kerala Scenic Escape (TCT-2026-KER-0195)
          </button>
          <button
            type="button"
            onClick={() => onLoadPreset?.('grand-kerala-kanyakumari')}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors shadow-2xs"
          >
            8D/7N Complete Kerala & Kanyakumari
          </button>
          <button
            type="button"
            onClick={() => onLoadPreset?.('alleppey-honeymoon')}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors shadow-2xs"
          >
            4D/3N Backwater Romance & Fort Kochi
          </button>
        </div>
      </div>

      {/* SECTION 1: Guest, Transfers & Vehicle Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7">
        {/* Guest Information */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base sm:text-lg">
              <Users className="w-5 h-5 text-emerald-700" />
              <span>Guest & Booking Information</span>
            </div>
            <span className="text-xs sm:text-sm font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
              {trip.voucherNumber}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs sm:text-sm font-bold text-slate-700">
                  Trip Title / Tour Heading *
                </label>
                <button
                  type="button"
                  onClick={() => handleSuggestTitle(true)}
                  disabled={isSuggestingTitle}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 transition-colors cursor-pointer disabled:opacity-50"
                  title="Generate route-matching title with AI"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isSuggestingTitle ? 'Generating...' : '✨ AI Suggest from Route'}</span>
                </button>
              </div>
              <input
                type="text"
                value={trip.tripTitle}
                onChange={(e) => onUpdateTrip({ ...trip, tripTitle: e.target.value })}
                className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden font-medium"
                placeholder="e.g. KERALA SCENIC ESCAPE"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
                Guest Name(s) *
              </label>
              <input
                type="text"
                value={trip.guestName}
                onChange={(e) => onUpdateTrip({ ...trip, guestName: e.target.value })}
                className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden font-medium"
                placeholder="e.g. Mr. Nikhil Sharma"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
                Voucher / File Number *
              </label>
              <input
                type="text"
                value={trip.voucherNumber}
                onChange={(e) => onUpdateTrip({ ...trip, voucherNumber: e.target.value })}
                className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden font-mono font-bold"
                placeholder="TCT-2026-KER-0195"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>Guest Contact Number</span>
              </label>
              <input
                type="text"
                value={trip.guestContact}
                onChange={(e) => onUpdateTrip({ ...trip, guestContact: e.target.value })}
                className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden font-medium"
                placeholder="+91 94957 01672"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
                  Adults (Pax)
                </label>
                <input
                  type="number"
                  min={1}
                  value={trip.adultsCount}
                  onChange={(e) => onUpdateTrip({ ...trip, adultsCount: parseInt(e.target.value) || 1 })}
                  className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden font-medium"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
                  Children
                </label>
                <input
                  type="number"
                  min={0}
                  value={trip.childrenCount}
                  onChange={(e) => onUpdateTrip({ ...trip, childrenCount: parseInt(e.target.value) || 0 })}
                  className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
                Children Age(s)
              </label>
              <input
                type="text"
                value={trip.childrenAges}
                onChange={(e) => onUpdateTrip({ ...trip, childrenAges: e.target.value })}
                className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden font-medium"
                placeholder="e.g. 3yr old"
              />
            </div>
          </div>
        </div>

        {/* Transfers & Vehicle Allocation */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base sm:text-lg">
              <Car className="w-5 h-5 text-emerald-800" />
              <span>Transfers & Vehicle Allocation</span>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Private Chauffeur Service</span>
            </span>
          </div>

          {/* Transit Corridor Summary Strip */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2 font-medium text-slate-700 truncate">
              <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="font-semibold text-slate-900 truncate max-w-[140px] sm:max-w-[200px]">
                {trip.pickupLocation ? trip.pickupLocation.split('(')[0].trim() : 'Pickup Point'}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mx-1" />
              <Navigation className="w-4 h-4 text-teal-700 shrink-0" />
              <span className="font-semibold text-slate-900 truncate max-w-[140px] sm:max-w-[200px]">
                {trip.dropoffLocation ? trip.dropoffLocation.split('(')[0].trim() : 'Drop-off Point'}
              </span>
            </div>
            <span className="text-xs sm:text-sm font-mono font-bold text-emerald-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs shrink-0">
              {trip.vehicleType || 'Sedan'}
            </span>
          </div>

          {/* Symmetrical Pickup & Drop-off Cards without green dots */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pickup (Arrival) Card */}
            <div className="border border-emerald-100 bg-emerald-50/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-950 uppercase tracking-wide">
                  <MapPin className="w-4 h-4 text-emerald-700" />
                  <span>Pickup (Arrival)</span>
                </div>
              </div>

              {/* Robust Date Picker for Pickup Date */}
              <DatePicker
                id="pickup-date-picker"
                label="Pickup Date *"
                badgeText="Arrival"
                value={trip.pickupDate}
                onChange={(formatted) => handlePickupDateChange(formatted)}
                placeholder="Select Pickup Date"
                rangeStart={trip.pickupDate}
                rangeEnd={trip.dropoffDate}
                theme="emerald"
                helperText="Hotel check-ins sequence automatically from this date"
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pickup Hub / Location *
                </label>
                <div className="space-y-2">
                  <select
                    aria-label="Select Pickup Hub"
                    value={LOCATION_OPTIONS.includes(trip.pickupLocation) ? trip.pickupLocation : '__custom__'}
                    onChange={(e) => {
                      if (e.target.value !== '__custom__') {
                        onUpdateTrip({ ...trip, pickupLocation: e.target.value });
                      }
                    }}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                  >
                    <option value="" disabled>Select Standard Hub...</option>
                    {LOCATION_OPTIONS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                    <option value="__custom__">Custom / Type Other Location...</option>
                  </select>

                  <input
                    type="text"
                    value={trip.pickupLocation}
                    onChange={(e) => onUpdateTrip({ ...trip, pickupLocation: e.target.value })}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                    placeholder="Or type custom location/hotel..."
                  />

                  {/* 1-Click Quick Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {[
                      { label: 'COK Airport', value: 'Cochin International Airport (COK)' },
                      { label: 'TRV Airport', value: 'Thiruvananthapuram International Airport (TRV)' },
                      { label: 'Ernakulam Rly', value: 'Ernakulam Railway Station' },
                      { label: 'Cochin City', value: 'Cochin' },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => onUpdateTrip({ ...trip, pickupLocation: chip.value })}
                        className={`text-xs font-semibold px-2 py-1 rounded-md border transition-colors ${
                          trip.pickupLocation === chip.value
                            ? 'bg-emerald-800 text-white border-emerald-800'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-900'
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Drop-off (Departure) Card */}
            <div className="border border-teal-100 bg-teal-50/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-teal-950 uppercase tracking-wide">
                  <Navigation className="w-4 h-4 text-teal-700" />
                  <span>Drop-off (Departure)</span>
                </div>
              </div>

              {/* Robust Date Picker for Drop-off Date */}
              <DatePicker
                id="dropoff-date-picker"
                label="Drop-off Date *"
                badgeText={`Departure (${trip.durationNights}N / ${trip.durationDays}D)`}
                value={trip.dropoffDate}
                minDate={minDropoffDate}
                onChange={(formatted) => handleDropoffDateChange(formatted)}
                placeholder="Select Drop-off Date"
                rangeStart={trip.pickupDate}
                rangeEnd={trip.dropoffDate}
                theme="teal"
                helperText="Must be after pickup date. Updates stays & check-in dates"
                errorMessage={
                  calculatedNightsFromDates !== null && calculatedNightsFromDates <= 0
                    ? 'Drop-off date must be after pickup date'
                    : undefined
                }
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Drop-off Hub / Location *
                </label>
                <div className="space-y-2">
                  <select
                    aria-label="Select Drop-off Hub"
                    value={LOCATION_OPTIONS.includes(trip.dropoffLocation) ? trip.dropoffLocation : '__custom__'}
                    onChange={(e) => {
                      if (e.target.value !== '__custom__') {
                        onUpdateTrip({ ...trip, dropoffLocation: e.target.value });
                      }
                    }}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                  >
                    <option value="" disabled>Select Standard Hub...</option>
                    {LOCATION_OPTIONS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                    <option value="__custom__">Custom / Type Other Location...</option>
                  </select>

                  <input
                    type="text"
                    value={trip.dropoffLocation}
                    onChange={(e) => onUpdateTrip({ ...trip, dropoffLocation: e.target.value })}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                    placeholder="Or type custom location/hotel..."
                  />

                  {/* 1-Click Quick Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {[
                      { label: 'COK Airport', value: 'Cochin International Airport (COK)' },
                      { label: 'TRV Airport', value: 'Thiruvananthapuram International Airport (TRV)' },
                      { label: 'Ernakulam Rly', value: 'Ernakulam Railway Station' },
                      { label: 'Trivandrum Rly', value: 'Trivandrum Railway Station' },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => onUpdateTrip({ ...trip, dropoffLocation: chip.value })}
                        className={`text-xs font-semibold px-2 py-1 rounded-md border transition-colors ${
                          trip.dropoffLocation === chip.value
                            ? 'bg-teal-800 text-white border-teal-800'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-teal-50 hover:text-teal-900'
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dedicated Vehicle & Fleet Allocation Sub-card */}
          <div className="border border-slate-200 rounded-xl p-4 sm:p-5 bg-slate-50/60 space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs sm:text-sm font-bold text-slate-800">
                Vehicle Assigned *
              </label>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Auto-updates Inclusions Statement #1
              </span>
            </div>

            {/* Visual Fleet Cards */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { 
                  name: 'Sedan', 
                  capacity: '1–4 Pax', 
                  models: 'Dzire / Aspire' 
                },
                { 
                  name: 'AC SUV', 
                  capacity: '4–6 Pax', 
                  models: 'AC SUV' 
                },
                { 
                  name: 'Traveller 12 Seat', 
                  capacity: '7–12 Pax', 
                  models: 'Traveller 12 Seat' 
                },
              ].map((veh) => {
                const isSelected = trip.vehicleType.toLowerCase().includes(veh.name.toLowerCase().split(' ')[0]);
                return (
                  <button
                    key={veh.name}
                    type="button"
                    onClick={() => handleVehicleChange(veh.name)}
                    className={`text-left p-3 rounded-xl border transition-all relative ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs sm:text-sm font-bold ${isSelected ? 'text-emerald-950' : 'text-slate-800'}`}>
                        {veh.name}
                      </span>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-emerald-800">
                      {veh.capacity}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {veh.models}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Dropdown Selector + Direct Editable Input */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <div className="sm:w-2/5">
                <select
                  aria-label="Vehicle Assigned Dropdown"
                  value={VEHICLE_OPTIONS.includes(trip.vehicleType) ? trip.vehicleType : '__custom__'}
                  onChange={(e) => {
                    if (e.target.value !== '__custom__') {
                      handleVehicleChange(e.target.value);
                    }
                  }}
                  className="w-full text-sm px-3 py-2.5 border border-slate-300 rounded-xl bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                >
                  <option value="Sedan">Sedan - Swift Dzire / Aspire (1-4 Pax)</option>
                  <option value="AC SUV">AC SUV (4-6 Pax)</option>
                  <option value="Traveller 12 Seat">Traveller 12 Seat (7-12 Pax)</option>
                  <option value="__custom__">Custom / Type Model...</option>
                </select>
              </div>

              <div className="sm:w-3/5">
                <input
                  type="text"
                  value={trip.vehicleType}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden font-medium"
                  placeholder="e.g. 01 AC Sedan (Swift Dzire / Aspire)"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Accommodation & Stays */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div 
            className="cursor-pointer flex items-center gap-2.5"
            onClick={() => setShowAccommodation(!showAccommodation)}
          >
            <Hotel className="w-5 h-5 text-emerald-800" />
            <div>
              <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base sm:text-lg">
                <span>Accommodation & Stays</span>
                <span className="text-xs sm:text-sm font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {trip.durationNights} Nights ({trip.accommodations.length} Accommodation Rows)
                </span>
                {showAccommodation ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Hotel and stay details for each night of your trip. Check-in dates and package inclusions automatically adjust with the route.
              </p>
            </div>
          </div>

          {/* Top Right Controls: Meal Plan Dropdown & Add Destination Stop */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Trip Meal Plan:</span>
              <select
                aria-label="Trip Meal Plan Selection"
                value={selectedTripMealPlan}
                onChange={(e) => handleApplyTripMealPlan(e.target.value)}
                className="text-xs sm:text-sm bg-transparent border-0 font-semibold text-emerald-900 focus:ring-0 focus:outline-hidden pr-2 cursor-pointer"
              >
                <option value="">Select Meal Plan...</option>
                {MEAL_PLAN_OPTIONS.map((plan) => (
                  <option key={plan} value={plan}>{plan}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => handleAddDestinationStop()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-2xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Destination Stop</span>
            </button>
          </div>
        </div>

        {showAccommodation && (
          <div className="pt-1">
            {/* Add-on Column Toggles & Sync Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-3 text-xs sm:text-sm">
              <span className="text-xs text-slate-500 font-medium">
                Each row corresponds to an accommodation night in the check-in schedule ({trip.accommodations.length} nights total):
              </span>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handleSyncCheckInDatesWithPickup}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                  title="Recalculate sequential check-in dates for all hotel stops based on Pickup Date"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Sync Schedule</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowMealPlanCol(!showMealPlanCol)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    showMealPlanCol
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {showMealPlanCol ? '✓ Meal Plan' : '+ Meal Plan'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowStatusCol(!showStatusCol)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    showStatusCol
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {showStatusCol ? '✓ Status' : '+ Status'}
                </button>
              </div>
            </div>

            {/* Stay Locations & Preferred Hubs (Replaces Route Movement) */}
            <div className="bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-slate-50 border border-emerald-200/80 rounded-xl p-3 sm:p-3.5 text-xs shadow-2xs space-y-2 mb-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-slate-800">
                  <div className="w-5 h-5 rounded-md bg-emerald-700 text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                    Stay Locations ({trip.accommodations.length} Overnight Stays • {trip.durationNights} Nights)
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Auto-suggested preferred stay locations
                </span>
              </div>

              {/* Sequential Stay Badges with Preferred Hubs */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {trip.accommodations.map((acc, idx) => {
                  const pref = PREFERRED_STAY_HUBS[acc.destination] || {
                    hub: 'Central District / Tourist Hub',
                    highlight: 'Scenic & accessible',
                  };
                  return (
                    <div
                      key={`stay-hub-${acc.id || idx}`}
                      className="flex items-center gap-2 bg-white border border-emerald-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs text-[11px]"
                    >
                      <span className="font-mono font-bold text-emerald-950 bg-emerald-100 px-1.5 py-0.5 rounded text-[10px]">
                        Stop {idx + 1}
                      </span>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <strong className="text-slate-900 font-bold">{acc.destination}</strong>
                          <span className="text-emerald-800 font-bold">({acc.nights || 1}N)</span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          Preferred: <span className="font-semibold text-emerald-900">{pref.hub}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Desktop Table View (Large Screens >= 1024px) */}
            <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-xs sm:text-sm">
                    <th className="py-3 px-2 text-center w-14">Night</th>
                    <th className="py-3 px-3">Destination</th>
                    <th className="py-3 px-3">Hotel Name</th>
                    <th className="py-3 px-3">Room Category</th>
                    <th className="py-3 px-3">
                      <span className="flex items-center gap-1">
                        Check-In Date
                        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md border border-emerald-200">Auto</span>
                      </span>
                    </th>
                    <th className="py-3 px-3 w-20 text-center">Nights</th>
                    {showMealPlanCol && (
                      <th className="py-3 px-3 bg-emerald-50/70 text-emerald-900">Meal Plan</th>
                    )}
                    {showStatusCol && (
                      <th className="py-3 px-3 bg-emerald-50/70 text-emerald-900">Status</th>
                    )}
                    <th className="py-3 px-2 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trip.accommodations.map((acc, idx) => (
                    <tr key={acc.id ? `${acc.id}-${idx}` : `acc-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-2 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100/90 text-emerald-800">
                          N-{idx + 1}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          value={acc.destination}
                          onChange={(e) => handleUpdateAccommodation(acc.id, 'destination', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-600 focus:outline-hidden font-semibold text-slate-800"
                          placeholder="Destination"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          value={acc.hotelName}
                          onChange={(e) => handleUpdateAccommodation(acc.id, 'hotelName', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-600 focus:outline-hidden font-medium"
                          placeholder="Hotel Name"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          value={acc.roomCategory}
                          onChange={(e) => handleUpdateAccommodation(acc.id, 'roomCategory', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-600 focus:outline-hidden"
                          placeholder="Room Category"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={acc.checkInDate}
                            onChange={(e) => handleUpdateAccommodation(acc.id, 'checkInDate', e.target.value)}
                            className="w-full pl-7 pr-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-600 focus:outline-hidden font-medium text-slate-800"
                            placeholder="Check-In Date"
                          />
                          <Calendar className="w-3.5 h-3.5 text-emerald-700 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          min={1}
                          value={acc.nights}
                          onChange={(e) => handleUpdateAccommodation(acc.id, 'nights', parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-600 focus:outline-hidden text-center font-bold"
                        />
                      </td>
                      {showMealPlanCol && (
                        <td className="py-2.5 px-2 bg-emerald-50/30">
                          <select
                            value={acc.mealPlan}
                            onChange={(e) => handleUpdateAccommodation(acc.id, 'mealPlan', e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-emerald-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-600 focus:outline-hidden bg-white"
                          >
                            {MEAL_PLAN_OPTIONS.map((mp) => (
                              <option key={mp} value={mp}>{mp}</option>
                            ))}
                          </select>
                        </td>
                      )}
                      {showStatusCol && (
                        <td className="py-2.5 px-2 bg-emerald-50/30">
                          <select
                            value={acc.status}
                            onChange={(e) => handleUpdateAccommodation(acc.id, 'status', e.target.value as any)}
                            className="px-2.5 py-1.5 border border-emerald-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-600 focus:outline-hidden bg-white text-emerald-800 font-semibold"
                          >
                            <option value="Confirmed">Confirmed</option>
                            <option value="Reserved">Reserved</option>
                            <option value="Voucher Issued">Voucher Issued</option>
                          </select>
                        </td>
                      )}
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveDestinationStop(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete this destination stop"
                          disabled={trip.accommodations.length <= 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile & Tablet Card View (< 1024px Screen Sizes) */}
            <div className="lg:hidden space-y-3">
              {trip.accommodations.map((acc, idx) => (
                <div 
                  key={acc.id ? `mobile-${acc.id}-${idx}` : `mobile-acc-${idx}`}
                  className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-3"
                >
                  {/* Card Header: Stop Badge + Destination + Delete */}
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 px-2 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                      Night {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={acc.destination}
                      onChange={(e) => handleUpdateAccommodation(acc.id, 'destination', e.target.value)}
                      className="flex-1 min-w-0 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:ring-1 focus:ring-emerald-600 focus:outline-hidden bg-slate-50"
                      placeholder="Destination (e.g. Munnar)"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveDestinationStop(idx)}
                      className="shrink-0 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30"
                      title="Delete stop"
                      disabled={trip.accommodations.length <= 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Hotel Name */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Hotel / Resort Name
                    </label>
                    <input
                      type="text"
                      value={acc.hotelName}
                      onChange={(e) => handleUpdateAccommodation(acc.id, 'hotelName', e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:ring-1 focus:ring-emerald-600 focus:outline-hidden"
                      placeholder="Hotel or property name"
                    />
                  </div>

                  {/* 2-Column Grid: Room Category & Check-In Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Room Category
                      </label>
                      <input
                        type="text"
                        value={acc.roomCategory}
                        onChange={(e) => handleUpdateAccommodation(acc.id, 'roomCategory', e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-1 focus:ring-emerald-600 focus:outline-hidden"
                        placeholder="Deluxe Room"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Check-In Date
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={acc.checkInDate}
                          onChange={(e) => handleUpdateAccommodation(acc.id, 'checkInDate', e.target.value)}
                          className="w-full pl-7 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-emerald-600 focus:outline-hidden"
                          placeholder="DD MMM YYYY"
                        />
                        <Calendar className="w-3.5 h-3.5 text-emerald-700 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Options Grid: Nights, Meal Plan, Status */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 border-t border-slate-100">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Nights
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={acc.nights}
                        onChange={(e) => handleUpdateAccommodation(acc.id, 'nights', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-center text-slate-900 focus:ring-1 focus:ring-emerald-600 focus:outline-hidden"
                      />
                    </div>

                    {showMealPlanCol && (
                      <div>
                        <label className="block text-[11px] font-semibold text-emerald-800 mb-1">
                          Meal Plan
                        </label>
                        <select
                          value={acc.mealPlan}
                          onChange={(e) => handleUpdateAccommodation(acc.id, 'mealPlan', e.target.value)}
                          className="w-full px-2 py-1.5 border border-emerald-200 rounded-lg text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-emerald-600 focus:outline-hidden bg-white"
                        >
                          {MEAL_PLAN_OPTIONS.map((mp) => (
                            <option key={mp} value={mp}>{mp}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {showStatusCol && (
                      <div className={!showMealPlanCol ? 'col-span-1' : 'col-span-2 sm:col-span-1'}>
                        <label className="block text-[11px] font-semibold text-emerald-800 mb-1">
                          Status
                        </label>
                        <select
                          value={acc.status}
                          onChange={(e) => handleUpdateAccommodation(acc.id, 'status', e.target.value as any)}
                          className="w-full px-2 py-1.5 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 focus:ring-1 focus:ring-emerald-600 focus:outline-hidden bg-white"
                        >
                          <option value="Confirmed">Confirmed</option>
                          <option value="Reserved">Reserved</option>
                          <option value="Voucher Issued">Voucher Issued</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: Package Commercials & Payment Status (Dedicated Section) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base sm:text-lg">
            <Receipt className="w-5 h-5 text-emerald-800" />
            <span>Package Commercials & Payment Status</span>
          </div>
          <span className="text-xs sm:text-sm font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
            Booking Voucher Pricing
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
              Total Package Cost (Net) *
            </label>
            <input
              type="text"
              value={trip.totalPackageCost}
              onChange={(e) => onUpdateTrip({ ...trip, totalPackageCost: e.target.value })}
              className="w-full text-base sm:text-lg font-black text-emerald-950 px-3.5 py-2 border-2 border-emerald-300 bg-emerald-50/40 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
              placeholder="₹ 81,000.00"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
              Advance Paid *
            </label>
            <input
              type="text"
              value={trip.advancePaid || ''}
              onChange={(e) => onUpdateTrip({ ...trip, advancePaid: e.target.value })}
              className="w-full text-sm font-semibold text-slate-800 px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
              placeholder="₹ 25,000.00"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
              Balance Payable
            </label>
            <input
              type="text"
              value={trip.balancePayable || ''}
              onChange={(e) => onUpdateTrip({ ...trip, balancePayable: e.target.value })}
              className="w-full text-sm font-semibold text-amber-900 px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
              placeholder="₹ 56,000.00"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
              Booking Status
            </label>
            <select
              value={trip.bookingStatus || 'Confirmed'}
              onChange={(e) => onUpdateTrip({ ...trip, bookingStatus: e.target.value as any })}
              className="w-full text-sm font-bold text-emerald-900 px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
            >
              <option value="Confirmed">Confirmed</option>
              <option value="Draft">Draft</option>
              <option value="Under Review">Under Review</option>
              <option value="Payment Pending">Payment Pending</option>
            </select>
          </div>

          <div className="sm:col-span-2 md:col-span-4">
            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
              Cost Terms & Conditions Summary
            </label>
            <input
              type="text"
              value={trip.costTerms}
              onChange={(e) => onUpdateTrip({ ...trip, costTerms: e.target.value })}
              className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
              placeholder="Total package cost inclusive of private transportation, accommodation, meal plan & mentioned sightseeing."
            />
          </div>

          <div className="sm:col-span-2 md:col-span-4">
            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
              Route Summary Corridor *
            </label>
            <input
              type="text"
              value={trip.routeSummary}
              onChange={(e) => onUpdateTrip({ ...trip, routeSummary: e.target.value })}
              className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden font-medium"
              placeholder="Kochi → Munnar → Thekkady → Alleppey → Kovalam → Kanyakumari → Kochi"
            />
          </div>

          <div className="sm:col-span-2 md:col-span-4">
            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">
              Special Notes / Tour Advisory
            </label>
            <input
              type="text"
              value={trip.specialNotes || ''}
              onChange={(e) => onUpdateTrip({ ...trip, specialNotes: e.target.value })}
              className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
              placeholder="All sightseeing is subject to weather, local regulations, and attraction operating schedules."
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: Inclusions & Exclusions (The Last Section) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base sm:text-lg">
              <FileText className="w-5 h-5 text-emerald-800" />
              <span>Inclusions ({trip.inclusions.length}) & Exclusions ({trip.exclusions.length})</span>
            </div>
            {/* Kept as description as requested */}
            <p className="text-xs sm:text-sm text-emerald-800 font-medium flex items-center gap-1.5">
              <span>⚡ Auto-Synced with Vehicle ({trip.vehicleType}) & Hotels ({trip.durationNights} Nights)</span>
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {/* Defined purpose of Re-sync button: live changes are visible automatically; this button restores standard template defaults if custom edits need to be reset */}
            <button
              type="button"
              onClick={handleManualResyncInclusions}
              className="text-xs sm:text-sm font-bold px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 rounded-xl transition-colors border border-slate-200 flex items-center gap-1.5 shadow-2xs"
              title="Statements update automatically with vehicle and hotels. Use this Re-sync button if you manually edited or deleted text and want to restore the pristine standard package statements."
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
              <span>Re-sync Defaults</span>
            </button>
            <button
              type="button"
              onClick={handleAddInclusion}
              className="text-xs sm:text-sm font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-200"
            >
              + Add Inclusion
            </button>
            <button
              type="button"
              onClick={handleAddExclusion}
              className="text-xs sm:text-sm font-semibold px-3 py-1.5 bg-rose-50 text-rose-800 hover:bg-rose-100 rounded-xl transition-colors border border-rose-200"
            >
              + Add Exclusion
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Inclusions List */}
          <div className="border border-emerald-100 rounded-xl p-4 bg-emerald-50/20 space-y-3">
            <div className="text-xs sm:text-sm font-bold text-emerald-950 uppercase tracking-wide flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Package Inclusions ({trip.inclusions.length})</span>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {trip.inclusions.map((inc, i) => (
                <div 
                  key={i} 
                  className={`flex items-start justify-between gap-2.5 text-xs sm:text-sm bg-white border px-3 py-2 rounded-xl shadow-2xs ${
                    i === 0 ? 'border-emerald-300 bg-emerald-50/40 font-semibold' : 'border-emerald-100'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-700 font-bold shrink-0">✓</span>
                    <span className="text-slate-800 leading-relaxed">{inc}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleRemoveInclusion(i)} 
                    className="text-slate-400 hover:text-rose-600 text-sm shrink-0 ml-1 p-0.5"
                    title="Remove inclusion"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Exclusions List */}
          <div className="border border-rose-100 rounded-xl p-4 bg-rose-50/20 space-y-3">
            <div className="text-xs sm:text-sm font-bold text-rose-950 uppercase tracking-wide flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center font-bold text-xs">✕</span>
              <span>Package Exclusions ({trip.exclusions.length})</span>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {trip.exclusions.map((exc, i) => (
                <div 
                  key={i} 
                  className={`flex items-start justify-between gap-2.5 text-xs sm:text-sm bg-white border px-3 py-2 rounded-xl shadow-2xs ${
                    i === 0 ? 'border-rose-300 bg-rose-50/40 font-semibold text-rose-950' : 'border-rose-100'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold shrink-0">•</span>
                    <span className="text-slate-700 leading-relaxed">{exc}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleRemoveExclusion(i)} 
                    className="text-slate-400 hover:text-rose-600 text-sm shrink-0 ml-1 p-0.5"
                    title="Remove exclusion"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation to Next Step */}
      <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 p-5 rounded-2xl shadow-2xs">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-emerald-950 uppercase tracking-wide">Ready for Sightseeing Customization?</h4>
          <p className="text-xs sm:text-sm text-emerald-800/80">Proceed to manage and verify day-by-day morning, afternoon, and evening attractions for this trip.</p>
        </div>
        <button
          type="button"
          onClick={onProceedToActivities}
          className="px-6 py-3 text-xs sm:text-sm font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-md transition-all hover:scale-[1.02]"
        >
          Manage Activities for This Trip →
        </button>
      </div>
    </div>
  );
};
