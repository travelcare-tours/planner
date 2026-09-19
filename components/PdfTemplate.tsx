'use client';

import React, { useState, useEffect } from 'react';
import { 
  Palmtree, 
  MapPin, 
  Calendar, 
  Car, 
  Clock, 
  CheckCircle2, 
  Hotel, 
  Compass, 
  ShieldCheck, 
  Sparkles, 
  QrCode,
  Info,
  ExternalLink,
  ShieldAlert,
  Building2,
  CreditCard
} from 'lucide-react';
import QRCode from 'qrcode';
import { TripDetails } from '@/types/itinerary';
import { COMPANY_DETAILS } from '@/lib/sample-data';
import { TC_LOGO_BASE64 } from '@/lib/logo';

interface PdfTemplateProps {
  trip: TripDetails;
}

// Authentic UPI App Transparent SVG Logos (No white box, no borders)
const UpiLogoBadge = () => (
  <span className="inline-flex items-center" title="UPI (Unified Payments Interface)">
    <svg className="h-4 w-auto" viewBox="0 0 54 18" fill="none">
      <polygon points="11,1 4,17 0,17 7,1" fill="#00783E" />
      <polygon points="19,1 12,17 8,17 15,1" fill="#F37021" />
      <text x="22" y="14" fill="#FFFFFF" fontWeight="900" fontSize="13" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.8">UPI</text>
    </svg>
  </span>
);

const GPayLogoBadge = () => (
  <span className="inline-flex items-center" title="Google Pay">
    <svg className="h-4 w-auto" viewBox="0 0 56 18" fill="none">
      <g transform="translate(0, 1)">
        <path d="M15.68 8.18c0-.57-.05-1.11-.14-1.64H8v3.09h4.3a3.68 3.68 0 0 1-1.6 2.41v2.01h2.59c1.52-1.4 2.39-3.46 2.39-5.87z" fill="#4285F4"/>
        <path d="M8 16c2.16 0 3.97-.71 5.3-1.95l-2.59-2.01c-.72.48-1.64.76-2.71.76-2.08 0-3.84-1.4-4.47-3.32H.9v2.07C2.21 14.15 4.9 16 8 16z" fill="#34A853"/>
        <path d="M3.53 9.48c-.16-.48-.25-1-.25-1.48s.09-1 .25-1.48V4.45H.9A7.996 7.996 0 0 0 0 8c0 1.29.31 2.51.9 3.55l2.63-2.07z" fill="#FBBC04"/>
        <path d="M8 3.18c1.17 0 2.23.4 3.06 1.2l2.29-2.3C11.97.79 10.16 0 8 0 4.9 0 2.21 1.85.9 4.45l2.63 2.07C4.16 4.58 5.92 3.18 8 3.18z" fill="#EA4335"/>
      </g>
      <text x="19" y="13.5" fill="#FFFFFF" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="12" letterSpacing="-0.2">Pay</text>
    </svg>
  </span>
);

const PhonePeLogoBadge = () => (
  <span className="inline-flex items-center gap-1" title="PhonePe">
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path 
        d="M10.206 9.941h2.949v4.692c-.402.201-.938.268-1.34.268-1.072 0-1.609-.536-1.609-1.743V9.941zm13.47 4.816c-1.523 6.449-7.985 10.442-14.433 8.919C2.794 22.154-1.199 15.691.324 9.243C1.847 2.794 8.309-1.199 14.757.324c6.449 1.523 10.442 7.985 8.919 14.433zm-6.231-5.888a.887.887 0 0 0-.871-.871h-1.609l-3.686-4.222c-.335-.402-.871-.536-1.407-.402l-1.274.401c-.201.067-.268.335-.134.469l4.021 3.82H6.386c-.201 0-.335.134-.335.335v.67c0 .469.402.871.871.871h.938v3.217c0 2.413 1.273 3.82 3.418 3.82.67 0 1.206-.067 1.877-.335v2.145c0 .603.469 1.072 1.072 1.072h.938a.432.432 0 0 0 .402-.402V9.874h1.542c.201 0 .335-.134.335-.335v-.67z" 
        fill="#A855F7"
      />
    </svg>
    <span className="font-bold text-[11px] text-white tracking-tight">Phone<span className="text-purple-300">Pe</span></span>
  </span>
);

const PaytmLogoBadge = () => (
  <span className="inline-flex items-center" title="Paytm">
    <svg className="h-4 w-auto" viewBox="0 0 54 18" fill="none">
      <text x="0" y="14" fill="#00BAF2" fontWeight="900" fontSize="14" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="-0.3">
        Pay<tspan fill="#FFFFFF">tm</tspan>
      </text>
    </svg>
  </span>
);

// Recurring Page Header Component matching official company identity
const PageHeader: React.FC<{ pageNum?: number }> = () => (
  <div className="border-b-2 border-emerald-900 pb-2.5 mb-4 flex items-start justify-between gap-4">
    {/* Left: Travel Care Tours Logo */}
    <div className="flex items-center gap-3">
      <img 
        src={TC_LOGO_BASE64} 
        alt="Travel Care Tours Pvt Ltd" 
        className="h-14 sm:h-16 w-auto object-contain max-h-18"
      />
    </div>

    {/* Right: Company verified address and contacts */}
    <div className="text-right text-xs text-slate-600 space-y-0.5">
      <div className="font-bold text-emerald-950 uppercase tracking-wide text-xs">
        Travel Care Tours Pvt. Ltd.
      </div>
      <div className="text-[10px] text-slate-600 leading-tight">
        Ground Flr, Mannath Bld, 36/267 Seaport-Airport Rd,<br />
        Thrikkakara, Ernakulam, Kerala - 682021
      </div>
      <div className="text-[10px] text-emerald-900 font-medium">
        Ph: <span className="font-bold">+91 91435 43444</span> | +91 91435 43666,  travelcare598@gmail.com
      </div>
    </div>
  </div>
);

