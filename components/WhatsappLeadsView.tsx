'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  TripDetails, 
  AccommodationItem,
  HotelModel,
  StaffUser 
} from '@/types/itinerary';
import { 
  MessageSquare, 
  Copy, 
  Check, 
  Calculator, 
  Percent, 
  Car, 
  Hotel, 
  Calendar, 
  MapPin, 
  Plus, 
  Trash2, 
  Sparkles, 
  RefreshCw, 
  Send, 
  Printer, 
  FileText, 
  CheckSquare,
  Clock,
  User,
  Phone,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Baby,
  Eye,
  EyeOff,
  Navigation,
  ShieldCheck,
  RotateCcw,
  Utensils,
  Info,
  Table,
  CreditCard,
  AlertTriangle,
  Building2,
  Edit3
} from 'lucide-react';
import { 
  DEFAULT_KERALA_DESTINATIONS,
  LOCATION_OPTIONS, 
  INITIAL_HOTEL_CATALOG
} from '@/lib/sample-data';
import DatePicker, { parseDateSafe, formatDisplayDate } from '@/components/DatePicker';
import { 
  syncDaysWithAccommodationsAndPickup, 
  generateDynamicInclusionsAndExclusions 
} from '@/components/TripDetailsForm';
import { CustomSelect, SelectOption } from '@/components/CustomSelect';
import { 
  fetchLastVoucherNumber, 
  saveVoucherToGoogleSheet, 
  getGoogleSheetWebAppUrl, 
  formatVoucherCode, 
  parseVoucherNumber 
} from '@/lib/google-sheets-sync';

interface WhatsappLeadsViewProps {
  trip: TripDetails;
  onUpdateTrip: (updated: TripDetails) => void;
  onNavigateToActivities: () => void;
  onNavigateToPreview: () => void;
  onNavigateToV1Trip?: () => void;
  onOpenGoogleSheets?: () => void;
  staffUser?: StaffUser | null;
  hotelCatalog?: HotelModel[];
  onUpdateHotelCatalog?: (newCatalog: HotelModel[]) => void;
}

// Allowed vehicle options as strictly requested:
// 1. Aspire instead of Etios
// 2. AC SUV instead of Ertiga and Innova
// 3. Traveller 12 seat, not 17
// 4. Urbania removed completely
export const FLEET_OPTIONS = [
  'AC Sedan',
  'AC SUV',
  'Traveller 12 Seater AC',
];

export const MEAL_PLANS = [
  'CP (Buffet Breakfast)',
  'MAP (Breakfast & Dinner)',
  'AP (All Meals)',
  'EP (Room Only)',
];

// Generate unique ID
function createId(prefix = 'acc'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
}

// Add days safely to a Date
function addDays(baseDate: Date, days: number): Date {
  const res = new Date(baseDate.getTime());
  res.setDate(res.getDate() + days);
  return res;
}

