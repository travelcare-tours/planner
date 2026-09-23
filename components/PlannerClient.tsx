'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Navbar 
} from '@/components/Navbar';
import { 
  TripDetailsForm,
  syncDaysWithAccommodationsAndPickup 
} from '@/components/TripDetailsForm';
import { 
  WhatsappLeadsView 
} from '@/components/WhatsappLeadsView';
import { 
  ActivityManager 
} from '@/components/ActivityManager';
import { 
  DestinationCatalogManager 
} from '@/components/DestinationCatalogManager';
import { 
  PdfTemplate 
} from '@/components/PdfTemplate';
import { 
  AuthModal 
} from '@/components/AuthModal';
import { 
  ImportPlannerModal 
} from '@/components/ImportPlannerModal';
import { 
  IntegrationDocsModal 
} from '@/components/IntegrationDocsModal';
import { parseDateSafe } from '@/components/DatePicker';
import { 
  SAMPLE_TRIP, 
  INITIAL_DESTINATIONS_CATALOG,
  COMPANY_DETAILS,
  applyDynamicTripDates,
  getTodayFormattedDate,
  formatTripDate,
  addDaysToTripDate
} from '@/lib/sample-data';
import { 
  TripDetails, 
  DestinationCatalogItem, 
  StaffUser 
} from '@/types/itinerary';
import { 
  Printer, 
  Download, 
  Share2, 
  Sparkles, 
  FileText, 
  CheckSquare, 
  Eye, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  RefreshCw,
  Copy,
  Check,
  Palmtree,
  ArrowRight,
  Database,
  Table
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { GoogleSheetsModal } from '@/components/GoogleSheetsModal';
import { saveVoucherToGoogleSheet, fetchLastVoucherNumber } from '@/lib/google-sheets-sync';

export interface PlannerClientProps {
  initialTab?: 'whatsapp-leads' | 'editor' | 'activities' | 'catalog' | 'preview' | 'docs';
}

export function PlannerClient({ initialTab = 'whatsapp-leads' }: PlannerClientProps) {
  const [currentTab, setCurrentTab] = useState<'whatsapp-leads' | 'editor' | 'activities' | 'catalog' | 'preview' | 'docs'>(initialTab);
  
  const [trip, setTrip] = useState<TripDetails>(() => {
    if (typeof window !== 'undefined') {
      return applyDynamicTripDates(SAMPLE_TRIP, new Date());
    }
    return SAMPLE_TRIP;
  });
  const [catalog, setCatalog] = useState<DestinationCatalogItem[]>(INITIAL_DESTINATIONS_CATALOG);
  
  // Staff Auth State
  const [staffUser, setStaffUser] = useState<StaffUser | null>({
    id: 'staff-default',
    name: 'Senior Tour Consultant',
    email: 'travelcare598@gmail.com',
    role: 'Staff Planner Specialist',
    isAuthenticated: true,
  });

  // Google Sheets Database state
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState(false);
  const [isSavingSheet, setIsSavingSheet] = useState(false);
  const [previewSaveStatus, setPreviewSaveStatus] = useState<string | null>(null);

  // PDF Preview page navigation & memory tracking
  const [activePreviewPage, setActivePreviewPage] = useState<string>('pdf-page-1');
  const lastViewedVoucherIdRef = useRef<string>(trip.voucherNumber);
  const lastViewedPageIdRef = useRef<string>('pdf-page-1');

  // Smooth scroll to target preview page
  const handleScrollToPreviewPage = (pageId: string) => {
    lastViewedPageIdRef.current = pageId;
    setActivePreviewPage(pageId);
    const target = document.getElementById(pageId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Manual save final voucher to Google Sheet from Preview with status 'Under Review'
  const handleSaveToGoogleSheetFromPreview = async () => {
    setIsSavingSheet(true);
    try {
      const res = await saveVoucherToGoogleSheet(trip, staffUser, 'Under Review');
      setPreviewSaveStatus(res.message);
      setTimeout(() => setPreviewSaveStatus(null), 3500);
    } catch {
      setPreviewSaveStatus('Error saving');
      setTimeout(() => setPreviewSaveStatus(null), 3500);
    } finally {
      setIsSavingSheet(false);
    }
  };

  // Load from localStorage only after initial client mount to avoid SSR hydration mismatch
  useEffect(() => {
    const timer = setTimeout(() => {
      // Check query params if specified
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');
        if (tabParam === 'v1' || tabParam === 'editor') {
          setCurrentTab('editor');
        } else if (tabParam === 'activities') {
          setCurrentTab('activities');
        } else if (tabParam === 'catalog') {
          setCurrentTab('catalog');
        } else if (tabParam === 'preview') {
          setCurrentTab('preview');
        } else if (tabParam === 'whatsapp' || tabParam === 'whatsapp-leads') {
          setCurrentTab('whatsapp-leads');
        }
      }

      try {
        const savedTrip = localStorage.getItem('tct_planner_current_trip');
        if (savedTrip) {
          let parsed = JSON.parse(savedTrip);
          if (parsed.guestName === 'Mr. Nikhil Sharma' || !parsed.guestName) {
            parsed.guestName = 'Valued Guest';
          }
          if (parsed.guestContact === '+91 94957 01672') {
            parsed.guestContact = '';
          }

          // Dynamic Pickup Date Migration:
          // If pickupDate is not set or is the old template date "19th Sept 2026", default to today's date dynamically
          if (!parsed.pickupDate || parsed.pickupDate === '19th Sept 2026') {
            parsed = applyDynamicTripDates(parsed, new Date());
          }

          // If previous accommodations had default MAPAI, update to default CP
          if (Array.isArray(parsed.accommodations)) {
            parsed.accommodations = parsed.accommodations.map((a: any) => {
              if (a.mealPlan === 'MAPAI (Breakfast & Dinner)' && !a.destination?.toLowerCase().includes('alleppey') && !a.hotelName?.toLowerCase().includes('houseboat')) {
                return { ...a, mealPlan: 'CP (Buffet Breakfast)' };
              }
              return a;
            });
          }
          // Migrate previous default locations to new standard defaults
          if (!parsed.pickupLocation || parsed.pickupLocation === 'Kochi Airport (COK)') {
            parsed.pickupLocation = 'Cochin International Airport (COK)';
          }
          if (!parsed.dropoffLocation || parsed.dropoffLocation === 'Kochi / Trivandrum Airport') {
            parsed.dropoffLocation = 'Thiruvananthapuram International Airport (TRV)';
          }
          if (parsed.routeSummary && parsed.routeSummary.includes('Kochi / Trivandrum Airport')) {
            parsed.routeSummary = parsed.routeSummary.replace('Kochi / Trivandrum Airport', 'Thiruvananthapuram International Airport (TRV)');
          }

          // Data Migration:
          // 1. Update Alleppey Houseboat B2B price to ₹ 15,500 if still on older rates
          if (Array.isArray(parsed.accommodations)) {
            parsed.accommodations = parsed.accommodations.map((a: any) => {
              const isHouseboat = a.destination?.toLowerCase().includes('alleppey') || a.hotelName?.toLowerCase().includes('houseboat');
              if (isHouseboat && (a.b2bPrice === 6500 || a.b2bPrice === 7500 || !a.b2bPrice)) {
                return { ...a, b2bPrice: 15500, b2bTotal: 15500 * (Number(a.nights) || 1) };
              }
              return a;
            });

            // 2. Remove redundant 2nd Kovalam row in default 6N itinerary to ensure 5N / 6D default
            const kovalamIndices: number[] = [];
            parsed.accommodations.forEach((item: any, idx: number) => {
              if (item.destination?.toLowerCase().includes('kovalam')) {
                kovalamIndices.push(idx);
              }
            });
            if (kovalamIndices.length > 1 && (parsed.durationNights === 6 || parsed.accommodations.length >= 5)) {
              parsed.accommodations = parsed.accommodations.filter((_: any, idx: number) => idx !== kovalamIndices[1]);
              const totNights = parsed.accommodations.reduce((sum: number, a: any) => sum + (Number(a.nights) || 1), 0);
              const baseDateObj = parseDateSafe(parsed.pickupDate) || new Date();
              parsed.dropoffDate = formatTripDate(addDaysToTripDate(baseDateObj, totNights));
            }

            // 3. Keep days and nights accurately in sync
            const totalNights = parsed.accommodations.reduce((sum: number, a: any) => sum + (Number(a.nights) || 1), 0);
            parsed.durationNights = totalNights;
            parsed.durationDays = totalNights + 1;
            parsed.days = syncDaysWithAccommodationsAndPickup(
              parsed.days || [],
              parsed.accommodations,
              parsed.pickupDate || getTodayFormattedDate(),
              parsed.dropoffLocation || 'Thiruvananthapuram International Airport (TRV)'
            );
          }

          setTrip(parsed);
          try {
            localStorage.setItem('tct_planner_current_trip', JSON.stringify(parsed));
          } catch (err) {}
        } else {
          // Fresh session without saved trip: initialize with today's date dynamically
          setTrip(applyDynamicTripDates(SAMPLE_TRIP, new Date()));
        }
      } catch (e) {}

      try {
        const savedCatalog = localStorage.getItem('tct_destinations_catalog');
        if (savedCatalog) {
          setCatalog(JSON.parse(savedCatalog));
        }
      } catch (e) {}

      try {
        const savedUser = localStorage.getItem('tct_staff_user');
        if (savedUser) {
          setStaffUser(JSON.parse(savedUser));
        }
      } catch (e) {}
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pdfZoom, setPdfZoom] = useState<number>(100);
  const [isSyncingPdf, setIsSyncingPdf] = useState<boolean>(false);
  const [pdfKey, setPdfKey] = useState<number>(0);

  const printRef = useRef<HTMLDivElement>(null);
  const [unscaledPdfHeight, setUnscaledPdfHeight] = useState<number>(() => {
    const daysCount = trip?.days?.length || 5;
    const totalPages = 6 + Math.ceil(daysCount / 2);
    return totalPages * 1155;
  });

  useEffect(() => {
    const el = printRef.current;
    if (!el) return;
    const update = () => {
      if (el) {
        const h = el.scrollHeight || el.offsetHeight;
        if (h > 0) setUnscaledPdfHeight(h);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [trip, pdfKey, currentTab]);

  // Synchronize PDF data directly from current state & storage as a backup
  const handleSyncPdfData = () => {
    setIsSyncingPdf(true);
    try {
      const savedTrip = localStorage.getItem('tct_planner_current_trip');
      let baseTrip = savedTrip ? JSON.parse(savedTrip) : trip;
      const totalNights = (baseTrip.accommodations || []).reduce(
        (sum: number, a: any) => sum + (Number(a.nights) || 1),
        0
      );
      const syncedDays = syncDaysWithAccommodationsAndPickup(
        baseTrip.days || [],
        baseTrip.accommodations || [],
        baseTrip.pickupDate || getTodayFormattedDate(),
        baseTrip.dropoffLocation || 'Thiruvananthapuram International Airport (TRV)'
      );
      const fullySyncedTrip: TripDetails = {
        ...baseTrip,
        durationNights: totalNights,
        durationDays: syncedDays.length,
        days: syncedDays,
      };
      setTrip(fullySyncedTrip);
      try {
        localStorage.setItem('tct_planner_current_trip', JSON.stringify(fullySyncedTrip));
      } catch (err) {}
    } catch (e) {
      const totalNights = trip.accommodations.reduce(
        (sum, a) => sum + (Number(a.nights) || 1),
        0
      );
      const syncedDays = syncDaysWithAccommodationsAndPickup(
        trip.days || [],
        trip.accommodations,
        trip.pickupDate,
        trip.dropoffLocation
      );
      const updated: TripDetails = {
        ...trip,
        durationNights: totalNights,
        durationDays: syncedDays.length,
        days: syncedDays,
      };
      setTrip(updated);
      try {
        localStorage.setItem('tct_planner_current_trip', JSON.stringify(updated));
      } catch (err) {}
    }

    setPdfKey((prev) => prev + 1);
    setTimeout(() => {
      setIsSyncingPdf(false);
    }, 400);
  };

  // Persist trip changes
  const handleUpdateTrip = (updated: TripDetails) => {
    setTrip(updated);
    try {
      localStorage.setItem('tct_planner_current_trip', JSON.stringify(updated));
    } catch (e) {}
  };

  // Persist catalog changes
  const handleUpdateCatalog = (newCatalog: DestinationCatalogItem[]) => {
    setCatalog(newCatalog);
    try {
      localStorage.setItem('tct_destinations_catalog', JSON.stringify(newCatalog));
    } catch (e) {}
  };

  // Staff Login
  const handleLoginSuccess = (user: StaffUser) => {
    setStaffUser(user);
    try {
      localStorage.setItem('tct_staff_user', JSON.stringify(user));
    } catch (e) {}
  };

  // Staff Logout
  const handleLogout = () => {
    setStaffUser(null);
    try {
      localStorage.removeItem('tct_staff_user');
    } catch (e) {}
    setShowAuthModal(true);
  };

  // Preset switch
  const handleLoadPreset = (key: string) => {
    if (key === 'munnar-thekkady-alleppey') {
      handleUpdateTrip(SAMPLE_TRIP);
    } else if (key === 'alleppey-honeymoon') {
      const honeymoonTrip: TripDetails = {
        ...SAMPLE_TRIP,
        id: `trip-honeymoon-${Date.now()}`,
        voucherNumber: 'TCT-2026-HNY-1029',
        tripTitle: 'Romantic Kerala: Backwater Houseboat & Fort Kochi Heritage',
        durationDays: 4,
        durationNights: 3,
        routeSummary: 'Cochin -> Alleppey (2N) -> Fort Kochi (1N) -> Cochin Drop',
        totalPackageCost: '₹ 46,000/-',
        specialNotes: 'Complimentary Honeymoon Cake, Candlelight Dinner on Houseboat & Flower bed arrangement.',
        accommodations: [
          {
            id: 'h-acc-1',
            destination: 'Alleppey',
            hotelName: 'Lakes & Lagoons Luxury Houseboat',
            roomCategory: 'Private 1-Bedroom Honeymoon AC Houseboat',
            checkInDate: '14 Oct 2026',
            nights: 2,
            mealPlan: 'AP (All Meals)',
            status: 'Confirmed',
          },
          {
            id: 'h-acc-2',
            destination: 'Fort Kochi',
            hotelName: 'Brunton Boatyard - CGH Earth',
            roomCategory: 'Sea Facing Heritage Suite',
            checkInDate: '16 Oct 2026',
            nights: 1,
            mealPlan: 'CP (Buffet Breakfast)',
            status: 'Confirmed',
          },
        ],
        days: SAMPLE_TRIP.days.slice(3),
      };
      handleUpdateTrip(honeymoonTrip);
    } else if (key === 'grand-kerala-kanyakumari') {
      const grandTrip: TripDetails = {
        ...SAMPLE_TRIP,
        id: `trip-grand-${Date.now()}`,
        voucherNumber: 'TCT-2026-GRD-5501',
        tripTitle: 'Grand Kerala & Lands End Kanyakumari Expedition',
        durationDays: 8,
        durationNights: 7,
        routeSummary: 'Cochin -> Munnar (2N) -> Thekkady (1N) -> Alleppey (1N) -> Kovalam (2N) -> Kanyakumari (1N) -> Trivandrum',
        totalPackageCost: '₹ 98,500/-',
      };
      handleUpdateTrip(grandTrip);
    }
  };

  const previewScrollContainerRef = useRef<HTMLDivElement>(null);

  // Restore scroll position or reset to beginning when switching to PDF Preview
  useEffect(() => {
    if (currentTab === 'preview') {
      // Check if voucher number has changed
      if (trip.voucherNumber !== lastViewedVoucherIdRef.current) {
        lastViewedVoucherIdRef.current = trip.voucherNumber;
        lastViewedPageIdRef.current = 'pdf-page-1';
        setActivePreviewPage('pdf-page-1');
        // Reset scroll to top (beginning of new voucher)
        window.scrollTo({ top: 0, behavior: 'instant' });
      } else {
        // Same voucher: restore to last viewed page
        const timer = setTimeout(() => {
          const target = document.getElementById(lastViewedPageIdRef.current);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            window.scrollTo({ top: 0, behavior: 'instant' });
          }
        }, 120);
        return () => clearTimeout(timer);
      }
    }
  }, [currentTab, trip.voucherNumber]);

  // Track active page in preview via IntersectionObserver
  useEffect(() => {
    if (currentTab !== 'preview') return;
    const pageIds = [
      'pdf-page-1',
      'pdf-page-2',
      'pdf-page-itinerary-1',
      'pdf-page-commercials',
      'pdf-page-payment',
      'pdf-page-terms',
      'pdf-page-tips-about'
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id) {
            setActivePreviewPage(entry.target.id);
            lastViewedPageIdRef.current = entry.target.id;
          }
        });
      },
      { threshold: 0.3 }
    );

    pageIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [currentTab, pdfKey]);

  // High-Resolution Native Browser Print / Save as PDF
  const triggerNativePrint = () => {
    window.print();
  };

  // Direct PDF File Download using html2canvas & jsPDF with exact A4 proportions
  const downloadPdfFile = async () => {
    if (!printRef.current) return;
    setIsExportingPdf(true);

    try {
      // Find all page containers
      const pageElements = printRef.current.querySelectorAll('.pdf-page-container');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i] as HTMLElement;
        const canvas = await html2canvas(pageEl, {
          scale: 3, // 300 PPI high-definition print resolution
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 1200,
          onclone: (clonedDoc) => {
            // Remove zoom transform on all cloned containers to prevent distorted scales
            const transformedEls = clonedDoc.querySelectorAll('[style*="transform"]');
            transformedEls.forEach((el) => {
              (el as HTMLElement).style.transform = 'none';
            });

            // Ensure cloned page containers strictly adhere to A4 dimensions
            const clonedPages = clonedDoc.querySelectorAll('.pdf-page-container');
            clonedPages.forEach((p) => {
              const htmlP = p as HTMLElement;
              htmlP.style.width = '210mm';
              htmlP.style.maxWidth = '210mm';
              htmlP.style.minHeight = '297mm';
              htmlP.style.maxHeight = '297mm';
              htmlP.style.height = '297mm';
              htmlP.style.aspectRatio = '1 / 1.414';
              htmlP.style.objectFit = 'contain';
              htmlP.style.boxSizing = 'border-box';
              htmlP.style.overflow = 'hidden';
              htmlP.style.transform = 'none';
            });
          },
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) pdf.addPage('a4', 'portrait');

        // A4 standard: 210 x 297 mm - Maintain exact aspect ratio
        const pageWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * pageWidth) / canvas.width;
        const renderHeight = Math.min(pageHeight, imgHeight);

        // Render cleanly within the A4 boundary without distortion
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, renderHeight, undefined, 'FAST');

        // Map all clickable links (such as direct UPI payment links) to interactive PDF annotations
        const pageRect = pageEl.getBoundingClientRect();
        if (pageRect.width > 0 && pageRect.height > 0) {
          const linkElements = pageEl.querySelectorAll('a[href]');
          linkElements.forEach((linkNode) => {
            const linkEl = linkNode as HTMLAnchorElement;
            const href = linkEl.getAttribute('href');
            if (!href || href.startsWith('#')) return;

            const linkRect = linkEl.getBoundingClientRect();
            if (linkRect.width <= 0 || linkRect.height <= 0) return;

            // Compute normalized relative coordinates (invariant to zoom and scroll)
            const leftRatio = (linkRect.left - pageRect.left) / pageRect.width;
            const topRatio = (linkRect.top - pageRect.top) / pageRect.height;
            const widthRatio = linkRect.width / pageRect.width;
            const heightRatio = linkRect.height / pageRect.height;

            const xMm = leftRatio * pageWidth;
            const yMm = topRatio * renderHeight;
            const wMm = widthRatio * pageWidth;
            const hMm = heightRatio * renderHeight;

            if (wMm > 0.5 && hMm > 0.5) {
              pdf.link(xMm, yMm, wMm, hMm, { url: href });
            }
          });

          // Normalize annotation /Rect bounds to fix jsPDF's inverted-Y bug (where finalBounds.y > finalBounds.h)
          // PDF spec ISO 32000-1 requires /Rect [llx lly urx ury] with lly < ury.
          const pageInfo = (pdf.internal as any).getCurrentPageInfo();
          if (pageInfo?.pageContext?.annotations) {
            for (const annot of pageInfo.pageContext.annotations) {
              if (annot.finalBounds) {
                const yVal = parseFloat(annot.finalBounds.y);
                const hVal = parseFloat(annot.finalBounds.h);
                if (yVal > hVal) {
                  const temp = annot.finalBounds.y;
                  annot.finalBounds.y = annot.finalBounds.h;
                  annot.finalBounds.h = temp;
                }
              }
            }
          }
        }
      }

      pdf.save(`TravelCareTours_Itinerary_${trip.voucherNumber || 'TCT-2026-Q0196'}.pdf`);

      // Automatically update/record in Google Sheet with status 'Under Review'
      saveVoucherToGoogleSheet(trip, staffUser, 'Under Review')
        .then((sheetRes) => {
          setPreviewSaveStatus(sheetRes.message);
          setTimeout(() => setPreviewSaveStatus(null), 3500);
        })
        .catch((e) => {
          console.warn('[Google Sheet Sync on PDF Download error]:', e);
        });
    } catch (err) {
      console.error('PDF export error:', err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleFitWidth = () => {
    if (!previewScrollContainerRef.current) {
      setPdfZoom(100);
      return;
    }
    // A4 width in standard screen pixels is 793.7px (~794px)
    const containerWidth = previewScrollContainerRef.current.clientWidth;
    const usableWidth = Math.max(300, containerWidth - 32);
    const calculatedZoom = Math.min(160, Math.max(30, Math.round((usableWidth / 793.7) * 100)));
    setPdfZoom(calculatedZoom);
    if (previewScrollContainerRef.current) {
      previewScrollContainerRef.current.scrollLeft = 0;
    }
  };

  const handleFitHeight = () => {
    // Screen height minus top nav, sticky headers, and margins (~180px)
    const availableHeight = typeof window !== 'undefined' ? window.innerHeight - 180 : 800;
    const calculatedZoom = Math.min(130, Math.max(30, Math.round((availableHeight / 1122.5) * 100)));
    setPdfZoom(calculatedZoom);
    if (previewScrollContainerRef.current) {
      previewScrollContainerRef.current.scrollLeft = 0;
    }
  };

  // WhatsApp formatted string generator
  const generateWhatsAppMessage = () => {
    const selectedActivitiesCount = trip.days.reduce(
      (sum, d) => sum + d.activities.filter((a) => a.isSelected).length, 
      0
    );

    return `🌴 *TRAVEL CARE TOURS PVT LTD* 🌴
*Official Holiday Itinerary & Voucher*
---------------------------------------
📋 *Voucher No:* ${trip.voucherNumber}
👤 *Guest:* ${trip.guestName} (${trip.adultsCount} Adults ${trip.childrenCount > 0 ? `+ ${trip.childrenCount} Child` : ''})
🚗 *Vehicle:* ${trip.vehicleType}
🗓️ *Duration:* ${trip.durationDays} Days / ${trip.durationNights} Nights
🗺️ *Route:* ${trip.routeSummary}

🏨 *ACCOMMODATION PLAN:*
${trip.accommodations.map((a) => `• ${a.destination}: ${a.hotelName} (${a.nights}N, ${a.mealPlan})`).join('\n')}

✨ *CURATED SIGHTSEEING HIGHLIGHTS (${selectedActivitiesCount} Points Verified):*
${trip.days.map((d) => `*Day ${d.dayNumber} (${d.destination}):* ${d.activities.filter(a => a.isSelected).map(a => a.title).join(', ') || 'Scenic Drive / Leisure'}`).join('\n')}

💰 *Total Package Value:* ${trip.totalPackageCost}
💳 *Advance:* ${trip.advancePaid || 'Paid'} | *Balance:* ${trip.balancePayable || 'On arrival'}

📞 *24/7 Operations Desk:* +91 91435 43444
🌐 *Travel Care Tours Pvt Ltd*, Thrikkakara, Ernakulam, Kerala`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        staffUser={staffUser}
        onLogout={handleLogout}
        onOpenLogin={() => setShowAuthModal(true)}
        onOpenImport={() => setShowImportModal(true)}
        onOpenGoogleSheets={() => setShowGoogleSheetsModal(true)}
        onPrint={triggerNativePrint}
        onShareWhatsApp={() => setShowWhatsAppModal(true)}
        voucherNumber={trip.voucherNumber}
      />

      {/* Main Container - Responsive Architecture */}
      <main className="flex-1 max-w-[1560px] w-full mx-auto px-3.5 sm:px-6 lg:px-10 py-3.5 sm:py-8">
        {/* WhatsApp Leads View (V2 Primary Staff Workspace) */}
        {currentTab === 'whatsapp-leads' && (
          <WhatsappLeadsView
            trip={trip}
            onUpdateTrip={handleUpdateTrip}
            onNavigateToActivities={() => setCurrentTab('activities')}
            onNavigateToPreview={() => setCurrentTab('preview')}
            onNavigateToV1Trip={() => setCurrentTab('editor')}
            onOpenGoogleSheets={() => setShowGoogleSheetsModal(true)}
            staffUser={staffUser}
          />
        )}

        {/* V1 Trip Page (Separate Detailed Workspace) */}
        {currentTab === 'editor' && (
          <TripDetailsForm
            trip={trip}
            onUpdateTrip={handleUpdateTrip}
            onLoadPreset={handleLoadPreset}
            onProceedToActivities={() => setCurrentTab('activities')}
            onNavigateToActivities={() => setCurrentTab('activities')}
            onNavigateToPreview={() => setCurrentTab('preview')}
            onNavigateToWhatsappLeads={() => setCurrentTab('whatsapp-leads')}
          />
        )}

        {/* Activity Management View (Critical Feature) */}
        {currentTab === 'activities' && (
          <ActivityManager
            trip={trip}
            onUpdateTrip={handleUpdateTrip}
            catalog={catalog}
            onNavigateToPreview={() => setCurrentTab('preview')}
          />
        )}

        {/* Destination Master Catalog View */}
        {currentTab === 'catalog' && (
          <DestinationCatalogManager
            catalog={catalog}
            onUpdateCatalog={handleUpdateCatalog}
          />
        )}

        {/* Integration Documentation View */}
        {currentTab === 'docs' && (
          <IntegrationDocsModal />
        )}

        {/* PDF Document Preview & Generation View */}
        {currentTab === 'preview' && (
          <div className="space-y-6 relative">
            {/* Floating Left Page Jump Toolbar */}
            <div 
              id="pdf-floating-jump-toolbar"
              className="fixed left-2 sm:left-4 lg:left-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1 p-1.5 sm:p-2 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-xl no-print animate-in fade-in slide-in-from-left-2 duration-200 ring-1 ring-slate-900/5"
            >
              <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-0.5">
                <Layers className="w-3 h-3 text-emerald-700" />
                <span className="hidden sm:inline">Jump</span>
              </div>
              {[
                { id: 'pdf-page-1', num: '1', label: 'Cover' },
                { id: 'pdf-page-2', num: '2', label: 'Overview' },
                { id: 'pdf-page-itinerary-1', num: '3', label: 'Days' },
                { id: 'pdf-page-commercials', num: '4', label: 'Inclusions' },
                { id: 'pdf-page-payment', num: '5', label: 'Payment' },
                { id: 'pdf-page-terms', num: '6', label: 'Terms' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleScrollToPreviewPage(p.id)}
                  className={`flex items-center gap-2 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left group ${
                    activePreviewPage === p.id
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
                  }`}
                  title={`Jump to Page ${p.num}: ${p.label}`}
                >
                  <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono font-black ${
                    activePreviewPage === p.id ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-white'
                  }`}>
                    {p.num}
                  </span>
                  <span className="hidden sm:inline text-[11px] whitespace-nowrap">{p.label}</span>
                </button>
              ))}
            </div>

            {/* Top Toolbar: Logical Grouping (View Controls Left, Export Actions Right) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 sm:gap-4 no-print sticky top-20 z-30 backdrop-blur-md bg-white/95">
              {/* LEFT GROUP: View Controls ("how I see it") */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <div className="flex items-center gap-2 pr-1 sm:pr-2 border-r border-slate-200">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center shrink-0">
                    <Eye className="w-4 h-4 text-emerald-800" />
                  </div>
                  <span className="font-extrabold text-xs sm:text-sm text-slate-900 hidden md:inline">Preview</span>
                </div>

                {/* Modern Zoom Controls: Fit Width, Fit Height, -, %, + */}
                <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 shadow-2xs gap-1">
                  <button
                    type="button"
                    onClick={handleFitWidth}
                    className="px-2 sm:px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-emerald-950 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200 shadow-2xs cursor-pointer"
                    title="Fit page to preview width"
                  >
                    Fit Width
                  </button>
                  <button
                    type="button"
                    onClick={handleFitHeight}
                    className="px-2 sm:px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-emerald-950 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200 shadow-2xs cursor-pointer"
                    title="Fit full A4 page to screen height"
                  >
                    Fit Height
                  </button>
                  <div className="h-4 w-[1px] bg-slate-300 mx-0.5" />
                  <button
                    type="button"
                    onClick={() => setPdfZoom((prev) => Math.max(30, prev - 10))}
                    className="p-1.5 text-slate-700 hover:text-slate-950 hover:bg-white rounded-lg transition-all cursor-pointer"
                    title="Zoom Out (-10%)"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-1.5 font-mono text-[11px] text-slate-800 font-extrabold select-none min-w-[36px] text-center">
                    {pdfZoom}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setPdfZoom((prev) => Math.min(180, prev + 10))}
                    className="p-1.5 text-slate-700 hover:text-slate-950 hover:bg-white rounded-lg transition-all cursor-pointer"
                    title="Zoom In (+10%)"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  id="btn-sync-pdf-data"
                  type="button"
                  onClick={handleSyncPdfData}
                  disabled={isSyncingPdf}
                  className="p-2 text-slate-600 hover:text-emerald-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                  title="Sync & Refresh PDF Data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingPdf ? 'animate-spin text-emerald-700' : 'text-slate-600'}`} />
                </button>
              </div>

              {/* RIGHT GROUP: Export & Action Controls ("what I do with it") */}
              <div className="flex items-center gap-2 sm:gap-2.5 ml-auto">
                {/* Secondary Action: Save to Sheet (Outlined / lighter button without text) */}
                <button
                  id="btn-preview-save-sheet"
                  type="button"
                  onClick={handleSaveToGoogleSheetFromPreview}
                  disabled={isSavingSheet}
                  className="p-2 sm:p-2.5 text-slate-600 hover:text-emerald-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                  title={previewSaveStatus ? `Sheet: ${previewSaveStatus}` : "Save confirmed voucher to Google Sheet database"}
                >
                  <Database className={`w-4 h-4 text-emerald-700 ${isSavingSheet ? 'animate-pulse' : ''}`} />
                </button>

                {/* Secondary Action: Print (Outlined / lighter button without text) */}
                <button
                  id="btn-print-native-pdf"
                  type="button"
                  onClick={triggerNativePrint}
                  className="p-2 sm:p-2.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all cursor-pointer shadow-2xs"
                  title="Print Document or Save as PDF"
                >
                  <Printer className="w-4 h-4 text-slate-700" />
                </button>

                {/* Secondary Action: WhatsApp (Outlined emerald button) */}
                <button
                  id="btn-preview-whatsapp"
                  type="button"
                  onClick={() => setShowWhatsAppModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors cursor-pointer shadow-2xs"
                  title="Share Itinerary on WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>

                {/* PRIMARY ACTION: Download PDF (Solid, bold brand-color button) */}
                <button
                  id="btn-download-pdf-file"
                  type="button"
                  onClick={() => {
                    downloadPdfFile().catch((err) => {
                      console.error('PDF download failed:', err);
                    });
                  }}
                  disabled={isExportingPdf}
                  className="flex items-center gap-2 px-4 sm:px-5 py-2.5 text-xs font-black text-white bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 border border-emerald-900 rounded-xl shadow-md transition-all hover:scale-[1.02] cursor-pointer"
                  title="Download PDF Document"
                >
                  {isExportingPdf ? (
                    <RefreshCw className="w-4 h-4 text-emerald-200 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 text-white" />
                  )}
                  <span>{isExportingPdf ? 'Exporting...' : 'Download PDF'}</span>
                </button>
              </div>
            </div>

            {/* Live Document Canvas with Soft Desk Contrast Background */}
            <div 
              ref={previewScrollContainerRef}
              className="w-full overflow-x-auto py-6 sm:py-10 px-2 sm:px-6 rounded-2xl sm:rounded-3xl bg-[#f0f2f5] border border-slate-300/80 shadow-inner print:bg-white print:border-0 print:p-0 print:overflow-visible touch-pan-x touch-pan-y"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {/* Scaled Anchor Box: Exactly matches visual scaled dimensions of the document */}
              <div 
                id="pdf-scale-anchor"
                className="relative mx-auto print:m-0 print:w-auto print:h-auto"
                style={{
                  width: `${Math.round(793.7 * (pdfZoom / 100))}px`,
                  height: unscaledPdfHeight > 0 ? `${Math.round(unscaledPdfHeight * (pdfZoom / 100))}px` : 'auto',
                  transition: 'width 150ms ease-out, height 150ms ease-out',
                }}
              >
                <div 
                  ref={printRef}
                  id="pdf-template-wrapper"
                  style={{ 
                    transform: `scale(${pdfZoom / 100})`, 
                    transformOrigin: 'top left',
                    width: '210mm',
                    minWidth: '210mm',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                  }}
                  className="pdf-template-container transition-transform duration-150 print:relative print:transform-none shrink-0"
                >
                  <PdfTemplate key={pdfKey} trip={trip} />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Import Modal */}
      <ImportPlannerModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={(newTrip) => {
          handleUpdateTrip(newTrip);
          setCurrentTab('activities');
        }}
        catalog={catalog}
      />

      {/* WhatsApp Share Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-emerald-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-emerald-300" />
                <h4 className="font-bold text-sm">Share Itinerary on WhatsApp</h4>
              </div>
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="text-white/70 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600">
                Formatted text summary ready to send to guests or agents directly on WhatsApp:
              </p>

              <textarea
                rows={10}
                readOnly
                value={generateWhatsAppMessage()}
                className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              />

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const msg = generateWhatsAppMessage();
                      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(msg);
                      } else if (typeof document !== 'undefined') {
                        const ta = document.createElement('textarea');
                        ta.value = msg;
                        ta.style.position = 'fixed';
                        ta.style.opacity = '0';
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                      }
                      setCopiedWhatsApp(true);
                      setTimeout(() => setCopiedWhatsApp(false), 2000);
                    } catch (err) {
                      console.warn('Failed to copy text:', err);
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  {copiedWhatsApp ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWhatsApp ? 'Copied to Clipboard!' : 'Copy Text'}</span>
                </button>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(generateWhatsAppMessage())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  <span>Open WhatsApp</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Google Sheets Voucher Database Modal */}
      {showGoogleSheetsModal && (
        <GoogleSheetsModal
          isOpen={showGoogleSheetsModal}
          onClose={() => setShowGoogleSheetsModal(false)}
          onSyncComplete={(nextVoucherNumber) => {
            handleUpdateTrip({ ...trip, voucherNumber: nextVoucherNumber });
          }}
        />
      )}
    </div>
  );
}
