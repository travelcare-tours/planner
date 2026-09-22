/**
 * Google Sheets Database & Voucher Synchronization Service
 * 
 * Provides centralized storage and auto-sequencing for vouchers/itineraries
 * via a serverless Google Apps Script Web App.
 */

import { TripDetails, StaffUser } from '@/types/itinerary';

// Default configuration key for localStorage
export const STORAGE_KEY_SHEET_URL = 'tct_google_sheet_webapp_url';
export const STORAGE_KEY_LAST_VOUCHER = 'tct_serial_quote_number';
export const STORAGE_KEY_CACHED_VOUCHER_CODE = 'tct_cached_voucher_code';

export interface VoucherSyncResponse {
  success: boolean;
  lastVoucherNumber?: string;
  nextVoucherNumber?: string;
  totalRecords?: number;
  error?: string;
}

export interface SaveVoucherPayload {
  voucherNumber: string;
  guestName: string;
  contactPhone: string;
  duration: string;
  travelDates: string;
  routeSummary: string;
  vehicleType: string;
  hotelStays: string;
  quotedTotal: number;
  netCost: number;
  staffName: string;
  status: string;
  createdAt?: string;
}

/**
 * Retrieve the configured Google Apps Script Web App URL.
 * Checks localStorage first, then environment variable.
 */
export function getGoogleSheetWebAppUrl(): string {
  if (typeof window !== 'undefined') {
    const customUrl = localStorage.getItem(STORAGE_KEY_SHEET_URL);
    if (customUrl && customUrl.trim()) {
      return customUrl.trim();
    }
  }
  return process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEBAPP_URL || '';
}

/**
 * Save or update the Google Apps Script Web App URL in localStorage.
 */
export function setGoogleSheetWebAppUrl(url: string): void {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem(STORAGE_KEY_SHEET_URL, url.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_SHEET_URL);
    }
  }
}

/**
 * Formats a sequence number into the standard Travel Care Tours format:
 * e.g., 197 -> "TCT-2026-Q0197"
 */
export function formatVoucherCode(num: number): string {
  const currentYear = new Date().getFullYear();
  return `TCT-${currentYear}-Q${String(num).padStart(4, '0')}`;
}

/**
 * Parses numeric sequence from a voucher string like "TCT-2026-Q0197" or "TCT-2026-KER-0195"
 */
export function parseVoucherNumber(code: string): number | null {
  if (!code) return null;
  const match = code.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Fetch the latest generated voucher number and compute next sequential number.
 * Fallbacks cleanly to localStorage if network or Google Sheet is unavailable.
 */
export async function fetchLastVoucherNumber(): Promise<{
  lastCode: string;
  nextCode: string;
  isRemote: boolean;
}> {
  const webAppUrl = getGoogleSheetWebAppUrl();

  // Local fallback baseline
  let localNum = 196;
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY_LAST_VOUCHER);
    if (saved) {
      localNum = parseInt(saved, 10) || 196;
    }
  }
  const fallbackLast = formatVoucherCode(localNum);
  const fallbackNext = formatVoucherCode(localNum + 1);

  if (!webAppUrl) {
    return {
      lastCode: fallbackLast,
      nextCode: fallbackNext,
      isRemote: false,
    };
  }

  try {
    const response = await fetch(`${webAppUrl}?action=getLastVoucher&t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data: VoucherSyncResponse = await response.json();
    if (data.success && data.nextVoucherNumber) {
      const parsedNext = parseVoucherNumber(data.nextVoucherNumber);
      if (parsedNext !== null && typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_LAST_VOUCHER, String(parsedNext - 1));
      }
      return {
        lastCode: data.lastVoucherNumber || fallbackLast,
        nextCode: data.nextVoucherNumber,
        isRemote: true,
      };
    }
  } catch (err) {
    console.warn('[Google Sheets Sync] Could not fetch remote voucher number, using local sequence:', err);
  }

  return {
    lastCode: fallbackLast,
    nextCode: fallbackNext,
    isRemote: false,
  };
}

/**
 * Record a generated voucher/quote to the Google Sheet database.
 */
export async function saveVoucherToGoogleSheet(
  trip: TripDetails,
  staffUser: StaffUser | null,
  status: 'Under Review' | 'Quoted' | 'PDF Generated' | 'WhatsApp Shared' | 'Confirmed' = 'Under Review'
): Promise<{ success: boolean; isRemote: boolean; message: string }> {
  // Extract hotel summaries
  const hotelSummary = (trip.accommodations || [])
    .map(a => `${a.destination || 'Destination'}: ${a.hotelName || 'TBD'} (${a.nights || 1}N, ${a.mealPlan || 'CP'})`)
    .join('; ');

  const totalNights = (trip.accommodations || []).reduce((sum, a) => sum + (Number(a.nights) || 1), 0);
  const totalDays = totalNights + 1;

  // Calculate pricing from accommodations and package cost
  const quotedTotal = parseFloat((trip.totalPackageCost || '').replace(/[^\d.]/g, '')) || 0;
  const hotelCost = (trip.accommodations || []).reduce((sum, a) => {
    const price = Number(a.b2bTotal) || (Number(a.b2bPrice || 0) * (Number(a.nights) || 1));
    return sum + price;
  }, 0);
  const netCost = hotelCost + (Number(trip.vehicleCharge) || 0);

  const payload: SaveVoucherPayload = {
    voucherNumber: trip.voucherNumber || formatVoucherCode(197),
    guestName: trip.guestName || 'Valued Guest',
    contactPhone: trip.guestContact || '',
    duration: `${totalNights} Nights / ${totalDays} Days`,
    travelDates: `${trip.pickupDate || 'Start'} to ${trip.dropoffDate || 'End'}`,
    routeSummary: trip.routeSummary || `${trip.pickupLocation} → ${trip.dropoffLocation}`,
    vehicleType: trip.vehicleType || 'Sedan AC',
    hotelStays: hotelSummary,
    quotedTotal: quotedTotal || netCost,
    netCost: netCost,
    staffName: staffUser?.name || 'Senior Tour Consultant',
    status: status,
    createdAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  };

  const webAppUrl = getGoogleSheetWebAppUrl();

  // If no remote URL configured, save sequence locally
  const currentNum = parseVoucherNumber(payload.voucherNumber);
  if (currentNum !== null && typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY_LAST_VOUCHER);
    const existingNum = saved ? parseInt(saved, 10) : 0;
    if (currentNum > existingNum) {
      localStorage.setItem(STORAGE_KEY_LAST_VOUCHER, String(currentNum));
    }
  }

  if (!webAppUrl) {
    return {
      success: true,
      isRemote: false,
      message: `Saved locally (${payload.voucherNumber}). Connect Google Sheet in Settings for cloud sync.`,
    };
  }

  try {
    // Note: Google Apps Script Web App endpoints require sending plain text or no-cors / standard POST
    // We send standard JSON with text/plain content-type to avoid CORS preflight redirection drops
    const response = await fetch(webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        const actionVerb = result.action === 'updated' ? 'Updated in' : 'Logged to';
        return {
          success: true,
          isRemote: true,
          message: `${actionVerb} Google Sheet (${payload.voucherNumber})`,
        };
      }
    }
  } catch (err) {
    console.warn('[Google Sheets Sync] Remote save error:', err);
  }

  return {
    success: true,
    isRemote: false,
    message: `Recorded locally (${payload.voucherNumber}). Network/Sheet sync pending.`,
  };
}