// Recurring Page Footer Component with Dynamic Page Numbering
const PageFooter: React.FC<{ currentPage: number; totalPages: number; voucherNumber: string }> = ({ 
  currentPage, 
  totalPages,
  voucherNumber
}) => (
  <div className="mt-auto pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
    <div className="flex items-center gap-2">
      <span className="font-bold text-emerald-900">TRAVEL CARE TOURS PVT LTD</span>
      <span>•</span>
      <span>Quote / Voucher: <strong className="font-mono text-slate-700">{voucherNumber}</strong></span>
    </div>
    <div className="font-semibold text-slate-700">
      Page {currentPage} of {totalPages}
    </div>
    <div>
      Ph: +91 91435 43444 • travelcare598@gmail.com
    </div>
  </div>
);

export const PdfTemplate: React.FC<PdfTemplateProps> = ({ trip }) => {
  const quoteRef = trip.voucherNumber || 'TCT-2026-Q0196';

  // State for dynamic QR code generation
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Numerical pricing calculations with strict validator logic:
  // Parse net amount properly (handling decimals .00 without multiplying by 100)
  const parseCostToNumber = (val?: string): number => {
    if (!val) return 81000;
    const cleaned = val.replace(/[₹,\s]/g, '').trim();
    const match = cleaned.match(/\d+(\.\d+)?/);
    if (!match) return 81000;
    const num = parseFloat(match[0]);
    return isNaN(num) || num <= 0 ? 81000 : Math.round(num);
  };

  const netAmount = parseCostToNumber(trip.totalPackageCost);
  // Strict validator strain: Advance amount (70%) MUST always be strictly less than Net amount
  const advance70 = Math.min(Math.round(netAmount * 0.70), netAmount > 0 ? netAmount - 1 : 0);
  const balancePayable = Math.max(0, netAmount - advance70);
  const advance100 = netAmount;

  // Statutory UPI limit: UPI transactions are capped at ₹ 1,00,000 (1 Lakh).
  // If the advance amount or net amount exceeds 1 Lakh, hide QR and UPI pay button.
  const isUpiEligible = advance70 < 100000 && netAmount <= 100000;

  const upiId = 'Vyapar.175694334138@hdfcbank';
  const payeeName = 'TRAVEL CARE TOURS PVT LTD';
  // Deep-link URI for UPI payment with prefilled payee and advance amount
  const upiPayLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${advance70}&cu=INR&tn=${encodeURIComponent(`Booking Advance ${quoteRef}`)}`;

  useEffect(() => {
    if (!isUpiEligible) return;
    let isMounted = true;
    QRCode.toDataURL(upiPayLink, {
      width: 500,
      margin: 1,
      color: { dark: '#064e3b', light: '#ffffff' },
    })
      .then((url) => {
        if (isMounted) setQrCodeDataUrl(url);
      })
      .catch((err) => {
        console.warn('QR Code generation fallback:', err);
        if (isMounted) {
          setQrCodeDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(upiPayLink)}`);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [upiPayLink, isUpiEligible]);

  // Dynamic header font size calculation based on length of Trip Title
  // Ensures it always fits cleanly within document width without breaking A4 page layout
  const rawTripTitle = trip.tripTitle?.trim() || 'Signature Kerala Tour Package';
  const getDynamicTripTitleStyle = (title: string): React.CSSProperties => {
    const len = title.length;
    if (len > 80) {
      return { fontSize: '15px', lineHeight: '1.2' };
    } else if (len > 55) {
      return { fontSize: '18px', lineHeight: '1.22' };
    } else if (len > 38) {
      return { fontSize: '21px', lineHeight: '1.25' };
    } else if (len > 24) {
      return { fontSize: '25px', lineHeight: '1.25' };
    } else {
      return { fontSize: '28px', lineHeight: '1.2' };
    }
  };
  const dynamicTripTitleStyle = getDynamicTripTitleStyle(rawTripTitle);

  // Chunk days into groups of 2 for strict A4 non-overflowing pagination
  const dayChunks: (typeof trip.days)[] = [];
  if (trip.days && trip.days.length > 0) {
    for (let i = 0; i < trip.days.length; i += 2) {
      dayChunks.push(trip.days.slice(i, i + 2));
    }
  } else {
    dayChunks.push([]);
  }

  const itineraryPagesCount = Math.max(1, dayChunks.length);
  // Total pages = Cover (1) + Hotels (1) + Itinerary (N) + Commercials (1) + Terms (1) + Bank/Payment (1) + Travel Tips/About Us (1)
  const totalPages = 2 + itineraryPagesCount + 4;

  let pageCounter = 1;

  return (
    <div 
      id="pdf-template-container"
      className="pdf-template-container w-[210mm] mx-auto bg-white text-slate-900 font-sans print:p-0 print:m-0 print:w-[210mm]"
      style={{ width: '210mm', maxWidth: '210mm', aspectRatio: '1/1.414', objectFit: 'contain' }}
    >
      {/* =========================================================================
          PAGE 1: SECTION 1 - COVER / TITLE PAGE
          ========================================================================= */}
      <div 
        id="pdf-page-1"
        className="pdf-page-container w-[210mm] min-h-[297mm] max-h-[297mm] h-[297mm] p-[12mm_16mm] flex flex-col justify-between bg-white border border-slate-200 print:border-0 shadow-lg print:shadow-none mb-8 print:mb-0 box-border shrink-0 relative overflow-hidden"
        style={{ width: '210mm', height: '297mm', minHeight: '297mm', maxHeight: '297mm', aspectRatio: '1/1.414', objectFit: 'contain', padding: '12mm 16mm', boxSizing: 'border-box' }}
      >
        <div className="flex flex-col">
          <PageHeader pageNum={pageCounter} />

          {/* Hero Banner with Kerala Palette */}
          <div className="relative rounded-2xl bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white p-6 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-emerald-950 uppercase tracking-widest shadow-2xs">
                <Compass className="w-3 h-3 text-emerald-950" />
                Section 1: Tour Overview & Quotation Voucher
              </span>
              <span className="text-xs font-mono text-emerald-200 font-bold bg-white/10 px-2.5 py-0.5 rounded">
                Ref: {quoteRef}
              </span>
            </div>

            <h1 
              id="pdf-trip-title"
              className="font-black tracking-tight text-white mb-2"
              style={dynamicTripTitleStyle}
            >
              {rawTripTitle}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-200 pt-2.5 border-t border-emerald-800/80">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-300" />
                <span className="font-bold text-white">{trip.durationDays} Days / {trip.durationNights} Nights</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                <span>{trip.pickupDate} to {trip.dropoffDate}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-emerald-300" />
                <span>{trip.vehicleType}</span>
              </div>
            </div>
          </div>

          {/* Guest Greeting Card */}
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2.5">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Prepared Exclusively For</span>
                <h2 className="text-lg font-bold text-slate-900">{trip.guestName || 'Valued Guest'}</h2>
              </div>
              <div className="text-right text-xs text-slate-600">
                <div>
                  Pax: <strong className="text-slate-900">
                    {trip.adultsCount} Adults {trip.childrenCount > 0 ? `+ ${trip.childrenCount} Child${trip.childrenAges ? ` (${trip.childrenAges})` : ''}` : ''}
                  </strong>
                </div>
                {trip.guestContact && <div>Contact: <span className="font-mono text-slate-800">{trip.guestContact}</span></div>}
              </div>
            </div>

            <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
              Dear Guest, Greetings from <strong>Travel Care Tours Pvt Ltd</strong>. We are pleased to present your tailor-made holiday itinerary across Kerala. Every drive, scenic stop, and hand-picked resort has been curated to provide an unforgettable journey amidst the mist-clad hills, fragrant spice plantations, and tranquil backwaters of God’s Own Country.
            </p>
          </div>

          {/* Unified Scenic Route Corridor & Overnight Stays Plan */}
          <div className="mt-4 border border-emerald-900/20 rounded-xl p-4 bg-gradient-to-br from-white via-emerald-50/20 to-slate-50 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
              <div className="text-[11px] font-bold text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-700" />
                Scenic Tour Corridor & Overnight Circuit
              </div>
              <div className="text-[10px] text-emerald-800 font-bold bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                {trip.durationDays} Days • {trip.durationNights} Nights Private Circuit
              </div>
            </div>

            {/* Route Breadcrumb & Chauffeur Hubs */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="sm:col-span-7 bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs">
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Route Corridor</div>
                <div className="font-semibold text-slate-800 leading-snug text-xs">
                  {trip.routeSummary || `${trip.pickupLocation} → Munnar → Thekkady → Alleppey → ${trip.dropoffLocation}`}
                </div>
              </div>

              <div className="sm:col-span-5 bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs">
                <div className="text-[10px] uppercase font-bold text-teal-700 mb-1 flex items-center gap-1">
                  <Car className="w-3 h-3" />
                  Chauffeur & Transfers
                </div>
                <div className="text-[11px] text-slate-700 space-y-0.5">
                  <div>Pickup: <strong className="text-slate-900">{trip.pickupLocation}</strong> ({trip.pickupDate})</div>
                  <div>Drop-off: <strong className="text-slate-900">{trip.dropoffLocation}</strong> ({trip.dropoffDate})</div>
                </div>
              </div>
            </div>

            {/* Overnight Stays Schedule */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Overnight Stay Schedule
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {trip.accommodations.map((acc, i) => (
                  <div key={acc.id ? `${acc.id}-${i}` : `acc-${i}`} className="bg-white border border-emerald-200/80 rounded-lg p-2 shadow-2xs">
                    <div className="text-[10px] text-emerald-800 font-bold uppercase">{acc.nights} Night{acc.nights > 1 ? 's' : ''}</div>
                    <div className="font-bold text-slate-900 truncate text-xs">{acc.destination}</div>
                    <div className="text-[10px] text-slate-600 truncate">{acc.hotelName || 'Standard 3★/4★ Hotel'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <PageFooter currentPage={pageCounter++} totalPages={totalPages} voucherNumber={quoteRef} />
      </div>

      {/* =========================================================================
          PAGE 2: SECTION 2 - ACCOMMODATION TABLE
          ========================================================================= */}
      <div 
        id="pdf-page-2"
        className="pdf-page-container w-[210mm] min-h-[297mm] max-h-[297mm] h-[297mm] p-[12mm_16mm] flex flex-col justify-between bg-white border border-slate-200 print:border-0 shadow-lg print:shadow-none mb-8 print:mb-0 box-border shrink-0 relative overflow-hidden"
        style={{ width: '210mm', height: '297mm', minHeight: '297mm', maxHeight: '297mm', aspectRatio: '1/1.414', objectFit: 'contain', padding: '12mm 16mm', boxSizing: 'border-box' }}
      >
        <div className="flex flex-col">
          <PageHeader pageNum={pageCounter} />

          <div className="mb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold mb-1.5">
              <Hotel className="w-3.5 h-3.5 text-emerald-800" />
              Section 2: Handcrafted Accommodations
            </div>
            <h2 className="text-xl font-bold text-slate-900">Hotel & Resort Reservation Schedule</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Confirmed stay arrangements booked and voucher-validated by Travel Care Tours Pvt Ltd.
            </p>
          </div>

          {/* Accommodation Table without Status and Meal Plan */}
          <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs mb-3.5">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-emerald-900 text-white font-semibold">
                  <th className="py-2.5 px-3 text-left">Destination</th>
                  <th className="py-2.5 px-3 text-left">Hotel / Resort Name</th>
                  <th className="py-2.5 px-3 text-left">Room Category</th>
                  <th className="py-2.5 px-3 text-center">Check-In Date</th>
                  <th className="py-2.5 px-3 text-center">Nights</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trip.accommodations.map((acc, index) => (
                  <tr key={acc.id ? `${acc.id}-${index}` : `acc-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                    <td className="py-2.5 px-3 font-bold text-emerald-950">
                      {acc.destination}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {acc.hotelName || 'Selected Property'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {acc.roomCategory || 'Deluxe Room'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium text-slate-600 whitespace-nowrap">
                      {acc.checkInDate || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-900">
                      {acc.nights} Night{acc.nights > 1 ? 's' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Standalone Reservation Status & Meal Plan Overview Cards */}
          <div className="grid grid-cols-2 gap-3.5 mb-3.5">
            <div className="bg-amber-50/60 border border-amber-200/90 rounded-xl p-3 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">Booking Status</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-950 border border-amber-300">
                  {trip.bookingStatus || 'Under Review'}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 mb-0.5">Status: Under Review (Proposed Quotation)</h4>
              <p className="text-[10.5px] text-slate-600 leading-relaxed">
                Hotels and room types are proposed based on current availability. Final confirmed vouchers are issued immediately upon receipt of the advance payment.
              </p>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200/90 rounded-xl p-3 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">Meal Plan Basis</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-950 border border-emerald-300">
                  CP & AP
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 mb-0.5">Buffet Breakfast + Full Meals on Cruise</h4>
              <p className="text-[10.5px] text-slate-600 leading-relaxed">
                Daily buffet breakfast (CP) is included at all resort and hotel stays. Alleppey Houseboat stay includes all meals (Lunch, Evening Tea/Snacks, Dinner, Breakfast - AP).
              </p>
            </div>
          </div>

          {/* Meal Plan & Check-in Notes */}
          <div className="grid grid-cols-2 gap-3.5 mt-2">
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-700" />
                Meal Plan Glossary
              </h4>
              <ul className="text-[11px] text-slate-600 space-y-1">
                <li>• <strong>CP (Continental Plan):</strong> Room with daily buffet breakfast at the hotel.</li>
                <li>• <strong>MAP (Modified American Plan):</strong> Room with breakfast and choice of lunch or dinner.</li>
                <li>• <strong>AP (American Plan):</strong> All meals (Breakfast, lunch, evening tea & dinner). Standard on Houseboats.</li>
              </ul>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-700" />
                Hotel Timings & Guidelines
              </h4>
              <ul className="text-[11px] text-slate-600 space-y-1">
                <li>• Standard Check-in time: <strong>14:00 hrs (2:00 PM)</strong>. Check-out: <strong>11:00 AM</strong>.</li>
                <li>• Houseboat boarding at Alleppey: <strong>12:00 Noon</strong>; checkout next day <strong>09:00 AM</strong>.</li>
                <li>• Valid photo ID with address required for all adult guests at check-in.</li>
              </ul>
            </div>
          </div>

          {/* Chauffeur Vehicle Banner */}
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-950 text-white flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Car className="w-5 h-5 text-emerald-300 shrink-0" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">Exclusive AC Cab For Tour Circuit</div>
                <div className="text-sm font-bold text-white">{trip.vehicleType}</div>
              </div>
            </div>
            <div className="text-right text-[11px] text-emerald-200 max-w-xs">
              Dedicated Chauffeur • AC On throughout • Tolls, parking, fuel & driver allowances included
            </div>
          </div>
        </div>

        <PageFooter currentPage={pageCounter++} totalPages={totalPages} voucherNumber={quoteRef} />
      </div>

      {/* =========================================================================
          PAGES 3 to N: SECTION 3 - DAY-BY-DAY SCENIC ITINERARY (DYNAMICALLY PAGINATED)
          ========================================================================= */}
      {dayChunks.map((chunk, chunkIndex) => (
        <div 
          key={`day-chunk-${chunkIndex}`}
          id={`pdf-page-itinerary-${chunkIndex + 1}`}
          className="pdf-page-container w-[210mm] min-h-[297mm] max-h-[297mm] h-[297mm] p-[12mm_16mm] flex flex-col justify-between bg-white border border-slate-200 print:border-0 shadow-lg print:shadow-none mb-8 print:mb-0 box-border shrink-0 relative overflow-hidden"
          style={{ width: '210mm', height: '297mm', minHeight: '297mm', maxHeight: '297mm', aspectRatio: '1/1.414', objectFit: 'contain', padding: '12mm 16mm', boxSizing: 'border-box' }}
        >
          <div className="flex flex-col">
            <PageHeader pageNum={pageCounter} />

            <div className="mb-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-bold mb-0.5">
                <Compass className="w-3 h-3 text-emerald-800" />
                Section 3: Day-by-Day Scenic Journey {dayChunks.length > 1 ? `(Part ${chunkIndex + 1})` : ''}
              </div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Customized Sightseeing & Daily Schedule</h2>
            </div>

            {/* Days in this page chunk (2 days per page - calibrated for exact A4 fit) */}
            <div className="space-y-2.5">
              {chunk.map((day) => {
                const selectedActs = day.activities ? day.activities.filter((a) => a.isSelected) : [];

                return (
                  <div key={day.dayNumber} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    {/* Day Header */}
                    <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-900 text-white font-bold text-[11px]">
                          Day {day.dayNumber}
                        </span>
                        <span className="font-bold text-xs text-slate-900 truncate max-w-[280px]">{day.title}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                        <span className="font-semibold text-slate-700">{day.date}</span> • Stay: <strong className="text-emerald-900">{day.overnightStay}</strong>
                      </div>
                    </div>

                    <div className="p-2.5 space-y-2">
                      {/* Narrative summary */}
                      {day.summary && (
                        <p className="text-[10.5px] text-slate-600 leading-snug italic bg-emerald-50/40 px-2 py-1 rounded-md border border-emerald-100/60 line-clamp-2">
                          {day.summary}
                        </p>
                      )}

                      {/* Selected Activities in Single Column Layout */}
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span>Sightseeing Highlights ({selectedActs.length})</span>
                          <span className="text-emerald-700 font-semibold">Meals: {day.mealsIncluded}</span>
                        </div>

                        {selectedActs.length === 0 ? (
                          <p className="text-[10.5px] text-slate-400 italic">Day reserved at leisure / scenic road travel relaxation.</p>
                        ) : (
                          <div className="grid grid-cols-1 gap-1.5">
                            {selectedActs.slice(0, 4).map((act) => (
                              <div key={act.id} className="bg-slate-50/70 border border-slate-200/80 rounded-lg px-2.5 py-1.5 shadow-2xs flex items-start gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-[11px] text-slate-900 leading-tight">
                                    {act.title}
                                  </div>
                                  {act.description && (
                                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 leading-snug">
                                      {act.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <PageFooter currentPage={pageCounter++} totalPages={totalPages} voucherNumber={quoteRef} />
        </div>
      ))}

      {/* =========================================================================
          SECTION 4: SCENIC HIGHLIGHTS - TEMPORARILY HIDDEN PER REQUEST
          ========================================================================= */}
      {/* 
        Section 4 is temporarily commented out as requested. It will be re-enabled in a future update.
      */}

      {/* =========================================================================
          PAGE (N+2): SECTION 5 - COMMERCIALS & INCLUSIONS
          ========================================================================= */}
      <div 
        id="pdf-page-commercials"
        className="pdf-page-container w-[210mm] min-h-[297mm] max-h-[297mm] h-[297mm] p-[12mm_16mm] flex flex-col justify-between bg-white border border-slate-200 print:border-0 shadow-lg print:shadow-none mb-8 print:mb-0 box-border shrink-0 relative overflow-hidden"
        style={{ width: '210mm', height: '297mm', minHeight: '297mm', maxHeight: '297mm', aspectRatio: '1/1.414', objectFit: 'contain', padding: '12mm 16mm', boxSizing: 'border-box' }}
      >
        <div className="flex flex-col">
          <PageHeader pageNum={pageCounter} />

          <div className="mb-3.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-800" />
              Section 5: Package Commercials & Inclusions
            </div>
            <h2 className="text-xl font-bold text-slate-900">Booking Voucher & Scope of Services</h2>
          </div>

          {/* Voucher Summary Box */}
          <div className="bg-slate-900 text-white rounded-xl p-4 mb-3.5 shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-2.5 mb-2.5">
              <div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Official Voucher / Quote Ref</span>
                <div className="text-lg font-mono font-bold">{quoteRef}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Package Cost (Net)</span>
                <div className="text-2xl font-black text-amber-400">{trip.totalPackageCost}</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-xs text-slate-300">
              <div>
                <span className="text-slate-400 text-[10px] block">Guest Name</span>
                <strong className="text-white truncate block">{trip.guestName || 'Valued Guest'}</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Pax Count</span>
                <strong className="text-white">{trip.adultsCount} Adults {trip.childrenCount > 0 ? `+ ${trip.childrenCount} Child` : ''}</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Advance Received</span>
                <strong className="text-emerald-400 font-semibold">{trip.advancePaid && trip.advancePaid !== '₹ 25,000.00' ? trip.advancePaid : '₹ 0/-'}</strong>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Booking Advance (70%)</span>
                <strong className="text-amber-300">₹ {advance70.toLocaleString('en-IN')}/-</strong>
              </div>
            </div>
          </div>

          {/* Payment Milestone Notice on Voucher */}
          <div className="mb-3 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span><strong>Advance Milestone:</strong> 70% (₹ {advance70.toLocaleString('en-IN')}/-) due on or before 30 days before tour start</span>
            </div>
            <div className="text-[11px] font-bold text-emerald-900">
              Balance (30%): ₹ {balancePayable.toLocaleString('en-IN')}/-
            </div>
          </div>

          {/* Inclusions and Exclusions side by side */}
          <div className="grid grid-cols-2 gap-3.5">
            {/* Inclusions */}
            <div className="border border-emerald-200 bg-emerald-50/20 rounded-xl p-3.5">
              <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                Package Inclusions
              </h3>
              <ul className="text-[11px] text-slate-700 space-y-1.5">
                {trip.inclusions && trip.inclusions.length > 0 ? (
                  trip.inclusions.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold text-xs leading-none">✓</span>
                      <span className="leading-tight">{item}</span>
                    </li>
                  ))
                ) : (
                  <>
                    <li className="flex items-start gap-1.5"><span className="text-emerald-600 font-bold text-xs">✓</span><span>Accommodation as per confirmed schedule with daily breakfast</span></li>
                    <li className="flex items-start gap-1.5"><span className="text-emerald-600 font-bold text-xs">✓</span><span>Exclusive AC vehicle for all transfers and daily sightseeing</span></li>
                    <li className="flex items-start gap-1.5"><span className="text-emerald-600 font-bold text-xs">✓</span><span>Tolls, parking, interstate permit & driver bata included</span></li>
                    <li className="flex items-start gap-1.5"><span className="text-emerald-600 font-bold text-xs">✓</span><span>All applicable hotel and vehicle GST included</span></li>
                  </>
                )}
              </ul>
            </div>

            {/* Exclusions */}
            <div className="border border-slate-200 bg-slate-50/50 rounded-xl p-3.5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                <span className="w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[9px] font-bold">✕</span>
                Package Exclusions
              </h3>
              <ul className="text-[11px] text-slate-600 space-y-1.5">
                {trip.exclusions && trip.exclusions.length > 0 ? (
                  trip.exclusions.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-slate-400 font-bold text-xs leading-none">•</span>
                      <span className="leading-tight">{item}</span>
                    </li>
                  ))
                ) : (
                  <>
                    <li className="flex items-start gap-1.5"><span className="text-slate-400">•</span><span>Airfare or train tickets to / from Kerala</span></li>
                    <li className="flex items-start gap-1.5"><span className="text-slate-400">•</span><span>Monument entrance tickets, safaris, boating & activity fees</span></li>
                    <li className="flex items-start gap-1.5"><span className="text-slate-400">•</span><span>Personal expenses such as laundry, phone calls, beverages & tips</span></li>
                    <li className="flex items-start gap-1.5"><span className="text-slate-400">•</span><span>Any cost arising due to unforeseen flight delays or roadblock</span></li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* Special notes */}
          {trip.specialNotes && (
            <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              <strong>Special Setup & Request:</strong> {trip.specialNotes}
            </div>
          )}
        </div>

        <PageFooter currentPage={pageCounter++} totalPages={totalPages} voucherNumber={quoteRef} />
      </div>

      {/* =========================================================================
          PAGE (N+2): SECTION 6 - OFFICIAL BANK ACCOUNT & PAYMENT COORDINATES
          ========================================================================= */}
      <div 
        id="pdf-page-payment"
        className="pdf-page-container w-[210mm] min-h-[297mm] max-h-[297mm] h-[297mm] p-[12mm_16mm] flex flex-col justify-between bg-white border border-slate-200 print:border-0 shadow-lg print:shadow-none mb-8 print:mb-0 box-border shrink-0 relative overflow-hidden"
        style={{ width: '210mm', height: '297mm', minHeight: '297mm', maxHeight: '297mm', aspectRatio: '1/1.414', objectFit: 'contain', padding: '12mm 16mm', boxSizing: 'border-box' }}
      >
        <div className="flex flex-col">
          <PageHeader pageNum={pageCounter} />

          {/* SECTION 6: BANK ACCOUNT INFORMATION + DYNAMIC UPI PAYMENT */}
          <div className="mb-3.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold mb-1">
              <Building2 className="w-3.5 h-3.5 text-emerald-800" />
              Section 6: Official Bank Account & Payment Coordinates
            </div>
            <h2 className="text-xl font-bold text-slate-900">Remittance & Payment Transfer Coordinates</h2>
          </div>

          <div className="bg-gradient-to-br from-emerald-950 to-slate-900 text-white rounded-xl p-4 shadow-sm mb-4">
            <div className="grid grid-cols-12 gap-4 items-center">
              {/* Bank credentials */}
              <div className="col-span-7 space-y-2.5 text-xs">
                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  Direct RTGS / NEFT / IMPS Bank Details
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-slate-200 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[9px]">Beneficiary Name</span>
                    <strong className="text-white text-xs">{COMPANY_DETAILS.bankDetails.accountName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">Bank Name</span>
                    <strong className="text-white text-xs">{COMPANY_DETAILS.bankDetails.bankName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">Current Account No.</span>
                    <strong className="text-amber-400 font-mono text-xs tracking-wide">{COMPANY_DETAILS.bankDetails.accountNumber}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">IFSC Code</span>
                    <strong className="text-emerald-300 font-mono text-xs">{COMPANY_DETAILS.bankDetails.ifscCode}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">Branch Location</span>
                    <span className="text-white text-xs">{COMPANY_DETAILS.bankDetails.branch}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px]">Account Type</span>
                    <span className="text-white text-xs">{COMPANY_DETAILS.bankDetails.accountType}</span>
                  </div>
                </div>

                {/* Direct Pay Link on the position of official UPI ID & External UPI Badges */}
                <div className="pt-2.5 border-t border-emerald-800/80 space-y-2">
                  {isUpiEligible ? (
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <a
                          href={upiPayLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all hover:scale-[1.02]"
                        >
                          <span>Direct Link to Pay 70% Advance (₹ {advance70.toLocaleString('en-IN')})</span>
                          <ExternalLink className="w-3.5 h-3.5 text-emerald-200" />
                        </a>
                      </div>
                      {/* UPI Logos outside the button - Transparent SVGs */}
                      <div className="flex items-center gap-2.5 flex-wrap pt-1">
                        <span className="text-[10px] text-emerald-300 font-medium">Supported Apps:</span>
                        <UpiLogoBadge />
                        <GPayLogoBadge />
                        <PhonePeLogoBadge />
                        <PaytmLogoBadge />
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-emerald-900/60 border border-emerald-700/60 text-[11px] text-emerald-200">
                      <strong>Payment Mode:</strong> Verified Direct Bank Remittance (NEFT / RTGS / IMPS)
                    </div>
                  )}
                </div>
              </div>

              {/* UPI QR Code OR 1 Lakh Bank Transfer Notice */}
              <div className="col-span-5 bg-white text-slate-900 rounded-xl p-3.5 text-center shadow-xs flex flex-col items-center justify-center min-h-[190px]">
                {isUpiEligible ? (
                  <>
                    <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                      Scan or Tap QR to Pay
                    </div>
                    {qrCodeDataUrl ? (
                      <a 
                        href={upiPayLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block cursor-pointer"
                        title="Click or Tap to Pay Advance via UPI"
                      >
                        <img 
                          src={qrCodeDataUrl} 
                          alt="Scan or Tap UPI QR to Pay Advance" 
                          className="w-28 h-28 object-contain rounded-md border border-emerald-800/20 p-1 mb-1.5 bg-white shadow-2xs hover:scale-105 transition-transform"
                        />
                      </a>
                    ) : (
                      <div className="w-28 h-28 bg-slate-100 rounded-md border border-dashed border-emerald-700 flex flex-col items-center justify-center p-1 mb-1.5">
                        <QrCode className="w-12 h-12 text-emerald-950" />
                        <span className="text-[9px] font-bold text-emerald-900 uppercase">Scan to Pay</span>
                      </div>
                    )}
                    <div className="text-[10px] font-bold text-emerald-900">
                      70% Advance: ₹ {advance70.toLocaleString('en-IN')}/-
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5">
                      Scan or tap with GPay, PhonePe, Paytm or any UPI App
                    </div>
                  </>
                ) : (
                  <div className="p-3 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center mx-auto">
                      <Building2 className="w-5 h-5 text-amber-800" />
                    </div>
                    <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Direct Bank Transfer Only
                    </div>
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      UPI transactions are capped at <strong>₹ 1,00,000</strong> as per statutory banking regulations. Since the tour payment exceeds ₹ 1 Lakh, please remit payment via <strong>NEFT / RTGS / IMPS</strong> using the verified company bank coordinates.
                    </p>
                    <div className="inline-block px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-md text-[10px] font-bold">
                      Account: {COMPANY_DETAILS.bankDetails.accountNumber}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment Policy Milestones & Tariff Notice */}
          <div className="grid grid-cols-2 gap-3.5 text-xs mb-4">
            {/* Payment Policy Milestones */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5">
              <h4 className="font-bold text-emerald-950 uppercase tracking-wide mb-2 flex items-center gap-1.5 text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                Guest Payment Policy & Milestones
              </h4>
              <ul className="text-slate-700 space-y-2 text-[11px] leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-700 font-bold">•</span>
                  <span><strong>On or before 30 days before service starts:</strong> 70% booking advance (<strong>₹ {advance70.toLocaleString('en-IN')}/-</strong>).</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-700 font-bold">•</span>
                  <span><strong>Balance payable on arrival / 10 days before tour:</strong> Remaining 30% (<strong>₹ {balancePayable.toLocaleString('en-IN')}/-</strong>).</span>
                </li>
              </ul>
            </div>

            {/* Room Availability Disclaimer */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5">
              <h4 className="font-bold text-amber-950 uppercase tracking-wide mb-2 flex items-center gap-1.5 text-xs">
                <Info className="w-3.5 h-3.5 text-amber-700" />
                Room Availability & Seasonal Tariff Notice
              </h4>
              <p className="text-slate-700 text-[10.5px] leading-relaxed">
                Resort and houseboat reservations are subject to live inventory. During peak season periods (October to February), rooms cannot be blocked without timely milestone remittance. Early payment guarantees guaranteed room allocation.
              </p>
            </div>
          </div>
        </div>

        <PageFooter currentPage={pageCounter++} totalPages={totalPages} voucherNumber={quoteRef} />
      </div>

      {/* =========================================================================
          PAGE (N+3): SECTION 7 - STANDARD BOOKING TERMS & CANCELLATION GUIDELINES
          ========================================================================= */}
      <div 
        id="pdf-page-terms"
        className="pdf-page-container w-[210mm] min-h-[297mm] max-h-[297mm] h-[297mm] p-[12mm_16mm] flex flex-col justify-between bg-white border border-slate-200 print:border-0 shadow-lg print:shadow-none mb-8 print:mb-0 box-border shrink-0 relative overflow-hidden"
        style={{ width: '210mm', height: '297mm', minHeight: '297mm', maxHeight: '297mm', aspectRatio: '1/1.414', objectFit: 'contain', padding: '12mm 16mm', boxSizing: 'border-box' }}
      >
        <div className="flex flex-col">
          <PageHeader pageNum={pageCounter} />

          <div className="mb-3.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-800" />
              Section 7: Standard Booking Terms & Cancellation Guidelines
            </div>
            <h2 className="text-xl font-bold text-slate-900">Standard Booking Terms & Operational Guidelines</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Transparent terms governing reservations, cancellations, and chauffeur transport coordination.
            </p>
          </div>

          {/* Cancellation Slab Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs mb-3.5">
            <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span>Standard Cancellation Slabs</span>
              <span className="text-[10px] text-slate-500 font-normal">Applicable across all holiday packages</span>
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5 font-semibold">Notice Period Prior to Arrival</th>
                  <th className="py-2.5 px-3.5 font-semibold">Refund Policy / Deductions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2.5 px-3.5 font-semibold text-slate-800">30 or more days prior to check-in</td>
                  <td className="py-2.5 px-3.5 text-emerald-800 font-medium">Full refund less 10% administrative & processing fee</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="py-2.5 px-3.5 font-semibold text-slate-800">15 to 29 days prior to check-in</td>
                  <td className="py-2.5 px-3.5 text-slate-700">50% package retention (50% refund)</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3.5 font-semibold text-slate-800">07 to 14 days prior to check-in</td>
                  <td className="py-2.5 px-3.5 text-slate-700">75% package retention (25% refund)</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="py-2.5 px-3.5 font-semibold text-slate-800">Less than 07 days / No-show</td>
                  <td className="py-2.5 px-3.5 text-rose-700 font-bold">100% retention (No refund admissible)</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Key Guidelines Cards */}
          <div className="grid grid-cols-2 gap-3.5 mb-3.5">
            {/* Houseboat Guidelines */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-700" />
                Houseboat Cruise Regulations
              </h4>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Traditional Alleppey houseboats cruise between <strong>12:00 PM and 5:30 PM</strong>. As per government maritime safety rules, boats anchor overnight from 5:30 PM to 8:00 AM. AC operates from <strong>9:00 PM to 6:00 AM</strong> in Deluxe/Premium categories and 24 hours in Luxury houseboats.
              </p>
            </div>

            {/* Chauffeur Guidelines */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-emerald-700" />
                Chauffeur & Vehicle Guidelines
              </h4>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Your dedicated chauffeur is at your disposal between <strong>08:00 AM and 08:00 PM</strong> daily for scheduled sightseeing. In hill stations like Munnar and Vagamon, night driving after 8:00 PM is restricted due to dense mist and safety regulations.
              </p>
            </div>
          </div>

          {/* Additional Terms & Policies */}
          <div className="grid grid-cols-2 gap-3.5 text-xs">
            {/* Hotel Check-in Policy */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-700" />
                Hotel Check-In & Identification
              </h4>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Standard check-in time is <strong>14:00 hrs (2:00 PM)</strong> and check-out is <strong>11:00 AM</strong>. As per government mandate, all guests (including children) must present valid government photo ID cards (Aadhaar, Passport, Voter ID) upon arrival.
              </p>
            </div>

            {/* Force Majeure & Amendments */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-700" />
                Force Majeure & Route Changes
              </h4>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Travel Care Tours Pvt Ltd is not liable for itinerary disruptions caused by landslides, adverse weather, or technical strikes. In such events, alternative sightseeing and transport corridors will be prioritized for guest comfort.
              </p>
            </div>
          </div>
        </div>

        <PageFooter currentPage={pageCounter++} totalPages={totalPages} voucherNumber={quoteRef} />
      </div>

      {/* =========================================================================
          PAGE (N+4): SECTION 8 - KERALA TRAVEL ESSENTIALS, USEFUL TIPS & ABOUT US
          ========================================================================= */}
      <div 
        id="pdf-page-tips-about"
        className="pdf-page-container w-[210mm] min-h-[297mm] max-h-[297mm] h-[297mm] p-[12mm_16mm] flex flex-col justify-between bg-white border border-slate-200 print:border-0 shadow-lg print:shadow-none mb-8 print:mb-0 box-border shrink-0 relative overflow-hidden"
        style={{ width: '210mm', height: '297mm', minHeight: '297mm', maxHeight: '297mm', aspectRatio: '1/1.414', objectFit: 'contain', padding: '12mm 16mm', boxSizing: 'border-box' }}
      >
        <div className="flex flex-col">
          <PageHeader pageNum={pageCounter} />

          <div className="mb-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold mb-1">
              <Palmtree className="w-3.5 h-3.5 text-emerald-800" />
              Section 8: Kerala Travel Essentials, Useful Tips & About Us
            </div>
            <h2 className="text-xl font-bold text-slate-900">Important Guest Information & Verified Agency Profile</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Essential tips for a smooth holiday experience and official company credentials.
            </p>
          </div>

          {/* 2-Column Balanced Cards */}
          <div className="grid grid-cols-2 gap-3.5 text-xs mb-3.5">
            {/* Packing & Climate Essentials */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Packing & Kerala Essentials
              </h4>
              <ul className="text-slate-600 space-y-1.5 text-[11px] leading-relaxed">
                <li>• <strong>Hill Clothing:</strong> Light woollens or jackets for Munnar & Thekkady (night temperatures dip to 12°C - 15°C).</li>
                <li>• <strong>Footwear:</strong> Comfortable walking shoes or sneakers for tea plantation treks, spice walks, and viewpoints.</li>
                <li>• <strong>Sun & Rain Protection:</strong> Carry an umbrella or light raincoat year-round due to localized tropical mountain showers.</li>
                <li>• <strong>Personal Medications:</strong> Basic motion sickness pills for ghat road travel in Munnar and insect repellent for outdoor visits.</li>
              </ul>
            </div>

            {/* Cultural & Environmental Etiquette */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 text-xs">
                <Compass className="w-3.5 h-3.5 text-teal-700" />
                Cultural & Environmental Guidelines
              </h4>
              <ul className="text-slate-600 space-y-1.5 text-[11px] leading-relaxed">
                <li>• <strong>Temple Attire:</strong> Traditional dress code (Dhoti/Mundu for men; Sarees/Salwars for ladies) is mandatory at heritage temples.</li>
                <li>• <strong>Eco-Friendly Tourism:</strong> Kerala is an ecologically sensitive destination; please minimize single-use plastics in hill stations and backwaters.</li>
                <li>• <strong>Forest & Sanctuary Entry:</strong> Carry valid original ID cards for entry into Periyar Tiger Reserve and Eravikulam National Park.</li>
                <li>• <strong>Local Currency & Digital Pay:</strong> UPI (GPay, PhonePe) and cards are widely accepted, but carry nominal cash for village shops.</li>
              </ul>
            </div>
          </div>

          {/* 24/7 Operations Support & Agency Credentials */}
          <div className="grid grid-cols-2 gap-3.5 text-xs mb-3.5">
            {/* 24/7 Guest Support Desk */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-1.5">
              <h4 className="font-bold text-emerald-950 uppercase tracking-wide flex items-center gap-1.5 text-xs">
                <Info className="w-3.5 h-3.5 text-emerald-700" />
                24/7 Trip Support & Chauffeur Coordination
              </h4>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                Your assigned trip manager will monitor your journey from arrival to airport departure. Driver details, vehicle registration number, and pickup coordinates are sent via WhatsApp 24 hours prior to travel.
              </p>
              <div className="text-[11px] text-emerald-900 font-semibold pt-1">
                24/7 Operations Helpline: <strong>+91 91435 43444</strong>
              </div>
            </div>

            {/* About Travel Care Tours */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-1.5">
              <h4 className="font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 text-xs">
                <Palmtree className="w-3.5 h-3.5 text-emerald-700" />
                About Travel Care Tours Pvt Ltd
              </h4>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Headquartered in Kochi, <strong>TRAVEL CARE TOURS PRIVATE LIMITED</strong> is Kerala&apos;s leading Destination Management Company (DMC), offering premium holiday packages, a private vehicle fleet, and verified resort partners across South India.
              </p>
              <div className="text-[10px] text-slate-500 font-mono pt-0.5">
                CIN: {COMPANY_DETAILS.regNo} • GSTIN: {COMPANY_DETAILS.gstin}
              </div>
            </div>
          </div>

          {/* Final Sign-off Banner */}
          <div className="mt-auto p-4 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white text-center shadow-sm">
            <div className="text-sm font-black uppercase tracking-widest text-amber-300 mb-1">
              We Wish You A Joyful & Memorable Holiday in God&apos;s Own Country!
            </div>
            <p className="text-[11px] text-emerald-100">
              TRAVEL CARE TOURS PVT LTD • Ground Flr, Mannath Bld, 36/267 Seaport-Airport Rd, Thrikkakara, Ernakulam, Kerala - 682021
            </p>
            <div className="text-[10.5px] text-emerald-200 mt-1 font-semibold">
              Web: www.travelcaretours.in • Email: travelcare598@gmail.com • Central Desk: +91 91435 43444
            </div>
          </div>
        </div>

        <PageFooter currentPage={pageCounter++} totalPages={totalPages} voucherNumber={quoteRef} />
      </div>
    </div>
  );
};