// Flexible date parser supporting "15 Oct 2026", "15th Oct", "2026-10-15", "15/10/2026"
function parseFlexible(dateStr: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  const safe = parseDateSafe(dateStr);
  if (safe) return safe;

  const cleaned = dateStr.replace(/(\d+)(st|nd|rd|th)/gi, '$1').trim();
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

// Mathematical cascading check-in date validator:
// If destination 1 is 2 nights starting 15 Oct -> Dest 2 check-in is 17 Oct (15 + 2)
// If destination 2 is 1 night -> Dest 3 check-in is 18 Oct (17 + 1)
function recalculateSequentialCheckIns(pickupStr: string, accs: AccommodationItem[]): AccommodationItem[] {
  const base = parseFlexible(pickupStr) || new Date();
  let cumulativeNights = 0;

  return accs.map((acc) => {
    const checkInDateObj = addDays(base, cumulativeNights);
    const nights = Math.max(1, Number(acc.nights) || 1);
    cumulativeNights += nights;
    return {
      ...acc,
      nights,
      checkInDate: formatDisplayDate(checkInDateObj),
    };
  });
}

// Calculate drop-off date from pickup date and cumulative nights
function calculateDropoffFromPickup(pickupStr: string, totalNights: number): string {
  const base = parseFlexible(pickupStr) || new Date();
  const dropDate = addDays(base, Math.max(1, totalNights));
  return formatDisplayDate(dropDate);
}

// Calculate nights between pickup and dropoff dates
function calculateNightsBetween(pickupStr: string, dropoffStr: string): number | null {
  const d1 = parseFlexible(pickupStr);
  const d2 = parseFlexible(dropoffStr);
  if (d1 && d2) {
    const diffMs = d2.getTime() - d1.getTime();
    const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (nights > 0 && nights <= 60) return nights;
  }
  return null;
}

// Serial quote code sequence generator (persisted in localStorage)
function getSequentialQuoteCode(increment = false): string {
  if (typeof window === 'undefined') return 'TCT-2026-Q0196';
  const saved = localStorage.getItem('tct_serial_quote_number');
  const currentNum = saved ? parseInt(saved, 10) : 196;
  const nextNum = increment ? currentNum + 1 : currentNum;
  localStorage.setItem('tct_serial_quote_number', String(nextNum));
  return `TCT-2026-Q${String(nextNum).padStart(4, '0')}`;
}

// Preferred stay locations & hubs for Kerala destinations
export const PREFERRED_STAY_HUBS: Record<string, { hub: string; highlight: string }> = {
  Munnar: { hub: 'Chinnakanal / Pallivasal / Tea Valley', highlight: 'Misty tea plantation slopes' },
  Thekkady: { hub: 'Kumily / Periyar Forest Border', highlight: 'Near spice walk & sanctuary boating' },
  Alleppey: { hub: 'Punnamada / Finishing Point Jetty', highlight: 'Prime backwater houseboat boarding' },
  Kovalam: { hub: 'Lighthouse Beach / Samudra Bay', highlight: 'Seafront promenade & sunset views' },
  Cochin: { hub: 'Fort Kochi / Marine Drive / Airport Hub', highlight: 'Colonial heritage or airport convenience' },
  Kochi: { hub: 'Fort Kochi / Marine Drive / Airport Hub', highlight: 'Colonial heritage or airport convenience' },
  Kumarakom: { hub: 'Vembanad Lakefront / Bird Sanctuary', highlight: 'Serene lakeside tranquility' },
  Wayanad: { hub: 'Vythiri / Kalpetta Rainforest Ridge', highlight: 'Lush greenery, waterfalls & caves' },
  Poovar: { hub: 'Poovar Island Estuary & Mangrove Coast', highlight: 'Floating cottages & backwater beach' },
  Varkala: { hub: 'North Cliff / Papanasam Beach', highlight: 'Scenic cliffside cafés & sunset' },
  Athirappilly: { hub: 'Chalakudy River / Falls View', highlight: 'Rainforest waterfall stay' },
  Bekal: { hub: 'Bekal Fort Beach / Pallikere', highlight: 'Historic coastal luxury' },
  Marari: { hub: 'Mararikulam Fishermen Village', highlight: 'Secluded coconut palm beach' },
  Kanyakumari: { hub: 'Cape Comorin / Sunrise Viewpoint', highlight: 'Triveni Sangam confluence' },
};

// Route movement builder based on current accommodation order
function buildRouteSummary(pickupLocation: string, accs: AccommodationItem[], dropoffLocation: string): string {
  const start = pickupLocation ? pickupLocation.split('(')[0].trim() : 'Cochin';
  const end = dropoffLocation ? dropoffLocation.split('(')[0].trim() : 'Cochin';
  
  const stops: string[] = [];
  accs.forEach((a) => {
    const dest = a.destination?.trim() || 'Kerala Stop';
    const nights = Math.max(1, Number(a.nights) || 1);
    stops.push(`${dest} (${nights}N)`);
  });

  if (stops.length === 0) return `${start} → ${end}`;
  return `${start} → ${stops.join(' → ')} → ${end}`;
}

export const WhatsappLeadsView: React.FC<WhatsappLeadsViewProps> = ({
  trip,
  onUpdateTrip,
  onNavigateToActivities,
  onNavigateToPreview,
  onNavigateToV1Trip,
  onOpenGoogleSheets,
  staffUser,
  hotelCatalog = INITIAL_HOTEL_CATALOG,
  onUpdateHotelCatalog,
}) => {
  // Dynamic cascading Hotel Catalog states
  const [customDestinationRows, setCustomDestinationRows] = useState<Record<number, boolean>>({});
  const [customHotelRows, setCustomHotelRows] = useState<Record<number, boolean>>({});
  const [customRoomRows, setCustomRoomRows] = useState<Record<number, boolean>>({});

  // Consolidated destinations for datalist and lookups
  const catalogDestinations = useMemo(() => {
    const set = new Set<string>();
    hotelCatalog.forEach((h) => {
      if (h.destination) set.add(h.destination.trim());
    });
    DEFAULT_KERALA_DESTINATIONS.forEach((d) => set.add(d));
    return Array.from(set);
  }, [hotelCatalog]);

  const destinationSelectOptions: SelectOption[] = useMemo(() => {
    return [
      ...catalogDestinations.map((dest) => {
        const count = hotelCatalog.filter(
          (h) => h.status !== false && h.destination?.trim().toLowerCase() === dest.trim().toLowerCase()
        ).length;
        return {
          value: dest,
          label: dest,
          badge: count > 0 ? `${count} ${count === 1 ? 'hotel' : 'hotels'}` : undefined,
        };
      }),
      {
        value: '__custom__',
        label: '✎ Custom Destination (Type Manually)...',
      },
    ];
  }, [catalogDestinations, hotelCatalog]);

  // 1. Persistent WhatsApp Message Parser State (kept until quote completed)
  const [pasteInput, setPasteInput] = useState<string>('');

  useEffect(() => {
    try {
      const savedMsg = localStorage.getItem('tct_current_lead_msg');
      if (savedMsg) {
        setPasteInput(savedMsg);
      }
    } catch (e) {
      console.error('Failed to load lead message from localStorage', e);
    }
  }, []);

  const [showPasteParser, setShowPasteParser] = useState(true);
  const [showLeadReferenceBox, setShowLeadReferenceBox] = useState(true);
  const [copiedQuote, setCopiedQuote] = useState(false);
  const [customDestinationInput, setCustomDestinationInput] = useState('');
  const [agentPhoneInput, setAgentPhoneInput] = useState('');
  const [lastRefreshedTime, setLastRefreshedTime] = useState<string>('Live');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-Parse Highlight & Missing Info Warning States
  const [autoHighlightedFields, setAutoHighlightedFields] = useState<string[]>([]);
  const [parserMissingAlerts, setParserMissingAlerts] = useState<string[]>([]);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  // Google Sheet Sync & Storage state
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [sheetSaveStatus, setSheetSaveStatus] = useState<string | null>(null);
  const [isRemoteConfigured, setIsRemoteConfigured] = useState(false);

  useEffect(() => {
    const checkConfig = () => {
      setIsRemoteConfigured(Boolean(getGoogleSheetWebAppUrl()));
    };
    checkConfig();
    window.addEventListener('storage', checkConfig);
    window.addEventListener('focus', checkConfig);
    return () => {
      window.removeEventListener('storage', checkConfig);
      window.removeEventListener('focus', checkConfig);
    };
  }, []);

  // Sync / Fetch remote voucher on initial mount
  useEffect(() => {
    let isSubscribed = true;
    async function initVoucherNumber() {
      if (!trip.voucherNumber || !trip.voucherNumber.startsWith('TCT-2026-Q') || trip.voucherNumber === 'TCT-2026-KER-0195') {
        const res = await fetchLastVoucherNumber();
        if (isSubscribed) {
          onUpdateTrip({ ...trip, voucherNumber: res.nextCode });
        }
      }
    }
    initVoucherNumber();
    return () => { isSubscribed = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Increment to Next Serial Quote Code
  const handleNextSerialCode = () => {
    const nextCode = getSequentialQuoteCode(true);
    onUpdateTrip({ ...trip, voucherNumber: nextCode });
  };

  // Handle Sync / Fetch latest from Google Sheet
  const handleSyncVoucherFromSheet = async () => {
    setIsSyncingSheet(true);
    setSheetSaveStatus(null);
    try {
      const res = await fetchLastVoucherNumber();
      onUpdateTrip({ ...trip, voucherNumber: res.nextCode });
      setSheetSaveStatus(res.isRemote ? `Synced: ${res.nextCode}` : `Local: ${res.nextCode}`);
      setTimeout(() => setSheetSaveStatus(null), 3500);
    } finally {
      setIsSyncingSheet(false);
    }
  };


  // Optional Meal Plan Column Visibility (hidden by default, toggled via button)
  const [showMealPlanCol, setShowMealPlanCol] = useState<boolean>(false);

  // Active non-houseboat meal plan from current accommodations, fallback to CP
  const defaultTourMealPlan = useMemo(() => {
    const nonHb = trip.accommodations?.find(
      (a) => !a.destination?.toLowerCase().includes('alleppey') && !a.hotelName?.toLowerCase().includes('houseboat')
    );
    return nonHb?.mealPlan || 'CP (Buffet Breakfast)';
  }, [trip.accommodations]);

  // Reorder mode for stop rearranging (hidden by default, toggled via button)
  const [isReorderMode, setIsReorderMode] = useState<boolean>(false);


  // Costing & Margin state
  const [isCustomPickup, setIsCustomPickup] = useState<boolean>(() => !LOCATION_OPTIONS.includes(trip.pickupLocation));
  const [isCustomDropoff, setIsCustomDropoff] = useState<boolean>(() => !LOCATION_OPTIONS.includes(trip.dropoffLocation));

  const [vehicleCost, setVehicleCost] = useState<number>(() => {
    return typeof trip.vehicleCharge === 'number' 
      ? trip.vehicleCharge 
      : Number(trip.vehicleCharge) || 12500;
  });

  const [marginType, setMarginType] = useState<'percentage' | 'custom'>(() => {
    return trip.marginType || 'percentage';
  });

  const [marginPercent, setMarginPercent] = useState<number>(() => {
    return typeof trip.marginPercent === 'number' ? trip.marginPercent : 20;
  });

  const [marginCustomAmount, setMarginCustomAmount] = useState<number>(() => {
    return typeof trip.marginCustomAmount === 'number' 
      ? trip.marginCustomAmount 
      : Number(trip.marginCustomAmount) || 5000;
  });

  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(() => {
    return typeof trip.adjustmentAmount === 'number' 
      ? trip.adjustmentAmount 
      : Number(trip.adjustmentAmount) || 0;
  });

  const [advancePercentage, setAdvancePercentage] = useState<number>(() => {
    return typeof trip.advancePercentage === 'number' && trip.advancePercentage > 0
      ? trip.advancePercentage
      : 40;
  });

  // Save raw lead message to localStorage so it is never lost until manually cleared
  const handleUpdatePasteInput = (val: string) => {
    setPasteInput(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tct_current_lead_msg', val);
    }
  };

  // Clear lead message when quote is fully completed / new lead
  const handleClearLeadMessage = () => {
    setPasteInput('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tct_current_lead_msg');
    }
  };

  // Compute total hotel B2B cost
  const totalHotelB2BCost = useMemo(() => {
    return trip.accommodations.reduce((sum, acc) => {
      const price = Number(acc.b2bPrice) || 0;
      const nights = Math.max(1, Number(acc.nights) || 1);
      return sum + (price * nights);
    }, 0);
  }, [trip.accommodations]);

  // Compute Base Cost (Hotels + Vehicle)
  const baseCost = totalHotelB2BCost + (Number(vehicleCost) || 0);

  // Compute Margin Amount
  const marginAmount = marginType === 'percentage'
    ? Math.round(baseCost * ((Number(marginPercent) || 0) / 100))
    : (Number(marginCustomAmount) || 0);

  // Subtotal before adjustment
  const subtotalCost = baseCost + marginAmount;

  // Final Gross Selling Package Value
  const finalTotalPackageCost = Math.max(0, subtotalCost + (Number(adjustmentAmount) || 0));

  // Compute dynamic advance amount and balance payable
  const calculatedAdvanceAmount = useMemo(() => {
    return Math.min(
      Math.round(finalTotalPackageCost * (advancePercentage / 100)),
      finalTotalPackageCost > 0 ? finalTotalPackageCost - 1 : 0
    );
  }, [finalTotalPackageCost, advancePercentage]);

  const calculatedBalanceAmount = useMemo(() => {
    return Math.max(0, finalTotalPackageCost - calculatedAdvanceAmount);
  }, [finalTotalPackageCost, calculatedAdvanceAmount]);

  // Helper to calculate total cost string
  const calculateTotalCostString = (
    accs: AccommodationItem[],
    vehCost: number,
    mType: 'percentage' | 'custom',
    mPct: number,
    mCustom: number,
    adj: number
  ) => {
    const hotelTotal = accs.reduce((sum, acc) => {
      const price = Number(acc.b2bPrice) || 0;
      const nights = Math.max(1, Number(acc.nights) || 1);
      return sum + (price * nights);
    }, 0);
    const bCost = hotelTotal + (Number(vehCost) || 0);
    const mAmt = mType === 'percentage'
      ? Math.round(bCost * ((Number(mPct) || 0) / 100))
      : (Number(mCustom) || 0);
    const finalAmt = Math.max(0, bCost + mAmt + (Number(adj) || 0));
    return `₹ ${finalAmt.toLocaleString('en-IN')}/-`;
  };

  // Sync computed pricing to trip object
  const syncPricingToTrip = (
    vehCost: number,
    mType: 'percentage' | 'custom',
    mPct: number,
    mCustom: number,
    adj: number,
    advPct: number = advancePercentage
  ) => {
    const newTotalStr = calculateTotalCostString(trip.accommodations, vehCost, mType, mPct, mCustom, adj);
    const parsedTotal = parseFloat(newTotalStr.replace(/[^\d.]/g, '')) || 0;
    const calcAdv = Math.min(Math.round(parsedTotal * (advPct / 100)), parsedTotal > 0 ? parsedTotal - 1 : 0);
    const calcBal = Math.max(0, parsedTotal - calcAdv);

    onUpdateTrip({
      ...trip,
      vehicleCharge: vehCost,
      marginType: mType,
      marginPercent: mPct,
      marginCustomAmount: mCustom,
      adjustmentAmount: adj,
      totalPackageCost: newTotalStr,
      advancePercentage: advPct,
      balancePayable: `₹ ${calcBal.toLocaleString('en-IN')}/-`,
    });
  };

  // Requirement 3 & 6: Pickup Date Change with cascading check-in dates and dropoff calculation
  const handlePickupDateChange = (newPickupDate: string) => {
    const formattedPickup = formatDisplayDate(parseFlexible(newPickupDate) || new Date());
    const totalNights = trip.accommodations.reduce((sum, a) => sum + Math.max(1, Number(a.nights) || 1), 0);
    const updatedDropoff = calculateDropoffFromPickup(formattedPickup, totalNights);
    const updatedAccs = recalculateSequentialCheckIns(formattedPickup, trip.accommodations);
    const updatedRoute = buildRouteSummary(trip.pickupLocation, updatedAccs, trip.dropoffLocation);
    const updatedDays = syncDaysWithAccommodationsAndPickup(trip.days || [], updatedAccs, formattedPickup, trip.dropoffLocation);

    onUpdateTrip({
      ...trip,
      pickupDate: formattedPickup,
      dropoffDate: updatedDropoff,
      accommodations: updatedAccs,
      routeSummary: updatedRoute,
      days: updatedDays,
    });
  };

  // Drop-off Date Change: recalculates nights and duration
  const handleDropoffDateChange = (newDropoffDate: string) => {
    const formattedDropoff = formatDisplayDate(parseFlexible(newDropoffDate) || new Date());
    const nights = calculateNightsBetween(trip.pickupDate, formattedDropoff);

    if (nights && nights > 0) {
      onUpdateTrip({
        ...trip,
        dropoffDate: formattedDropoff,
        durationNights: nights,
        durationDays: nights + 1,
      });
    } else {
      onUpdateTrip({
        ...trip,
        dropoffDate: formattedDropoff,
      });
    }
  };

  // Requirement 5: Rearrange destination row UP or DOWN
  // Updates accommodation order, re-sequences check-in dates, and updates route movement
  const handleMoveHotelRow = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= trip.accommodations.length) return;

    const reordered = [...trip.accommodations];
    const [movedItem] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, movedItem);

    // Recalculate sequential check-in dates based on new order
    const updatedWithDates = recalculateSequentialCheckIns(trip.pickupDate, reordered);
    const updatedRoute = buildRouteSummary(trip.pickupLocation, updatedWithDates, trip.dropoffLocation);
    const updatedDays = syncDaysWithAccommodationsAndPickup(trip.days || [], updatedWithDates, trip.pickupDate, trip.dropoffLocation);
    const { inclusions, exclusions } = generateDynamicInclusionsAndExclusions(trip.vehicleType, updatedWithDates, trip.inclusions, trip.exclusions);

    onUpdateTrip({
      ...trip,
      accommodations: updatedWithDates,
      routeSummary: updatedRoute,
      days: updatedDays,
      inclusions,
      exclusions,
    });
  };

  // Helper to handle hotel field change with cascading date validation
  const handleUpdateHotelRow = (index: number, field: keyof AccommodationItem, value: any) => {
    let updatedAccs = [...trip.accommodations];
    const target = { ...updatedAccs[index], [field]: value };

    if (field === 'b2bPrice' || field === 'nights') {
      const price = field === 'b2bPrice' ? Number(value) || 0 : Number(target.b2bPrice) || 0;
      const nights = field === 'nights' ? Math.max(1, Number(value) || 1) : target.nights || 1;
      target.b2bTotal = price * nights;
      target.nights = nights;
    }

    updatedAccs[index] = target;

    // Recalculate package price with new hotel totals
    const newTotalStr = calculateTotalCostString(updatedAccs, vehicleCost, marginType, marginPercent, marginCustomAmount, adjustmentAmount);

    // If nights changed, recalculate sequential check-in dates for all subsequent rows
    if (field === 'nights') {
      updatedAccs = recalculateSequentialCheckIns(trip.pickupDate, updatedAccs);
      const totalNights = updatedAccs.reduce((sum, a) => sum + (a.nights || 1), 0);
      const updatedDropoff = calculateDropoffFromPickup(trip.pickupDate, totalNights);
      const updatedRoute = buildRouteSummary(trip.pickupLocation, updatedAccs, trip.dropoffLocation);
      const updatedDays = syncDaysWithAccommodationsAndPickup(trip.days || [], updatedAccs, trip.pickupDate, trip.dropoffLocation);
      const { inclusions, exclusions } = generateDynamicInclusionsAndExclusions(trip.vehicleType, updatedAccs, trip.inclusions, trip.exclusions);

      onUpdateTrip({
        ...trip,
        accommodations: updatedAccs,
        durationNights: totalNights,
        durationDays: totalNights + 1,
        dropoffDate: updatedDropoff,
        routeSummary: updatedRoute,
        days: updatedDays,
        inclusions,
        exclusions,
        totalPackageCost: newTotalStr,
      });
      return;
    }

    // If destination or hotel changed, update route summary, inclusions and days
    if (field === 'destination' || field === 'hotelName') {
      const updatedRoute = buildRouteSummary(trip.pickupLocation, updatedAccs, trip.dropoffLocation);
      const updatedDays = syncDaysWithAccommodationsAndPickup(trip.days || [], updatedAccs, trip.pickupDate, trip.dropoffLocation);
      const { inclusions, exclusions } = generateDynamicInclusionsAndExclusions(trip.vehicleType, updatedAccs, trip.inclusions, trip.exclusions);
      onUpdateTrip({
        ...trip,
        accommodations: updatedAccs,
        routeSummary: updatedRoute,
        days: updatedDays,
        inclusions,
        exclusions,
        totalPackageCost: newTotalStr,
      });
      return;
    }

    onUpdateTrip({
      ...trip,
      accommodations: updatedAccs,
      totalPackageCost: newTotalStr,
    });
  };

  // Helper to handle multiple hotel fields update in one batch (e.g., selecting catalog hotel + room + base rate)
  const handleUpdateHotelRowMulti = (index: number, updates: Partial<AccommodationItem>) => {
    let updatedAccs = [...trip.accommodations];
    const target = { ...updatedAccs[index], ...updates };

    const price = Number(target.b2bPrice) || 0;
    const nights = Math.max(1, Number(target.nights) || 1);
    target.b2bTotal = price * nights;
    target.nights = nights;

    updatedAccs[index] = target;

    const newTotalStr = calculateTotalCostString(updatedAccs, vehicleCost, marginType, marginPercent, marginCustomAmount, adjustmentAmount);

    if ('nights' in updates) {
      updatedAccs = recalculateSequentialCheckIns(trip.pickupDate, updatedAccs);
      const totalNights = updatedAccs.reduce((sum, a) => sum + (a.nights || 1), 0);
      const updatedDropoff = calculateDropoffFromPickup(trip.pickupDate, totalNights);
      const updatedRoute = buildRouteSummary(trip.pickupLocation, updatedAccs, trip.dropoffLocation);
      const updatedDays = syncDaysWithAccommodationsAndPickup(trip.days || [], updatedAccs, trip.pickupDate, trip.dropoffLocation);
      const { inclusions, exclusions } = generateDynamicInclusionsAndExclusions(trip.vehicleType, updatedAccs, trip.inclusions, trip.exclusions);

      onUpdateTrip({
        ...trip,
        accommodations: updatedAccs,
        durationNights: totalNights,
        durationDays: totalNights + 1,
        dropoffDate: updatedDropoff,
        routeSummary: updatedRoute,
        days: updatedDays,
        inclusions,
        exclusions,
        totalPackageCost: newTotalStr,
      });
      return;
    }

    if ('destination' in updates || 'hotelName' in updates) {
      const updatedRoute = buildRouteSummary(trip.pickupLocation, updatedAccs, trip.dropoffLocation);
      const updatedDays = syncDaysWithAccommodationsAndPickup(trip.days || [], updatedAccs, trip.pickupDate, trip.dropoffLocation);
      const { inclusions, exclusions } = generateDynamicInclusionsAndExclusions(trip.vehicleType, updatedAccs, trip.inclusions, trip.exclusions);
      onUpdateTrip({
        ...trip,
        accommodations: updatedAccs,
        routeSummary: updatedRoute,
        days: updatedDays,
        inclusions,
        exclusions,
        totalPackageCost: newTotalStr,
      });
      return;
    }

    onUpdateTrip({
      ...trip,
      accommodations: updatedAccs,
      totalPackageCost: newTotalStr,
    });
  };

  // Add a new night / hotel row with auto sequential check-in date
  const handleAddHotelRow = () => {
    const lastAcc = trip.accommodations[trip.accommodations.length - 1];
    const newDestination = lastAcc ? lastAcc.destination : 'Munnar';
    const newNightRow: AccommodationItem = {
      id: createId('acc'),
      destination: newDestination,
      hotelName: '',
      roomCategory: 'Deluxe Room',
      checkInDate: '',
      nights: 1,
      mealPlan: defaultTourMealPlan,
      status: 'Confirmed',
      b2bPrice: 2800,
      b2bTotal: 2800,
    };

    const combined = [...trip.accommodations, newNightRow];
    const updatedAccs = recalculateSequentialCheckIns(trip.pickupDate, combined);
    const totalNights = updatedAccs.reduce((sum, a) => sum + (a.nights || 1), 0);
    const updatedDropoff = calculateDropoffFromPickup(trip.pickupDate, totalNights);
    const updatedRoute = buildRouteSummary(trip.pickupLocation, updatedAccs, trip.dropoffLocation);
    const updatedDays = syncDaysWithAccommodationsAndPickup(trip.days || [], updatedAccs, trip.pickupDate, trip.dropoffLocation);
    const { inclusions, exclusions } = generateDynamicInclusionsAndExclusions(trip.vehicleType, updatedAccs, trip.inclusions, trip.exclusions);
    const newTotalStr = calculateTotalCostString(updatedAccs, vehicleCost, marginType, marginPercent, marginCustomAmount, adjustmentAmount);

    onUpdateTrip({
      ...trip,
      durationNights: totalNights,
      durationDays: totalNights + 1,
      dropoffDate: updatedDropoff,
      accommodations: updatedAccs,
      routeSummary: updatedRoute,
      days: updatedDays,
      inclusions,
      exclusions,
      totalPackageCost: newTotalStr,
    });
  };

  // Remove a night / hotel row
  const handleRemoveHotelRow = (index: number) => {
    if (trip.accommodations.length <= 1) return;
    const filtered = trip.accommodations.filter((_, i) => i !== index);
    const updatedAccs = recalculateSequentialCheckIns(trip.pickupDate, filtered);
    const totalNights = updatedAccs.reduce((sum, a) => sum + (a.nights || 1), 0);
    const updatedDropoff = calculateDropoffFromPickup(trip.pickupDate, totalNights);
    const updatedRoute = buildRouteSummary(trip.pickupLocation, updatedAccs, trip.dropoffLocation);
    const updatedDays = syncDaysWithAccommodationsAndPickup(trip.days || [], updatedAccs, trip.pickupDate, trip.dropoffLocation);
    const { inclusions, exclusions } = generateDynamicInclusionsAndExclusions(trip.vehicleType, updatedAccs, trip.inclusions, trip.exclusions);
    const newTotalStr = calculateTotalCostString(updatedAccs, vehicleCost, marginType, marginPercent, marginCustomAmount, adjustmentAmount);

    onUpdateTrip({
      ...trip,
      durationNights: totalNights,
      durationDays: totalNights + 1,
      dropoffDate: updatedDropoff,
      accommodations: updatedAccs,
      routeSummary: updatedRoute,
      days: updatedDays,
      inclusions,
      exclusions,
      totalPackageCost: newTotalStr,
    });
  };

  // Toggle destination in Kerala pill selector
  const handleToggleDestination = (destName: string) => {
    const isPresent = trip.accommodations.some(
      (a) => a.destination.trim().toLowerCase() === destName.trim().toLowerCase()
    );

    if (isPresent) {
      if (trip.accommodations.length <= 1) return;
      const updated = trip.accommodations.filter(
        (a) => a.destination.trim().toLowerCase() !== destName.trim().toLowerCase()
      );
      const updatedAccs = recalculateSequentialCheckIns(trip.pickupDate, updated);
      const totalNights = updatedAccs.reduce((sum, a) => sum + (a.nights || 1), 0);
      const updatedDropoff = calculateDropoffFromPickup(trip.pickupDate, totalNights);
      const updatedRoute = buildRouteSummary(trip.pickupLocation, updatedAccs, trip.dropoffLocation);
      const updatedDays = syncDaysWithAccommodationsAndPickup(trip.days || [], updatedAccs, trip.pickupDate, trip.dropoffLocation);
      const { inclusions, exclusions } = generateDynamicInclusionsAndExclusions(trip.vehicleType, updatedAccs, trip.inclusions, trip.exclusions);
      const newTotalStr = calculateTotalCostString(updatedAccs, vehicleCost, marginType, marginPercent, marginCustomAmount, adjustmentAmount);

      onUpdateTrip({
        ...trip,
        durationNights: totalNights,
        durationDays: totalNights + 1,
        dropoffDate: updatedDropoff,
        accommodations: updatedAccs,
        routeSummary: updatedRoute,
        days: updatedDays,
        inclusions,
        exclusions,
        totalPackageCost: newTotalStr,
      });
    } else {
      const isHouseboat = destName.toLowerCase().includes('alleppey') || destName.toLowerCase().includes('houseboat');
      const destHotels = hotelCatalog.filter((h) => h.status !== false && h.destination?.trim().toLowerCase() === destName.trim().toLowerCase());
      const firstHotel = destHotels[0];
      const firstRoom = firstHotel?.rooms?.[0];
      const newAcc: AccommodationItem = {
        id: createId('acc'),
        destination: destName,
        hotelName: firstHotel ? firstHotel.hotel_name : '',
        roomCategory: firstRoom ? firstRoom.room_category : (isHouseboat ? 'Private AC Houseboat' : 'Deluxe Room'),
        checkInDate: '',
        nights: 1,
        mealPlan: isHouseboat ? 'AP (All Meals)' : defaultTourMealPlan,
        status: 'Confirmed',
        b2bPrice: firstRoom ? firstRoom.base_b2b_rate : (isHouseboat ? 15500 : 0),
        b2bTotal: firstRoom ? firstRoom.base_b2b_rate : (isHouseboat ? 15500 : 0),
      };
      const updatedAccs = recalculateSequentialCheckIns(trip.pickupDate, [...trip.accommodations, newAcc]);
      const totalNights = updatedAccs.reduce((sum, a) => sum + (a.nights || 1), 0);
      const updatedDropoff = calculateDropoffFromPickup(trip.pickupDate, totalNights);
      const updatedRoute = buildRouteSummary(trip.pickupLocation, updatedAccs, trip.dropoffLocation);
      const updatedDays = syncDaysWithAccommodationsAndPickup(trip.days || [], updatedAccs, trip.pickupDate, trip.dropoffLocation);
      const { inclusions, exclusions } = generateDynamicInclusionsAndExclusions(trip.vehicleType, updatedAccs, trip.inclusions, trip.exclusions);
      const newTotalStr = calculateTotalCostString(updatedAccs, vehicleCost, marginType, marginPercent, marginCustomAmount, adjustmentAmount);

      onUpdateTrip({
        ...trip,
        durationNights: totalNights,
        durationDays: totalNights + 1,
        dropoffDate: updatedDropoff,
        accommodations: updatedAccs,
        routeSummary: updatedRoute,
        days: updatedDays,
        inclusions,
        exclusions,
        totalPackageCost: newTotalStr,
      });
    }
  };

  // Add custom place
  const handleAddCustomPlace = () => {
    const trimmed = customDestinationInput.trim();
    if (!trimmed) return;
    handleToggleDestination(trimmed);
    setCustomDestinationInput('');
  };

  // Quick apply default meal plan to all non-houseboat hotels
  const handleApplyGlobalMealPlan = (plan: string) => {
    const updated = trip.accommodations.map((acc) => {
      const isHouseboat = acc.destination.toLowerCase().includes('alleppey') || acc.hotelName.toLowerCase().includes('houseboat');
      return {
        ...acc,
        mealPlan: isHouseboat ? 'Houseboat All Meals Plan' : plan,
      };
    });
    const updatedInclusions = (trip.inclusions || []).map((inc) => {
      if (inc.toLowerCase().startsWith('meal plan:') || inc.toLowerCase().includes('breakfast')) {
        return `Meal Plan: ${plan} at hotels/resorts; all meals on Houseboat`;
      }
      return inc;
    });

    onUpdateTrip({
      ...trip,
      accommodations: updated,
      inclusions: updatedInclusions,
    });
  };

  // Requirement 1, 3, 8, 11: WhatsApp Message Quick-Parser for Leads
  const handleParseWhatsAppLead = () => {
    if (!pasteInput.trim()) return;
    const text = pasteInput;

    // Detect destinations mentioned with nights count if specified (e.g., 2N Munnar, 1N Thekkady)
    const allKnown = [
      ...DEFAULT_KERALA_DESTINATIONS,
      'Kumarakom', 'Jatayu', 'Marari', 'Bekal', 'Calicut', 'Kozhikode', 'Vagamon', 'Nelliyampathy'
    ];

    const detectedStops: { destination: string; nights: number }[] = [];
    allKnown.forEach((dest) => {
      const regexWithNights = new RegExp(`(\\d+)\\s*(?:n|night|nights)?\\s*${dest}|${dest}\\s*(\\d+)\\s*(?:n|night|nights)?`, 'i');
      const match = text.match(regexWithNights);
      const plainRegex = new RegExp(`\\b${dest}\\b`, 'i');

      if (match) {
        const nights = parseInt(match[1] || match[2] || '1', 10);
        detectedStops.push({ destination: dest, nights: Math.max(1, nights) });
      } else if (plainRegex.test(text)) {
        detectedStops.push({ destination: dest, nights: 1 });
      }
    });

    // Requirement 8: Detect vehicle strictly matching new fleet
    let detectedVehicle = 'AC Sedan';
    if (/suv|innova|ertiga|crysta|scorpio|xuv/i.test(text)) {
      detectedVehicle = 'AC SUV';
    } else if (/traveller|tempo|12\s*seat|van|bus|minibus/i.test(text)) {
      detectedVehicle = 'Traveller 12 Seater AC';
    } else if (/sedan|dzire|aspire|etios|cab/i.test(text)) {
      detectedVehicle = 'AC Sedan';
    }

    // Detect adults count
    const adultsMatch = text.match(/(\d+)\s*(?:adults?|pax|guests?|person)/i);
    const detectedAdults = adultsMatch ? parseInt(adultsMatch[1], 10) : trip.adultsCount;

    // Requirement 11: Detect children and child ages
    let detectedChildren = trip.childrenCount;
    let detectedChildrenAges = trip.childrenAges;
    const childMatch = text.match(/(\d+)\s*(?:child|children|kid|kids|childs|infant)/i);
    if (childMatch) {
      detectedChildren = parseInt(childMatch[1], 10);
    }
    const ageMatch = text.match(/(?:child|kid|children|age|ages?)\s*(?:is|of|:)?\s*(\d+(?:\s*(?:yrs?|years?|yo))?(?:\s*(?:and|,)\s*\d+(?:\s*(?:yrs?|years?|yo))?)?)/i);
    if (ageMatch) {
      detectedChildrenAges = ageMatch[1].trim();
    }

    // Requirement 3: Detect pickup and drop-off dates
    let detectedPickupDate = trip.pickupDate;
    let detectedDropoffDate = trip.dropoffDate;

    // Check for explicit dates e.g. "15 Oct 2026", "20/10/2026", "travel date: 22nd Nov"
    const dateRangeMatch = text.match(/(?:from|travel\s*dates?|dates?)\s*[:\-]?\s*([0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:\s+202[5-9])?|[0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.](?:202[5-9]|2[5-9]))\s*(?:to|till|\-)\s*([0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:\s+202[5-9])?|[0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.](?:202[5-9]|2[5-9]))/i);
    let singleDateMatch: RegExpMatchArray | null = null;
    if (dateRangeMatch) {
      const pParsed = parseFlexible(dateRangeMatch[1]);
      const dParsed = parseFlexible(dateRangeMatch[2]);
      if (pParsed) detectedPickupDate = formatDisplayDate(pParsed);
      if (dParsed) detectedDropoffDate = formatDisplayDate(dParsed);
    } else {
      singleDateMatch = text.match(/(?:travel\s*date|date|start|pickup|arrival|on)\s*[:\-]?\s*([0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:\s+202[5-9])?|[0-9]{1,2}[\/\-\.][0-9]{1,2}[\/\-\.](?:202[5-9]|2[5-9]))/i);
      if (singleDateMatch) {
        const pParsed = parseFlexible(singleDateMatch[1]);
        if (pParsed) detectedPickupDate = formatDisplayDate(pParsed);
      }
    }

    // Detect meal plan
    let detectedMealPlan = defaultTourMealPlan;
    if (/map|dinner/i.test(text)) detectedMealPlan = 'MAP (Breakfast & Dinner)';
    else if (/ap|all meals|lunch.*dinner/i.test(text)) detectedMealPlan = 'AP (All Meals)';
    else if (/ep|room only/i.test(text)) detectedMealPlan = 'EP (Room Only)';
    else if (/cp|breakfast/i.test(text)) detectedMealPlan = 'CP (Buffet Breakfast)';

    // Build accommodations
    let newAccs: AccommodationItem[] = trip.accommodations;
    if (detectedStops.length > 0) {
      newAccs = detectedStops.map((stop) => {
        const dest = stop.destination;
        const isHouseboat = dest.toLowerCase().includes('alleppey') || dest.toLowerCase().includes('houseboat');
        const destHotels = hotelCatalog.filter((h) => h.status !== false && h.destination?.trim().toLowerCase() === dest.trim().toLowerCase());
        const firstHotel = destHotels[0];
        const firstRoom = firstHotel?.rooms?.[0];
        const hotelName = firstHotel ? firstHotel.hotel_name : (isHouseboat ? 'Private Premium AC Houseboat' : '');
        const roomCategory = firstRoom ? firstRoom.room_category : (isHouseboat ? 'Private AC Houseboat' : 'Deluxe Room');
        const b2bRate = firstRoom ? firstRoom.base_b2b_rate : (isHouseboat ? 15500 : 0);
        return {
          id: createId('acc'),
          destination: dest,
          hotelName,
          roomCategory,
          checkInDate: '',
          nights: stop.nights,
          mealPlan: isHouseboat ? 'AP (All Meals)' : detectedMealPlan,
          status: 'Confirmed',
          b2bPrice: b2bRate,
          b2bTotal: b2bRate * stop.nights,
        };
      });
    }

    // Cascading check-in dates
    newAccs = recalculateSequentialCheckIns(detectedPickupDate, newAccs);
    const totalN = newAccs.reduce((sum, a) => sum + (a.nights || 1), 0);

    // If dropoff date wasn't explicitly mentioned, calculate from pickup + nights
    if (!dateRangeMatch) {
      detectedDropoffDate = calculateDropoffFromPickup(detectedPickupDate, totalN);
    }

    const updatedRoute = buildRouteSummary(trip.pickupLocation, newAccs, trip.dropoffLocation);
    const updatedDays = syncDaysWithAccommodationsAndPickup(trip.days || [], newAccs, detectedPickupDate, trip.dropoffLocation);
    const { inclusions, exclusions } = generateDynamicInclusionsAndExclusions(detectedVehicle, newAccs, trip.inclusions, trip.exclusions);
    const newTotalStr = calculateTotalCostString(newAccs, vehicleCost, marginType, marginPercent, marginCustomAmount, adjustmentAmount);

    onUpdateTrip({
      ...trip,
      guestName: trip.guestName || 'Valued Guest',
      vehicleType: detectedVehicle,
      adultsCount: detectedAdults || 2,
      childrenCount: detectedChildren,
      childrenAges: detectedChildrenAges,
      pickupDate: detectedPickupDate,
      dropoffDate: detectedDropoffDate,
      durationNights: totalN,
      durationDays: totalN + 1,
      accommodations: newAccs,
      routeSummary: updatedRoute,
      days: updatedDays,
      inclusions,
      exclusions,
      totalPackageCost: newTotalStr,
    });

    // Requirement 1: DO NOT clear pasteInput! Keep it in the parser until quote is completed
    setShowLeadReferenceBox(true);

    // Track detected fields for visual success highlighting
    const detected: string[] = [];
    if (dateRangeMatch || singleDateMatch) detected.push('dates');
    if (adultsMatch) detected.push('adults');
    if (childMatch || ageMatch) detected.push('children');
    if (/suv|innova|ertiga|crysta|scorpio|xuv|traveller|tempo|12\s*seat|van|bus|minibus|sedan|dzire|aspire|etios|cab/i.test(text)) detected.push('vehicle');
    if (detectedStops.length > 0) detected.push('destinations');
    if (/map|dinner|ap|all meals|lunch.*dinner|ep|room only|cp|breakfast/i.test(text)) detected.push('mealPlan');

    setAutoHighlightedFields(detected);
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = setTimeout(() => {
      setAutoHighlightedFields([]);
    }, 3500);

    // Track missing crucial info warnings
    const missing: string[] = [];
    if (!dateRangeMatch && !singleDateMatch) {
      missing.push("Could not detect travel dates from the message (defaulted to today's date).");
    }
    if (!adultsMatch) {
      missing.push("Could not detect number of guests/pax (defaulted to 2 adults).");
    }
    if (detectedStops.length === 0) {
      missing.push("Could not detect destination stops or nights (defaulted to current schedule).");
    }
    setParserMissingAlerts(missing);
  };

  // Requirement 9: Live WhatsApp formatted quote text (Reactively updates on any change)
  const generateAgentWhatsAppQuote = () => {
    const guestDisplayName = trip.guestName.trim() || 'Valued Guest';
    const guestPhone = trip.guestContact ? ` | Ph: ${trip.guestContact}` : '';
    
    // Group hotels for clean display
    const hotelLines = trip.accommodations.map((a, i) => {
      const hotel = a.hotelName ? a.hotelName : `Standard 3★ / 4★ Property`;
      const dateTag = a.checkInDate ? ` (${a.checkInDate})` : '';
      const isHouseboat = a.destination?.toLowerCase().includes('alleppey') || a.hotelName?.toLowerCase().includes('houseboat');
      const meal = isHouseboat 
        ? (a.mealPlan || 'Houseboat All Meals Plan') 
        : (a.mealPlan || defaultTourMealPlan || 'CP (Buffet Breakfast)');
      return `• *Night ${i + 1} - ${a.destination}*${dateTag}: ${hotel} [${a.roomCategory || 'Deluxe Room'}] - ${meal}`;
    }).join('\n');

    const childrenString = trip.childrenCount > 0 
      ? ` + ${trip.childrenCount} ${trip.childrenCount === 1 ? 'Child' : 'Children'}${trip.childrenAges ? ` (${trip.childrenAges})` : ''}`
      : '';

    const nonHb = trip.accommodations.find(
      (a) => !a.destination?.toLowerCase().includes('alleppey') && !a.hotelName?.toLowerCase().includes('houseboat')
    );
    const activeMeal = nonHb?.mealPlan || defaultTourMealPlan || 'CP (Buffet Breakfast)';
    const mealDescription = activeMeal.toLowerCase().includes('dinner') || activeMeal.toLowerCase().includes('map')
      ? 'Breakfast & Dinner'
      : activeMeal.toLowerCase().includes('all meals') || activeMeal.toLowerCase().includes('ap')
      ? 'All Meals'
      : activeMeal.toLowerCase().includes('room only') || activeMeal.toLowerCase().includes('ep')
      ? 'Room Only'
      : 'Buffet Breakfast';

    return `🌴 *TRAVEL CARE TOURS PVT LTD* 🌴
*B2B Kerala Tour Quotation*
---------------------------------------
📋 *Quote Ref:* ${trip.voucherNumber || 'TCT-2026-Q0196'}
👤 *Guest:* ${guestDisplayName}${guestPhone}
👥 *Pax:* ${trip.adultsCount} Adults${childrenString}
🗓️ *Duration:* ${trip.durationNights} Nights / ${trip.durationDays} Days
📍 *Pickup:* ${trip.pickupLocation} (${trip.pickupDate}${trip.pickupTime ? ` at ${trip.pickupTime}` : ''})
📍 *Drop-off:* ${trip.dropoffLocation} (${trip.dropoffDate}${trip.dropoffTime ? ` at ${trip.dropoffTime}` : ''})
🚗 *Vehicle:* ${trip.vehicleType} (Exclusive AC Cab for entire tour)

🏨 *PROPOSED HOTEL STAYS & SCHEDULE:*
${hotelLines}

💰 *TOTAL PACKAGE QUOTE:* ${trip.totalPackageCost || `₹ ${finalTotalPackageCost.toLocaleString('en-IN')}/-`}
*(Includes Accommodation, ${mealDescription}, Private AC Cab, Tolls, Parking, Driver Bata & GST)*

✅ *KEY INCLUSIONS:*
• Accommodation as per night schedule with specified meal plans (${activeMeal})
• Exclusive AC vehicle for all transfers and daily sightseeing as per itinerary
• Professional English/Hindi speaking tourist vehicle driver
• Toll taxes, parking charges, interstate permit & fuel charges
• 24/7 on-tour coordination & operational assistance

📞 *Travel Care Tours Operations Desk:* +91 94477 82828
🌐 Ernakulam, Kochi, Kerala | B2B Partner Desk`;
  };

  // Requirement 9: Refresh button handler with visual feedback and live timestamp
  const handleRefreshLiveQuote = () => {
    setIsRefreshing(true);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastRefreshedTime(`Refreshed at ${timeStr}`);
    
    // Re-verify sequential check-in dates
    const revalidated = recalculateSequentialCheckIns(trip.pickupDate, trip.accommodations);
    const updatedRoute = buildRouteSummary(trip.pickupLocation, revalidated, trip.dropoffLocation);
    
    onUpdateTrip({
      ...trip,
      accommodations: revalidated,
      routeSummary: updatedRoute,
    });

    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  // Handle copying WhatsApp quote with safe fallback
  const handleCopyWhatsAppQuote = async () => {
    try {
      const text = generateAgentWhatsAppQuote();
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (typeof document !== 'undefined') {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedQuote(true);
      setTimeout(() => setCopiedQuote(false), 2500);
    } catch (err) {
      console.warn('Failed to copy WhatsApp quote:', err);
    }
  };

  // Handle direct WhatsApp Web send
  const handleDirectWhatsAppSend = () => {
    try {
      const text = encodeURIComponent(generateAgentWhatsAppQuote());
      const phoneClean = agentPhoneInput.replace(/\D/g, '');
      const url = phoneClean 
        ? `https://wa.me/${phoneClean}?text=${text}`
        : `https://wa.me/?text=${text}`;
      if (typeof window !== 'undefined') {
        window.open(url, '_blank');
      }
    } catch (err) {
      console.warn('WhatsApp send error:', err);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-[1440px] mx-auto pb-8 sm:pb-12">
      {/* Top Banner: Workflow Overview */}
      <div className="bg-gradient-to-r from-[#0B2545] via-[#133E6D] to-[#0B2545] text-white rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-md flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-emerald-400 text-emerald-950 uppercase tracking-wider">
              Staff B2B Workspace
            </span>
            <span className="text-[11px] sm:text-xs text-emerald-200 font-mono font-bold">
              Quote Ref: {trip.voucherNumber || 'TCT-2026-Q0196'}
            </span>
          </div>
          <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white">
            WhatsApp Leads to B2B Quote & Voucher
          </h1>
          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed">
            Convert travel agent WhatsApp inquiries into structured quotes with sequential check-in dates, interactive pickup/dropoff timing, reorderable stops, and manager margins.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowPasteParser(!showPasteParser)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300" />
            <span>{showPasteParser ? 'Hide Parser' : 'Lead Parser'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopyWhatsAppQuote()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-emerald-950 transition-all shadow-xs active:scale-95 whitespace-nowrap"
          >
            {copiedQuote ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" /> : <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            <span>{copiedQuote ? 'Copied!' : 'Copy Quote'}</span>
          </button>
        </div>
      </div>

      {/* Requirement 1: WhatsApp Message Parser with Persistence */}
      {showPasteParser && (
        <div className="bg-emerald-50/70 border-2 border-emerald-300/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-xs space-y-3 sm:space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs sm:text-base">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
              <span>Paste WhatsApp Message from Travel Agent</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs text-emerald-800 font-semibold bg-emerald-100/80 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg">
                Saved until completed
              </span>
              {pasteInput && (
                <button
                  type="button"
                  onClick={() => handleClearLeadMessage()}
                  className="text-[11px] sm:text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg transition-colors flex items-center gap-1"
                  title="Clear inquiry text to start fresh"
                >
                  <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          <textarea
            rows={3}
            value={pasteInput}
            onChange={(e) => handleUpdatePasteInput(e.target.value)}
            placeholder="Paste guest WhatsApp inquiry message here... (e.g. 2 adults 1 kid, 4 nights Munnar-Thekkady, dates 12 to 16 Nov, sedan cab)"
            className="w-full bg-white border border-emerald-200 rounded-xl p-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-700 font-mono"
          />

          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-emerald-200/60">
            <div className="text-[11px] sm:text-xs text-emerald-900 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
              <span>Auto-detects: Dates, Nights, Hubs (Munnar, Thekkady, etc.), Adults, Kids, Vehicle</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  handleUpdatePasteInput("Need Kerala quote for 4N/5D: 2N Munnar, 1N Thekkady, 1N Alleppey Houseboat. 3 star hotel with breakfast, AC Sedan cab, 2 adults + 1 kid (4 yrs). Travel date: 15 Oct 2026 to 19 Oct 2026.");
                }}
                className="text-[11px] sm:text-xs font-bold text-emerald-800 hover:text-emerald-950 underline px-1.5 py-1"
              >
                Sample Msg
              </button>
              <button
                type="button"
                onClick={() => handleParseWhatsAppLead()}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Parse & Populate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requirement 1: Collapsible Reference Card for Raw Message if parser drawer is closed */}
      {!showPasteParser && pasteInput && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:p-3.5 flex items-center justify-between gap-2.5 sm:gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 truncate min-w-0">
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700 shrink-0" />
            <span className="font-bold text-slate-900 shrink-0 text-[11px] sm:text-xs">Original Inquiry:</span>
            <span className="text-slate-600 truncate max-w-[200px] sm:max-w-[500px] font-mono text-[11px] sm:text-xs">{pasteInput}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowPasteParser(true)}
              className="text-emerald-700 font-bold hover:underline text-[11px] sm:text-xs whitespace-nowrap"
            >
              View Message
            </button>
            <button
              type="button"
              onClick={() => handleClearLeadMessage()}
              className="text-slate-400 hover:text-rose-600 p-1"
              title="Clear inquiry"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Missing Info Alerts from Auto-Parse */}
      {parserMissingAlerts.length > 0 && (
        <div className="bg-amber-50/95 border border-amber-300 rounded-xl p-3 sm:p-3.5 space-y-1.5 shadow-2xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Inquiry Parsing Attention Needed ({parserMissingAlerts.length}):</span>
            </div>
            <button
              type="button"
              onClick={() => setParserMissingAlerts([])}
              className="text-amber-800 hover:text-amber-950 text-xs font-bold px-2 py-0.5 rounded-md hover:bg-amber-100 transition-colors cursor-pointer"
              title="Dismiss warning"
            >
              ✕ Dismiss
            </button>
          </div>
          <div className="space-y-1 pl-6 text-xs text-amber-900 font-medium">
            {parserMissingAlerts.map((msg, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>{msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Top Metadata Row: Sequential Quote Code, Guest Name, Contact, Adults, Children, Vehicle */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-3.5 sm:p-6 shadow-xs space-y-3.5 sm:space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-100 text-[#0B2545] flex items-center justify-center font-bold shrink-0">
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0B2545]" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-xs sm:text-base tracking-tight">
                Lead Identification & Serial Quote Code
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Official quotation reference number and guest party configuration
              </p>
            </div>
          </div>

          {/* Requirement 2: Quote code in serial for cross checking */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 bg-slate-50/90 p-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-200 shadow-2xs w-full sm:w-auto">
            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
              <span className="text-[11px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider shrink-0">Quote Ref:</span>
              <input
                type="text"
                value={trip.voucherNumber || 'TCT-2026-Q0196'}
                onChange={(e) => onUpdateTrip({ ...trip, voucherNumber: e.target.value })}
                className="h-10 sm:h-11 px-2 sm:px-3 rounded-xl bg-white font-mono font-black text-xs sm:text-sm text-emerald-950 border border-slate-300 w-36 sm:w-44 text-center focus:ring-2 focus:ring-[#0B2545] focus:outline-hidden shadow-2xs min-w-0"
              />
              <button
                type="button"
                onClick={() => handleNextSerialCode()}
                className="h-10 sm:h-11 w-9 sm:w-10 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl text-base font-bold transition-all shadow-2xs shrink-0 flex items-center justify-center cursor-pointer"
                title="Increment Next Serial (+1)"
              >
                +
              </button>
              <button
                type="button"
                onClick={handleSyncVoucherFromSheet}
                disabled={isSyncingSheet}
                className="h-10 sm:h-11 w-9 sm:w-10 bg-white hover:bg-emerald-50 active:bg-emerald-100 text-slate-700 hover:text-emerald-800 border border-slate-300 rounded-xl transition-all shadow-2xs shrink-0 flex items-center justify-center cursor-pointer disabled:opacity-50"
                title="Fetch Latest Voucher # from Google Sheet"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheet ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            </div>

            {/* Sheet Connection Status Indicator (Green when connected, Red when disconnected) */}
            <button
              type="button"
              onClick={() => onOpenGoogleSheets?.()}
              className={`h-10 sm:h-11 px-2.5 sm:px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-2xs ${
                isRemoteConfigured
                  ? 'bg-emerald-50/90 text-emerald-900 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400'
                  : 'bg-rose-50/90 text-rose-900 border-rose-300 hover:bg-rose-100 hover:border-rose-400'
              }`}
              title={isRemoteConfigured ? "Google Sheet Connected (Click to view database)" : "Google Sheet Not Connected (Click to connect)"}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isRemoteConfigured ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isRemoteConfigured ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              </span>
              <Table className={`w-3.5 h-3.5 ${isRemoteConfigured ? 'text-emerald-700' : 'text-rose-700'}`} />
              <span className="text-[11px] font-extrabold hidden sm:inline">
                {isRemoteConfigured ? 'Sheet Connected' : 'Sheet Offline'}
              </span>
            </button>

            {sheetSaveStatus && (
              <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-200 animate-in fade-in">
                {sheetSaveStatus}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 sm:gap-4">
          {/* Guest Name */}
          <div className="sm:col-span-6 lg:col-span-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-700">Guest Name</label>
              <span className="text-[10px] sm:text-xs text-emerald-700 font-bold">Default: Valued Guest</span>
            </div>
            <div className="relative">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={trip.guestName === 'Valued Guest' ? '' : (trip.guestName || '')}
                onChange={(e) => onUpdateTrip({ ...trip, guestName: e.target.value })}
                placeholder="Valued Guest"
                className="w-full h-12 bg-slate-50/70 border border-slate-300 rounded-xl pl-10 sm:pl-11 pr-3 text-sm sm:text-base font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0B2545] focus:outline-hidden transition-colors shadow-2xs"
              />
            </div>
          </div>

          {/* Guest Phone */}
          <div className="sm:col-span-6 lg:col-span-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-700">Guest Phone</label>
              <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Optional</span>
            </div>
            <div className="relative">
              <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={trip.guestContact || ''}
                onChange={(e) => onUpdateTrip({ ...trip, guestContact: e.target.value })}
                placeholder=""
                className="w-full h-12 bg-slate-50/70 border border-slate-300 rounded-xl pl-10 sm:pl-11 pr-3 text-sm sm:text-base font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0B2545] focus:outline-hidden transition-colors shadow-2xs"
              />
            </div>
          </div>

          {/* Vehicle Type (Brought before Adults count, with 'Sedan • SUV • 12-Seat' removed) */}
          <div className={`sm:col-span-6 lg:col-span-3 space-y-1.5 p-1 rounded-xl transition-all duration-700 ${
            autoHighlightedFields.includes('vehicle') ? 'bg-emerald-50 ring-2 ring-emerald-500/70 shadow-xs' : ''
          }`}>
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-700 block">Vehicle Type</label>
              {autoHighlightedFields.includes('vehicle') && (
                <span className="text-[10px] font-extrabold text-emerald-700 animate-pulse">✓ Auto-filled</span>
              )}
            </div>
            <div className="relative">
              <Car className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <CustomSelect
                value={FLEET_OPTIONS.includes(trip.vehicleType) ? trip.vehicleType : FLEET_OPTIONS[0]}
                onChange={(newVeh) => {
                  const { inclusions, exclusions } = generateDynamicInclusionsAndExclusions(newVeh, trip.accommodations, trip.inclusions, trip.exclusions);
                  onUpdateTrip({ ...trip, vehicleType: newVeh, inclusions, exclusions });
                }}
                options={FLEET_OPTIONS}
                theme="navy"
                size="lg"
                triggerClassName="pl-10 sm:pl-11 font-bold text-sm sm:text-base text-slate-900 bg-slate-50/70 hover:bg-white"
                ariaLabel="Select Vehicle Type"
              />
            </div>
          </div>

          {/* Adults Count & Child Count - 1x1 Side-by-Side Grid */}
          <div className="sm:col-span-6 lg:col-span-3 grid grid-cols-2 gap-2.5 sm:gap-3">
            {/* Adults Count */}
            <div className={`space-y-1.5 p-1 rounded-xl transition-all duration-700 ${
              autoHighlightedFields.includes('adults') ? 'bg-emerald-50 ring-2 ring-emerald-500/70 shadow-xs' : ''
            }`}>
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold text-slate-700 block truncate">Adults Count</label>
                {autoHighlightedFields.includes('adults') && (
                  <span className="text-[10px] font-extrabold text-emerald-700 animate-pulse">✓ Auto</span>
                )}
              </div>
              <div className="flex items-center h-12 bg-slate-50/70 border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => onUpdateTrip({ ...trip, adultsCount: Math.max(1, trip.adultsCount - 1) })}
                  className="w-9 sm:w-10 h-full flex items-center justify-center text-slate-600 hover:bg-slate-200 active:bg-slate-300 transition-colors font-bold text-lg cursor-pointer shrink-0"
                  title="Decrease adults"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={trip.adultsCount}
                  onChange={(e) => onUpdateTrip({ ...trip, adultsCount: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  className="w-full text-center font-bold text-slate-900 text-sm sm:text-base bg-transparent border-0 focus:ring-0 focus:outline-hidden p-0"
                />
                <button
                  type="button"
                  onClick={() => onUpdateTrip({ ...trip, adultsCount: trip.adultsCount + 1 })}
                  className="w-9 sm:w-10 h-full flex items-center justify-center text-slate-600 hover:bg-slate-200 active:bg-slate-300 transition-colors font-bold text-lg cursor-pointer shrink-0"
                  title="Increase adults"
                >
                  +
                </button>
              </div>
            </div>

            {/* Child Count */}
            <div className={`space-y-1.5 p-1 rounded-xl transition-all duration-700 ${
              autoHighlightedFields.includes('children') ? 'bg-emerald-50 ring-2 ring-emerald-500/70 shadow-xs' : ''
            }`}>
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold text-slate-700 block truncate">Child Count</label>
                {autoHighlightedFields.includes('children') && (
                  <span className="text-[10px] font-extrabold text-emerald-700 animate-pulse">✓ Auto</span>
                )}
              </div>
              <div className="flex items-center h-12 bg-slate-50/70 border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                <button
                  type="button"
                  onClick={() => onUpdateTrip({ ...trip, childrenCount: Math.max(0, trip.childrenCount - 1) })}
                  className="w-9 sm:w-10 h-full flex items-center justify-center text-slate-600 hover:bg-slate-200 active:bg-slate-300 transition-colors font-bold text-lg cursor-pointer shrink-0"
                  title="Decrease children"
                >
                  -
                </button>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={trip.childrenCount}
                  onChange={(e) => onUpdateTrip({ ...trip, childrenCount: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  className="w-full text-center font-bold text-slate-900 text-sm sm:text-base bg-transparent border-0 focus:ring-0 focus:outline-hidden p-0"
                />
                <button
                  type="button"
                  onClick={() => onUpdateTrip({ ...trip, childrenCount: trip.childrenCount + 1 })}
                  className="w-9 sm:w-10 h-full flex items-center justify-center text-slate-600 hover:bg-slate-200 active:bg-slate-300 transition-colors font-bold text-lg cursor-pointer shrink-0"
                  title="Increase children"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Conditional Child Ages Entry (Only visible if childrenCount > 0) */}
          {trip.childrenCount > 0 && (
            <div className="sm:col-span-12 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <Baby className="w-4 h-4 text-amber-700" />
                  <span>Children Ages</span>
                </label>
                <span className="text-[10px] sm:text-xs text-amber-800 font-medium">
                  Below 5 yrs complimentary in Kerala hotels
                </span>
              </div>
              <input
                type="text"
                value={trip.childrenAges || ''}
                onChange={(e) => onUpdateTrip({ ...trip, childrenAges: e.target.value })}
                placeholder="e.g. 4 yrs, 8 yrs"
                className="w-full h-12 bg-slate-50/70 border border-slate-300 rounded-xl px-3.5 text-sm sm:text-base text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-[#0B2545] focus:outline-hidden transition-colors shadow-2xs"
              />
            </div>
          )}
        </div>

        {/* Requirement 3 & 4: Pick-up & Drop-off Dates, Locations & Flight Times (Same UI as V1) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 pt-1 sm:pt-2">
          {/* Pickup Card */}
          <div className={`border rounded-xl sm:rounded-2xl p-3.5 sm:p-5 space-y-3 transition-all duration-700 ${
            autoHighlightedFields.includes('dates')
              ? 'bg-emerald-100/70 border-emerald-400 ring-2 ring-emerald-500/70 shadow-md'
              : 'border-emerald-200 bg-emerald-50/40'
          }`}>
            <div className="flex items-center justify-between border-b border-emerald-200/70 pb-2.5">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-950 uppercase tracking-wide">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" />
                <span>Pickup (Arrival Details)</span>
              </div>
              <div className="flex items-center gap-1.5">
                {autoHighlightedFields.includes('dates') && (
                  <span className="text-[10px] font-extrabold text-emerald-800 animate-pulse">✓ Auto-filled</span>
                )}
                <span className="text-[10px] sm:text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md">
                  Day 1 Start
                </span>
              </div>
            </div>

            {/* Interactive Date Picker for Pickup Date */}
            <DatePicker
              id="lead-pickup-date-picker"
              label="Pickup Date *"
              badgeText="Tour Start"
              value={trip.pickupDate}
              onChange={(formatted) => handlePickupDateChange(formatted)}
              placeholder="Select Pickup Date"
              theme="emerald"
            />

            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-bold text-slate-700">
                Pickup Hub / Location *
              </label>
              <CustomSelect
                ariaLabel="Select Pickup Hub"
                value={!isCustomPickup && LOCATION_OPTIONS.includes(trip.pickupLocation) ? trip.pickupLocation : '__custom__'}
                onChange={(val) => {
                  if (val === '__custom__') {
                    setIsCustomPickup(true);
                  } else {
                    setIsCustomPickup(false);
                    onUpdateTrip({ ...trip, pickupLocation: val });
                  }
                }}
                options={[
                  ...LOCATION_OPTIONS,
                  { value: '__custom__', label: 'Custom / Type Other Location...' },
                ]}
                theme="emerald"
                size="lg"
                searchable={true}
              />

              {(isCustomPickup || !LOCATION_OPTIONS.includes(trip.pickupLocation)) && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                  <input
                    type="text"
                    value={trip.pickupLocation}
                    onChange={(e) => onUpdateTrip({ ...trip, pickupLocation: e.target.value })}
                    className="w-full h-10 sm:h-11 text-xs sm:text-sm px-3.5 border border-emerald-400 bg-emerald-50/40 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden shadow-2xs"
                    placeholder="Enter custom pickup hotel / airport / station name..."
                  />
                </div>
              )}

              {/* 1-Click Quick Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: 'COK Airport', value: 'Cochin International Airport (COK)' },
                  { label: 'TRV Airport', value: 'Thiruvananthapuram International Airport (TRV)' },
                  { label: 'Ernakulam Rly', value: 'Ernakulam Railway Station' },
                  { label: 'Cochin City', value: 'Cochin' },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => {
                      setIsCustomPickup(false);
                      onUpdateTrip({ ...trip, pickupLocation: chip.value });
                    }}
                    className={`text-xs font-semibold px-2.5 py-1 min-h-[34px] rounded-lg border transition-colors flex items-center ${
                      trip.pickupLocation === chip.value
                        ? 'bg-emerald-800 text-white border-emerald-800'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50 active:bg-emerald-100'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Drop-off Card */}
          <div className={`border rounded-xl sm:rounded-2xl p-3.5 sm:p-5 space-y-3 transition-all duration-700 ${
            autoHighlightedFields.includes('dates')
              ? 'bg-rose-100/70 border-rose-400 ring-2 ring-emerald-500/70 shadow-md'
              : 'border-rose-200 bg-rose-50/40'
          }`}>
            <div className="flex items-center justify-between border-b border-rose-200/70 pb-2.5">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-rose-950 uppercase tracking-wide">
                <Navigation className="w-4 h-4 sm:w-5 sm:h-5 text-rose-700" />
                <span>Drop-off (Departure Details)</span>
              </div>
              <div className="flex items-center gap-1.5">
                {autoHighlightedFields.includes('dates') && (
                  <span className="text-[10px] font-extrabold text-emerald-800 animate-pulse">✓ Auto-calculated</span>
                )}
                <span className="text-[10px] sm:text-xs font-bold text-rose-800 bg-rose-100 px-2.5 py-1 rounded-md">
                  Day {trip.durationDays} End
                </span>
              </div>
            </div>

            {/* Interactive Date Picker for Drop-off Date */}
            <DatePicker
              id="lead-dropoff-date-picker"
              label="Drop-off Date *"
              badgeText={`${trip.durationNights} Nights / ${trip.durationDays} Days`}
              value={trip.dropoffDate}
              onChange={(formatted) => handleDropoffDateChange(formatted)}
              placeholder="Select Drop-off Date"
              theme="rose"
            />

            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-bold text-slate-700">
                Drop-off Hub / Location *
              </label>
              <CustomSelect
                ariaLabel="Select Drop-off Hub"
                value={!isCustomDropoff && LOCATION_OPTIONS.includes(trip.dropoffLocation) ? trip.dropoffLocation : '__custom__'}
                onChange={(val) => {
                  if (val === '__custom__') {
                    setIsCustomDropoff(true);
                  } else {
                    setIsCustomDropoff(false);
                    onUpdateTrip({ ...trip, dropoffLocation: val });
                  }
                }}
                options={[
                  ...LOCATION_OPTIONS,
                  { value: '__custom__', label: 'Custom / Type Other Location...' },
                ]}
                theme="rose"
                size="lg"
                searchable={true}
              />

              {(isCustomDropoff || !LOCATION_OPTIONS.includes(trip.dropoffLocation)) && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                  <input
                    type="text"
                    value={trip.dropoffLocation}
                    onChange={(e) => onUpdateTrip({ ...trip, dropoffLocation: e.target.value })}
                    className="w-full h-10 sm:h-11 text-xs sm:text-sm px-3.5 border border-rose-400 bg-rose-50/40 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-600 focus:outline-hidden shadow-2xs"
                    placeholder="Enter custom drop-off hotel / airport / station name..."
                  />
                </div>
              )}

              {/* 1-Click Quick Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: 'COK Airport', value: 'Cochin International Airport (COK)' },
                  { label: 'TRV Airport', value: 'Thiruvananthapuram International Airport (TRV)' },
                  { label: 'Ernakulam Rly', value: 'Ernakulam Railway Station' },
                  { label: 'Trivandrum Rly', value: 'Trivandrum Railway Station' },
                  { label: 'Cochin City', value: 'Cochin' },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => {
                      setIsCustomDropoff(false);
                      onUpdateTrip({ ...trip, dropoffLocation: chip.value });
                    }}
                    className={`text-xs font-semibold px-2.5 py-1 min-h-[34px] rounded-lg border transition-colors flex items-center ${
                      trip.dropoffLocation === chip.value
                        ? 'bg-rose-800 text-white border-rose-800'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50 active:bg-rose-100'
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

      {/* 3. CHOOSE KERALA DESTINATIONS */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-3.5 sm:p-6 shadow-xs space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 sm:pb-3">
          <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-700 font-extrabold text-[11px] sm:text-sm tracking-wider uppercase">
            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 stroke-[2.5]" />
            <span>CHOOSE KERALA DESTINATIONS</span>
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-slate-500">
            Click to toggle stops
          </span>
        </div>

        {/* Destination Pills */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
          {Array.from(
            new Set([
              ...DEFAULT_KERALA_DESTINATIONS,
              ...trip.accommodations.map((a) => a.destination.trim()).filter(Boolean),
            ])
          ).map((dest) => {
            const isSelected = trip.accommodations.some(
              (a) => a.destination.trim().toLowerCase() === dest.trim().toLowerCase()
            );
            return (
              <button
                key={dest}
                type="button"
                onClick={() => handleToggleDestination(dest)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 sm:gap-2 ${
                  isSelected
                    ? 'bg-[#0B2545] hover:bg-[#07192F] text-white shadow-xs'
                    : 'bg-[#F0F4F8] hover:bg-[#E2E8F0] text-slate-800'
                }`}
              >
                {isSelected && (
                  <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 stroke-[3]" />
                )}
                <span>{dest}</span>
              </button>
            );
          })}
        </div>

        {/* Add More Places Input Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] sm:text-xs font-bold text-slate-800 shrink-0">
            Add Offbeat Stop:
          </span>
          <div className="flex-1 flex items-center gap-1.5 sm:gap-2 min-w-0 sm:min-w-[240px]">
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
              placeholder="Type town or attraction..."
              className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#0B2545]"
            />
            <button
              type="button"
              onClick={() => handleAddCustomPlace()}
              className="bg-[#0B2545] hover:bg-[#07192F] text-white font-bold text-xs px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add</span>
            </button>
          </div>
          <div className="text-slate-400 text-[11px] sm:text-xs hidden sm:inline">
            e.g. Kumarakom, Jatayu Rock, Marari, Bekal
          </div>
        </div>
      </div>

      {/* 4. HOTEL SELECTION & B2B PRICING TABLE (Requirements 5 & 6) */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-3.5 sm:p-6 shadow-xs space-y-3 sm:space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold shrink-0">
              <Hotel className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-800" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="font-extrabold text-slate-900 text-xs sm:text-base">
                  Hotel Selection & B2B Costing
                </span>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {trip.accommodations.length} Stops ({trip.durationNights}N)
                </span>
              </div>
            </div>
          </div>

          {/* Section 4 Controls: Default Meal Plan, Toggle Meal Plan Column, Rearrange Stops & Add Stop Button */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            {/* Default Meal Plan selector - always visible to set the trip-wide meal plan */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm shadow-2xs min-h-[40px]">
              <span className="font-bold text-slate-700 whitespace-nowrap">Default Meal:</span>
              <CustomSelect
                value={defaultTourMealPlan}
                onChange={(val) => handleApplyGlobalMealPlan(val)}
                options={MEAL_PLANS}
                theme="emerald"
                size="sm"
                fullWidth={false}
                triggerClassName="min-w-[175px] font-bold"
                title="Default meal plan applied to all hotel stays"
              />
            </div>

            {/* Meal Plan button along with default meal plan to toggle individual stay column if required */}
            <button
              type="button"
              id="btn-toggle-meal-plan-col"
              onClick={() => setShowMealPlanCol(!showMealPlanCol)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border transition-all shadow-2xs whitespace-nowrap min-h-[40px] ${
                showMealPlanCol
                  ? 'bg-emerald-100 text-emerald-950 border-emerald-400'
                  : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
              }`}
              title={showMealPlanCol ? "Hide individual meal plan column" : "Add individual meal plan column if specific stays need custom meal plans"}
            >
              <Utensils className="w-3.5 h-3.5 text-emerald-700" />
              <span>{showMealPlanCol ? '✓ Meal Plan' : '+ Meal Plan'}</span>
            </button>

            {/* Rearrange button - reveals reorder controls when pressed */}
            <button
              type="button"
              id="btn-toggle-reorder-mode"
              onClick={() => setIsReorderMode(!isReorderMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border transition-all shadow-2xs whitespace-nowrap min-h-[40px] ${
                isReorderMode
                  ? 'bg-amber-100 text-amber-950 border-amber-400 ring-2 ring-amber-300/40'
                  : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
              }`}
              title={isReorderMode ? "Done rearranging stops" : "Enable stop rearranging to re-sequence route stops"}
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-700" />
              <span>{isReorderMode ? '✓ Done' : '⇄ Rearrange'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleAddHotelRow()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 transition-all shadow-2xs whitespace-nowrap min-h-[40px]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Stop</span>
            </button>
          </div>
        </div>

        {/* Rearrange guidance banner when reorder mode is active */}
        {isReorderMode && (
          <div className="bg-amber-50 border border-amber-300/80 rounded-xl px-3 sm:px-4 py-2 text-[11px] sm:text-xs text-amber-950 flex items-center justify-between flex-wrap gap-2 shadow-2xs">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Rearrange Active:</strong> Use <strong>↑</strong> or <strong>↓</strong> buttons to re-sequence route stops.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsReorderMode(false)}
              className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg font-bold text-amber-900 text-[11px] sm:text-xs shadow-2xs"
            >
              Done Rearranging
            </button>
          </div>
        )}

        {/* Stay Locations & Preferred Hubs (Replaces Route Movement) */}
        <div className="bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-slate-50 border border-emerald-200/80 rounded-xl p-3 sm:p-3.5 text-xs shadow-2xs space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-slate-800">
              <div className="w-5 h-5 rounded-md bg-emerald-700 text-white flex items-center justify-center text-[10px] font-bold shadow-2xs">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                Stay Locations ({trip.accommodations.length} Overnight Stays • {trip.durationNights} Nights)
              </span>
            </div>
          </div>
        </div>

        {/* Table View (Desktop >= 1024px) - Spacious, Enlarged Layout */}
        <div className={`hidden lg:block overflow-x-auto rounded-2xl border shadow-xs bg-white transition-all duration-700 ${
          autoHighlightedFields.includes('destinations')
            ? 'border-emerald-500 ring-2 ring-emerald-400/50 bg-emerald-50/20'
            : 'border-slate-200'
        }`}>
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-800 font-extrabold border-b border-slate-200 text-xs uppercase tracking-wider">
                {isReorderMode ? (
                  <th className="py-4 px-3 w-32 text-center bg-amber-50/80 text-amber-950 font-black">
                    Rearrange
                  </th>
                ) : (
                  <th className="py-4 px-3 w-14 text-center text-slate-600">#</th>
                )}
                <th className="py-4 px-4 w-44">Destination</th>
                <th className="py-4 px-4 min-w-[240px]">Hotel Property</th>
                <th className="py-4 px-4 min-w-[170px]">Room Category</th>
                {/* Requirement 6: Mathematically validated Check-in date */}
                <th className="py-4 px-4 w-36">Check-in Date</th>
                <th className="py-4 px-4 w-28 text-center">Nights</th>
                {showMealPlanCol && (
                  <th className="py-4 px-4 min-w-[160px] bg-emerald-50 text-emerald-950 font-bold">Meal Plan</th>
                )}
                {/* Requirement 6: B2B Price kept, Total column removed */}
                <th className="py-4 px-4 w-36 text-right font-black text-emerald-900">B2B Price (₹)</th>
                <th className="py-4 px-3 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trip.accommodations.map((acc, index) => {
                const isFirst = index === 0;
                const isLast = index === trip.accommodations.length - 1;

                return (
                  <tr key={acc.id ? `${acc.id}-${index}` : `acc-${index}`} className="hover:bg-slate-50/80 transition-colors">
                    {/* Rearrange column / compact index */}
                    {isReorderMode ? (
                      <td className="py-3 px-3 text-center bg-amber-50/30">
                        <div className="inline-flex items-center gap-1.5 bg-white p-1 rounded-xl border border-amber-300 shadow-2xs">
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => handleMoveHotelRow(index, 'up')}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:hover:bg-slate-50 transition-colors cursor-pointer"
                            title="Move Stop Up (changes route sequence)"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-black text-slate-800 px-1">
                            #{index + 1}
                          </span>
                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => handleMoveHotelRow(index, 'down')}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:hover:bg-slate-50 transition-colors cursor-pointer"
                            title="Move Stop Down (changes route sequence)"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    ) : (
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 font-black text-slate-700 text-xs">
                          #{index + 1}
                        </span>
                      </td>
                    )}

                    {/* Destination (Searchable CustomSelect with custom text fallback) */}
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      {(() => {
                        const isCustomDest = customDestinationRows[index] || (Boolean(acc.destination) && !catalogDestinations.includes(acc.destination));

                        if (isCustomDest) {
                          return (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={acc.destination}
                                onChange={(e) => handleUpdateHotelRow(index, 'destination', e.target.value)}
                                placeholder="e.g. Munnar"
                                className="w-full h-10 bg-white border border-slate-300 rounded-xl px-3 text-sm font-extrabold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] shadow-2xs"
                              />
                              <button
                                type="button"
                                onClick={() => setCustomDestinationRows((prev) => ({ ...prev, [index]: false }))}
                                className="px-2.5 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
                                title="Pick from destination catalog"
                              >
                                Catalog
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div className="flex items-center gap-1.5">
                            <CustomSelect
                              ariaLabel="Select Destination"
                              value={catalogDestinations.includes(acc.destination) ? acc.destination : (acc.destination ? '__custom__' : '')}
                              onChange={(val) => {
                                if (val === '__custom__') {
                                  setCustomDestinationRows((prev) => ({ ...prev, [index]: true }));
                                } else {
                                  setCustomDestinationRows((prev) => ({ ...prev, [index]: false }));
                                  const matchedHotel = hotelCatalog.find(
                                    (h) => h.hotel_name.trim().toLowerCase() === (acc.hotelName || '').trim().toLowerCase()
                                  );
                                  const hotelMatchesNewDest = matchedHotel && matchedHotel.destination.trim().toLowerCase() === val.trim().toLowerCase();
                                  if (!hotelMatchesNewDest) {
                                    const destHotels = hotelCatalog.filter((h) => h.status !== false && h.destination?.trim().toLowerCase() === val.trim().toLowerCase());
                                    if (destHotels.length > 0) {
                                      const firstH = destHotels[0];
                                      const firstR = firstH.rooms && firstH.rooms.length > 0 ? firstH.rooms[0] : null;
                                      handleUpdateHotelRowMulti(index, {
                                        destination: val,
                                        hotelName: firstH.hotel_name,
                                        roomCategory: firstR ? firstR.room_category : 'Deluxe Room',
                                        b2bPrice: firstR ? firstR.base_b2b_rate : 0,
                                      });
                                    } else {
                                      handleUpdateHotelRowMulti(index, {
                                        destination: val,
                                        hotelName: '',
                                        roomCategory: '',
                                        b2bPrice: 0,
                                      });
                                    }
                                  } else {
                                    handleUpdateHotelRow(index, 'destination', val);
                                  }
                                }
                              }}
                              options={destinationSelectOptions}
                              placeholder="Select Destination..."
                              theme="navy"
                              size="md"
                              searchable={true}
                            />
                            <button
                              type="button"
                              onClick={() => setCustomDestinationRows((prev) => ({ ...prev, [index]: true }))}
                              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
                              title="Type custom destination"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Hotel Name (Cascading dynamic CustomSelect with custom input) */}
                    <td className="py-3.5 px-4">
                      {(() => {
                        const destNorm = (acc.destination || '').trim().toLowerCase();
                        const availableHotels = hotelCatalog.filter((h) => {
                          if (h.status === false) return false;
                          const hDest = (h.destination || '').trim().toLowerCase();
                          return destNorm === hDest || destNorm.includes(hDest) || hDest.includes(destNorm);
                        });
                        const matchedHotel = hotelCatalog.find(
                          (h) => h.hotel_name.trim().toLowerCase() === (acc.hotelName || '').trim().toLowerCase()
                        );
                        const isCustomMode = customHotelRows[index] || (availableHotels.length === 0 && !matchedHotel && Boolean(acc.hotelName));

                        const hotelOptions: SelectOption[] = [
                          ...availableHotels.map((h) => ({
                            value: h.id,
                            label: `${h.hotel_name}${h.star_rating ? ` (${h.star_rating}★)` : ''}`,
                            badge: (h.rooms || []).length > 0 ? `${h.rooms.length} rm` : undefined,
                          })),
                          ...(matchedHotel && !availableHotels.some((h) => h.id === matchedHotel.id)
                            ? [{
                                value: matchedHotel.id,
                                label: `${matchedHotel.hotel_name}${matchedHotel.star_rating ? ` (${matchedHotel.star_rating}★)` : ''}`,
                                badge: (matchedHotel.rooms || []).length > 0 ? `${matchedHotel.rooms.length} rm` : undefined,
                              }]
                            : []),
                          { value: '__custom__', label: '✎ Custom Hotel (Type Manually)...' },
                        ];

                        if (!isCustomMode && (availableHotels.length > 0 || matchedHotel)) {
                          return (
                            <div className="flex items-center gap-1.5">
                              <CustomSelect
                                ariaLabel="Select Hotel Property"
                                value={matchedHotel ? matchedHotel.id : ''}
                                onChange={(val) => {
                                  if (val === '__custom__') {
                                    setCustomHotelRows((prev) => ({ ...prev, [index]: true }));
                                    return;
                                  }
                                  const selected = hotelCatalog.find((h) => h.id === val);
                                  if (selected) {
                                    const firstRoom = selected.rooms && selected.rooms.length > 0 ? selected.rooms[0] : null;
                                    handleUpdateHotelRowMulti(index, {
                                      hotelName: selected.hotel_name,
                                      roomCategory: firstRoom ? firstRoom.room_category : (acc.roomCategory || 'Deluxe Room'),
                                      b2bPrice: firstRoom ? firstRoom.base_b2b_rate : (acc.b2bPrice || 0),
                                    });
                                  } else {
                                    handleUpdateHotelRow(index, 'hotelName', '');
                                  }
                                }}
                                options={hotelOptions}
                                placeholder={`-- Select Hotel (${availableHotels.length}) --`}
                                theme="navy"
                                size="md"
                                searchable={true}
                              />
                              <button
                                type="button"
                                onClick={() => setCustomHotelRows((prev) => ({ ...prev, [index]: true }))}
                                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
                                title="Switch to custom hotel name"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={acc.hotelName}
                              onChange={(e) => handleUpdateHotelRow(index, 'hotelName', e.target.value)}
                              placeholder={availableHotels.length > 0 ? "Type custom hotel..." : "Enter hotel property..."}
                              className="w-full h-10 bg-white border border-slate-300 rounded-xl px-3.5 text-sm text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] shadow-2xs"
                            />
                            {availableHotels.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setCustomHotelRows((prev) => ({ ...prev, [index]: false }))}
                                className="px-2.5 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
                                title="Pick from destination hotel catalog"
                              >
                                Catalog
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    {/* Room Category (Filtered to rooms in selected hotel with CustomSelect) */}
                    <td className="py-3.5 px-4">
                      {(() => {
                        const matchedHotel = hotelCatalog.find(
                          (h) => h.hotel_name.trim().toLowerCase() === (acc.hotelName || '').trim().toLowerCase()
                        );
                        const rooms = matchedHotel?.rooms || [];
                        const matchedRoom = rooms.find(
                          (r) => r.room_category.trim().toLowerCase() === (acc.roomCategory || '').trim().toLowerCase()
                        );
                        const isCustomRoom = customRoomRows[index] || (rooms.length === 0 && !matchedRoom && Boolean(acc.roomCategory));

                        const roomOptions: SelectOption[] = [
                          ...rooms.map((r) => ({
                            value: r.id,
                            label: r.room_category,
                            badge: `₹${r.base_b2b_rate.toLocaleString('en-IN')}`,
                          })),
                          { value: '__custom__', label: '✎ Custom Room (Type Manually)...' },
                        ];

                        if (!isCustomRoom && rooms.length > 0) {
                          return (
                            <div className="flex items-center gap-1.5">
                              <CustomSelect
                                ariaLabel="Select Room Category"
                                value={matchedRoom ? matchedRoom.id : ''}
                                onChange={(val) => {
                                  if (val === '__custom__') {
                                    setCustomRoomRows((prev) => ({ ...prev, [index]: true }));
                                    return;
                                  }
                                  const selectedRoom = rooms.find((r) => r.id === val);
                                  if (selectedRoom) {
                                    handleUpdateHotelRowMulti(index, {
                                      roomCategory: selectedRoom.room_category,
                                      b2bPrice: selectedRoom.base_b2b_rate,
                                    });
                                  } else {
                                    handleUpdateHotelRow(index, 'roomCategory', '');
                                  }
                                }}
                                options={roomOptions}
                                placeholder={`-- Room (${rooms.length}) --`}
                                theme="navy"
                                size="md"
                                searchable={rooms.length > 5}
                              />
                              <button
                                type="button"
                                onClick={() => setCustomRoomRows((prev) => ({ ...prev, [index]: true }))}
                                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
                                title="Switch to custom room category"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={acc.roomCategory}
                              onChange={(e) => handleUpdateHotelRow(index, 'roomCategory', e.target.value)}
                              placeholder="Deluxe Room"
                              className="w-full h-10 bg-white border border-slate-300 rounded-xl px-3.5 text-sm text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] shadow-2xs"
                            />
                            {rooms.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setCustomRoomRows((prev) => ({ ...prev, [index]: false }))}
                                className="px-2.5 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
                                title="Pick from hotel's catalog room categories"
                              >
                                Catalog
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    {/* Requirement 6: Check-in Date validated via number of nights spent */}
                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 h-10 px-3 rounded-xl text-xs font-bold text-slate-800">
                        <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span className="truncate">{acc.checkInDate || 'Auto-Calculated'}</span>
                      </div>
                    </td>

                    {/* Nights */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden h-10 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleUpdateHotelRow(index, 'nights', Math.max(1, (acc.nights || 1) - 1))}
                          className="w-8 h-full flex items-center justify-center text-sm font-black text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
                        >
                          –
                        </button>
                        <span className="px-2 font-black text-slate-900 text-sm min-w-[32px] text-center">
                          {acc.nights || 1}N
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateHotelRow(index, 'nights', (acc.nights || 1) + 1)}
                          className="w-8 h-full flex items-center justify-center text-sm font-black text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    {/* Meal Plan (Optional - toggled via button) */}
                    {showMealPlanCol && (
                      <td className="py-3.5 px-4 bg-emerald-50/30">
                        <CustomSelect
                          value={acc.mealPlan}
                          onChange={(val) => handleUpdateHotelRow(index, 'mealPlan', val)}
                          options={MEAL_PLANS}
                          theme="emerald"
                          size="sm"
                          triggerClassName="bg-white border-emerald-300 font-bold"
                          ariaLabel="Select Meal Plan"
                        />
                      </td>
                    )}

                    {/* B2B Cost Price */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-slate-400 font-bold text-sm">₹</span>
                        <input
                          type="number"
                          step={100}
                          value={acc.b2bPrice ?? ''}
                          onChange={(e) => handleUpdateHotelRow(index, 'b2bPrice', e.target.value)}
                          placeholder="0"
                          className="w-28 h-10 text-right bg-emerald-50/60 border border-emerald-300 rounded-xl px-3 text-sm font-black text-emerald-950 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                        />
                      </div>
                    </td>

                    {/* Delete action */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        disabled={trip.accommodations.length <= 1}
                        onClick={() => handleRemoveHotelRow(index)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-20 transition-colors cursor-pointer"
                        title="Remove night row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100/90 font-extrabold text-slate-900 border-t-2 border-slate-200">
                <td colSpan={showMealPlanCol ? 7 : 6} className="py-3 px-4 text-right uppercase tracking-wider text-xs text-slate-700">
                  Total Hotel B2B Cost ({trip.durationNights} Nights):
                </td>
                <td className="py-3 px-4 text-right text-sm font-black text-emerald-900">
                  ₹ {totalHotelB2BCost.toLocaleString('en-IN')}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile & Tablet Screen-Matched Card View (< 1024px) */}
        <div className={`lg:hidden space-y-2.5 sm:space-y-3 transition-all duration-700 ${
          autoHighlightedFields.includes('destinations')
            ? 'p-1.5 rounded-2xl ring-2 ring-emerald-400/50 bg-emerald-50/20'
            : ''
        }`}>
          {trip.accommodations.map((acc, index) => {
            const isFirst = index === 0;
            const isLast = index === trip.accommodations.length - 1;
            const isCustomDest = customDestinationRows[index] || (Boolean(acc.destination) && !catalogDestinations.includes(acc.destination));

            return (
              <div 
                key={acc.id ? `lead-mob-${acc.id}-${index}` : `lead-mob-acc-${index}`}
                className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-2xs space-y-2.5 sm:space-y-3.5 transition-all"
              >
                {/* Header: Stop Badge / Reorder Buttons + Destination CustomSelect + Delete */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {isReorderMode ? (
                    <div className="inline-flex items-center gap-1 bg-amber-50 p-0.5 sm:p-1 rounded-lg border border-amber-300 shrink-0 shadow-2xs">
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => handleMoveHotelRow(index, 'up')}
                        className="p-1 rounded bg-white hover:bg-amber-100 text-slate-700 disabled:opacity-30 transition-colors"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <span className="text-[11px] font-black text-amber-950 px-1">
                        #{index + 1}
                      </span>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => handleMoveHotelRow(index, 'down')}
                        className="p-1 rounded bg-white hover:bg-amber-100 text-slate-700 disabled:opacity-30 transition-colors"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-900 text-white font-black text-[11px] sm:text-xs shrink-0 shadow-2xs">
                      #{index + 1}
                    </span>
                  )}

                  {/* Destination dropdown (CustomSelect) */}
                  <div className="flex-1">
                    {isCustomDest ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={acc.destination}
                          onChange={(e) => handleUpdateHotelRow(index, 'destination', e.target.value)}
                          className="w-full h-11 bg-white border border-slate-300 rounded-xl px-3 text-sm font-extrabold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] shadow-2xs"
                          placeholder="Destination (e.g. Munnar)"
                        />
                        <button
                          type="button"
                          onClick={() => setCustomDestinationRows((prev) => ({ ...prev, [index]: false }))}
                          className="px-2.5 py-2 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
                          title="Pick from destination catalog"
                        >
                          Catalog
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <CustomSelect
                          ariaLabel="Select Destination"
                          value={catalogDestinations.includes(acc.destination) ? acc.destination : (acc.destination ? '__custom__' : '')}
                          onChange={(val) => {
                            if (val === '__custom__') {
                              setCustomDestinationRows((prev) => ({ ...prev, [index]: true }));
                            } else {
                              setCustomDestinationRows((prev) => ({ ...prev, [index]: false }));
                              const matchedHotel = hotelCatalog.find(
                                (h) => h.hotel_name.trim().toLowerCase() === (acc.hotelName || '').trim().toLowerCase()
                              );
                              const hotelMatchesNewDest = matchedHotel && matchedHotel.destination.trim().toLowerCase() === val.trim().toLowerCase();
                              if (!hotelMatchesNewDest) {
                                const destHotels = hotelCatalog.filter((h) => h.status !== false && h.destination?.trim().toLowerCase() === val.trim().toLowerCase());
                                if (destHotels.length > 0) {
                                  const firstH = destHotels[0];
                                  const firstR = firstH.rooms && firstH.rooms.length > 0 ? firstH.rooms[0] : null;
                                  handleUpdateHotelRowMulti(index, {
                                    destination: val,
                                    hotelName: firstH.hotel_name,
                                    roomCategory: firstR ? firstR.room_category : 'Deluxe Room',
                                    b2bPrice: firstR ? firstR.base_b2b_rate : 0,
                                  });
                                } else {
                                  handleUpdateHotelRowMulti(index, {
                                    destination: val,
                                    hotelName: '',
                                    roomCategory: '',
                                    b2bPrice: 0,
                                  });
                                }
                              } else {
                                handleUpdateHotelRow(index, 'destination', val);
                              }
                            }
                          }}
                          options={destinationSelectOptions}
                          placeholder="Select Destination..."
                          theme="navy"
                          size="md"
                          searchable={true}
                        />
                        <button
                          type="button"
                          onClick={() => setCustomDestinationRows((prev) => ({ ...prev, [index]: true }))}
                          className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
                          title="Type custom destination"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={trip.accommodations.length <= 1}
                    onClick={() => handleRemoveHotelRow(index)}
                    className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-20 transition-colors"
                    title="Remove stop"
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                {/* Hotel Property (Cascading dynamic CustomSelect or custom input) */}
                {(() => {
                  const destNorm = (acc.destination || '').trim().toLowerCase();
                  const availableHotels = hotelCatalog.filter((h) => {
                    if (h.status === false) return false;
                    const hDest = (h.destination || '').trim().toLowerCase();
                    return destNorm === hDest || destNorm.includes(hDest) || hDest.includes(destNorm);
                  });
                  const matchedHotel = hotelCatalog.find(
                    (h) => h.hotel_name.trim().toLowerCase() === (acc.hotelName || '').trim().toLowerCase()
                  );
                  const isCustomMode = customHotelRows[index] || (availableHotels.length === 0 && !matchedHotel && Boolean(acc.hotelName));

                  const hotelOptions: SelectOption[] = [
                    ...availableHotels.map((h) => ({
                      value: h.id,
                      label: `${h.hotel_name}${h.star_rating ? ` (${h.star_rating}★)` : ''}`,
                      badge: (h.rooms || []).length > 0 ? `${h.rooms.length} rm` : undefined,
                    })),
                    ...(matchedHotel && !availableHotels.some((h) => h.id === matchedHotel.id)
                      ? [{
                          value: matchedHotel.id,
                          label: `${matchedHotel.hotel_name}${matchedHotel.star_rating ? ` (${matchedHotel.star_rating}★)` : ''}`,
                          badge: (matchedHotel.rooms || []).length > 0 ? `${matchedHotel.rooms.length} rm` : undefined,
                        }]
                      : []),
                    { value: '__custom__', label: '✎ Custom Hotel (Type Manually)...' },
                  ];

                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                        <span className="flex items-center gap-1.5 font-bold text-slate-800">
                          <Building2 className="w-3.5 h-3.5 text-teal-700" />
                          <span>Hotel Property</span>
                        </span>
                        {availableHotels.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setCustomHotelRows((prev) => ({ ...prev, [index]: !isCustomMode }))}
                            className="text-[11px] font-bold text-teal-700 hover:text-teal-900 cursor-pointer"
                          >
                            {isCustomMode ? '← Pick from Catalog' : '✎ Type Custom'}
                          </button>
                        )}
                      </div>
                      {!isCustomMode && (availableHotels.length > 0 || matchedHotel) ? (
                        <div className="flex items-center gap-1.5">
                          <CustomSelect
                            ariaLabel="Select Hotel Property"
                            value={matchedHotel ? matchedHotel.id : ''}
                            onChange={(val) => {
                              if (val === '__custom__') {
                                setCustomHotelRows((prev) => ({ ...prev, [index]: true }));
                                return;
                              }
                              const selected = hotelCatalog.find((h) => h.id === val);
                              if (selected) {
                                const firstRoom = selected.rooms && selected.rooms.length > 0 ? selected.rooms[0] : null;
                                handleUpdateHotelRowMulti(index, {
                                  hotelName: selected.hotel_name,
                                  roomCategory: firstRoom ? firstRoom.room_category : (acc.roomCategory || 'Deluxe Room'),
                                  b2bPrice: firstRoom ? firstRoom.base_b2b_rate : (acc.b2bPrice || 0),
                                });
                              } else {
                                handleUpdateHotelRow(index, 'hotelName', '');
                              }
                            }}
                            options={hotelOptions}
                            placeholder={`-- Select Hotel (${availableHotels.length}) --`}
                            theme="navy"
                            size="md"
                            searchable={true}
                          />
                          <button
                            type="button"
                            onClick={() => setCustomHotelRows((prev) => ({ ...prev, [index]: true }))}
                            className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
                            title="Switch to custom hotel name"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={acc.hotelName}
                            onChange={(e) => handleUpdateHotelRow(index, 'hotelName', e.target.value)}
                            placeholder={availableHotels.length > 0 ? "Type custom hotel..." : "Enter hotel property..."}
                            className="w-full h-11 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm sm:text-base text-slate-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] shadow-2xs"
                          />
                          {availableHotels.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setCustomHotelRows((prev) => ({ ...prev, [index]: false }))}
                              className="px-2.5 py-2 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
                              title="Pick from destination hotel catalog"
                            >
                              Catalog
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 2-Column Grid: Room Category (Cascading CustomSelect) & Check-In Date */}
                <div className="grid grid-cols-2 gap-2.5">
                  {(() => {
                    const matchedHotel = hotelCatalog.find(
                      (h) => h.hotel_name.trim().toLowerCase() === (acc.hotelName || '').trim().toLowerCase()
                    );
                    const rooms = matchedHotel?.rooms || [];
                    const matchedRoom = rooms.find(
                      (r) => r.room_category.trim().toLowerCase() === (acc.roomCategory || '').trim().toLowerCase()
                    );
                    const isCustomRoom = customRoomRows[index] || (rooms.length === 0 && !matchedRoom && Boolean(acc.roomCategory));

                    const roomOptions: SelectOption[] = [
                      ...rooms.map((r) => ({
                        value: r.id,
                        label: r.room_category,
                        badge: `₹${r.base_b2b_rate.toLocaleString('en-IN')}`,
                      })),
                      { value: '__custom__', label: '✎ Custom Room...' },
                    ];

                    return (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                          <span>Room Category</span>
                          {rooms.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setCustomRoomRows((prev) => ({ ...prev, [index]: !isCustomRoom }))}
                              className="text-[10px] font-bold text-teal-700 hover:text-teal-900 cursor-pointer"
                            >
                              {isCustomRoom ? '← Catalog' : '✎ Custom'}
                            </button>
                          )}
                        </div>
                        {!isCustomRoom && rooms.length > 0 ? (
                          <div className="flex items-center gap-1">
                            <CustomSelect
                              ariaLabel="Select Room Category"
                              value={matchedRoom ? matchedRoom.id : ''}
                              onChange={(val) => {
                                if (val === '__custom__') {
                                  setCustomRoomRows((prev) => ({ ...prev, [index]: true }));
                                  return;
                                }
                                const selectedRoom = rooms.find((r) => r.id === val);
                                if (selectedRoom) {
                                  handleUpdateHotelRowMulti(index, {
                                    roomCategory: selectedRoom.room_category,
                                    b2bPrice: selectedRoom.base_b2b_rate,
                                  });
                                } else {
                                  handleUpdateHotelRow(index, 'roomCategory', '');
                                }
                              }}
                              options={roomOptions}
                              placeholder={`-- Room (${rooms.length}) --`}
                              theme="navy"
                              size="md"
                              searchable={rooms.length > 5}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={acc.roomCategory}
                              onChange={(e) => handleUpdateHotelRow(index, 'roomCategory', e.target.value)}
                              placeholder="Deluxe Room"
                              className="w-full h-11 bg-white border border-slate-300 rounded-xl px-3 text-xs sm:text-sm text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0B2545] shadow-2xs"
                            />
                            {rooms.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setCustomRoomRows((prev) => ({ ...prev, [index]: false }))}
                                className="px-2 py-2 text-[10px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                              >
                                Cat
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Check-In Date
                    </label>
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-3 h-11 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs">
                      <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span className="truncate">{acc.checkInDate || 'Auto-Calculated'}</span>
                    </div>
                  </div>
                </div>

                {/* Conditional Meal Plan */}
                {showMealPlanCol && (
                  <div className="space-y-1.5 bg-emerald-50/60 border border-emerald-200/90 p-2.5 sm:p-3 rounded-xl">
                    <label className="block text-xs font-bold text-emerald-950">
                      Individual Stay Meal Plan
                    </label>
                    <CustomSelect
                      value={acc.mealPlan}
                      onChange={(val) => handleUpdateHotelRow(index, 'mealPlan', val)}
                      options={MEAL_PLANS}
                      theme="emerald"
                      size="md"
                      triggerClassName="bg-white border-emerald-300 font-semibold"
                      ariaLabel="Individual Stay Meal Plan"
                    />
                  </div>
                )}

                {/* Compact Row: Nights Stepper + B2B Rate */}
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
                  <div className="space-y-1">
                    <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Stay Duration
                    </span>
                    <div className="inline-flex items-center bg-slate-50 border border-slate-300 rounded-xl overflow-hidden shadow-2xs h-11">
                      <button
                        type="button"
                        onClick={() => handleUpdateHotelRow(index, 'nights', Math.max(1, (acc.nights || 1) - 1))}
                        className="w-9 h-full flex items-center justify-center text-sm font-black text-slate-700 hover:bg-slate-200 active:bg-slate-300 transition-colors"
                      >
                        –
                      </button>
                      <span className="px-2.5 font-black text-slate-900 text-xs sm:text-sm min-w-[32px] text-center">
                        {acc.nights || 1}N
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateHotelRow(index, 'nights', (acc.nights || 1) + 1)}
                        className="w-9 h-full flex items-center justify-center text-sm font-black text-slate-700 hover:bg-slate-200 active:bg-slate-300 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-right">
                    <span className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                      B2B Rate / Night
                    </span>
                    <div className="inline-flex items-center gap-1.5">
                      <span className="text-emerald-700 font-bold text-sm">₹</span>
                      <input
                        type="number"
                        step={100}
                        value={acc.b2bPrice ?? ''}
                        onChange={(e) => handleUpdateHotelRow(index, 'b2bPrice', e.target.value)}
                        placeholder="0"
                        className="w-24 sm:w-28 h-11 text-right bg-emerald-50/80 border border-emerald-300 rounded-xl px-2.5 text-sm sm:text-base font-black text-emerald-950 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Mobile Total Hotel Cost Card */}
          <div className="bg-rose-950 text-white border border-rose-800/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-xs">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-rose-200 block">Total Hotel Net Cost</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-900 text-rose-300 rounded border border-rose-700">B2B Net</span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-rose-300/80">({trip.durationNights}N across {trip.accommodations.length} stops)</span>
            </div>
            <span className="text-base sm:text-lg font-black text-rose-100">
              ₹ {totalHotelB2BCost.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* 5. PRICING & MARGIN ENGINE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-5 items-stretch">
        {/* Left Col: Calculation Inputs */}
        <div className="lg:col-span-7 bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-xs space-y-3 sm:space-y-4 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 sm:pb-3 mb-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold shrink-0">
                <Calculator className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-800" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 text-xs sm:text-base">
                  B2B Margin & Package Value Calculator
                </h2>
                <p className="text-[10px] sm:text-xs text-slate-500">
                  Base costs + profit margin + round-off adjustment & advance planner
                </p>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-3.5 text-xs sm:text-sm">
              {/* Row 1: Base Costs (Hotels + Vehicle) side-by-side - Color-coded in soft rose/red for Net Costs */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Total Hotel Cost Display - Soft Rose Net Outflow */}
                  <div className="p-3.5 sm:p-4 rounded-xl bg-rose-50/70 border border-rose-200/90 flex items-center justify-between min-h-[84px] sm:min-h-[88px] transition-all shadow-2xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-rose-950 font-black">
                        <Hotel className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Hotel Net Cost</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-100/90 text-rose-800 rounded border border-rose-200">B2B Net</span>
                      </div>
                      <div className="text-[11px] font-semibold text-rose-700/80 pl-5.5">
                        {trip.durationNights}N ({trip.accommodations.length} stops)
                      </div>
                    </div>
                    <div className="font-black text-rose-950 text-base sm:text-lg tracking-tight">
                      ₹ {totalHotelB2BCost.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Vehicle Charge - Soft Rose Net Outflow */}
                  <div className="p-3.5 sm:p-4 rounded-xl bg-rose-50/70 border border-rose-200/90 flex items-center justify-between min-h-[84px] sm:min-h-[88px] transition-all shadow-2xs">
                    <div className="space-y-1">
                      <label className="flex items-center gap-1.5 text-xs text-rose-950 font-black cursor-pointer">
                        <Car className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Cab Net Cost:</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-rose-100/90 text-rose-800 rounded border border-rose-200">B2B Net</span>
                      </label>
                      <div className="text-[11px] font-semibold text-rose-700/80 pl-5.5 truncate max-w-[130px]" title={trip.vehicleType}>
                        {trip.vehicleType}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-rose-800 text-sm">₹</span>
                      <input
                        type="number"
                        step={100}
                        value={vehicleCost}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setVehicleCost(val);
                          syncPricingToTrip(val, marginType, marginPercent, marginCustomAmount, adjustmentAmount);
                        }}
                        placeholder="12000"
                        className="w-24 sm:w-28 h-9 sm:h-10 bg-white border border-rose-300 rounded-lg px-2.5 text-right font-black text-rose-950 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-hidden shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Combined Base Cost Sub-strip - Distinct Soft Red Background */}
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-rose-100/80 border border-rose-200 text-xs font-semibold text-rose-900 min-h-[42px] shadow-2xs">
                  <span className="flex items-center gap-1.5 font-bold text-rose-950">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                    <span>Combined Base Cost (Hotel + Cab Net Outflow):</span>
                  </span>
                  <span className="font-black text-rose-950 text-xs sm:text-sm">₹ {baseCost.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Row 2: Profit Margin & Adjustment side-by-side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Margin Selector Card */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 flex flex-col justify-between min-h-[100px] sm:min-h-[108px] space-y-2.5">
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-950 text-xs sm:text-sm">
                      <Percent className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Profit Margin:</span>
                    </div>

                    {/* Toggle: % vs Custom */}
                    <div className="flex items-center bg-white p-1 rounded-lg border border-emerald-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => {
                          setMarginType('percentage');
                          syncPricingToTrip(vehicleCost, 'percentage', marginPercent, marginCustomAmount, adjustmentAmount);
                        }}
                        className={`h-7 sm:h-7.5 px-3 rounded-md text-xs font-black transition-all cursor-pointer ${
                          marginType === 'percentage' 
                            ? 'bg-emerald-700 text-white shadow-xs' 
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMarginType('custom');
                          syncPricingToTrip(vehicleCost, 'custom', marginPercent, marginCustomAmount, adjustmentAmount);
                        }}
                        className={`h-7 sm:h-7.5 px-3 rounded-md text-xs font-black transition-all cursor-pointer ${
                          marginType === 'custom' 
                            ? 'bg-emerald-700 text-white shadow-xs' 
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        ₹ Fixed
                      </button>
                    </div>
                  </div>

                  {marginType === 'percentage' ? (
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <div className="text-xs text-emerald-900 font-bold leading-tight">
                        <span className="text-[11px] text-emerald-700 block font-semibold">Calculated Margin:</span>
                        <span className="text-emerald-900 font-black text-sm sm:text-base">+ ₹ {marginAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={marginPercent}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setMarginPercent(val);
                            syncPricingToTrip(vehicleCost, 'percentage', val, marginCustomAmount, adjustmentAmount);
                          }}
                          className="w-16 sm:w-18 h-9 sm:h-10 bg-white border border-slate-300 rounded-lg px-2.5 text-right font-black text-slate-900 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-hidden shadow-2xs"
                        />
                        <span className="font-bold text-slate-700 text-sm">%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <span className="text-xs text-slate-600 font-bold">Custom Fixed:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-slate-700 text-sm">₹</span>
                        <input
                          type="number"
                          step={500}
                          value={marginCustomAmount}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setMarginCustomAmount(val);
                            syncPricingToTrip(vehicleCost, 'custom', marginPercent, val, adjustmentAmount);
                          }}
                          className="w-24 sm:w-28 h-9 sm:h-10 bg-white border border-slate-300 rounded-lg px-2.5 text-right font-black text-slate-900 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-hidden shadow-2xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Adjustment / Round-Off Card */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between min-h-[100px] sm:min-h-[108px] space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-bold text-slate-800 text-xs sm:text-sm block truncate">
                      Adjustment / Round-Off:
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-600 text-sm">₹</span>
                      <input
                        type="number"
                        value={adjustmentAmount}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setAdjustmentAmount(val);
                          syncPricingToTrip(vehicleCost, marginType, marginPercent, marginCustomAmount, val);
                        }}
                        placeholder="0"
                        className="w-20 sm:w-24 h-9 sm:h-10 bg-white border border-slate-300 rounded-lg px-2.5 text-right font-black text-slate-900 text-sm focus:ring-2 focus:ring-[#0B2545] focus:outline-hidden shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Quick round-off helpers - ALIGNED LEFT */}
                  <div className="flex items-center gap-2 justify-start flex-wrap text-xs">
                    <span className="text-slate-500 text-xs font-bold">Quick:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const current = subtotalCost;
                        const rounded = Math.ceil(current / 500) * 500;
                        const diff = rounded - current;
                        setAdjustmentAmount(diff);
                        syncPricingToTrip(vehicleCost, marginType, marginPercent, marginCustomAmount, diff);
                      }}
                      className="h-7.5 sm:h-8 px-3 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                    >
                      ₹500
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const current = subtotalCost;
                        const rounded = Math.ceil(current / 1000) * 1000;
                        const diff = rounded - current;
                        setAdjustmentAmount(diff);
                        syncPricingToTrip(vehicleCost, marginType, marginPercent, marginCustomAmount, diff);
                      }}
                      className="h-7.5 sm:h-8 px-3 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                    >
                      ₹1,000
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdjustmentAmount(0);
                        syncPricingToTrip(vehicleCost, marginType, marginPercent, marginCustomAmount, 0);
                      }}
                      className="h-7.5 sm:h-8 px-3 rounded-lg bg-white border border-slate-300 text-slate-500 hover:bg-slate-100 font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 3: Booking Advance Percentage Setter & Hotel Coverage */}
              <div className="p-3.5 sm:p-5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3.5">
                {/* Header row with Title and Manual input on right */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs sm:text-sm">
                    <CreditCard className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Booking Advance:</span>
                  </div>

                  {/* Manual Input on right */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-amber-900">Custom:</span>
                    <input
                      type="number"
                      min={10}
                      max={95}
                      step={5}
                      value={advancePercentage}
                      onChange={(e) => {
                        const val = Math.max(5, Math.min(95, Number(e.target.value) || 40));
                        setAdvancePercentage(val);
                        syncPricingToTrip(vehicleCost, marginType, marginPercent, marginCustomAmount, adjustmentAmount, val);
                      }}
                      className="w-16 h-8 sm:h-8.5 bg-white border border-amber-300 rounded-lg px-2 text-right font-black text-amber-950 text-xs sm:text-sm focus:ring-2 focus:ring-amber-600 focus:outline-hidden shadow-2xs"
                    />
                    <span className="font-bold text-amber-800 text-xs sm:text-sm">%</span>
                  </div>
                </div>

                {/* Preset Buttons - CENTER ALIGNED & TALLER */}
                <div className="flex items-center justify-center gap-2 sm:gap-2.5 flex-wrap pt-0.5">
                  {[25, 30, 40, 50].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setAdvancePercentage(pct);
                        syncPricingToTrip(vehicleCost, marginType, marginPercent, marginCustomAmount, adjustmentAmount, pct);
                      }}
                      className={`h-8.5 sm:h-9 px-3.5 sm:px-4 text-xs sm:text-sm font-extrabold rounded-lg border transition-all cursor-pointer shadow-2xs ${
                        advancePercentage === pct
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-400/40'
                          : 'bg-white text-slate-700 border-amber-200/90 hover:bg-amber-100 hover:border-amber-300'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}

                  {/* Dynamic Hotel Cost button */}
                  {finalTotalPackageCost > 0 && totalHotelB2BCost > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const exactHotelPct = Math.ceil((totalHotelB2BCost / finalTotalPackageCost) * 100);
                        const roundedHotelPct = Math.min(95, Math.max(10, Math.ceil(exactHotelPct / 5) * 5));
                        setAdvancePercentage(roundedHotelPct);
                        syncPricingToTrip(vehicleCost, marginType, marginPercent, marginCustomAmount, adjustmentAmount, roundedHotelPct);
                      }}
                      className="h-8.5 sm:h-9 px-3.5 sm:px-4 text-xs sm:text-sm font-extrabold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-800 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                      title={`Calculate exact % needed to cover Hotel B2B Net Cost (₹ ${totalHotelB2BCost.toLocaleString('en-IN')})`}
                    >
                      <Hotel className="w-3.5 h-3.5" />
                      <span>Hotel ({Math.ceil((totalHotelB2BCost / finalTotalPackageCost) * 100)}%)</span>
                    </button>
                  )}
                </div>

                {/* Live Cross-Check Summary */}
                <div className="pt-2 border-t border-amber-200/80 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-white/95 p-3 rounded-xl border border-amber-200/90 flex flex-col justify-between min-h-[62px] shadow-2xs">
                    <span className="text-[11px] text-slate-500 font-semibold block">Advance Payable ({advancePercentage}%):</span>
                    <span className="font-black text-amber-950 text-sm sm:text-base">₹ {calculatedAdvanceAmount.toLocaleString('en-IN')}/-</span>
                  </div>
                  <div className="bg-white/95 p-3 rounded-xl border border-amber-200/90 flex flex-col justify-between min-h-[62px] shadow-2xs">
                    <span className="text-[11px] text-slate-500 font-semibold block">Balance on Arrival ({100 - advancePercentage}%):</span>
                    <span className="font-black text-slate-800 text-sm sm:text-base">₹ {calculatedBalanceAmount.toLocaleString('en-IN')}/-</span>
                  </div>
                </div>

                {/* Comparison with Hotel Booking Net Cost */}
                <div className="flex items-center justify-between text-xs pt-1 flex-wrap gap-2">
                  <span className="text-slate-600 font-medium">
                    Hotel Net: <strong className="text-slate-900">₹ {totalHotelB2BCost.toLocaleString('en-IN')}</strong>
                  </span>
                  {calculatedAdvanceAmount >= totalHotelB2BCost ? (
                    <span className="text-emerald-800 font-bold bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md text-[11px]">
                      ✓ Covers Hotel (Buffer: ₹ {(calculatedAdvanceAmount - totalHotelB2BCost).toLocaleString('en-IN')})
                    </span>
                  ) : (
                    <span className="text-amber-900 font-bold bg-amber-200/90 border border-amber-300 px-2.5 py-1 rounded-md text-[11px]">
                      ⚠️ ₹ {(totalHotelB2BCost - calculatedAdvanceAmount).toLocaleString('en-IN')} short of Hotel Cost
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Final Gross Selling Price Summary & WhatsApp Dispatch */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-gradient-to-b from-[#0B2545] via-[#081f3b] to-[#07192F] text-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-md space-y-3 sm:space-y-3.5">
          {/* Top Section */}
          <div className="space-y-2.5 sm:space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[11px] sm:text-xs uppercase tracking-wider font-extrabold text-emerald-400">
                Agent Gross Package Value
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white font-mono">
                {trip.voucherNumber || 'TCT-2026-Q0196'}
              </span>
            </div>

            {/* Prominent Confident Selling Price Display Card */}
            <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 border-2 border-emerald-400 shadow-lg space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="text-[10px] sm:text-[11px] text-emerald-300 font-black uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  FINAL SELLING QUOTATION TO AGENT:
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-emerald-950 shadow-xs">
                  Quote to Agent
                </span>
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-xs">
                ₹ {finalTotalPackageCost.toLocaleString('en-IN')}/-
              </div>
              <p className="text-[10px] sm:text-[11px] text-emerald-200/80 font-medium">
                Official selling rate for client quotation (includes margin)
              </p>
            </div>

            {/* Financial Breakdown Matrix */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="bg-rose-950/40 rounded-xl p-2 sm:p-2.5 border border-rose-500/40">
                <span className="text-rose-300 block text-[10px] font-bold">Base Net Outflow:</span>
                <span className="font-black text-rose-200 text-xs sm:text-sm">
                  ₹ {baseCost.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-rose-300/80 block truncate font-medium">
                  Hotel ₹{totalHotelB2BCost.toLocaleString('en-IN')} + Cab ₹{vehicleCost.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="bg-white/10 rounded-xl p-2 sm:p-2.5 border border-white/10">
                <span className="text-slate-400 block text-[10px]">Net B2B Margin:</span>
                <span className="font-bold text-emerald-300 text-xs sm:text-sm">
                  + ₹ {(marginAmount + adjustmentAmount).toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-emerald-400/80 block truncate">
                  {marginType === 'percentage' ? `${marginPercent}% margin` : 'Custom margin'}
                  {adjustmentAmount !== 0 && ` (${adjustmentAmount > 0 ? '+' : ''}₹${adjustmentAmount})`}
                </span>
              </div>

              <div className="bg-white/10 rounded-xl p-2 sm:p-2.5 border border-white/10">
                <span className="text-slate-400 block text-[10px]">Advance ({advancePercentage}%):</span>
                <span className="font-bold text-amber-300 text-xs sm:text-sm">
                  ₹ {calculatedAdvanceAmount.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-amber-200/70 block truncate">
                  Payable for booking
                </span>
              </div>

              <div className="bg-white/10 rounded-xl p-2 sm:p-2.5 border border-white/10">
                <span className="text-slate-400 block text-[10px]">Balance on Arrival:</span>
                <span className="font-bold text-emerald-300 text-xs sm:text-sm">
                  ₹ {calculatedBalanceAmount.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  {100 - advancePercentage}% on tour start
                </span>
              </div>
            </div>

            {/* Agent WhatsApp Direct Send */}
            <div className="pt-0.5 space-y-1">
              <label className="text-[10px] sm:text-[11px] font-bold text-slate-300 flex items-center justify-between">
                <span>Agent WhatsApp:</span>
                <span className="text-[10px] text-slate-400 font-normal">Optional 1-click send</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={agentPhoneInput}
                  onChange={(e) => setAgentPhoneInput(e.target.value)}
                  placeholder="e.g. 919876543210"
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white placeholder:text-slate-400 focus:bg-white/20 focus:outline-hidden min-w-0"
                />
                <button
                  type="button"
                  onClick={() => handleDirectWhatsAppSend()}
                  className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 shrink-0 shadow-xs active:scale-95 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => handleCopyWhatsAppQuote()}
              className="w-full py-2.5 px-3 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-400 text-emerald-950 transition-all shadow-md flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
            >
              {copiedQuote ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
              <span>{copiedQuote ? 'Quote Copied!' : 'Copy WhatsApp Quote'}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onNavigateToActivities?.()}
                className="py-2 px-2 rounded-lg font-bold text-[11px] sm:text-xs bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5 text-teal-300" />
                <span>Activities ({trip.days.reduce((s, d) => s + d.activities.filter(a => a.isSelected).length, 0)})</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateToPreview?.()}
                className="py-2 px-2 rounded-lg font-bold text-[11px] sm:text-xs bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-amber-300" />
                <span>View Full PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Live WhatsApp Message Preview Card */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-3.5 sm:p-6 shadow-xs space-y-2.5 sm:space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 sm:pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
            <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
              <span>Live WhatsApp Message Preview</span>
              <span className="text-[10px] sm:text-[11px] font-normal text-slate-500 hidden sm:inline">
                ({lastRefreshedTime})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => handleRefreshLiveQuote()}
              disabled={isRefreshing}
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-all flex items-center gap-1 sm:gap-1.5 shadow-2xs active:scale-95"
              title="Refresh and sync quote"
            >
              <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isRefreshing ? 'animate-spin text-emerald-700' : 'text-emerald-700'}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopyWhatsAppQuote()}
              className="text-[11px] sm:text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg sm:rounded-xl transition-colors"
            >
              <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Copy</span>
            </button>
          </div>
        </div>

        <pre className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-normal sm:leading-relaxed max-h-64 sm:max-h-80 overflow-y-auto select-all">
          {generateAgentWhatsAppQuote()}
        </pre>
      </div>
    </div>
  );
};
