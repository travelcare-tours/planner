'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Navbar 
} from '@/components/Navbar';
import { 
  TripDetailsForm 
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
import { 
  SAMPLE_TRIP, 
  INITIAL_DESTINATIONS_CATALOG,
  COMPANY_DETAILS
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
  ArrowRight
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

export interface PlannerClientProps {
  initialTab?: 'whatsapp-leads' | 'editor' | 'activities' | 'catalog' | 'preview' | 'docs';
}

export function PlannerClient({ initialTab = 'whatsapp-leads' }: PlannerClientProps) {
  const [currentTab, setCurrentTab] = useState<'whatsapp-leads' | 'editor' | 'activities' | 'catalog' | 'preview' | 'docs'>(initialTab);
  
  const [trip, setTrip] = useState<TripDetails>(SAMPLE_TRIP);
  const [catalog, setCatalog] = useState<DestinationCatalogItem[]>(INITIAL_DESTINATIONS_CATALOG);
  
  // Staff Auth State
  const [staffUser, setStaffUser] = useState<StaffUser | null>({
    id: 'staff-default',
    name: 'Senior Tour Consultant',
    email: 'travelcare598@gmail.com',
    role: 'Staff Planner Specialist',
    isAuthenticated: true,
  });

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
          const parsed = JSON.parse(savedTrip);
          if (parsed.guestName === 'Mr. Nikhil Sharma' || !parsed.guestName) {
            parsed.guestName = 'Valued Guest';
          }
          if (parsed.guestContact === '+91 94957 01672') {
            parsed.guestContact = '';
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
          setTrip(parsed);
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

  const printRef = useRef<HTMLDivElement>(null);

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

            // Ensure cloned page containers strictly adhere to A4 dimensions (794px width)
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

        const imgData = canvas.toDataURL('image/jpeg', 0.85); // High quality 300 PPI with optimized file size
        if (i > 0) pdf.addPage('a4', 'portrait');

        // A4 standard: 210 x 297 mm - Maintain exact aspect ratio
        const pageWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * pageWidth) / canvas.width;

        // Render cleanly within the A4 boundary without distortion
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, Math.min(pageHeight, imgHeight), undefined, 'FAST');
      }

      pdf.save(`TravelCareTours_Itinerary_${trip.voucherNumber || 'TCT-2026-Q0196'}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      // Fallback to native print if html2canvas meets canvas limitations
      window.print();
    } finally {
      setIsExportingPdf(false);
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
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 no-print sticky top-20 z-30 backdrop-blur-md bg-white/95">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-emerald-800" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Multi-Page Itinerary Document Preview</h3>
                  <p className="text-[11px] text-slate-500">
                    High-end 8-page format with Travel Care Tours header & address on every page.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                {/* Zoom controls - hidden on mobile (native pinch-to-zoom), enabled on desktop */}
                <div className="hidden sm:flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
                  <button
                    onClick={() => setPdfZoom(Math.max(40, pdfZoom - 10))}
                    className="p-1.5 text-slate-600 hover:text-slate-900 rounded"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-1.5 sm:px-2 font-mono text-[11px] text-slate-700 font-bold">{pdfZoom}%</span>
                  <button
                    onClick={() => setPdfZoom(Math.min(130, pdfZoom + 10))}
                    className="p-1.5 text-slate-600 hover:text-slate-900 rounded"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    id="btn-preview-whatsapp"
                    onClick={() => setShowWhatsAppModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    id="btn-download-pdf-file"
                    onClick={downloadPdfFile}
                    disabled={isExportingPdf}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg transition-colors"
                  >
                    {isExportingPdf ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-emerald-800" />
                    )}
                    <span>{isExportingPdf ? 'Exporting...' : 'PDF'}</span>
                  </button>

                  <button
                    id="btn-print-native-pdf"
                    onClick={triggerNativePrint}
                    className="flex items-center gap-2 px-3.5 sm:px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-900 hover:to-teal-900 rounded-lg shadow-md transition-all hover:scale-[1.02]"
                  >
                    <Printer className="w-4 h-4 text-emerald-200" />
                    <span className="hidden sm:inline">Print / Save as PDF (Vector HD)</span>
                    <span className="sm:hidden">Print PDF</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Document Canvas */}
            <div className="w-full overflow-x-auto py-4 px-1 sm:px-4 print:py-0 print:px-0 print:overflow-visible">
              <div className="min-w-fit flex justify-start md:justify-center mx-auto">
                <div 
                  ref={printRef}
                  id="pdf-template-wrapper"
                  style={{ 
                    transform: `scale(${pdfZoom / 100})`, 
                    transformOrigin: 'top left',
                    width: '210mm',
                    minWidth: '210mm',
                  }}
                  className="pdf-template-container transition-transform duration-150 py-2 print:py-0 print:transform-none shrink-0"
                >
                  <PdfTemplate trip={trip} />
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
                  onClick={() => {
                    navigator.clipboard.writeText(generateWhatsAppMessage());
                    setCopiedWhatsApp(true);
                    setTimeout(() => setCopiedWhatsApp(false), 2000);
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
    </div>
  );
}
