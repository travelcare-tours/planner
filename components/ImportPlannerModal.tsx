'use client';

import React, { useState } from 'react';
import { 
  Upload, 
  FileCode, 
  Check, 
  AlertCircle, 
  ArrowRight,
  Database,
  Sparkles
} from 'lucide-react';
import { TripDetails, DayItinerary, DestinationCatalogItem } from '@/types/itinerary';
import { generateItineraryFromInputs } from '@/lib/itinerary-generator';
import { getTodayFormattedDate, formatTripDate, addDaysToTripDate } from '@/lib/sample-data';

interface ImportPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (importedTrip: TripDetails) => void;
  catalog: DestinationCatalogItem[];
}

export const ImportPlannerModal: React.FC<ImportPlannerModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  catalog,
}) => {
  const [jsonInput, setJsonInput] = useState<string>(`{
  "voucher_no": "TCT-2026-KER-0195",
  "guest_name": "Mr. Nikhil Sharma",
  "guest_phone": "+91 94957 01672",
  "guest_email": "travelcare598@gmail.com",
  "travel_date": "2026-09-19",
  "nights": 6,
  "adults": 2,
  "children": 1,
  "children_ages": "3yr old",
  "vehicle": "01 Sedan",
  "selected_dests": ["Munnar", "Thekkady", "Alleppey", "Kovalam", "Kanyakumari"],
  "total_cost": "₹ 81,000.00"
}`);

  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProcessImport = () => {
    try {
      setError(null);
      const parsed = JSON.parse(jsonInput);

      // Map parsed payload into TripPlannerInputs
      const dests: string[] = parsed.selected_dests || 
        (parsed.route ? parsed.route.split('->').map((s: string) => s.trim()) : ['Munnar', 'Thekkady', 'Alleppey']);

      const generated = generateItineraryFromInputs(
        {
          voucherNumber: parsed.voucher_no || 'TCT-2026-KER-0195',
          guestName: parsed.guest_name || 'Valued Guests',
          guestPhone: parsed.guest_phone || '+91 94477 82828',
          guestEmail: parsed.guest_email || 'travelcare598@gmail.com',
          travelDate: parsed.travel_date || parsed.pickup_date || getTodayFormattedDate(),
          nights: Number(parsed.nights) || 6,
          adults: Number(parsed.adults || parsed.pax_adults) || 2,
          children: Number(parsed.children || parsed.pax_children) || 0,
          childAges: parsed.children_ages ? [3] : [],
          vehicle: parsed.vehicle || '01 Sedan',
          selectedDests: dests,
          totalCost: parsed.total_cost || '₹ 81,000.00',
        },
        catalog
      );

      const newTrip: TripDetails = {
        id: `trip-${Date.now()}`,
        voucherNumber: parsed.voucher_no || 'TCT-2026-KER-0195',
        tripTitle: generated.tripTitle || `KERALA SCENIC ESCAPE`,
        guestName: parsed.guest_name || 'Mr. Nikhil Sharma',
        guestContact: parsed.guest_phone || '+91 94957 01672',
        guestEmail: parsed.guest_email || 'travelcare598@gmail.com',
        adultsCount: Number(parsed.adults || parsed.pax_adults) || 2,
        childrenCount: Number(parsed.children || parsed.pax_children) || 0,
        childrenAges: parsed.children_ages || '',
        durationDays: generated.durationDays || 7,
        durationNights: generated.durationNights || 6,
        pickupDate: generated.pickupDate || getTodayFormattedDate(),
        pickupTime: '09:30 AM',
        pickupLocation: generated.pickupLocation || 'Cochin International Airport (COK)',
        dropoffDate: generated.dropoffDate || formatTripDate(addDaysToTripDate(new Date(), 6)),
        dropoffTime: '05:00 PM',
        dropoffLocation: generated.dropoffLocation || 'Thiruvananthapuram International Airport (TRV)',
        routeSummary: generated.routeSummary || 'Cochin International Airport (COK) → Munnar → Thekkady → Alleppey → Kovalam → Kanyakumari → Thiruvananthapuram International Airport (TRV)',
        vehicleType: parsed.vehicle || '01 Sedan',
        vehicleNotes: 'Dedicated sanitized air-conditioned vehicle with courteous, professional tourist chauffeur. All tolls, parking, interstate road permits, fuel, and driver allowances included throughout the trip.',
        totalPackageCost: parsed.total_cost || '₹ 81,000.00',
        costTerms: 'Total package cost inclusive of private transportation, accommodation, meal plan & mentioned sightseeing.',
        advancePaid: '₹ 25,000.00',
        balancePayable: '₹ 56,000.00',
        bookingStatus: 'Confirmed',
        specialNotes: 'All sightseeing is subject to weather, local regulations, road conditions and attraction operating schedules. Houseboat check-in, cruise duration, meal plan and mooring point depend on the selected operator and operational conditions.',
        inclusions: generated.inclusions || [
          '01 Sanitized AC Vehicle at disposal as per itinerary from arrival to departure',
          'Chauffeur allowances, fuel charges, interstate road taxes, toll gate taxes, and parking fees',
          '02 Nights accommodation at Munnar',
          '01 Night accommodation at Thekkady',
          '01 Night private Premium Houseboat cruise at Alleppey with all meals',
          '02 Nights accommodation at Kovalam',
          'Meal Plan: MAPAI (Breakfast & Dinner) at resorts; all meals on Houseboat',
          '24/7 dedicated Travel Care Tours customer service helpline & local manager support',
        ],
        exclusions: generated.exclusions || [
          'Airfare / Train tickets to and from Kerala',
          'Entry tickets to monuments, Eravikulam National park bus, boat tickets, and elephant activities',
          'Personal expenses such as laundry, phone calls, room service, alcoholic beverages, and tips',
        ],
        accommodations: generated.accommodations || [],
        days: generated.days || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onImportSuccess(newTrip);
      onClose();
    } catch (err: any) {
      setError(`Invalid JSON structure: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="bg-gradient-to-r from-emerald-950 to-teal-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="font-bold text-base">Import Planner Form Data (JSON)</h3>
              <p className="text-xs text-emerald-200">
                Pulls trip payload submitted via travelcaretours.in/planner
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white font-bold text-lg">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            When staff or guests fill the trip inquiry on <strong>travelcaretours.in/planner</strong>, the system emits this JSON payload. Paste the JSON below or use sample data to auto-populate the itinerary and activities instantly:
          </p>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center justify-between">
              <span>JSON Payload</span>
              <span className="text-[10px] text-emerald-700 font-mono">Format: travelcaretours.in/planner v1</span>
            </label>
            <textarea
              rows={12}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-hidden bg-slate-50 text-slate-800"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-[11px] text-slate-500">
              Auto-links with master activities catalog for matching destinations.
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessImport}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <Database className="w-3.5 h-3.5" />
                Import & Generate Itinerary
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
