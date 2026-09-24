'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Building2, 
  MapPin, 
  Star, 
  Plus, 
  Trash2, 
  Pencil, 
  RotateCcw, 
  Check, 
  Search, 
  X, 
  Layers, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Bed, 
  IndianRupee,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  Download,
  Upload,
  FileSpreadsheet,
  Zap,
  Table as TableIcon,
  ArrowUpDown,
  AlertCircle,
  FileText,
  Filter,
  CheckSquare,
  Square,
  Calendar,
  Users,
  Utensils,
  PlusCircle,
  FolderOpen,
  ArrowRight
} from 'lucide-react';
import { HotelModel, RoomModel, SeasonRateBracket, MealPlanCode } from '@/types/itinerary';
import { DEFAULT_KERALA_DESTINATIONS } from '@/lib/sample-data';
import { 
  generateHotelExcelTemplate, 
  exportCurrentHotelsToExcel, 
  parseHotelsFromExcel 
} from '@/lib/hotel-excel-utils';

interface HotelRoomCatalogManagerProps {
  hotelCatalog: HotelModel[];
  onUpdateHotelCatalog: (updated: HotelModel[]) => void;
}

// Month name map for date parsing
const MONTH_NAMES_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

/**
 * Parses a date fragment (e.g. "30-Sep", "31-Aug-2026", "2026-08-31", "August")
 * into month index (0-11), day (1-31), and optional 4-digit year.
 */
function parseDateFragment(str: string): { month: number; day: number; year?: number } | null {
  if (!str) return null;
  const clean = str.trim().toLowerCase();

  // Check for ISO YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    return {
      year: parseInt(isoMatch[1], 10),
      month: parseInt(isoMatch[2], 10) - 1,
      day: parseInt(isoMatch[3], 10),
    };
  }

  // Check for DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    return {
      year: parseInt(dmyMatch[3], 10),
      month: parseInt(dmyMatch[2], 10) - 1,
      day: parseInt(dmyMatch[1], 10),
    };
  }

  // Look for 4-digit year anywhere in the fragment
  const yearMatch = clean.match(/\b(20\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : undefined;

  // Look for month name
  const monthMatch = clean.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/);
  if (!monthMatch) return null;
  const month = MONTH_NAMES_MAP[monthMatch[1]];
  if (month === undefined) return null;

  // Look for day number (1-31), excluding the 4-digit year
  const cleanedForDay = clean.replace(/\b20\d{2}\b/g, '');
  const dayMatch = cleanedForDay.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
  const day = dayMatch ? parseInt(dayMatch[1], 10) : 28;

  return { month, day, year };
}

/**
 * Checks whether a single date sub-range concluded strictly before the start of the current month.
 */
function isSubBracketBeforeThisMonth(
  subStr: string,
  fallbackStart?: string,
  fallbackEnd?: string,
  refDate: Date = new Date()
): boolean {
  const clean = subStr.trim();
  if (!clean) return false;

  const currentYear = refDate.getFullYear();
  const currentMonth = refDate.getMonth(); // 0-11
  const startOfCurrentMonth = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);

  // Split start and end
  let startPart = '';
  let endPart = '';

  const rangeParts = clean.split(/\s+(?:to|-|–|—)\s+/i);
  if (rangeParts.length >= 2) {
    startPart = rangeParts[0].trim();
    endPart = rangeParts[rangeParts.length - 1].trim();
  } else {
    endPart = clean;
    if (fallbackStart) startPart = fallbackStart.trim();
  }

  if (!endPart && fallbackEnd) endPart = fallbackEnd.trim();

  const parsedEnd = parseDateFragment(endPart);
  if (!parsedEnd) return false;

  const parsedStart = parseDateFragment(startPart);

  // If explicit year is present on end date
  if (parsedEnd.year !== undefined) {
    const endDateTime = new Date(parsedEnd.year, parsedEnd.month, parsedEnd.day, 23, 59, 59, 999);
    return endDateTime.getTime() < startOfCurrentMonth.getTime();
  }

  // If explicit year is present on start date but not end date
  if (parsedStart && parsedStart.year !== undefined) {
    const inferredYear = parsedEnd.month < parsedStart.month ? parsedStart.year + 1 : parsedStart.year;
    const endDateTime = new Date(inferredYear, parsedEnd.month, parsedEnd.day, 23, 59, 59, 999);
    return endDateTime.getTime() < startOfCurrentMonth.getTime();
  }

  // No explicit year specified: standard annual/recurring hospitality seasonal cycle
  const startMonth = parsedStart ? parsedStart.month : parsedEnd.month;
  const endMonth = parsedEnd.month;

  // Case A: Within single calendar year (e.g. 1-Apr to 31-Aug)
  if (startMonth <= endMonth) {
    // If the season ended in an earlier month of this year
    if (endMonth < currentMonth) {
      return true;
    }
    return false;
  }

  // Case B: Cross-year winter cycle (e.g. 20-Dec to 5-Jan)
  return false;
}

/**
 * Determines if a season window date has completely ended before the start of the current month.
 * Supports split seasons (e.g. "1-Oct to 19-Dec & 6-Jan to 31-May").
 * Returns true if ALL sub-brackets ended before this month (past season), false if active or upcoming.
 */
export function isSeasonBeforeThisMonth(
  season: SeasonRateBracket | { season_name?: string; date_bracket?: string; date_start?: string; date_end?: string },
  refDate: Date = new Date()
): boolean {
  if (!season) return false;
  const bracketStr = season.date_bracket || `${season.date_start || ''} to ${season.date_end || ''}`;
  if (!bracketStr || !bracketStr.trim()) return false;

  const subRanges = bracketStr.split(/[&;,]+/).map((s) => s.trim()).filter(Boolean);
  if (subRanges.length === 0) return false;

  return subRanges.every((sub) =>
    isSubBracketBeforeThisMonth(sub, season.date_start, season.date_end, refDate)
  );
}

// Pre-configured B2B standard seasons generator based on a room base CP rate
export function createDefaultKeralaSeasons(baseRate: number): SeasonRateBracket[] {
  const safeBase = Math.max(1000, Number(baseRate) || 3000);
  return [
    {
      id: `sn-off-${Date.now()}-1`,
      season_name: 'Off-Peak (Monsoon)',
      date_start: '01-Jun',
      date_end: '30-Sep',
      date_bracket: '1-Jun to 30-Sep',
      base_rate: Math.round(safeBase * 0.8 / 100) * 100,
      ep_rate: Math.round(safeBase * 0.72 / 100) * 100,
      cp_rate: Math.round(safeBase * 0.8 / 100) * 100,
      map_rate: Math.round((safeBase * 0.8 + 800) / 100) * 100,
      ap_rate: Math.round((safeBase * 0.8 + 1600) / 100) * 100,
      extra_adult: 1000,
      child_with_bed: 600,
      child_no_bed: 300,
    },
    {
      id: `sn-reg-${Date.now()}-2`,
      season_name: 'Regular Season',
      date_start: '01-Oct',
      date_end: '19-Dec',
      date_bracket: '1-Oct to 19-Dec & 6-Jan to 31-May',
      base_rate: safeBase,
      ep_rate: Math.round(safeBase * 0.9 / 100) * 100,
      cp_rate: safeBase,
      map_rate: safeBase + 900,
      ap_rate: safeBase + 1800,
      extra_adult: 1200,
      child_with_bed: 800,
      child_no_bed: 400,
    },
    {
      id: `sn-pk-${Date.now()}-3`,
      season_name: 'Peak Festive',
      date_start: '20-Dec',
      date_end: '05-Jan',
      date_bracket: '20-Dec to 5-Jan',
      base_rate: Math.round(safeBase * 1.55 / 100) * 100,
      ep_rate: Math.round(safeBase * 1.45 / 100) * 100,
      cp_rate: Math.round(safeBase * 1.55 / 100) * 100,
      map_rate: Math.round((safeBase * 1.55 + 1200) / 100) * 100,
      ap_rate: Math.round((safeBase * 1.55 + 2400) / 100) * 100,
      extra_adult: 1800,
      child_with_bed: 1200,
      child_no_bed: 600,
    },
  ];
}

// Sample B2B Tariffs preset for 1-click onboarding / testing
export const SAMPLE_KERALA_B2B_TARIFFS: HotelModel[] = [
  {
    id: 'htl-mun-parakkat',
    destination: 'Munnar',
    hotel_name: 'Parakkat Nature Resort',
    star_rating: 5,
    status: true,
    rooms: [
      {
        id: 'rm-parakkat-1',
        hotel_id: 'htl-mun-parakkat',
        room_category: 'Classic Room Valley View',
        base_b2b_rate: 6500,
        max_occupancy: '2 Adults + 1 Child',
        total_inventory: 15,
        seasons: createDefaultKeralaSeasons(6500),
      },
      {
        id: 'rm-parakkat-2',
        hotel_id: 'htl-mun-parakkat',
        room_category: 'Club Suite with Balcony',
        base_b2b_rate: 8500,
        max_occupancy: '2 Adults + 2 Children',
        total_inventory: 8,
        seasons: createDefaultKeralaSeasons(8500),
      },
      {
        id: 'rm-parakkat-3',
        hotel_id: 'htl-mun-parakkat',
        room_category: 'Private Pool Villa',
        base_b2b_rate: 12000,
        max_occupancy: '2 Adults + 2 Children',
        total_inventory: 4,
        seasons: createDefaultKeralaSeasons(12000),
      },
    ],
  },
  {
    id: 'htl-mun-queen',
    destination: 'Munnar',
    hotel_name: 'The Munnar Queen',
    star_rating: 4,
    status: true,
    rooms: [
      {
        id: 'rm-queen-1',
        hotel_id: 'htl-mun-queen',
        room_category: 'Executive Room',
        base_b2b_rate: 3500,
        max_occupancy: '2 Adults + 1 Child',
        total_inventory: 20,
        seasons: createDefaultKeralaSeasons(3500),
      },
      {
        id: 'rm-queen-2',
        hotel_id: 'htl-mun-queen',
        room_category: 'Club Suite Valley View',
        base_b2b_rate: 4800,
        max_occupancy: '2 Adults + 2 Children',
        total_inventory: 10,
        seasons: createDefaultKeralaSeasons(4800),
      },
    ],
  },
  {
    id: 'htl-mun-misty',
    destination: 'Munnar',
    hotel_name: 'Misty Mountain Resort',
    star_rating: 3,
    status: true,
    rooms: [
      {
        id: 'rm-misty-1',
        hotel_id: 'htl-mun-misty',
        room_category: 'Standard Room',
        base_b2b_rate: 2500,
        max_occupancy: '2 Adults + 1 Child',
        total_inventory: 18,
        seasons: createDefaultKeralaSeasons(2500),
      },
      {
        id: 'rm-misty-2',
        hotel_id: 'htl-mun-misty',
        room_category: 'Valley View Deluxe Room',
        base_b2b_rate: 3200,
        max_occupancy: '2 Adults + 1 Child',
        total_inventory: 12,
        seasons: createDefaultKeralaSeasons(3200),
      },
    ],
  },
  {
    id: 'htl-mun-leaf',
    destination: 'Munnar',
    hotel_name: 'The Leaf Munnar',
    star_rating: 4,
    status: true,
    rooms: [
      {
        id: 'rm-leaf-1',
        hotel_id: 'htl-mun-leaf',
        room_category: 'Silver Leaf Valley View',
        base_b2b_rate: 3200,
        max_occupancy: '2 Adults + 1 Child',
        total_inventory: 14,
        seasons: createDefaultKeralaSeasons(3200),
      },
      {
        id: 'rm-leaf-2',
        hotel_id: 'htl-mun-leaf',
        room_category: 'Golden Leaf Cottage',
        base_b2b_rate: 4400,
        max_occupancy: '2 Adults + 2 Children',
        total_inventory: 8,
        seasons: createDefaultKeralaSeasons(4400),
      },
    ],
  },
  {
    id: 'htl-mun-vega',
    destination: 'Munnar',
    hotel_name: 'Vega Munnar Resort',
    star_rating: 5,
    status: true,
    rooms: [
      {
        id: 'rm-vega-1',
        hotel_id: 'htl-mun-vega',
        room_category: 'Deluxe Valley View',
        base_b2b_rate: 5500,
        max_occupancy: '2 Adults + 1 Child',
        total_inventory: 16,
        seasons: createDefaultKeralaSeasons(5500),
      },
      {
        id: 'rm-vega-2',
        hotel_id: 'htl-mun-vega',
        room_category: 'Executive Suite',
        base_b2b_rate: 7500,
        max_occupancy: '2 Adults + 2 Children',
        total_inventory: 6,
        seasons: createDefaultKeralaSeasons(7500),
      },
    ],
  },
  {
    id: 'htl-mun-secretvalley',
    destination: 'Munnar',
    hotel_name: 'Secret Valley Plantation Resort',
    star_rating: 5,
    status: true,
    rooms: [
      {
        id: 'rm-sv-1',
        hotel_id: 'htl-mun-secretvalley',
        room_category: 'Plantation Valley View Room',
        base_b2b_rate: 5800,
        max_occupancy: '2 Adults + 1 Child',
        total_inventory: 12,
        seasons: createDefaultKeralaSeasons(5800),
      },
      {
        id: 'rm-sv-2',
        hotel_id: 'htl-mun-secretvalley',
        room_category: 'Tree House / Wooden Chalet',
        base_b2b_rate: 8000,
        max_occupancy: '2 Adults + 1 Child',
        total_inventory: 4,
        seasons: createDefaultKeralaSeasons(8000),
      },
    ],
  },
  {
    id: 'htl-mun-fragrant',
    destination: 'Munnar',
    hotel_name: 'Fragrant Nature',
    star_rating: 5,
    status: true,
    rooms: [
      {
        id: 'rm-fn-1',
        hotel_id: 'htl-mun-fragrant',
        room_category: 'Tropic Green Room',
        base_b2b_rate: 6200,
        max_occupancy: '2 Adults + 1 Child',
        total_inventory: 20,
        seasons: createDefaultKeralaSeasons(6200),
      },
      {
        id: 'rm-fn-2',
        hotel_id: 'htl-mun-fragrant',
        room_category: 'Moonlight Suite with Fireplace',
        base_b2b_rate: 9000,
        max_occupancy: '2 Adults + 2 Children',
        total_inventory: 6,
        seasons: createDefaultKeralaSeasons(9000),
      },
    ],
  },
  {
    id: 'htl-mun-windywoods',
    destination: 'Munnar',
    hotel_name: 'Chandys Windy Woods',
    star_rating: 5,
    status: true,
    rooms: [
      {
        id: 'rm-cww-1',
        hotel_id: 'htl-mun-windywoods',
        room_category: 'Deluxe Room',
        base_b2b_rate: 6800,
        max_occupancy: '2 Adults + 1 Child',
        total_inventory: 18,
        seasons: createDefaultKeralaSeasons(6800),
      },
      {
        id: 'rm-cww-2',
        hotel_id: 'htl-mun-windywoods',
        room_category: 'Super Deluxe Valley View',
        base_b2b_rate: 8500,
        max_occupancy: '2 Adults + 2 Children',
        total_inventory: 10,
        seasons: createDefaultKeralaSeasons(8500),
      },
    ],
  },
  {
    id: 'htl-mun-drizzledrops',
    destination: 'Munnar',
    hotel_name: 'Chandys Drizzle Drops',
    star_rating: 5,
    status: true,
    rooms: [
      {
        id: 'rm-cdd-1',
        hotel_id: 'htl-mun-drizzledrops',
        room_category: 'Executive Room',
        base_b2b_rate: 6500,
        max_occupancy: '2 Adults + 1 Child',
        total_inventory: 15,
        seasons: createDefaultKeralaSeasons(6500),
      },
      {
        id: 'rm-cdd-2',
        hotel_id: 'htl-mun-drizzledrops',
        room_category: 'Presidential Suite',
        base_b2b_rate: 9500,
        max_occupancy: '2 Adults + 2 Children',
        total_inventory: 5,
        seasons: createDefaultKeralaSeasons(9500),
      },
    ],
  },
  {
    id: 'htl-mun-thefog',
    destination: 'Munnar',
    hotel_name: 'The Fog Resort & Spa',
    star_rating: 5,
    status: true,
    rooms: [
      {
        id: 'rm-fog-1',
        hotel_id: 'htl-mun-thefog',
        room_category: 'Fog Villa',
        base_b2b_rate: 5800,
        max_occupancy: '2 Adults + 1 Child',
        total_inventory: 16,
        seasons: createDefaultKeralaSeasons(5800),
      },
      {
        id: 'rm-fog-2',
        hotel_id: 'htl-mun-thefog',
        room_category: 'Valley View Suite',
        base_b2b_rate: 7800,
        max_occupancy: '2 Adults + 2 Children',
        total_inventory: 8,
        seasons: createDefaultKeralaSeasons(7800),
      },
    ],
  },
  {
    id: 'htl-mun-vibemunnar',
    destination: 'Munnar',
    hotel_name: 'Vibe Munnar Resort & Spa',
    star_rating: 5,
    status: true,
    rooms: [
      {
        id: 'rm-vibe-1',
        hotel_id: 'htl-mun-vibemunnar',
        room_category: 'Luxury Valley View',
        base_b2b_rate: 7000,
        max_occupancy: '2 Adults + 1 Child',
        total_inventory: 20,
        seasons: createDefaultKeralaSeasons(7000),
      },
      {
        id: 'rm-vibe-2',
        hotel_id: 'htl-mun-vibemunnar',
        room_category: 'Private Pool Villa',
        base_b2b_rate: 12500,
        max_occupancy: '2 Adults + 2 Children',
        total_inventory: 6,
        seasons: createDefaultKeralaSeasons(12500),
      },
    ],
  },
  {
    id: 'htl-thek-greenwoods',
    destination: 'Thekkady',
    hotel_name: 'Greenwoods Resort Thekkady',
    star_rating: 4,
    status: true,
    rooms: [
      {
        id: 'rm-gw-1',
        hotel_id: 'htl-thek-greenwoods',
        room_category: 'Aranya Superior Room',
        base_b2b_rate: 3200,
        max_occupancy: '2 Adults',
        total_inventory: 18,
        seasons: createDefaultKeralaSeasons(3200),
      },
      {
        id: 'rm-gw-2',
        hotel_id: 'htl-thek-greenwoods',
        room_category: 'Ranni Plunge Pool Villa',
        base_b2b_rate: 6800,
        max_occupancy: '2 Adults + 2 Children',
        total_inventory: 6,
        seasons: createDefaultKeralaSeasons(6800),
      },
    ],
  },
  {
    id: 'htl-allp-hb',
    destination: 'Alleppey',
    hotel_name: 'Travel Care Deluxe A/C Houseboat',
    star_rating: 4,
    status: true,
    rooms: [
      {
        id: 'rm-hb-1',
        hotel_id: 'htl-allp-hb',
        room_category: '1 BHK Private Deluxe AC (All Meals)',
        base_b2b_rate: 7500,
        max_occupancy: '2 Adults',
        total_inventory: 5,
        seasons: [
          {
            id: 'sn-hb1-1',
            season_name: 'Off-Peak (Monsoon)',
            date_bracket: '1-Jun to 30-Sep',
            base_rate: 6500,
            ap_rate: 6500,
            extra_adult: 1500,
            child_with_bed: 1000,
            child_no_bed: 500,
          },
          {
            id: 'sn-hb1-2',
            season_name: 'Regular Season',
            date_bracket: '1-Oct to 19-Dec & 6-Jan to 31-May',
            base_rate: 7500,
            ap_rate: 7500,
            extra_adult: 1800,
            child_with_bed: 1200,
            child_no_bed: 600,
          },
          {
            id: 'sn-hb1-3',
            season_name: 'Peak Festive',
            date_bracket: '20-Dec to 5-Jan',
            base_rate: 11500,
            ap_rate: 11500,
            extra_adult: 2500,
            child_with_bed: 1800,
            child_no_bed: 900,
          },
        ],
      },
    ],
  },
  {
    id: 'htl-kov-uday',
    destination: 'Kovalam',
    hotel_name: 'Uday Samudra Leisure Beach Hotel',
    star_rating: 5,
    status: true,
    rooms: [
      {
        id: 'rm-ud-1',
        hotel_id: 'htl-kov-uday',
        room_category: 'Atrium Sea Facing Room',
        base_b2b_rate: 4500,
        max_occupancy: '2 Adults + 1 Child',
        total_inventory: 24,
        seasons: createDefaultKeralaSeasons(4500),
      },
    ],
  },
  {
    id: 'htl-cok-radisson',
    destination: 'Cochin',
    hotel_name: 'Radisson Blu Kochi',
    star_rating: 5,
    status: true,
    rooms: [
      {
        id: 'rm-rad-1',
        hotel_id: 'htl-cok-radisson',
        room_category: 'Superior King Room',
        base_b2b_rate: 3800,
        max_occupancy: '2 Adults',
        total_inventory: 30,
        seasons: createDefaultKeralaSeasons(3800),
      },
    ],
  },
];

export const HotelRoomCatalogManagerV2: React.FC<HotelRoomCatalogManagerProps> = ({
  hotelCatalog,
  onUpdateHotelCatalog,
}) => {
  // ==========================================
  // 1. Sliding 3-Column State (Progressive Disclosure)
  // State 1: selectedDest === null (Destinations 25%, Hotels 75% placeholder)
  // State 2: selectedDest !== null && selectedHotelId === null (Dest 5% strip, Hotels 30%, Rooms 65%)
  // State 3: selectedDest !== null && selectedHotelId !== null (Dest 5% strip, Hotels 15%, Rooms 80%)
  // ==========================================
  const [selectedDest, setSelectedDest] = useState<string | null>(null);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);

  // Search queries per column
  const [destSearch, setDestSearch] = useState<string>('');
  const [hotelSearch, setHotelSearch] = useState<string>('');
  const [globalGridSearch, setGlobalGridSearch] = useState<string>('');

  // Row Grouping expand/collapse state: Set of room IDs that are expanded
  const [expandedRoomIds, setExpandedRoomIds] = useState<Set<string>>(new Set());

  // Dynamic Injected Meal Plan Columns
  const [visibleMealPlans, setVisibleMealPlans] = useState<MealPlanCode[]>(['CP']);
  const [showMealPlanPicker, setShowMealPlanPicker] = useState<boolean>(false);
  const [showExtraBeds, setShowExtraBeds] = useState<boolean>(false);

  // Proportional column distribution for desktop fixed table layout (eliminates horizontal scrolling on desktop)
  const activeRateColCount = (visibleMealPlans.includes('EP') ? 1 : 0)
    + (visibleMealPlans.includes('CP') ? 1 : 0)
    + (visibleMealPlans.includes('MAP') ? 1 : 0)
    + (visibleMealPlans.includes('AP') ? 1 : 0)
    + (showExtraBeds ? 2 : 0);
  const roomColPercent = 32;
  const seasonColPercent = 26;
  const actionsColPercent = 5;
  const remainingRatePercent = 100 - roomColPercent - seasonColPercent - actionsColPercent; // 37%
  const rateColPercent = Number((remainingRatePercent / Math.max(1, activeRateColCount)).toFixed(2));
  const totalTableCols = 3 + visibleMealPlans.length + (showExtraBeds ? 2 : 0);

  // Column Header Funnel Filters
  const [roomCategoryFilter, setRoomCategoryFilter] = useState<Set<string>>(new Set());
  const [seasonTypeFilter, setSeasonTypeFilter] = useState<Set<string>>(new Set());
  const [hidePastSeasons, setHidePastSeasons] = useState<boolean>(false);
  const [hotelStarFilter, setHotelStarFilter] = useState<string>('all');
  const [hotelStatusFilter, setHotelStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Active filter popover dropdown: 'room' | 'season' | null
  const [activeHeaderFilter, setActiveHeaderFilter] = useState<'room' | 'season' | null>(null);

  // Inline Editing cell state: { key: 'roomId-seasonId-field', value: string }
  const [editingCell, setEditingCell] = useState<{ id: string; field: string; val: string } | null>(null);

  // Modals
  const [showHotelModal, setShowHotelModal] = useState<boolean>(false);
  const [editingHotel, setEditingHotel] = useState<HotelModel | null>(null);
  const [showAddRoomModal, setShowAddRoomModal] = useState<boolean>(false);
  const [showAddSeasonModal, setShowAddSeasonModal] = useState<boolean>(false);
  const [activeSeasonRoomId, setActiveSeasonRoomId] = useState<string | null>(null);

  // Hotel Form State
  const [formDest, setFormDest] = useState<string>('Munnar');
  const [formName, setFormName] = useState<string>('');
  const [formStar, setFormStar] = useState<number | string>(4);
  const [formStatus, setFormStatus] = useState<boolean>(true);

  // Room Form State
  const [formRoomCat, setFormRoomCat] = useState<string>('');
  const [formRoomRate, setFormRoomRate] = useState<string>('3200');
  const [formRoomOccupancy, setFormRoomOccupancy] = useState<string>('2 Adults + 1 Child');
  const [formRoomInventory, setFormRoomInventory] = useState<string>('10');

  // Season Form State
  const [formSeasonName, setFormSeasonName] = useState<string>('High Season');
  const [formSeasonDates, setFormSeasonDates] = useState<string>('15-Jan to 31-Mar');
  const [formSeasonBase, setFormSeasonBase] = useState<string>('3500');
  const [formSeasonEP, setFormSeasonEP] = useState<string>('3000');
  const [formSeasonCP, setFormSeasonCP] = useState<string>('3500');
  const [formSeasonMAP, setFormSeasonMAP] = useState<string>('4400');
  const [formSeasonAP, setFormSeasonAP] = useState<string>('5300');
  const [formSeasonExtraAdult, setFormSeasonExtraAdult] = useState<string>('1200');
  const [formSeasonChildBed, setFormSeasonChildBed] = useState<string>('800');

  // Excel Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<{
    hotels: HotelModel[];
    totalRows: number;
    totalRooms: number;
    warnings: string[];
    fileName: string;
  } | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2800);
  };

  // Auto-Save and Cell Feedback State
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedCellKey, setLastSavedCellKey] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cellPulseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // In-line Season Date Range Editor State
  const [editingSeasonDate, setEditingSeasonDate] = useState<{
    hotelId: string;
    roomId: string;
    seasonId: string;
    seasonName: string;
    dateBracket: string;
  } | null>(null);

  // Destination Management State
  const [extraDestinations, setExtraDestinations] = useState<string[]>([]);
  const [removedDestinations, setRemovedDestinations] = useState<Set<string>>(new Set());
  const [showDestModal, setShowDestModal] = useState<boolean>(false);
  const [editingDestName, setEditingDestName] = useState<string | null>(null);
  const [destFormInput, setDestFormInput] = useState<string>('');

  // Room Edit Modal State
  const [editingRoom, setEditingRoom] = useState<RoomModel | null>(null);
  const [showEditRoomModal, setShowEditRoomModal] = useState<boolean>(false);
  const [editRoomCat, setEditRoomCat] = useState<string>('');
  const [editRoomOccupancy, setEditRoomOccupancy] = useState<string>('');
  const [editRoomInventory, setEditRoomInventory] = useState<string>('10');
  const [editRoomBaseRate, setEditRoomBaseRate] = useState<string>('3000');

  // Quick Edit Rates Spreadsheet Grid Mode State
  const [isQuickEditMode, setIsQuickEditMode] = useState<boolean>(false);
  const [modifiedRoomIds, setModifiedRoomIds] = useState<Set<string>>(new Set());
  const [quickEditSearch, setQuickEditSearch] = useState<string>('');
  const [quickEditDestFilter, setQuickEditDestFilter] = useState<string>('All');
  const [quickEditStarFilter, setQuickEditStarFilter] = useState<string>('all');

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      if (cellPulseTimerRef.current) clearTimeout(cellPulseTimerRef.current);
    };
  }, []);

  // Close filter popovers on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.filter-popover-container')) {
        setActiveHeaderFilter(null);
      }
      if (!target.closest('.meal-plan-dropdown-container')) {
        setShowMealPlanPicker(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Distinct Destinations list (supports dynamic add, edit, and removal while preserving current order)
  const allDestinations = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    const addDest = (d: string) => {
      const clean = (d || '').trim();
      if (!clean || removedDestinations.has(clean)) return;
      const lower = clean.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        list.push(clean);
      }
    };

    // Primary current destination order
    DEFAULT_KERALA_DESTINATIONS.forEach(addDest);
    hotelCatalog.forEach((h) => {
      if (h.destination) addDest(h.destination);
    });
    extraDestinations.forEach(addDest);

    return list;
  }, [hotelCatalog, extraDestinations, removedDestinations]);

  // Filtered destinations list
  const filteredDestinations = useMemo(() => {
    if (!destSearch.trim()) return allDestinations;
    const q = destSearch.toLowerCase().trim();
    return allDestinations.filter((d) => d.toLowerCase().includes(q));
  }, [allDestinations, destSearch]);

  // Selected Hotel Object
  const selectedHotel = useMemo(() => {
    if (!selectedHotelId) return null;
    return hotelCatalog.find((h) => h.id === selectedHotelId) || null;
  }, [hotelCatalog, selectedHotelId]);

  // Hotels in the Selected Destination
  const destinationHotels = useMemo(() => {
    if (!selectedDest) return [];
    return hotelCatalog.filter((h) => {
      const matchesDest = h.destination.toLowerCase() === selectedDest.toLowerCase();
      if (!matchesDest) return false;
      if (hotelStatusFilter === 'active' && !h.status) return false;
      if (hotelStatusFilter === 'inactive' && h.status) return false;
      if (hotelStarFilter !== 'all' && String(h.star_rating) !== hotelStarFilter) return false;
      if (hotelSearch.trim()) {
        const q = hotelSearch.toLowerCase().trim();
        const matchesName = h.hotel_name.toLowerCase().includes(q);
        const matchesRooms = h.rooms.some((r) => r.room_category.toLowerCase().includes(q));
        if (!matchesName && !matchesRooms) return false;
      }
      return true;
    });
  }, [hotelCatalog, selectedDest, hotelStatusFilter, hotelStarFilter, hotelSearch]);

  // Total counts for metrics
  const totalHotels = hotelCatalog.length;
  const activeHotels = hotelCatalog.filter((h) => h.status).length;
  const totalRooms = hotelCatalog.reduce((sum, h) => sum + (h.rooms || []).length, 0);
  const totalHotelsInCatalog = totalHotels;
  const totalRoomsInCatalog = totalRooms;

  // Initialize all room IDs as expanded by default for convenient viewing
  useEffect(() => {
    if (selectedHotel && selectedHotel.rooms) {
      setExpandedRoomIds(new Set(selectedHotel.rooms.map((r) => r.id)));
    }
  }, [selectedHotelId]);

  // Expand / Collapse Row Toggle
  const toggleRoomExpand = (roomId: string) => {
    setExpandedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    if (selectedHotel?.rooms) {
      setExpandedRoomIds(new Set(selectedHotel.rooms.map((r) => r.id)));
    }
  };

  const handleCollapseAll = () => {
    setExpandedRoomIds(new Set());
  };

  // Rooms Data for the Selected Hotel with normalized seasonal brackets
  const normalizedRooms = useMemo(() => {
    if (!selectedHotel || !selectedHotel.rooms) return [];
    return selectedHotel.rooms.map((room) => {
      // Ensure each room has at least default seasons
      const seasons = (room.seasons && room.seasons.length > 0)
        ? room.seasons
        : createDefaultKeralaSeasons(room.base_b2b_rate);
      return {
        ...room,
        seasons,
      };
    });
  }, [selectedHotel]);

  // Filtered Rooms and Seasons based on Excel Funnel Filters & Global Search
  const filteredRooms = useMemo(() => {
    return normalizedRooms.filter((room) => {
      // Filter by Room Category funnel
      if (roomCategoryFilter.size > 0 && !roomCategoryFilter.has(room.room_category)) {
        return false;
      }

      // Filter by Global Search
      if (globalGridSearch.trim()) {
        const q = globalGridSearch.toLowerCase().trim();
        const matchesCat = room.room_category.toLowerCase().includes(q);
        const matchesOccupancy = (room.max_occupancy || '').toLowerCase().includes(q);
        const matchesSeason = room.seasons?.some(
          (s) => s.season_name.toLowerCase().includes(q) || s.date_bracket.toLowerCase().includes(q)
        );
        const matchesPrice = room.seasons?.some(
          (s) => String(s.base_rate).includes(q) || String(s.cp_rate || '').includes(q)
        );
        if (!matchesCat && !matchesOccupancy && !matchesSeason && !matchesPrice) {
          return false;
        }
      }

      return true;
    }).map((room) => {
      let seasons = room.seasons || [];
      // Filter Child Seasons by Season Type funnel
      if (seasonTypeFilter.size > 0) {
        seasons = seasons.filter((s) => seasonTypeFilter.has(s.season_name));
      }
      // If hidePastSeasons is active, don't show seasons that ended before this month
      if (hidePastSeasons) {
        seasons = seasons.filter((s) => !isSeasonBeforeThisMonth(s));
      }
      return {
        ...room,
        seasons,
      };
    });
  }, [normalizedRooms, roomCategoryFilter, seasonTypeFilter, globalGridSearch, hidePastSeasons]);

  // Distinct values for Funnel Filters
  const distinctRoomCategories = useMemo(() => {
    if (!selectedHotel?.rooms) return [];
    return Array.from(new Set(selectedHotel.rooms.map((r) => r.room_category))).sort();
  }, [selectedHotel]);

  const distinctSeasonTypes = useMemo(() => {
    const set = new Set<string>();
    normalizedRooms.forEach((r) => {
      r.seasons?.forEach((s) => set.add(s.season_name));
    });
    return Array.from(set).sort();
  }, [normalizedRooms]);

  // Count past seasons in the active hotel
  const pastSeasonsCount = useMemo(() => {
    if (!selectedHotel?.rooms) return 0;
    let count = 0;
    selectedHotel.rooms.forEach((r) => {
      (r.seasons || []).forEach((s) => {
        if (isSeasonBeforeThisMonth(s)) count++;
      });
    });
    return count;
  }, [selectedHotel]);

  // Save updated room seasons back to catalog
  const updateRoomSeasonsInCatalog = (
    hotelId: string,
    roomId: string,
    updatedSeasons: SeasonRateBracket[]
  ) => {
    const updated = hotelCatalog.map((h) => {
      if (h.id === hotelId) {
        return {
          ...h,
          rooms: h.rooms.map((r) => {
            if (r.id === roomId) {
              const primaryBase = updatedSeasons[0]?.base_rate || r.base_b2b_rate;
              return {
                ...r,
                base_b2b_rate: primaryBase,
                seasons: updatedSeasons,
              };
            }
            return r;
          }),
        };
      }
      return h;
    });
    onUpdateHotelCatalog(updated);
  };

  // Quick update rate in spreadsheet grid or quick edit inputs
  const handleQuickUpdateRate = (hotelId: string, roomId: string, newRate: number) => {
    const rateVal = Math.max(0, newRate);
    const updated = hotelCatalog.map((h) => {
      if (h.id === hotelId) {
        return {
          ...h,
          rooms: h.rooms.map((r) => {
            if (r.id === roomId) {
              const oldBase = r.base_b2b_rate || 3000;
              const ratio = oldBase > 0 ? rateVal / oldBase : 1;
              const updatedSeasons = (r.seasons && r.seasons.length > 0)
                ? r.seasons.map((s, idx) => {
                    if (idx === 0) {
                      return {
                        ...s,
                        base_rate: rateVal,
                        cp_rate: rateVal,
                        ep_rate: Math.round(rateVal * 0.9 / 100) * 100,
                        map_rate: Math.round((rateVal + 900) / 100) * 100,
                        ap_rate: Math.round((rateVal + 1800) / 100) * 100,
                      };
                    }
                    return {
                      ...s,
                      base_rate: Math.round(s.base_rate * ratio / 100) * 100,
                      cp_rate: Math.round((s.cp_rate || s.base_rate) * ratio / 100) * 100,
                      ep_rate: Math.round((s.ep_rate || s.base_rate * 0.9) * ratio / 100) * 100,
                      map_rate: Math.round(((s.map_rate || s.base_rate + 900)) * ratio / 100) * 100,
                      ap_rate: Math.round(((s.ap_rate || s.base_rate + 1800)) * ratio / 100) * 100,
                    };
                  })
                : createDefaultKeralaSeasons(rateVal);

              return { 
                ...r, 
                base_b2b_rate: rateVal,
                seasons: updatedSeasons
              };
            }
            return r;
          }),
        };
      }
      return h;
    });
    onUpdateHotelCatalog(updated);
    setModifiedRoomIds((prev) => new Set(prev).add(roomId));
    setAutoSaveStatus('saved');
    const now = new Date();
    setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => setAutoSaveStatus('idle'), 3000);
  };

  // Quick update category name in spreadsheet grid
  const handleQuickUpdateCategory = (hotelId: string, roomId: string, newCategory: string) => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    const updated = hotelCatalog.map((h) => {
      if (h.id === hotelId) {
        return {
          ...h,
          rooms: h.rooms.map((r) => {
            if (r.id === roomId) {
              return { ...r, room_category: trimmed };
            }
            return r;
          }),
        };
      }
      return h;
    });
    onUpdateHotelCatalog(updated);
    setModifiedRoomIds((prev) => new Set(prev).add(roomId));
    setAutoSaveStatus('saved');
    const now = new Date();
    setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => setAutoSaveStatus('idle'), 3000);
  };

  // Toggle hotel active / inactive status
  const handleToggleHotelStatus = (hotelId: string) => {
    const updated = hotelCatalog.map((h) => {
      if (h.id === hotelId) {
        return { ...h, status: !h.status };
      }
      return h;
    });
    onUpdateHotelCatalog(updated);
    showToast('Hotel status updated.');
  };

  // Flattened rooms for Quick Edit Rates spreadsheet view
  const flattenedRooms = useMemo(() => {
    const list: Array<{
      hotelId: string;
      hotelName: string;
      destination: string;
      starRating: number | string;
      hotelStatus: boolean;
      roomId: string;
      roomCategory: string;
      baseB2BRate: number;
      maxOccupancy: string;
      inventory: number;
      seasonsCount: number;
      index: number;
    }> = [];

    let count = 0;
    const hotelsToProcess = hotelCatalog.filter((h) => {
      if (quickEditDestFilter !== 'All' && h.destination.toLowerCase() !== quickEditDestFilter.toLowerCase()) {
        return false;
      }
      if (quickEditStarFilter !== 'all' && String(h.star_rating) !== quickEditStarFilter) {
        return false;
      }
      if (quickEditSearch.trim()) {
        const q = quickEditSearch.toLowerCase().trim();
        const matchHotel = h.hotel_name.toLowerCase().includes(q);
        const matchDest = h.destination.toLowerCase().includes(q);
        const matchRooms = h.rooms?.some((r) => r.room_category.toLowerCase().includes(q));
        if (!matchHotel && !matchDest && !matchRooms) return false;
      }
      return true;
    });

    hotelsToProcess.forEach((hotel) => {
      if (!hotel.rooms || hotel.rooms.length === 0) {
        list.push({
          hotelId: hotel.id,
          hotelName: hotel.hotel_name,
          destination: hotel.destination,
          starRating: hotel.star_rating,
          hotelStatus: hotel.status !== false,
          roomId: `${hotel.id}-empty`,
          roomCategory: 'Standard Room',
          baseB2BRate: 0,
          maxOccupancy: '2A + 1C',
          inventory: 10,
          seasonsCount: 0,
          index: count++,
        });
      } else {
        hotel.rooms.forEach((room) => {
          if (quickEditSearch.trim()) {
            const q = quickEditSearch.toLowerCase().trim();
            const matchHotel = hotel.hotel_name.toLowerCase().includes(q);
            const matchDest = hotel.destination.toLowerCase().includes(q);
            const matchRoom = room.room_category.toLowerCase().includes(q);
            if (!matchHotel && !matchDest && !matchRoom) return;
          }
          list.push({
            hotelId: hotel.id,
            hotelName: hotel.hotel_name,
            destination: hotel.destination,
            starRating: hotel.star_rating,
            hotelStatus: hotel.status !== false,
            roomId: room.id,
            roomCategory: room.room_category,
            baseB2BRate: room.base_b2b_rate,
            maxOccupancy: room.max_occupancy || '2A + 1C',
            inventory: room.total_inventory || 10,
            seasonsCount: (room.seasons || []).length,
            index: count++,
          });
        });
      }
    });

    return list;
  }, [hotelCatalog, quickEditDestFilter, quickEditStarFilter, quickEditSearch]);

  // Inline cell save with instant visual auto-save feedback
  const handleSaveInlineRate = (
    hotelId: string,
    roomId: string,
    seasonId: string,
    field: keyof SeasonRateBracket,
    newVal: number
  ) => {
    const hotel = hotelCatalog.find((h) => h.id === hotelId);
    if (!hotel) return;
    const room = hotel.rooms.find((r) => r.id === roomId);
    if (!room) return;
    const seasons = (room.seasons && room.seasons.length > 0)
      ? room.seasons
      : createDefaultKeralaSeasons(room.base_b2b_rate);

    const updatedSeasons = seasons.map((s) => {
      if (s.id === seasonId) {
        const val = Math.max(0, newVal);
        if (field === 'cp_rate') {
          return { ...s, cp_rate: val, base_rate: val };
        }
        if (field === 'base_rate') {
          return { ...s, base_rate: val, cp_rate: val };
        }
        return { ...s, [field]: val };
      }
      return s;
    });

    updateRoomSeasonsInCatalog(hotelId, roomId, updatedSeasons);

    // Visual save status indicator without disruptive toast
    const cellKey = `${seasonId}-${field}`;
    setLastSavedCellKey(cellKey);
    setAutoSaveStatus('saved');
    const now = new Date();
    setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      setAutoSaveStatus('idle');
    }, 3000);

    if (cellPulseTimerRef.current) clearTimeout(cellPulseTimerRef.current);
    cellPulseTimerRef.current = setTimeout(() => {
      setLastSavedCellKey(null);
    }, 1800);
  };

  // Keyboard navigation for spreadsheet-like rate inputs
  const handleRateInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    roomId: string,
    seasonIdx: number,
    colKey: string
  ) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      // Move to same rate column in next seasonal tier row
      const target = document.querySelector<HTMLInputElement>(
        `input[data-rate-input="true"][data-room-id="${roomId}"][data-season-idx="${seasonIdx + 1}"][data-col-key="${colKey}"]`
      );
      if (target) {
        target.focus();
        target.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      // Move to same rate column in previous seasonal tier row
      const target = document.querySelector<HTMLInputElement>(
        `input[data-rate-input="true"][data-room-id="${roomId}"][data-season-idx="${seasonIdx - 1}"][data-col-key="${colKey}"]`
      );
      if (target) {
        target.focus();
        target.select();
      }
    }
  };

  // Save season date boundaries from popover/modal editor
  const handleSaveSeasonDate = (
    hotelId: string,
    roomId: string,
    seasonId: string,
    seasonName: string,
    dateBracket: string
  ) => {
    const hotel = hotelCatalog.find((h) => h.id === hotelId);
    if (!hotel) return;
    const room = hotel.rooms.find((r) => r.id === roomId);
    if (!room) return;
    const seasons = (room.seasons && room.seasons.length > 0)
      ? room.seasons
      : createDefaultKeralaSeasons(room.base_b2b_rate);

    const updatedSeasons = seasons.map((s) => {
      if (s.id === seasonId) {
        return {
          ...s,
          season_name: seasonName.trim() || s.season_name,
          date_bracket: dateBracket.trim() || s.date_bracket,
        };
      }
      return s;
    });

    updateRoomSeasonsInCatalog(hotelId, roomId, updatedSeasons);
    setAutoSaveStatus('saved');
    const now = new Date();
    setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => setAutoSaveStatus('idle'), 3000);
    showToast(`Updated season window to "${dateBracket.trim()}".`);
  };

  // Toggle meal plan column
  const toggleMealPlanColumn = (plan: MealPlanCode) => {
    setVisibleMealPlans((prev) => {
      if (prev.includes(plan)) {
        if (prev.length <= 1) {
          showToast('Keep at least 1 meal plan visible.');
          return prev;
        }
        return prev.filter((p) => p !== plan);
      } else {
        return [...prev, plan];
      }
    });
  };

  // Save new hotel modal
  const handleSaveHotelForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingHotel) {
      const updated = hotelCatalog.map((h) => {
        if (h.id === editingHotel.id) {
          return {
            ...h,
            destination: formDest.trim(),
            hotel_name: formName.trim(),
            star_rating: formStar,
            status: formStatus,
          };
        }
        return h;
      });
      onUpdateHotelCatalog(updated);
      showToast(`Updated "${formName.trim()}"`);
    } else {
      const newId = `htl-${formDest.toLowerCase().slice(0, 3)}-${Date.now()}`;
      const defaultRoomId = `rm-${Date.now()}`;
      const newHotel: HotelModel = {
        id: newId,
        destination: formDest.trim(),
        hotel_name: formName.trim(),
        star_rating: formStar,
        status: formStatus,
        rooms: [
          {
            id: defaultRoomId,
            hotel_id: newId,
            room_category: 'Deluxe Room',
            base_b2b_rate: 3200,
            max_occupancy: '2 Adults + 1 Child',
            total_inventory: 10,
            seasons: createDefaultKeralaSeasons(3200),
          },
        ],
      };
      onUpdateHotelCatalog([...hotelCatalog, newHotel]);
      setSelectedDest(formDest.trim());
      setSelectedHotelId(newId);
      showToast(`Created "${formName.trim()}" with 3 default seasonal tariffs!`);
    }

    setShowHotelModal(false);
  };

  // Delete hotel
  const handleDeleteHotel = (hotelId: string, name: string) => {
    if (confirm(`Delete "${name}" from inventory? Existing customer vouchers will not be affected.`)) {
      const updated = hotelCatalog.filter((h) => h.id !== hotelId);
      onUpdateHotelCatalog(updated);
      if (selectedHotelId === hotelId) {
        setSelectedHotelId(null);
      }
      showToast(`Deleted "${name}"`);
    }
  };

  // Add Room Category to selected hotel
  const handleSaveNewRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotel || !formRoomCat.trim()) return;

    const rate = Math.max(0, parseInt(formRoomRate, 10) || 0);
    const newRoom: RoomModel = {
      id: `rm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      hotel_id: selectedHotel.id,
      room_category: formRoomCat.trim(),
      base_b2b_rate: rate,
      max_occupancy: formRoomOccupancy.trim() || '2 Adults + 1 Child',
      total_inventory: Math.max(1, parseInt(formRoomInventory, 10) || 10),
      seasons: createDefaultKeralaSeasons(rate),
    };

    const updated = hotelCatalog.map((h) => {
      if (h.id === selectedHotel.id) {
        return {
          ...h,
          rooms: [...h.rooms, newRoom],
        };
      }
      return h;
    });

    onUpdateHotelCatalog(updated);
    setExpandedRoomIds((prev) => new Set(prev).add(newRoom.id));
    setShowAddRoomModal(false);
    setFormRoomCat('');
    showToast(`Added "${newRoom.room_category}" with seasons.`);
  };

  // Delete Room Category
  const handleDeleteRoom = (hotelId: string, roomId: string, name: string) => {
    if (confirm(`Remove "${name}" room category?`)) {
      const updated = hotelCatalog.map((h) => {
        if (h.id === hotelId) {
          return {
            ...h,
            rooms: h.rooms.filter((r) => r.id !== roomId),
          };
        }
        return h;
      });
      onUpdateHotelCatalog(updated);
      showToast(`Removed "${name}"`);
    }
  };

  // Add Season Bracket
  const handleSaveNewSeason = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotel || !activeSeasonRoomId || !formSeasonDates.trim()) return;

    const cpVal = Math.max(0, parseInt(formSeasonCP, 10) || parseInt(formSeasonBase, 10) || 0);
    const newSeason: SeasonRateBracket = {
      id: `sn-custom-${Date.now()}`,
      season_name: formSeasonName.trim() || 'Seasonal Rate',
      date_bracket: formSeasonDates.trim(),
      base_rate: cpVal,
      ep_rate: Math.max(0, parseInt(formSeasonEP, 10) || 0),
      cp_rate: cpVal,
      map_rate: Math.max(0, parseInt(formSeasonMAP, 10) || 0),
      ap_rate: Math.max(0, parseInt(formSeasonAP, 10) || 0),
      extra_adult: Math.max(0, parseInt(formSeasonExtraAdult, 10) || 0),
      child_with_bed: Math.max(0, parseInt(formSeasonChildBed, 10) || 0),
    };

    const room = selectedHotel.rooms.find((r) => r.id === activeSeasonRoomId);
    const existingSeasons = (room?.seasons && room.seasons.length > 0)
      ? room.seasons
      : createDefaultKeralaSeasons(room?.base_b2b_rate || 3000);

    updateRoomSeasonsInCatalog(selectedHotel.id, activeSeasonRoomId, [...existingSeasons, newSeason]);
    setShowAddSeasonModal(false);
    showToast(`Added seasonal bracket "${newSeason.season_name}".`);
  };

  // Delete Season Bracket
  const handleDeleteSeasonBracket = (
    hotelId: string,
    roomId: string,
    seasonId: string,
    seasonName: string
  ) => {
    const hotel = hotelCatalog.find((h) => h.id === hotelId);
    if (!hotel) return;
    const room = hotel.rooms.find((r) => r.id === roomId);
    if (!room) return;
    const seasons = (room.seasons && room.seasons.length > 0)
      ? room.seasons
      : createDefaultKeralaSeasons(room.base_b2b_rate);

    if (seasons.length <= 1) {
      showToast('Each room must maintain at least 1 seasonal tariff.');
      return;
    }

    const updatedSeasons = seasons.filter((s) => s.id !== seasonId);
    updateRoomSeasonsInCatalog(hotelId, roomId, updatedSeasons);
    showToast(`Deleted bracket "${seasonName}".`);
  };

  // Load Sample Kerala B2B Tariffs
  const handleLoadSampleTariffs = () => {
    onUpdateHotelCatalog(SAMPLE_KERALA_B2B_TARIFFS);
    setSelectedDest('Munnar');
    setSelectedHotelId('htl-mun-leaf');
    showToast('Loaded 5 Kerala properties with full seasonal brackets & meal plans!');
  };

  // Open create new hotel modal
  const handleOpenCreateHotel = () => {
    setEditingHotel(null);
    setFormDest(selectedDest || 'Munnar');
    setFormName('');
    setFormStar(4);
    setFormStatus(true);
    setShowHotelModal(true);
  };

  // Open edit hotel modal
  const handleOpenEditHotel = (hotel: HotelModel) => {
    setEditingHotel(hotel);
    setFormDest(hotel.destination);
    setFormName(hotel.hotel_name);
    setFormStar(hotel.star_rating);
    setFormStatus(hotel.status);
    setShowHotelModal(true);
  };

  // Open Add Destination modal
  const handleOpenAddDest = () => {
    setEditingDestName(null);
    setDestFormInput('');
    setShowDestModal(true);
  };

  // Open Edit / Rename Destination modal
  const handleOpenEditDest = (destName: string) => {
    setEditingDestName(destName);
    setDestFormInput(destName);
    setShowDestModal(true);
  };

  // Save Destination (create or rename)
  const handleSaveDestForm = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = destFormInput.trim();
    if (!clean) return;

    if (editingDestName) {
      if (editingDestName.toLowerCase() === clean.toLowerCase()) {
        setShowDestModal(false);
        return;
      }
      // Rename destination across all matching hotels
      const updated = hotelCatalog.map((h) => {
        if (h.destination.toLowerCase() === editingDestName.toLowerCase()) {
          return { ...h, destination: clean };
        }
        return h;
      });
      onUpdateHotelCatalog(updated);
      setExtraDestinations((prev) => [...prev.filter((d) => d.toLowerCase() !== editingDestName.toLowerCase()), clean]);
      setRemovedDestinations((prev) => {
        const next = new Set(prev);
        next.add(editingDestName);
        next.delete(clean);
        return next;
      });
      if (selectedDest && selectedDest.toLowerCase() === editingDestName.toLowerCase()) {
        setSelectedDest(clean);
      }
      showToast(`Renamed destination "${editingDestName}" to "${clean}".`);
    } else {
      // Add new destination
      setExtraDestinations((prev) => Array.from(new Set([...prev, clean])));
      setRemovedDestinations((prev) => {
        const next = new Set(prev);
        next.delete(clean);
        return next;
      });
      setSelectedDest(clean);
      setSelectedHotelId(null);
      showToast(`Added destination "${clean}".`);
    }
    setShowDestModal(false);
  };

  // Delete Destination
  const handleDeleteDest = (destName: string) => {
    const matchingHotels = hotelCatalog.filter(
      (h) => h.destination.toLowerCase() === destName.toLowerCase()
    );
    const confirmMsg = matchingHotels.length > 0
      ? `Remove destination "${destName}" and all ${matchingHotels.length} properties within it?`
      : `Remove destination "${destName}" from list?`;

    if (confirm(confirmMsg)) {
      if (matchingHotels.length > 0) {
        const updated = hotelCatalog.filter(
          (h) => h.destination.toLowerCase() !== destName.toLowerCase()
        );
        onUpdateHotelCatalog(updated);
      }
      setRemovedDestinations((prev) => new Set(prev).add(destName));
      setExtraDestinations((prev) => prev.filter((d) => d.toLowerCase() !== destName.toLowerCase()));
      if (selectedDest && selectedDest.toLowerCase() === destName.toLowerCase()) {
        setSelectedDest(null);
        setSelectedHotelId(null);
      }
      showToast(`Removed destination "${destName}".`);
    }
  };

  // Open edit room category modal
  const handleOpenEditRoom = (room: RoomModel) => {
    setEditingRoom(room);
    setEditRoomCat(room.room_category);
    setEditRoomOccupancy(room.max_occupancy || '2 Adults + 1 Child');
    setEditRoomInventory(String(room.total_inventory || 10));
    setEditRoomBaseRate(String(room.base_b2b_rate));
    setShowEditRoomModal(true);
  };

  // Save room category edits
  const handleSaveEditRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotel || !editingRoom || !editRoomCat.trim()) return;

    const rate = Math.max(0, parseInt(editRoomBaseRate, 10) || 0);
    const updatedRooms = selectedHotel.rooms.map((r) => {
      if (r.id === editingRoom.id) {
        return {
          ...r,
          room_category: editRoomCat.trim(),
          max_occupancy: editRoomOccupancy.trim() || '2 Adults + 1 Child',
          total_inventory: Math.max(1, parseInt(editRoomInventory, 10) || 10),
          base_b2b_rate: rate,
        };
      }
      return r;
    });

    const updatedCatalog = hotelCatalog.map((h) => {
      if (h.id === selectedHotel.id) {
        return { ...h, rooms: updatedRooms };
      }
      return h;
    });

    onUpdateHotelCatalog(updatedCatalog);
    setShowEditRoomModal(false);
    setEditingRoom(null);
    showToast(`Updated "${editRoomCat.trim()}" details.`);
  };

  // Reset entire catalog to Travel Care Tours official Kerala defaults
  const handleResetDefaults = () => {
    if (confirm('Reset entire Hotel & Room Database to Travel Care Tours official Kerala defaults? Any custom added properties will be replaced.')) {
      onUpdateHotelCatalog(SAMPLE_KERALA_B2B_TARIFFS);
      setSelectedDest('Munnar');
      setSelectedHotelId('htl-mun-leaf');
      showToast('Hotel inventory reset to official defaults.');
    }
  };

  // Excel File Selected for Import
  const handleFileSelected = async (file: File) => {
    setUploadError(null);
    setIsUploading(true);
    try {
      const parsed = await parseHotelsFromExcel(file);
      setParsedPreview({
        ...parsed,
        fileName: file.name,
      });
    } catch (err: any) {
      setUploadError(err.message || 'Failed to read Excel file.');
      setParsedPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Commit Excel Import
  const handleCommitImport = () => {
    if (!parsedPreview) return;
    if (importMode === 'replace') {
      onUpdateHotelCatalog(parsedPreview.hotels);
      showToast(`Catalog replaced with ${parsedPreview.hotels.length} hotels.`);
    } else {
      const merged = [...hotelCatalog];
      parsedPreview.hotels.forEach((incoming) => {
        const idx = merged.findIndex(
          (h) => h.destination.toLowerCase() === incoming.destination.toLowerCase() &&
                 h.hotel_name.toLowerCase() === incoming.hotel_name.toLowerCase()
        );
        if (idx >= 0) {
          merged[idx] = { ...merged[idx], rooms: incoming.rooms };
        } else {
          merged.push(incoming);
        }
      });
      onUpdateHotelCatalog(merged);
      showToast(`Merged ${parsedPreview.hotels.length} hotels into inventory.`);
    }
    setShowUploadModal(false);
    setParsedPreview(null);
  };

  // Derive active view state
  const isState1 = selectedDest === null;
  const isState2 = selectedDest !== null && selectedHotelId === null;
  const isState3 = selectedDest !== null && selectedHotelId !== null;

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-[#0B2545] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400/40 animate-in fade-in slide-in-from-top-3 duration-200">
          <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{toastMsg}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 sm:px-5 sm:py-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          {/* Main Heading formatted as Hotel & Room Management Dashboard directly */}
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-100/90 border border-amber-300 text-orange-500 shadow-2xs shrink-0 flex items-center justify-center">
              <Building2 className="w-4.5 h-4.5 text-orange-600 fill-amber-400 stroke-[2.2]" />
            </span>
            <span>Hotel &amp; Room Management Dashboard</span>
          </h2>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-2 sm:gap-3 mt-1.5 text-xs flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded-lg text-[11px]">
              <Building2 className="w-3 h-3 text-slate-600" />
              <span>{totalHotels} Properties</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 text-[11px]">
              <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
              <span>{activeHotels} Active</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-indigo-800 font-bold bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200 text-[11px]">
              <Bed className="w-3 h-3 text-indigo-600" />
              <span>{totalRooms} Room Types</span>
            </span>
          </div>
        </div>

        {/* Action Controls 3x2 Grid Toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {/* Row 1, Col 1: Hotel (Primary) */}
            <button
              type="button"
              onClick={handleOpenCreateHotel}
              className="h-8 px-2.5 sm:px-3 text-xs font-bold text-white bg-[#0B2545] hover:bg-[#07192F] rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              title="Create new hotel property"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Hotel</span>
            </button>

            {/* Row 1, Col 2: Destination */}
            <button
              type="button"
              onClick={handleOpenAddDest}
              className="h-8 px-2.5 sm:px-3 text-xs font-bold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              title="Add new destination"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="truncate">Destination</span>
            </button>

            {/* Row 1, Col 3: Quick Edit Rates Toggle */}
            <button
              type="button"
              id="btn-toggle-quick-edit-rates"
              onClick={() => setIsQuickEditMode(!isQuickEditMode)}
              className={`h-8 px-2.5 sm:px-3 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs border ${
                isQuickEditMode
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-600 shadow-md ring-2 ring-amber-400/40'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-300'
              }`}
              title="Toggle high-speed spreadsheet grid to tab through and update prices for dozens of rooms in minutes"
            >
              <span className="truncate">⚡ Quick Rates</span>
            </button>

            {/* Row 2, Col 1: Download Template */}
            <button
              type="button"
              id="btn-download-hotel-template"
              onClick={generateHotelExcelTemplate}
              className="h-8 px-2.5 sm:px-3 text-xs font-bold text-emerald-900 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              title="Download formatted Excel (.xlsx) template with sample Kerala hotels and instructions"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Template</span>
            </button>

            {/* Row 2, Col 2: Import Excel */}
            <button
              type="button"
              id="btn-import-hotel-excel"
              onClick={() => {
                setShowUploadModal(true);
                setParsedPreview(null);
                setUploadError(null);
              }}
              className="h-8 px-2.5 sm:px-3 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              title="Upload filled Excel (.xlsx, .xls, .csv) to import or bulk-update tariffs"
            >
              <Upload className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>Import</span>
            </button>

            {/* Row 2, Col 3: Export Excel */}
            <button
              type="button"
              onClick={() => exportCurrentHotelsToExcel(hotelCatalog)}
              disabled={hotelCatalog.length === 0}
              className="h-8 px-2.5 sm:px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              title="Export all current hotel tariffs to an Excel file (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>Export</span>
            </button>
          </div>

          {/* Reset / Default Tariffs button */}
          <button
            type="button"
            onClick={handleResetDefaults}
            className="h-[70px] px-2 text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center gap-1 shrink-0"
            title="Reset to default Kerala partner hotel catalog"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400 hover:rotate-180 transition-transform" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* QUICK EDIT SPREADSHEET OR 3-COLUMN CASCADING FINDER      */}
      {/* ======================================================== */}
      {isQuickEditMode ? (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[680px]">
          {/* Top Instruction & Live Status Banner */}
          <div className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-slate-50 border-b border-amber-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-amber-500 text-slate-950 shrink-0 shadow-2xs">
                <Zap className="w-4 h-4 fill-slate-950" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-black text-slate-900">
                    High-Speed Rate Spreadsheet
                  </span>
                  <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 border border-amber-500 shadow-2xs">
                    {flattenedRooms.length} room tariffs
                  </span>
                  {modifiedRoomIds.size > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[11px] border border-emerald-300 shadow-2xs animate-in fade-in">
                      ✓ {modifiedRoomIds.size} modified live
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono font-bold text-slate-700">Enter</kbd> or <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono font-bold text-slate-700">↓ / ↑</kbd> to jump between rate inputs. Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono font-bold text-slate-700">Tab</kbd> to move across cells. Auto-saves on blur.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setIsQuickEditMode(false)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-[#0B2545] text-white hover:bg-[#07192F] rounded-xl shadow-xs transition-all cursor-pointer"
                title="Switch back to 3-column Finder view"
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Exit to 3-Column Finder</span>
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-80 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={quickEditSearch}
                onChange={(e) => setQuickEditSearch(e.target.value)}
                placeholder="Filter room, hotel, destination..."
                className="w-full h-8.5 pl-9 pr-7 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B2545] focus:outline-hidden"
              />
              {quickEditSearch && (
                <button
                  type="button"
                  onClick={() => setQuickEditSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Destination Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 text-xs">
              <button
                type="button"
                onClick={() => setQuickEditDestFilter('All')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs shrink-0 transition-all cursor-pointer ${
                  quickEditDestFilter === 'All'
                    ? 'bg-[#0B2545] text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                }`}
              >
                All Destinations
              </button>
              {allDestinations.map((dest) => (
                <button
                  key={dest}
                  type="button"
                  onClick={() => setQuickEditDestFilter(dest)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs shrink-0 transition-all cursor-pointer ${
                    quickEditDestFilter.toLowerCase() === dest.toLowerCase()
                      ? 'bg-emerald-800 text-white shadow-2xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
                  }`}
                >
                  {dest}
                </button>
              ))}
            </div>
          </div>

          {/* Spreadsheet Table Container */}
          <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[650px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-700 shadow-xs">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12">#</th>
                  <th className="py-2.5 px-3 w-32">Destination</th>
                  <th className="py-2.5 px-3">Hotel / Resort</th>
                  <th className="py-2.5 px-3 w-20 text-center">Stars</th>
                  <th className="py-2.5 px-3">Room Category</th>
                  <th className="py-2.5 px-3 w-36">Occupancy</th>
                  <th className="py-2.5 px-3 w-44 text-right">Base B2B Tariff (CP)</th>
                  <th className="py-2.5 px-3 w-24 text-center">Status</th>
                  <th className="py-2.5 px-3 w-20 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {flattenedRooms.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-400 font-medium">
                      No room categories match the selected filter.
                    </td>
                  </tr>
                ) : (
                  flattenedRooms.map((item) => {
                    const isModified = modifiedRoomIds.has(item.roomId);
                    return (
                      <tr
                        key={`${item.hotelId}-${item.roomId}`}
                        className={`transition-colors ${
                          isModified ? 'bg-amber-50/50 hover:bg-amber-50/80' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {item.index + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold text-[11px]">
                            {item.destination}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          <span className="line-clamp-1" title={item.hotelName}>
                            {item.hotelName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 font-bold text-[10px] border border-amber-200">
                            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                            <span>{item.starRating}★</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          <input
                            type="text"
                            defaultValue={item.roomCategory}
                            onBlur={(e) => {
                              if (e.target.value.trim() !== item.roomCategory) {
                                handleQuickUpdateCategory(item.hotelId, item.roomId, e.target.value);
                              }
                            }}
                            className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-600 rounded px-1.5 py-0.5 font-bold text-xs text-slate-800 focus:outline-hidden"
                            title="Edit room category title directly"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-medium text-[11px]">
                          <span className="truncate block">👥 {item.maxOccupancy}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div
                            className={`inline-flex items-center gap-1 bg-white border rounded-lg px-2 py-1 shadow-2xs transition-all ${
                              isModified
                                ? 'border-amber-500 ring-2 ring-amber-400/30'
                                : 'border-slate-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20'
                            }`}
                          >
                            <span className="text-slate-400 font-bold text-xs">₹</span>
                            <input
                              id={`quick-rate-cell-${item.index}`}
                              data-rate-index={item.index}
                              type="number"
                              step={100}
                              defaultValue={item.baseB2BRate}
                              onBlur={(e) => {
                                const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                if (val !== item.baseB2BRate) {
                                  handleQuickUpdateRate(item.hotelId, item.roomId, val);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  const next = document.getElementById(
                                    `quick-rate-cell-${item.index + 1}`
                                  ) as HTMLInputElement;
                                  if (next) {
                                    next.focus();
                                    next.select();
                                  }
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  const prev = document.getElementById(
                                    `quick-rate-cell-${item.index - 1}`
                                  ) as HTMLInputElement;
                                  if (prev) {
                                    prev.focus();
                                    prev.select();
                                  }
                                }
                              }}
                              className="w-24 text-right text-xs font-black text-slate-900 focus:outline-hidden"
                              title="Enter rate and press Enter or Arrow Down to jump to next room"
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleHotelStatus(item.hotelId)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${
                              item.hotelStatus
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                            }`}
                            title="Click to toggle hotel Active / Inactive"
                          >
                            {item.hotelStatus ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRoom(item.hotelId, item.roomId, item.roomCategory)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Delete this room category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-3 min-h-[680px] lg:h-[760px] bg-slate-100/60 p-2 sm:p-3 rounded-2xl sm:rounded-3xl border border-slate-200 overflow-hidden relative">

        {/* ---------------------------------------------------- */}
        {/* COLUMN 1: DESTINATIONS PANEL                         */}
        {/* State 1: 25% width                                   */}
        {/* State 2 & 3: 5% vertical collapsed strip             */}
        {/* ---------------------------------------------------- */}
        {isState1 ? (
          <div className="w-full lg:w-[25%] lg:min-w-[260px] bg-white rounded-2xl border border-slate-200/90 p-4 flex flex-col shadow-xs transition-all duration-300 ease-in-out">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  Destinations
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleOpenAddDest}
                  className="p-1 text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                  title="Add new destination"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-extrabold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg">
                  {allDestinations.length}
                </span>
              </div>
            </div>

            {/* Destination Search */}
            <div className="relative my-3">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={destSearch}
                onChange={(e) => setDestSearch(e.target.value)}
                placeholder="Search destination..."
                className="w-full h-9 pl-9 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0B2545] focus:outline-hidden"
              />
              {destSearch && (
                <button
                  type="button"
                  onClick={() => setDestSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Destination List (Scrollable) */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredDestinations.map((dest) => {
                const count = hotelCatalog.filter(
                  (h) => h.destination.toLowerCase() === dest.toLowerCase()
                ).length;

                return (
                  <div
                    key={dest}
                    onClick={() => {
                      setSelectedDest(dest);
                      setSelectedHotelId(null);
                    }}
                    className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-transparent text-left transition-all cursor-pointer group bg-slate-50/70 hover:bg-slate-100 hover:border-slate-200"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-emerald-500 transition-colors shrink-0" />
                      <span className="text-xs sm:text-sm font-bold text-slate-800 truncate group-hover:text-[#0B2545]">
                        {dest}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        count > 0 ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200/70 text-slate-500'
                      }`}>
                        {count} {count === 1 ? 'hotel' : 'hotels'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditDest(dest);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title={`Rename "${dest}"`}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDest(dest);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title={`Delete destination "${dest}"`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* State 2 & 3: Collapsed 5% Vertical Strip */
          <div
            onClick={() => {
              setSelectedDest(null);
              setSelectedHotelId(null);
            }}
            className="w-full lg:w-[5%] lg:min-w-[56px] lg:max-w-[70px] bg-[#0B2545] hover:bg-[#07192F] text-white rounded-2xl p-2.5 sm:p-3 flex flex-row lg:flex-col items-center justify-between transition-all duration-300 ease-in-out cursor-pointer group shadow-md shrink-0 select-none"
            title="Click to switch destination"
          >
            <div className="flex items-center lg:flex-col gap-2">
              <button
                type="button"
                className="w-8 h-8 rounded-xl bg-white/10 group-hover:bg-emerald-500 text-white flex items-center justify-center transition-colors"
                title="Expand Destinations"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
              <MapPin className="w-4 h-4 text-emerald-400 hidden lg:block" />
            </div>

            {/* Vertical destination text for desktop */}
            <div className="hidden lg:block my-auto py-6">
              <span
                style={{ writingMode: 'vertical-rl' }}
                className="rotate-180 text-xs font-black tracking-widest uppercase text-slate-200 group-hover:text-emerald-300 transition-colors whitespace-nowrap"
              >
                {selectedDest}
              </span>
            </div>

            {/* Mobile horizontal text */}
            <div className="lg:hidden flex items-center gap-2">
              <span className="text-xs font-black text-white">{selectedDest}</span>
              <span className="text-[10px] text-slate-300">Tap to change</span>
            </div>

            <div className="flex items-center lg:flex-col gap-1 text-[11px] font-black bg-white/15 px-2 py-1 rounded-lg">
              <span>{hotelCatalog.filter((h) => h.destination.toLowerCase() === (selectedDest || '').toLowerCase()).length}</span>
              <span className="text-[9px] uppercase tracking-wider text-slate-300">htl</span>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* COLUMN 2: HOTELS PANEL                               */}
        {/* State 1: 75% width placeholder                       */}
        {/* State 2: 30% width full list                         */}
        {/* State 3: 15% width collapsed strip with switcher     */}
        {/* ---------------------------------------------------- */}
        {isState1 ? (
          /* State 1: Empty / Guide Placeholder (75% width) */
          <div className="w-full lg:w-[75%] bg-white rounded-2xl border border-slate-200/90 p-8 flex flex-col items-center justify-center text-center shadow-xs transition-all duration-300 ease-in-out">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-4 shadow-inner">
              <Building2 className="w-8 h-8 text-emerald-700" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">
              Select a Destination to Browse Properties
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
              Drill down from any Kerala destination on the left to inspect properties, configure seasonal rate brackets, and manage dynamic meal plan tariffs.
            </p>

            {/* Quick Destination Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mb-8">
              {allDestinations.map((dest) => (
                <button
                  key={dest}
                  type="button"
                  onClick={() => {
                    setSelectedDest(dest);
                    setSelectedHotelId(null);
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-[#0B2545] hover:text-white text-slate-700 rounded-xl transition-all cursor-pointer shadow-2xs"
                >
                  {dest}
                </button>
              ))}
            </div>

            {/* Summary Counters */}
            <div className="grid grid-cols-3 gap-4 max-w-md w-full pt-4 border-t border-slate-100">
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="text-xs text-slate-500 font-bold">Total Hotels</div>
                <div className="text-lg font-black text-slate-900">{totalHotelsInCatalog}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="text-xs text-slate-500 font-bold">Destinations</div>
                <div className="text-lg font-black text-emerald-800">{allDestinations.length}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="text-xs text-slate-500 font-bold">Room Types</div>
                <div className="text-lg font-black text-[#0B2545]">{totalRoomsInCatalog}</div>
              </div>
            </div>
          </div>
        ) : isState2 ? (
          /* State 2: Destination Selected, Hotels Panel Expanded to 30% */
          <div className="w-full lg:w-[30%] lg:min-w-[280px] bg-white rounded-2xl border border-slate-200/90 p-4 flex flex-col shadow-xs transition-all duration-300 ease-in-out shrink-0">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-700">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{selectedDest}</span>
                  <button
                    type="button"
                    onClick={() => handleOpenEditDest(selectedDest)}
                    className="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition-colors ml-0.5"
                    title={`Rename "${selectedDest}"`}
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDest(selectedDest)}
                    className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                    title={`Delete destination "${selectedDest}"`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <h3 className="text-sm font-black text-slate-900 truncate">
                  Hotels & Resorts
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingHotel(null);
                  setFormDest(selectedDest);
                  setFormName('');
                  setFormStar(4);
                  setFormStatus(true);
                  setShowHotelModal(true);
                }}
                className="p-1.5 rounded-lg bg-[#0B2545] text-white hover:bg-[#07192F] transition-colors cursor-pointer shrink-0"
                title="Add new hotel to this destination"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="space-y-2 my-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={hotelSearch}
                  onChange={(e) => setHotelSearch(e.target.value)}
                  placeholder="Search hotel or room..."
                  className="w-full h-8 pl-8 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0B2545] focus:outline-hidden"
                />
                {hotelSearch && (
                  <button
                    type="button"
                    onClick={() => setHotelSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Star Rating Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {['all', '3', '4', '5'].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setHotelStarFilter(star)}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
                      hotelStarFilter === star
                        ? 'bg-[#0B2545] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {star === 'all' ? 'All Stars' : `${star}★`}
                  </button>
                ))}
              </div>
            </div>

            {/* Hotels List (Scrollable) */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {destinationHotels.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No hotels found in {selectedDest}.
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingHotel(null);
                        setFormDest(selectedDest);
                        setFormName('');
                        setShowHotelModal(true);
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-[#0B2545] rounded-xl"
                    >
                      + Add First Hotel
                    </button>
                  </div>
                </div>
              ) : (
                destinationHotels.map((hotel) => {
                  const startingRate = hotel.rooms && hotel.rooms.length > 0
                    ? Math.min(...hotel.rooms.map((r) => r.base_b2b_rate))
                    : 0;

                  return (
                    <div
                      key={hotel.id}
                      onClick={() => setSelectedHotelId(hotel.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer group relative ${
                        selectedHotelId === hotel.id
                          ? 'bg-emerald-50/70 border-emerald-400 shadow-sm'
                          : 'bg-slate-50/70 hover:bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-[#0B2545]">
                            {hotel.hotel_name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[11px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/80">
                              {hotel.star_rating}★
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {(hotel.rooms || []).length} categories
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 mt-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditHotel(hotel);
                            }}
                            className="p-1 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-md transition-colors"
                            title={`Edit "${hotel.hotel_name}"`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHotel(hotel.id, hotel.hotel_name);
                            }}
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                            title={`Delete "${hotel.hotel_name}"`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 transition-transform group-hover:translate-x-1 shrink-0 ml-0.5" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 text-[11px]">
                        <span className="text-slate-500 font-medium">
                          Starting at
                        </span>
                        <span className="font-black text-emerald-900">
                          ₹ {startingRate.toLocaleString('en-IN')}/nt
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* State 3: Hotel Selected, Hotels Panel Collapses to 15% Width Strip */
          <div className="w-full lg:w-[15%] lg:min-w-[150px] lg:max-w-[220px] bg-white rounded-2xl border border-slate-200/90 p-3 flex flex-col shadow-xs transition-all duration-300 ease-in-out shrink-0">
            {/* Top Switcher / Back Button */}
            <button
              type="button"
              onClick={() => setSelectedHotelId(null)}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer mb-2.5"
              title="Expand hotels list"
            >
              <div className="flex items-center gap-1">
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>All Hotels</span>
              </div>
              <ChevronsRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Currently Active Hotel Card */}
            {selectedHotel && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300/80 mb-2">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Active Property</div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditHotel(selectedHotel)}
                      className="p-0.5 text-slate-500 hover:text-blue-600 rounded transition-colors"
                      title="Edit this hotel"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteHotel(selectedHotel.id, selectedHotel.hotel_name)}
                      className="p-0.5 text-slate-500 hover:text-rose-600 rounded transition-colors"
                      title="Delete this hotel"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="text-xs font-black text-slate-900 truncate mt-0.5">{selectedHotel.hotel_name}</div>
                <div className="text-[11px] text-amber-700 font-bold mt-0.5">{selectedHotel.star_rating}★ Property</div>
              </div>
            )}

            {/* Quick Switcher for Other Hotels in Destination */}
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1">
              Switch Property
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
              {destinationHotels.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setSelectedHotelId(h.id)}
                  className={`w-full text-left p-2 rounded-xl text-xs font-bold truncate transition-colors cursor-pointer ${
                    selectedHotelId === h.id
                      ? 'bg-[#0B2545] text-white shadow-2xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                  title={h.hotel_name}
                >
                  <div className="truncate">{h.hotel_name}</div>
                  <div className={`text-[10px] ${selectedHotelId === h.id ? 'text-emerald-300' : 'text-slate-400'}`}>
                    {h.star_rating}★ • {(h.rooms || []).length} rms
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingHotel(null);
                setFormDest(selectedDest || 'Munnar');
                setFormName('');
                setShowHotelModal(true);
              }}
              className="mt-2 w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add Hotel</span>
            </button>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* COLUMN 3: ROOMS GRID & SEASONAL RATES PANEL          */}
        {/* State 1: Hidden                                      */}
        {/* State 2: 65% width prompt                            */}
        {/* State 3: 80% width COMMANDING VIEWPORT               */}
        {/* ---------------------------------------------------- */}
        {isState2 && (
          <div className="w-full lg:w-[65%] bg-white rounded-2xl border border-slate-200/90 p-8 flex flex-col items-center justify-center text-center shadow-xs transition-all duration-300 ease-in-out">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-4 shadow-inner">
              <TableIcon className="w-8 h-8 text-blue-700" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">
              Select a Hotel to View Tariff Grid
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
              Choose any property in {selectedDest} from the middle panel to view and edit its room categories, seasonal date brackets, and B2B meal plan rates.
            </p>
            {destinationHotels.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedHotelId(destinationHotels[0].id)}
                className="px-4 py-2 text-xs font-black text-white bg-[#0B2545] rounded-xl shadow-sm hover:bg-[#07192F] transition-all flex items-center gap-2"
              >
                <span>Open {destinationHotels[0].hotel_name}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {isState3 && selectedHotel && (
          /* State 3: Commanding 80% Width Room Rates Grid */
          <div className="w-full lg:w-[80%] flex-1 bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex flex-col shadow-xs transition-all duration-300 ease-in-out min-w-0">
            {/* Grid Header & Action Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <h3
                    className="text-base sm:text-lg font-black text-slate-900 truncate max-w-[280px] sm:max-w-md md:max-w-lg lg:max-w-xl"
                    title={selectedHotel.hotel_name}
                  >
                    {selectedHotel.hotel_name}
                  </h3>
                  <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 shrink-0">
                    {selectedHotel.star_rating}★
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                    selectedHotel.status ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {selectedHotel.status ? 'Active' : 'Inactive'}
                  </span>

                  {/* Master Edit and Delete Hotel Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditHotel(selectedHotel)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold border border-slate-200 hover:border-blue-200 transition-all cursor-pointer shadow-2xs"
                      title="Edit hotel details (name, star rating, destination, status)"
                    >
                      <Pencil className="w-3 h-3 text-blue-600" />
                      <span>Edit Hotel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteHotel(selectedHotel.id, selectedHotel.hotel_name)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-all cursor-pointer shadow-2xs"
                      title="Delete this hotel from catalog"
                    >
                      <Trash2 className="w-3 h-3 text-rose-600" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>

                  {/* Auto-Save Status Indicator */}
                  {autoSaveStatus === 'saved' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 animate-in fade-in shrink-0 shadow-2xs">
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      <span>Saved</span>
                      {lastSavedTime && <span className="text-[10px] text-emerald-600/70 font-normal">({lastSavedTime})</span>}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Multi-variable seasonal B2B tariff matrix • {filteredRooms.length} room categories configured
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {/* Expand / Collapse All Toggle */}
                <button
                  type="button"
                  onClick={expandedRoomIds.size > 0 ? handleCollapseAll : handleExpandAll}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  title="Expand or collapse all room seasons"
                >
                  {expandedRoomIds.size > 0 ? 'Collapse All' : 'Expand All'}
                </button>

                {/* [+ Add Meal Plan] Dynamic Column Injector */}
                <div className="relative meal-plan-dropdown-container">
                  <button
                    type="button"
                    onClick={() => setShowMealPlanPicker(!showMealPlanPicker)}
                    className="px-3 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Meal Plans ({visibleMealPlans.length})</span>
                    <ChevronDown className="w-3 h-3 text-emerald-700" />
                  </button>

                  {/* Meal Plan Popover Dropdown */}
                  {showMealPlanPicker && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
                      <div className="text-xs font-black text-slate-900 pb-2 border-b border-slate-100">
                        Inject Pricing Columns
                      </div>
                      <div className="py-2 space-y-1.5 text-xs">
                        {[
                          { code: 'EP' as MealPlanCode, label: 'EP - Room Only' },
                          { code: 'CP' as MealPlanCode, label: 'CP - Buffet Breakfast' },
                          { code: 'MAP' as MealPlanCode, label: 'MAP - Breakfast + Dinner' },
                          { code: 'AP' as MealPlanCode, label: 'AP - All Meals Included' },
                        ].map((item) => (
                          <label
                            key={item.code}
                            className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer font-bold text-slate-800"
                          >
                            <input
                              type="checkbox"
                              checked={visibleMealPlans.includes(item.code)}
                              onChange={() => toggleMealPlanColumn(item.code)}
                              className="rounded-md text-[#0B2545] focus:ring-[#0B2545] w-4 h-4 cursor-pointer"
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}

                        <div className="pt-2 border-t border-slate-100">
                          <label className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer font-bold text-slate-800">
                            <input
                              type="checkbox"
                              checked={showExtraBeds}
                              onChange={() => setShowExtraBeds(!showExtraBeds)}
                              className="rounded-md text-[#0B2545] focus:ring-[#0B2545] w-4 h-4 cursor-pointer"
                            />
                            <span>Extra Bed Rates (EAB, CWB)</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* [+ Add Room Category] Button */}
                <button
                  type="button"
                  onClick={() => {
                    setFormRoomCat('');
                    setFormRoomRate('3200');
                    setShowAddRoomModal(true);
                  }}
                  className="px-3 py-1.5 text-xs font-black text-white bg-[#0B2545] hover:bg-[#07192F] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Add Room Category</span>
                </button>
              </div>
            </div>

            {/* Filter & Global Search Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3">
              {/* Global Search text input */}
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={globalGridSearch}
                  onChange={(e) => setGlobalGridSearch(e.target.value)}
                  placeholder="Search room category, season, rate..."
                  className="w-full h-9 pl-9 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0B2545] focus:outline-hidden"
                />
                {globalGridSearch && (
                  <button
                    type="button"
                    onClick={() => setGlobalGridSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Past Seasons Toggle + Active Filter Indicators */}
              <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setHidePastSeasons(!hidePastSeasons)}
                  className={`h-9 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                    hidePastSeasons
                      ? 'bg-[#0B2545] text-white border-[#0B2545]'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                  title={
                    hidePastSeasons
                      ? 'Past seasons (ended before this month) are hidden. Click to show them (greyed out).'
                      : 'Past seasons (ended before this month) are shown greyed out. Click to hide them.'
                  }
                >
                  {hidePastSeasons ? (
                    <EyeOff className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                  <span>{hidePastSeasons ? 'Past Seasons: Hidden' : 'Past Seasons: Greyed'}</span>
                  {pastSeasonsCount > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                        hidePastSeasons
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {pastSeasonsCount}
                    </span>
                  )}
                </button>

                {(roomCategoryFilter.size > 0 || seasonTypeFilter.size > 0 || globalGridSearch || hidePastSeasons) && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">
                      Filtered view
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setRoomCategoryFilter(new Set());
                        setSeasonTypeFilter(new Set());
                        setGlobalGridSearch('');
                        setHidePastSeasons(false);
                      }}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ======================================================== */}
            {/* THE ROOMS & SEASONAL RATES TABLE                         */}
            {/* ======================================================== */}
            <div className="accommodation-catalog-container flex-1 overflow-x-auto lg:overflow-x-hidden overflow-y-auto rounded-xl border border-slate-200 relative">
              <table className="accommodation-catalog-table w-full min-w-full lg:min-w-0 text-left text-xs border-collapse lg:table-fixed">
                {/* Proportional Column Width Distribution for Desktop Fixed Table Layout */}
                <colgroup>
                  <col style={{ width: `${roomColPercent}%` }} />
                  <col style={{ width: `${seasonColPercent}%` }} />
                  {visibleMealPlans.includes('EP') && <col style={{ width: `${rateColPercent}%` }} />}
                  {visibleMealPlans.includes('CP') && <col style={{ width: `${rateColPercent}%` }} />}
                  {visibleMealPlans.includes('MAP') && <col style={{ width: `${rateColPercent}%` }} />}
                  {visibleMealPlans.includes('AP') && <col style={{ width: `${rateColPercent}%` }} />}
                  {showExtraBeds && (
                    <>
                      <col style={{ width: `${rateColPercent}%` }} />
                      <col style={{ width: `${rateColPercent}%` }} />
                    </>
                  )}
                  <col style={{ width: `${actionsColPercent}%` }} />
                </colgroup>

                {/* Sticky Table Header */}
                <thead className="sticky top-0 z-20 bg-slate-100 text-slate-800 font-black uppercase tracking-wider text-[11px] border-b-2 border-slate-200 shadow-2xs">
                  <tr>
                    {/* Room Category with Funnel Filter - Sticky Column 1 */}
                    <th 
                      style={{ width: `${roomColPercent}%` }}
                      className="py-3 px-3 sm:px-4 min-w-[260px] lg:min-w-0 sticky left-0 top-0 z-30 bg-slate-100 shadow-[1px_0_0_0_#cbd5e1]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">Room Category & Inventory</span>
                        <div className="relative filter-popover-container">
                          <button
                            type="button"
                            onClick={() => setActiveHeaderFilter(activeHeaderFilter === 'room' ? null : 'room')}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              roomCategoryFilter.size > 0
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'text-slate-400 hover:text-slate-700'
                            }`}
                            title="Filter by room category"
                          >
                            <Filter className="w-3 h-3" />
                          </button>

                          {/* Room Category Filter Popover */}
                          {activeHeaderFilter === 'room' && (
                            <div className="absolute left-0 top-full mt-1.5 w-60 bg-white rounded-xl border border-slate-200 shadow-xl p-2.5 z-40 normal-case font-normal text-xs animate-in fade-in-50">
                              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 font-bold text-slate-900">
                                <span>Filter Category</span>
                                {roomCategoryFilter.size > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setRoomCategoryFilter(new Set())}
                                    className="text-[11px] text-rose-600 hover:underline"
                                  >
                                    Reset
                                  </button>
                                )}
                              </div>
                              <div className="py-2 space-y-1 max-h-48 overflow-y-auto">
                                {distinctRoomCategories.map((cat) => (
                                  <label key={cat} className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-50 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={roomCategoryFilter.has(cat)}
                                      onChange={() => {
                                        setRoomCategoryFilter((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(cat)) next.delete(cat);
                                          else next.add(cat);
                                          return next;
                                        });
                                      }}
                                      className="rounded text-[#0B2545]"
                                    />
                                    <span className="truncate">{cat}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </th>

                    {/* Season Window with Funnel Filter */}
                    <th 
                      style={{ width: `${seasonColPercent}%` }}
                      className="py-3 px-3 sm:px-4 min-w-[200px] lg:min-w-0 sticky top-0 z-20 bg-slate-100"
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">Season Window & Dates</span>
                        <div className="relative filter-popover-container">
                          <button
                            type="button"
                            onClick={() => setActiveHeaderFilter(activeHeaderFilter === 'season' ? null : 'season')}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              seasonTypeFilter.size > 0
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'text-slate-400 hover:text-slate-700'
                            }`}
                            title="Filter by season bracket"
                          >
                            <Filter className="w-3 h-3" />
                          </button>

                          {/* Season Type Filter Popover */}
                          {activeHeaderFilter === 'season' && (
                            <div className="absolute left-0 top-full mt-1.5 w-60 bg-white rounded-xl border border-slate-200 shadow-xl p-2.5 z-40 normal-case font-normal text-xs animate-in fade-in-50">
                              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 font-bold text-slate-900">
                                <span>Filter Seasons</span>
                                {(seasonTypeFilter.size > 0 || hidePastSeasons) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSeasonTypeFilter(new Set());
                                      setHidePastSeasons(false);
                                    }}
                                    className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                                  >
                                    Reset
                                  </button>
                                )}
                              </div>

                              {/* Hide Past Seasons Toggle inside popover */}
                              <div className="py-2 border-b border-slate-100">
                                <label className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer font-bold text-slate-800">
                                  <input
                                    type="checkbox"
                                    checked={hidePastSeasons}
                                    onChange={(e) => setHidePastSeasons(e.target.checked)}
                                    className="rounded text-[#0B2545]"
                                  />
                                  <span>Don&apos;t show past seasons</span>
                                </label>
                                <div className="text-[10px] text-slate-400 px-1 mt-1">
                                  {hidePastSeasons ? 'Tariffs ended before this month are hidden' : 'Unchecked: past tariffs are shown greyed out'}
                                </div>
                              </div>

                              <div className="py-2 space-y-1 max-h-48 overflow-y-auto">
                                <div className="text-[10px] uppercase font-bold text-slate-400 px-1 mb-1">Season Name</div>
                                {distinctSeasonTypes.map((st) => (
                                  <label key={st} className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-50 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={seasonTypeFilter.has(st)}
                                      onChange={() => {
                                        setSeasonTypeFilter((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(st)) next.delete(st);
                                          else next.add(st);
                                          return next;
                                        });
                                      }}
                                      className="rounded text-[#0B2545]"
                                    />
                                    <span className="truncate">{st}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </th>

                    {/* Injected Meal Plan Columns */}
                    {visibleMealPlans.includes('EP') && (
                      <th 
                        style={{ width: `${rateColPercent}%` }}
                        className="py-3 px-2 sm:px-3 lg:px-2 min-w-[90px] lg:min-w-0 text-right bg-blue-50 text-blue-950 sticky top-0 z-20"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span className="truncate">EP (Room Only)</span>
                          <button
                            type="button"
                            onClick={() => toggleMealPlanColumn('EP')}
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer shrink-0"
                            title="Remove EP column"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </th>
                    )}

                    {visibleMealPlans.includes('CP') && (
                      <th 
                        style={{ width: `${rateColPercent}%` }}
                        className="py-3 px-2 sm:px-3 lg:px-2 min-w-[90px] lg:min-w-0 text-right bg-emerald-50 text-emerald-950 font-black sticky top-0 z-20"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span className="truncate">CP (Breakfast)</span>
                          <button
                            type="button"
                            onClick={() => toggleMealPlanColumn('CP')}
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer shrink-0"
                            title="Remove CP column"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </th>
                    )}

                    {visibleMealPlans.includes('MAP') && (
                      <th 
                        style={{ width: `${rateColPercent}%` }}
                        className="py-3 px-2 sm:px-3 lg:px-2 min-w-[90px] lg:min-w-0 text-right bg-amber-50 text-amber-950 sticky top-0 z-20"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span className="truncate">MAP (Dinner)</span>
                          <button
                            type="button"
                            onClick={() => toggleMealPlanColumn('MAP')}
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer shrink-0"
                            title="Remove MAP column"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </th>
                    )}

                    {visibleMealPlans.includes('AP') && (
                      <th 
                        style={{ width: `${rateColPercent}%` }}
                        className="py-3 px-2 sm:px-3 lg:px-2 min-w-[90px] lg:min-w-0 text-right bg-purple-50 text-purple-950 sticky top-0 z-20"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span className="truncate">AP (All Meals)</span>
                          <button
                            type="button"
                            onClick={() => toggleMealPlanColumn('AP')}
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer shrink-0"
                            title="Remove AP column"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </th>
                    )}

                    {/* Extra Bed Columns (If enabled) */}
                    {showExtraBeds && (
                      <>
                        <th 
                          style={{ width: `${rateColPercent}%` }}
                          className="py-3 px-2 sm:px-2.5 min-w-[85px] lg:min-w-0 text-right bg-slate-50 text-slate-700 sticky top-0 z-20"
                        >
                          <span className="truncate block">Extra Adult</span>
                        </th>
                        <th 
                          style={{ width: `${rateColPercent}%` }}
                          className="py-3 px-2 sm:px-2.5 min-w-[85px] lg:min-w-0 text-right bg-slate-50 text-slate-700 sticky top-0 z-20"
                        >
                          <span className="truncate block">Child w/ Bed</span>
                        </th>
                      </>
                    )}

                    {/* Row Actions */}
                    <th 
                      style={{ width: `${actionsColPercent}%` }}
                      className="py-3 px-2 min-w-[50px] lg:min-w-0 text-center sticky top-0 z-20 bg-slate-100"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>

                {/* Table Body with Hierarchical Row Grouping */}
                <tbody className="divide-y divide-slate-200">
                  {filteredRooms.length === 0 ? (
                    <tr>
                      <td colSpan={totalTableCols} className="py-12 text-center text-slate-400">
                        No room categories match the current filter or search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRooms.map((room) => {
                      const isExpanded = expandedRoomIds.has(room.id);
                      const seasons = room.seasons || [];

                      return (
                        <React.Fragment key={room.id}>
                          {/* ======================================== */}
                          {/* PARENT ROW: Room Category               */}
                          {/* ======================================== */}
                          <tr className="group bg-slate-50 hover:bg-slate-100/90 border-t-2 border-slate-200 transition-colors">
                            {/* Room Category Details - Sticky Column 1 */}
                            <td className="py-3 px-3 sm:px-4 min-w-[260px] lg:min-w-0 sticky left-0 z-10 bg-slate-50 group-hover:bg-slate-100 transition-colors shadow-[1px_0_0_0_#e2e8f0]">
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => toggleRoomExpand(room.id)}
                                  className="w-6 h-6 rounded-lg bg-white border border-slate-300 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0"
                                  title={isExpanded ? 'Collapse seasonal tariffs' : 'Expand seasonal tariffs'}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-emerald-700" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-500" />
                                  )}
                                </button>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span
                                      onClick={() => handleOpenEditRoom(room)}
                                      className="font-black text-sm text-slate-900 truncate max-w-[180px] sm:max-w-xs inline-block cursor-pointer hover:text-blue-700 hover:underline"
                                      title={`Click to edit "${room.room_category}" details`}
                                    >
                                      {room.room_category}
                                    </span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 shrink-0">
                                      {seasons.length} {seasons.length === 1 ? 'season' : 'seasons'}
                                    </span>
                                  </div>
                                  <div
                                    onClick={() => handleOpenEditRoom(room)}
                                    className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium cursor-pointer hover:text-slate-800 truncate"
                                    title="Click to edit occupancy / inventory"
                                  >
                                    <span className="truncate">👥 {room.max_occupancy || '2A + 1C'}</span>
                                    <span>•</span>
                                    <span className="shrink-0">🚪 {room.total_inventory || 10} rms</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Summary Window */}
                            <td className="py-3 px-3 sm:px-4 text-slate-500 font-medium min-w-[200px] lg:min-w-0">
                              <span className="text-slate-400 italic truncate block">
                                {isExpanded ? 'Seasonal rates listed below ↓' : 'Click [+] to expand seasonal rates'}
                              </span>
                            </td>

                            {/* Empty space for EP on parent row */}
                            {visibleMealPlans.includes('EP') && <td className="py-3 px-2 sm:px-3 lg:px-2 bg-blue-50/20"></td>}

                            {/* Starting Rate Summary with Quick Inline Edit under CP (Breakfast / Base B2B Tariff) */}
                            {visibleMealPlans.includes('CP') && (
                              <td className="py-2.5 px-2 sm:px-3 lg:px-2 text-right bg-emerald-50/20">
                                <div 
                                  className="inline-flex items-center justify-end gap-1 bg-white border border-emerald-300 hover:border-emerald-400 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 rounded-lg px-2 py-1 shadow-2xs transition-all ml-auto"
                                  title="Quick edit room CP base tariff (updates seasonal rates proportionally)"
                                >
                                  <span className="text-[11px] font-bold text-emerald-600">₹</span>
                                  <input
                                    type="number"
                                    step={100}
                                    defaultValue={room.base_b2b_rate || seasons[0]?.cp_rate || seasons[0]?.base_rate || 3000}
                                    onBlur={(e) => {
                                      const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                      if (val !== room.base_b2b_rate) {
                                        handleQuickUpdateRate(selectedHotel.id, room.id, val);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.currentTarget.blur();
                                      }
                                    }}
                                    className="w-20 text-right text-xs font-black text-emerald-950 focus:outline-hidden"
                                  />
                                </div>
                              </td>
                            )}

                            {visibleMealPlans.includes('MAP') && <td className="py-3 px-2 sm:px-3 lg:px-2 bg-amber-50/20"></td>}
                            {visibleMealPlans.includes('AP') && <td className="py-3 px-2 sm:px-3 lg:px-2 bg-purple-50/20"></td>}
                            {showExtraBeds && (
                              <>
                                <td className="py-3 px-2 sm:px-2.5 bg-slate-50/30"></td>
                                <td className="py-3 px-2 sm:px-2.5 bg-slate-50/30"></td>
                              </>
                            )}

                            {/* Parent Row Actions */}
                            <td className="py-3 px-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditRoom(room)}
                                  className="p-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                  title={`Edit room category "${room.room_category}"`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSeasonRoomId(room.id);
                                    setFormSeasonBase(String(room.base_b2b_rate));
                                    setFormSeasonCP(String(room.base_b2b_rate));
                                    setFormSeasonMAP(String(room.base_b2b_rate + 900));
                                    setFormSeasonAP(String(room.base_b2b_rate + 1800));
                                    setShowAddSeasonModal(true);
                                  }}
                                  className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                                  title="Add new season bracket to this room"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRoom(selectedHotel.id, room.id, room.room_category)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete room category"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* ======================================== */}
                          {/* CHILD ROWS: Nested Seasonal Date Brackets */}
                          {/* ======================================== */}
                          {isExpanded && seasons.map((season, seasonIdx) => {
                            const isPast = isSeasonBeforeThisMonth(season);

                            // Badge styling by season type
                            const isOffPeak = season.season_name.toLowerCase().includes('off');
                            const isPeak = season.season_name.toLowerCase().includes('peak');
                            const badgeClass = isOffPeak
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : isPeak
                              ? 'bg-amber-100 text-amber-950 border-amber-300'
                              : 'bg-blue-100 text-blue-900 border-blue-300';

                            return (
                              <tr
                                key={season.id}
                                className={`group transition-colors ${
                                  isPast
                                    ? 'bg-slate-100/70 opacity-60 hover:opacity-100 text-slate-400'
                                    : 'hover:bg-slate-50/80 text-slate-800'
                                }`}
                              >
                                {/* Tree Connector & Sub-row indent - Sticky Column 1 */}
                                <td
                                  className={`py-2.5 px-3 sm:px-4 pl-8 sm:pl-10 lg:pl-8 min-w-[260px] lg:min-w-0 sticky left-0 z-10 transition-colors shadow-[1px_0_0_0_#e2e8f0] ${
                                    isPast
                                      ? 'bg-slate-100 group-hover:bg-slate-200/70 text-slate-400'
                                      : 'bg-white group-hover:bg-slate-50 text-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <span className="text-slate-300 font-mono text-sm shrink-0">└─</span>
                                    {isPast ? (
                                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold border border-slate-300 bg-slate-200/90 text-slate-500 uppercase tracking-wider truncate flex items-center gap-1.5">
                                        <span className="line-through">{season.season_name}</span>
                                        <span className="text-[9px] font-black bg-slate-400/30 px-1 py-0.2 rounded text-slate-600">PAST</span>
                                      </span>
                                    ) : (
                                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider truncate ${badgeClass}`}>
                                        {season.season_name}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Seasonal Date Bracket Cell - Click to edit boundaries */}
                                <td className="py-2.5 px-3 sm:px-4 font-bold min-w-[200px] lg:min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingSeasonDate({
                                        hotelId: selectedHotel.id,
                                        roomId: room.id,
                                        seasonId: season.id,
                                        seasonName: season.season_name,
                                        dateBracket: season.date_bracket,
                                      });
                                    }}
                                    className={`group/date flex items-center gap-1.5 px-2 py-1 -ml-2 rounded-lg border border-transparent transition-all cursor-pointer text-left w-full ${
                                      isPast
                                        ? 'hover:bg-slate-200/60 text-slate-400 hover:border-slate-300'
                                        : 'hover:bg-slate-100 hover:border-slate-300 text-slate-700'
                                    }`}
                                    title={isPast ? 'Past season (ended before this month) - Click to adjust dates' : 'Click to adjust season dates and boundaries'}
                                  >
                                    <Calendar className={`w-3.5 h-3.5 shrink-0 transition-colors ${isPast ? 'text-slate-400' : 'text-slate-400 group-hover/date:text-emerald-700'}`} />
                                    <span className={`font-bold truncate ${isPast ? 'text-slate-400 line-through decoration-slate-400' : 'text-slate-800 group-hover/date:text-emerald-950'}`}>
                                      {season.date_bracket}
                                    </span>
                                    {isPast && (
                                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-500 shrink-0 ml-1 border border-slate-300">
                                        Past
                                      </span>
                                    )}
                                    <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover/date:opacity-100 group-hover/date:text-slate-600 transition-opacity ml-auto shrink-0" />
                                  </button>
                                </td>

                                {/* Injected EP Rate */}
                                {visibleMealPlans.includes('EP') && (
                                  <td className={`py-2.5 px-2 sm:px-3 lg:px-2 text-right ${isPast ? 'bg-slate-100/40' : 'bg-blue-50/20'}`}>
                                    <input
                                      type="number"
                                      value={season.ep_rate || Math.round(season.base_rate * 0.9)}
                                      data-rate-input="true"
                                      data-room-id={room.id}
                                      data-season-idx={seasonIdx}
                                      data-col-key="ep_rate"
                                      onKeyDown={(e) => handleRateInputKeyDown(e, room.id, seasonIdx, 'ep_rate')}
                                      onChange={(e) => {
                                        handleSaveInlineRate(
                                          selectedHotel.id,
                                          room.id,
                                          season.id,
                                          'ep_rate',
                                          parseInt(e.target.value, 10) || 0
                                        );
                                      }}
                                      className={`w-full max-w-[88px] h-8 text-right px-2 font-bold border rounded-lg focus:outline-hidden text-xs shadow-2xs transition-all ml-auto block ${
                                        isPast
                                          ? 'bg-slate-100/90 text-slate-400 border-slate-200 focus:bg-white focus:text-blue-950 focus:ring-2 focus:ring-[#0B2545]'
                                          : 'text-blue-950 bg-white border-blue-200 focus:ring-2 focus:ring-[#0B2545]'
                                      } ${
                                        lastSavedCellKey === `${season.id}-ep_rate`
                                          ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/40'
                                          : ''
                                      }`}
                                    />
                                  </td>
                                )}

                                {/* Injected CP Rate */}
                                {visibleMealPlans.includes('CP') && (
                                  <td className={`py-2.5 px-2 sm:px-3 lg:px-2 text-right ${isPast ? 'bg-slate-100/40' : 'bg-emerald-50/20'}`}>
                                    <input
                                      type="number"
                                      value={season.cp_rate || season.base_rate}
                                      data-rate-input="true"
                                      data-room-id={room.id}
                                      data-season-idx={seasonIdx}
                                      data-col-key="cp_rate"
                                      onKeyDown={(e) => handleRateInputKeyDown(e, room.id, seasonIdx, 'cp_rate')}
                                      onChange={(e) => {
                                        handleSaveInlineRate(
                                          selectedHotel.id,
                                          room.id,
                                          season.id,
                                          'cp_rate',
                                          parseInt(e.target.value, 10) || 0
                                        );
                                      }}
                                      className={`w-full max-w-[88px] h-8 text-right px-2 font-black border rounded-lg focus:outline-hidden text-xs shadow-2xs transition-all ml-auto block ${
                                        isPast
                                          ? 'bg-slate-100/90 text-slate-400 border-slate-200 focus:bg-white focus:text-emerald-950 focus:ring-2 focus:ring-emerald-700'
                                          : 'text-emerald-950 bg-white border-emerald-300 focus:ring-2 focus:ring-emerald-700'
                                      } ${
                                        lastSavedCellKey === `${season.id}-cp_rate`
                                          ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/40'
                                          : ''
                                      }`}
                                    />
                                  </td>
                                )}

                                {/* Injected MAP Rate */}
                                {visibleMealPlans.includes('MAP') && (
                                  <td className={`py-2.5 px-2 sm:px-3 lg:px-2 text-right ${isPast ? 'bg-slate-100/40' : 'bg-amber-50/20'}`}>
                                    <input
                                      type="number"
                                      value={season.map_rate || season.base_rate + 900}
                                      data-rate-input="true"
                                      data-room-id={room.id}
                                      data-season-idx={seasonIdx}
                                      data-col-key="map_rate"
                                      onKeyDown={(e) => handleRateInputKeyDown(e, room.id, seasonIdx, 'map_rate')}
                                      onChange={(e) => {
                                        handleSaveInlineRate(
                                          selectedHotel.id,
                                          room.id,
                                          season.id,
                                          'map_rate',
                                          parseInt(e.target.value, 10) || 0
                                        );
                                      }}
                                      className={`w-full max-w-[88px] h-8 text-right px-2 font-bold border rounded-lg focus:outline-hidden text-xs shadow-2xs transition-all ml-auto block ${
                                        isPast
                                          ? 'bg-slate-100/90 text-slate-400 border-slate-200 focus:bg-white focus:text-amber-950 focus:ring-2 focus:ring-amber-700'
                                          : 'text-amber-950 bg-white border-amber-300 focus:ring-2 focus:ring-amber-700'
                                      } ${
                                        lastSavedCellKey === `${season.id}-map_rate`
                                          ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/40'
                                          : ''
                                      }`}
                                    />
                                  </td>
                                )}

                                {/* Injected AP Rate */}
                                {visibleMealPlans.includes('AP') && (
                                  <td className={`py-2.5 px-2 sm:px-3 lg:px-2 text-right ${isPast ? 'bg-slate-100/40' : 'bg-purple-50/20'}`}>
                                    <input
                                      type="number"
                                      value={season.ap_rate || season.base_rate + 1800}
                                      data-rate-input="true"
                                      data-room-id={room.id}
                                      data-season-idx={seasonIdx}
                                      data-col-key="ap_rate"
                                      onKeyDown={(e) => handleRateInputKeyDown(e, room.id, seasonIdx, 'ap_rate')}
                                      onChange={(e) => {
                                        handleSaveInlineRate(
                                          selectedHotel.id,
                                          room.id,
                                          season.id,
                                          'ap_rate',
                                          parseInt(e.target.value, 10) || 0
                                        );
                                      }}
                                      className={`w-full max-w-[88px] h-8 text-right px-2 font-bold border rounded-lg focus:outline-hidden text-xs shadow-2xs transition-all ml-auto block ${
                                        isPast
                                          ? 'bg-slate-100/90 text-slate-400 border-slate-200 focus:bg-white focus:text-purple-950 focus:ring-2 focus:ring-purple-700'
                                          : 'text-purple-950 bg-white border-purple-300 focus:ring-2 focus:ring-purple-700'
                                      } ${
                                        lastSavedCellKey === `${season.id}-ap_rate`
                                          ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/40'
                                          : ''
                                      }`}
                                    />
                                  </td>
                                )}

                                {/* Injected Extra Bed Rates */}
                                {showExtraBeds && (
                                  <>
                                    <td className={`py-2.5 px-2 sm:px-2.5 text-right ${isPast ? 'bg-slate-100/40' : 'bg-slate-50/30'}`}>
                                      <input
                                        type="number"
                                        value={season.extra_adult || 1200}
                                        data-rate-input="true"
                                        data-room-id={room.id}
                                        data-season-idx={seasonIdx}
                                        data-col-key="extra_adult"
                                        onKeyDown={(e) => handleRateInputKeyDown(e, room.id, seasonIdx, 'extra_adult')}
                                        onChange={(e) => {
                                          handleSaveInlineRate(
                                            selectedHotel.id,
                                            room.id,
                                            season.id,
                                            'extra_adult',
                                            parseInt(e.target.value, 10) || 0
                                          );
                                        }}
                                        className={`w-full max-w-[76px] h-7 text-right px-1.5 font-medium border rounded text-xs transition-all ml-auto block ${
                                          isPast
                                            ? 'bg-slate-100/90 text-slate-400 border-slate-200 focus:bg-white focus:text-slate-800'
                                            : 'text-slate-800 bg-white border-slate-200'
                                        } ${
                                          lastSavedCellKey === `${season.id}-extra_adult`
                                            ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/40'
                                            : ''
                                        }`}
                                      />
                                    </td>
                                    <td className={`py-2.5 px-2 sm:px-2.5 text-right ${isPast ? 'bg-slate-100/40' : 'bg-slate-50/30'}`}>
                                      <input
                                        type="number"
                                        value={season.child_with_bed || 800}
                                        data-rate-input="true"
                                        data-room-id={room.id}
                                        data-season-idx={seasonIdx}
                                        data-col-key="child_with_bed"
                                        onKeyDown={(e) => handleRateInputKeyDown(e, room.id, seasonIdx, 'child_with_bed')}
                                        onChange={(e) => {
                                          handleSaveInlineRate(
                                            selectedHotel.id,
                                            room.id,
                                            season.id,
                                            'child_with_bed',
                                            parseInt(e.target.value, 10) || 0
                                          );
                                        }}
                                        className={`w-full max-w-[76px] h-7 text-right px-1.5 font-medium border rounded text-xs transition-all ml-auto block ${
                                          isPast
                                            ? 'bg-slate-100/90 text-slate-400 border-slate-200 focus:bg-white focus:text-slate-800'
                                            : 'text-slate-800 bg-white border-slate-200'
                                        } ${
                                          lastSavedCellKey === `${season.id}-child_with_bed`
                                            ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/40'
                                            : ''
                                        }`}
                                      />
                                    </td>
                                  </>
                                )}

                                {/* Delete Season Bracket Action */}
                                <td className="py-2.5 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSeasonBracket(
                                      selectedHotel.id,
                                      room.id,
                                      season.id,
                                      season.season_name
                                    )}
                                    className="p-1 rounded text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                                    title="Delete this seasonal tariff bracket"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT HOTEL                                  */}
      {/* ======================================================== */}
      {showHotelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#0B2545] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h4 className="font-black text-base">
                  {editingHotel ? 'Edit Property Details' : 'Create New Hotel Property'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowHotelModal(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHotelForm} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Destination *
                </label>
                <select
                  value={formDest}
                  onChange={(e) => setFormDest(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm font-bold text-slate-900"
                >
                  {allDestinations.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hotel Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Amber Dale Luxury Resort"
                  className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0B2545]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Star Rating
                  </label>
                  <select
                    value={formStar}
                    onChange={(e) => setFormStar(e.target.value)}
                    className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm font-bold text-slate-900"
                  >
                    <option value={3}>3 Star</option>
                    <option value={4}>4 Star</option>
                    <option value={5}>5 Star (Luxury)</option>
                    <option value="Heritage">Heritage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Inventory Status
                  </label>
                  <select
                    value={formStatus ? 'active' : 'inactive'}
                    onChange={(e) => setFormStatus(e.target.value === 'active')}
                    className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm font-bold text-slate-900"
                  >
                    <option value="active">Active (Visible)</option>
                    <option value="inactive">Inactive (Hidden)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowHotelModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black text-white bg-[#0B2545] hover:bg-[#07192F] rounded-xl shadow-md cursor-pointer"
                >
                  {editingHotel ? 'Save Changes' : 'Create Hotel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD ROOM CATEGORY                                */}
      {/* ======================================================== */}
      {showAddRoomModal && selectedHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#0B2545] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Bed className="w-5 h-5 text-emerald-400" />
                <h4 className="font-black text-base">Add Room Category</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddRoomModal(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewRoom} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Room Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={formRoomCat}
                  onChange={(e) => setFormRoomCat(e.target.value)}
                  placeholder="e.g. Deluxe Valley View A/C"
                  className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0B2545]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Base B2B Rate (CP) *
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      required
                      min={0}
                      step={50}
                      value={formRoomRate}
                      onChange={(e) => setFormRoomRate(e.target.value)}
                      className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 text-sm font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0B2545]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Total Inventory
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formRoomInventory}
                    onChange={(e) => setFormRoomInventory(e.target.value)}
                    className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Max Occupancy
                </label>
                <input
                  type="text"
                  value={formRoomOccupancy}
                  onChange={(e) => setFormRoomOccupancy(e.target.value)}
                  placeholder="e.g. 2 Adults + 1 Child"
                  className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3.5 text-sm font-medium text-slate-900"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-900 font-medium">
                ✨ Standard Kerala seasons (Off-Peak, Regular, Peak Festive) will be automatically generated from this base tariff.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddRoomModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black text-white bg-[#0B2545] hover:bg-[#07192F] rounded-xl shadow-md cursor-pointer"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD SEASON BRACKET                                */}
      {/* ======================================================== */}
      {showAddSeasonModal && selectedHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#0B2545] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <h4 className="font-black text-base">Add Seasonal Date Tariff</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSeasonModal(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewSeason} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Season Type *
                  </label>
                  <select
                    value={formSeasonName}
                    onChange={(e) => setFormSeasonName(e.target.value)}
                    className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm font-bold text-slate-900"
                  >
                    <option value="Off-Peak (Monsoon)">Off-Peak (Monsoon)</option>
                    <option value="Regular Season">Regular Season</option>
                    <option value="Peak Festive">Peak Festive</option>
                    <option value="High Season">High Season</option>
                    <option value="Super Peak (Xmas/New Year)">Super Peak</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date Bracket Window *
                  </label>
                  <input
                    type="text"
                    required
                    value={formSeasonDates}
                    onChange={(e) => setFormSeasonDates(e.target.value)}
                    placeholder="e.g. 15-Jan to 31-Mar"
                    className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Meal Plan Rates Matrix */}
              <div className="pt-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                  Meal Plan B2B Rates (₹)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-blue-800 block mb-1">EP (Room Only)</label>
                    <input
                      type="number"
                      value={formSeasonEP}
                      onChange={(e) => setFormSeasonEP(e.target.value)}
                      className="w-full h-10 px-2 text-right bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-emerald-800 block mb-1">CP (Breakfast)</label>
                    <input
                      type="number"
                      value={formSeasonCP}
                      onChange={(e) => setFormSeasonCP(e.target.value)}
                      className="w-full h-10 px-2 text-right bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-black text-emerald-950"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-amber-800 block mb-1">MAP (Dinner)</label>
                    <input
                      type="number"
                      value={formSeasonMAP}
                      onChange={(e) => setFormSeasonMAP(e.target.value)}
                      className="w-full h-10 px-2 text-right bg-amber-50 border border-amber-300 rounded-xl text-xs font-bold text-amber-950"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-purple-800 block mb-1">AP (All Meals)</label>
                    <input
                      type="number"
                      value={formSeasonAP}
                      onChange={(e) => setFormSeasonAP(e.target.value)}
                      className="w-full h-10 px-2 text-right bg-purple-50 border border-purple-300 rounded-xl text-xs font-bold text-purple-950"
                    />
                  </div>
                </div>
              </div>

              {/* Extra Bed Rates */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Extra Adult with Bed</label>
                  <input
                    type="number"
                    value={formSeasonExtraAdult}
                    onChange={(e) => setFormSeasonExtraAdult(e.target.value)}
                    className="w-full h-10 px-3 text-right bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Child with Bed</label>
                  <input
                    type="number"
                    value={formSeasonChildBed}
                    onChange={(e) => setFormSeasonChildBed(e.target.value)}
                    className="w-full h-10 px-3 text-right bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddSeasonModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black text-white bg-[#0B2545] hover:bg-[#07192F] rounded-xl shadow-md cursor-pointer"
                >
                  Add Season Bracket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EXCEL IMPORT & PREVIEW                            */}
      {/* ======================================================== */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#0B2545] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h4 className="font-black text-base">Import Hotels & Tariffs Excel</h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setParsedPreview(null);
                }}
                className="text-white/70 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!parsedPreview ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 hover:border-[#0B2545] bg-slate-50 hover:bg-slate-100/70 p-8 rounded-2xl text-center transition-colors cursor-pointer relative">
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelected(file);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-black text-slate-800">
                      Click to choose or drag & drop Excel spreadsheet
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Supports .xlsx, .xls and .csv formatted tariffs
                    </p>
                  </div>

                  {uploadError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={generateHotelExcelTemplate}
                      className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download standard template (.xlsx)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                    <div className="flex items-center gap-2 text-emerald-950 font-black text-sm">
                      <Check className="w-4 h-4 text-emerald-700" />
                      <span>Ready to Import: {parsedPreview.fileName}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-bold text-slate-700">
                      <div>Hotels Detected: <span className="text-slate-900">{parsedPreview.hotels.length}</span></div>
                      <div>Room Types: <span className="text-slate-900">{parsedPreview.totalRooms}</span></div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase text-slate-700 block">
                      Import Strategy
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setImportMode('merge')}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          importMode === 'merge'
                            ? 'bg-[#0B2545] text-white border-[#0B2545]'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <div className="text-xs font-black">Merge with Catalog</div>
                        <div className="text-[10px] opacity-80 mt-0.5">Updates matching & adds new</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setImportMode('replace')}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          importMode === 'replace'
                            ? 'bg-[#0B2545] text-white border-[#0B2545]'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <div className="text-xs font-black">Replace All</div>
                        <div className="text-[10px] opacity-80 mt-0.5">Wipes current and imports fresh</div>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setParsedPreview(null)}
                      className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleCommitImport}
                      className="px-5 py-2.5 text-xs font-black text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-md cursor-pointer"
                    >
                      Confirm & Import {parsedPreview.hotels.length} Properties
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT SEASON DATE RANGE & BOUNDARIES               */}
      {/* ======================================================== */}
      {editingSeasonDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-[#0B2545] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <div>
                  <h4 className="font-black text-base">Adjust Season Window & Dates</h4>
                  <div className="text-[11px] text-emerald-300 font-medium">
                    {editingSeasonDate.seasonName}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSeasonDate(null)}
                className="text-white/70 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Season Tier Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Season Tier Name
                </label>
                <input
                  type="text"
                  value={editingSeasonDate.seasonName}
                  onChange={(e) =>
                    setEditingSeasonDate({ ...editingSeasonDate, seasonName: e.target.value })
                  }
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0B2545] focus:outline-hidden font-bold"
                  placeholder="e.g. Regular Season, Off-Peak, Peak Festive"
                />
              </div>

              {/* Date Window String */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Season Window & Dates *
                </label>
                <input
                  type="text"
                  value={editingSeasonDate.dateBracket}
                  onChange={(e) =>
                    setEditingSeasonDate({ ...editingSeasonDate, dateBracket: e.target.value })
                  }
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0B2545] focus:outline-hidden font-bold text-slate-900"
                  placeholder="e.g. 1-Oct to 19-Dec & 6-Jan to 31-May"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports single ranges (e.g. 01-Jun to 30-Sep) or multi-bracket split periods with &apos;&amp;&apos;.
                </p>
                {isSeasonBeforeThisMonth({ date_bracket: editingSeasonDate.dateBracket }) && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2 mt-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>This season ended before this month (will be displayed greyed out or hidden).</span>
                  </div>
                )}
              </div>

              {/* Quick Kerala Presets */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  Quick Tariff Presets
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Regular Season', dates: '1-Oct to 19-Dec & 6-Jan to 31-May' },
                    { label: 'Off-Peak (Monsoon)', dates: '1-Jun to 30-Sep' },
                    { label: 'Peak Festive (Xmas & New Year)', dates: '20-Dec to 5-Jan' },
                    { label: 'Summer Vacation', dates: '1-Apr to 31-May' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        setEditingSeasonDate({
                          ...editingSeasonDate,
                          seasonName: preset.label,
                          dateBracket: preset.dates,
                        })
                      }
                      className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/60 transition-all text-xs cursor-pointer group"
                    >
                      <div className="font-bold text-slate-800 group-hover:text-emerald-950">
                        {preset.label}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                        {preset.dates}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSeasonDate(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveSeasonDate(
                      editingSeasonDate.hotelId,
                      editingSeasonDate.roomId,
                      editingSeasonDate.seasonId,
                      editingSeasonDate.seasonName,
                      editingSeasonDate.dateBracket
                    );
                    setEditingSeasonDate(null);
                  }}
                  className="px-5 py-2 text-xs font-black text-white bg-[#0B2545] hover:bg-[#07192F] rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Apply Season Dates</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT DESTINATION                            */}
      {/* ======================================================== */}
      {showDestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-[#0B2545] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-5 h-5 text-emerald-400" />
                <h4 className="font-black text-base">
                  {editingDestName ? `Rename Destination "${editingDestName}"` : 'Add New Destination'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowDestModal(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDestForm} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Destination Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={destFormInput}
                  onChange={(e) => setDestFormInput(e.target.value)}
                  placeholder="e.g. Munnar, Alleppey, Wayanad..."
                  className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0B2545] focus:outline-hidden"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {editingDestName
                    ? 'Renaming will automatically update all hotels located under this destination.'
                    : 'The destination will immediately be available for adding hotel properties.'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDestModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black text-white bg-[#0B2545] hover:bg-[#07192F] rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{editingDestName ? 'Save Destination' : 'Add Destination'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT ROOM CATEGORY                                */}
      {/* ======================================================== */}
      {showEditRoomModal && editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-[#0B2545] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Bed className="w-5 h-5 text-emerald-400" />
                <h4 className="font-black text-base">Edit Room Category</h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditRoomModal(false);
                  setEditingRoom(null);
                }}
                className="text-white/70 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRoom} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Room Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={editRoomCat}
                  onChange={(e) => setEditRoomCat(e.target.value)}
                  placeholder="e.g. Deluxe Valley View A/C"
                  className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0B2545]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Base B2B Rate (CP) *
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      required
                      min={0}
                      step={50}
                      value={editRoomBaseRate}
                      onChange={(e) => setEditRoomBaseRate(e.target.value)}
                      className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 text-sm font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0B2545]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Total Inventory
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editRoomInventory}
                    onChange={(e) => setEditRoomInventory(e.target.value)}
                    className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Max Occupancy
                </label>
                <input
                  type="text"
                  value={editRoomOccupancy}
                  onChange={(e) => setEditRoomOccupancy(e.target.value)}
                  placeholder="e.g. 2 Adults + 1 Child"
                  className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3.5 text-sm font-medium text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditRoomModal(false);
                    setEditingRoom(null);
                  }}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black text-white bg-[#0B2545] hover:bg-[#07192F] rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save Room Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
