'use client';

import React, { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

const emptySubscribe = () => () => {};
import { 
  Compass, 
  FileText, 
  CheckSquare, 
  Settings, 
  Code, 
  Printer, 
  Share2, 
  Upload, 
  LogOut, 
  UserCheck,
  Palmtree,
  Sparkles,
  MessageSquare,
  ChevronDown,
  Menu,
  Layers,
  BookOpen,
  ArrowRight,
  LayoutGrid,
  Table,
  X
} from 'lucide-react';
import { StaffUser } from '@/types/itinerary';
import { TC_LOGO_BASE64 } from '@/lib/logo';

interface NavbarProps {
  currentTab: 'whatsapp-leads' | 'editor' | 'activities' | 'catalog' | 'preview' | 'docs';
  setCurrentTab: (tab: 'whatsapp-leads' | 'editor' | 'activities' | 'catalog' | 'preview' | 'docs') => void;
  staffUser: StaffUser | null;
  onLogout: () => void;
  onOpenLogin: () => void;
  onOpenImport: () => void;
  onOpenGoogleSheets?: () => void;
  onPrint: () => void;
  onShareWhatsApp: () => void;
  voucherNumber: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  staffUser,
  onLogout,
  onOpenLogin,
  onOpenImport,
  onOpenGoogleSheets,
  onPrint,
  onShareWhatsApp,
  voucherNumber,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileSheetRef = useRef<HTMLDivElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll when mobile menu is open to prevent background scrolling and eliminate double scrollbars
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  // Close menu on click outside (check both desktop dropdown and mobile portal bottom sheet)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // If click is inside desktop menu button/dropdown
      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }
      // If click is on mobile trigger button
      if (mobileTriggerRef.current && mobileTriggerRef.current.contains(target)) {
        return;
      }
      // If click is inside mobile bottom sheet content
      if (mobileSheetRef.current && mobileSheetRef.current.contains(target)) {
        return;
      }
      setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-900/10 shadow-xs no-print">
      {/* Main navigation - unconstricted free-flow */}
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-13 sm:h-18 gap-2 sm:gap-4">
          {/* Official Logo */}
          <div 
            className="flex items-center cursor-pointer py-1 transition-opacity hover:opacity-95" 
            onClick={() => setCurrentTab('whatsapp-leads')}
            title="Travel Care Tours - Staff B2B Workspace"
          >
            <img 
              src={TC_LOGO_BASE64} 
              alt="Travel Care Tours" 
              className="h-8 sm:h-12 w-auto object-contain max-w-[170px] sm:max-w-[210px]"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          {/* Navigation Tabs - Free-flowing across the header */}
          <div className="hidden md:flex flex-1 items-center justify-center gap-2 lg:gap-3 px-2">
            <nav className="flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200 shadow-2xs">
              {/* Primary Tab: Whatsapp Leads */}
              <button
                id="nav-tab-whatsapp-leads"
                onClick={() => setCurrentTab('whatsapp-leads')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  currentTab === 'whatsapp-leads'
                    ? 'bg-[#0B2545] text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
                }`}
              >
                <MessageSquare className={`w-4 h-4 ${currentTab === 'whatsapp-leads' ? 'text-emerald-400' : 'text-emerald-700'}`} />
                <span>Whatsapp Leads</span>
              </button>

              {/* Activity Selection Tab */}
              <button
                id="nav-tab-activities"
                onClick={() => setCurrentTab('activities')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all relative ${
                  currentTab === 'activities'
                    ? 'bg-white text-emerald-950 shadow-xs border border-slate-200/80'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
                }`}
              >
                <CheckSquare className="w-4 h-4 text-teal-600" />
                <span>Activity Selection</span>
              </button>

              {/* PDF Preview Tab */}
              <button
                id="nav-tab-preview"
                onClick={() => setCurrentTab('preview')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  currentTab === 'preview'
                    ? 'bg-white text-emerald-950 shadow-xs border border-slate-200/80'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>PDF Preview</span>
              </button>
            </nav>

            {/* Menu Bar - Unconstricted & Free-Flowing into remaining space */}
            <div className="relative" ref={menuRef}>
              <button
                id="nav-menu-bar-dropdown"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all border ${
                  isMenuOpen || currentTab === 'catalog'
                    ? 'bg-slate-900 text-white border-slate-700 shadow-md ring-2 ring-emerald-500/20'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-2xs'
                }`}
                title="Menu Bar: Access Destination Catalog and Import Planner Data"
              >
                <div className="p-1 rounded bg-amber-400 text-slate-950 font-black flex items-center justify-center">
                  <Menu className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span>Menu Bar</span>
                {currentTab === 'catalog' && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-500 text-white font-black uppercase">
                    Catalog
                  </span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isMenuOpen ? 'rotate-180 text-white' : ''}`} />
              </button>

              {/* Free-Flowing Menu Dropdown Panel */}
              {isMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-2xs animate-in fade-in duration-150"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div className="absolute left-0 mt-3 w-88 sm:w-96 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/90 p-3.5 z-50 animate-in fade-in-50 slide-in-from-top-3 duration-200 ring-1 ring-slate-900/5">
                    {/* Top Anchor Caret */}
                    <div className="absolute -top-1.5 left-7 w-3 h-3 bg-white border-t border-l border-slate-200/90 rotate-45 rounded-tl-xs shadow-2xs" />

                    <div className="flex items-center justify-between px-2 pb-2.5 mb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-4 rounded-full bg-emerald-600" />
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Menu Bar Workspace
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold uppercase tracking-wider">Quick Access</span>
                    </div>

                    <div className="space-y-2">
                      {/* 1. Destination Catalog */}
                      <button
                        type="button"
                        id="menu-item-catalog"
                        onClick={() => {
                          setCurrentTab('catalog');
                          setIsMenuOpen(false);
                        }}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl text-left text-xs transition-all border cursor-pointer group ${
                          currentTab === 'catalog' 
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-semibold shadow-xs ring-1 ring-indigo-400/20' 
                            : 'bg-white hover:bg-indigo-50/50 border-slate-200/80 hover:border-indigo-200 text-slate-700 hover:shadow-2xs'
                        }`}
                      >
                        <div className="p-2.5 rounded-xl bg-indigo-100/80 text-indigo-700 shrink-0 mt-0.5 shadow-2xs group-hover:scale-105 transition-transform">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900 text-xs group-hover:text-indigo-900 transition-colors">Destination Catalog</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">Database</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Manage destinations, sightseeing activity inventory, and default packages.</p>
                        </div>
                      </button>

                      {/* 2. Import Planner Data */}
                      <button
                        type="button"
                        id="menu-item-import-planner"
                        onClick={() => {
                          onOpenImport();
                          setIsMenuOpen(false);
                        }}
                        className="w-full flex items-start gap-3 p-3 rounded-xl text-left text-xs transition-all border border-slate-200/80 hover:border-emerald-300 bg-white hover:bg-emerald-50/60 text-slate-700 cursor-pointer shadow-2xs hover:shadow-xs group"
                      >
                        <div className="p-2.5 rounded-xl bg-emerald-100/80 text-emerald-800 shrink-0 mt-0.5 shadow-2xs group-hover:scale-105 transition-transform">
                          <Upload className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900 text-xs group-hover:text-emerald-900 transition-colors">Import Planner Data</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">Paste / File</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Import booking details, customer inputs, or restore sample data.</p>
                        </div>
                      </button>

                      {/* 3. Google Sheet Voucher Database */}
                      <button
                        type="button"
                        id="menu-item-google-sheets"
                        onClick={() => {
                          onOpenGoogleSheets?.();
                          setIsMenuOpen(false);
                        }}
                        className="w-full flex items-start gap-3 p-3 rounded-xl text-left text-xs transition-all border border-teal-200/80 hover:border-teal-300 bg-teal-50/40 hover:bg-teal-50/80 text-slate-700 cursor-pointer shadow-2xs hover:shadow-xs group"
                      >
                        <div className="p-2.5 rounded-xl bg-teal-600 text-white shrink-0 mt-0.5 shadow-2xs group-hover:scale-105 transition-transform">
                          <Table className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900 text-xs group-hover:text-teal-950 transition-colors">Voucher Database</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold border border-teal-200">Google Sheet</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Sync voucher serial numbers & log generated itineraries in real time.</p>
                        </div>
                      </button>

                      {/* 4. Switch to Workspace Hub */}
                      <a
                        href="https://travelcaretours.in/invoice/"
                        target="_self"
                        title="Switch to Workspace Hub"
                        className="w-full flex items-start gap-3 p-3 rounded-xl text-left text-xs transition-all border border-slate-700 bg-gradient-to-r from-slate-900 to-slate-800 text-slate-100 hover:from-slate-850 hover:to-slate-750 shadow-sm cursor-pointer group"
                      >
                        <div className="p-2.5 rounded-xl bg-slate-800 text-blue-400 shrink-0 mt-0.5 shadow-2xs group-hover:scale-105 transition-transform border border-slate-700">
                          <LayoutGrid className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-white text-xs">Workspace Hub</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/80 text-blue-300 font-bold border border-blue-700">Billing Portal</span>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">Switch back to Travel Care Tours billing and operations portal.</p>
                        </div>
                      </a>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action buttons (Icon-Only Header Controls) */}
          <div className="flex items-center gap-2">
            {/* Workspace Hub Button */}
            <a
              href="https://travelcaretours.in/invoice/"
              target="_self"
              title="Switch to Workspace Hub"
              aria-label="Switch to Workspace Hub"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-slate-200 hover:text-white border border-slate-700 transition-all shadow-2xs hover:shadow-xs flex items-center justify-center cursor-pointer active:scale-95 shrink-0 group"
            >
              <LayoutGrid className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
            </a>

            {/* Generate PDF Button */}
            <button
              id="btn-generate-pdf"
              type="button"
              onClick={() => {
                setCurrentTab('preview');
                setTimeout(() => onPrint(), 250);
              }}
              title="Generate & Print PDF Itinerary"
              aria-label="Generate & Print PDF Itinerary"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-800 to-teal-800 hover:from-emerald-900 hover:to-teal-900 text-white border border-emerald-700/60 transition-all shadow-2xs hover:shadow-xs flex items-center justify-center cursor-pointer active:scale-95 shrink-0 group"
            >
              <Printer className="w-5 h-5 text-emerald-200 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>

        {/* Mobile secondary tab strip */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1.5 border-t border-slate-100 no-scrollbar items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1">
            <button
              onClick={() => setCurrentTab('whatsapp-leads')}
              className={`flex-1 min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-black whitespace-nowrap flex items-center justify-center gap-1.5 transition-all shadow-2xs ${
                currentTab === 'whatsapp-leads'
                  ? 'bg-[#0B2545] text-white shadow-xs'
                  : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              <MessageSquare className={`w-3.5 h-3.5 ${currentTab === 'whatsapp-leads' ? 'text-emerald-400' : 'text-emerald-700'}`} />
              <span>Leads</span>
            </button>
            <button
              onClick={() => setCurrentTab('activities')}
              className={`flex-1 min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1.5 transition-all shadow-2xs ${
                currentTab === 'activities'
                  ? 'bg-[#0B2545] text-white shadow-xs'
                  : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              <CheckSquare className={`w-3.5 h-3.5 ${currentTab === 'activities' ? 'text-teal-400' : 'text-teal-700'}`} />
              <span>Activities</span>
            </button>
            <button
              onClick={() => setCurrentTab('preview')}
              className={`flex-1 min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1.5 transition-all shadow-2xs ${
                currentTab === 'preview'
                  ? 'bg-[#0B2545] text-white shadow-xs'
                  : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${currentTab === 'preview' ? 'text-amber-400' : 'text-amber-600'}`} />
              <span>PDF</span>
            </button>
          </div>
          <button
            ref={mobileTriggerRef}
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`min-h-[40px] w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
              isMenuOpen || currentTab === 'catalog'
                ? 'bg-slate-900 text-amber-400 border-slate-700 shadow-xs'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs'
            }`}
            title="Menu"
            aria-label="Menu"
          >
            <Menu className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Mobile Menu Slide-Over / Bottom Sheet - rendered via Portal to escape header's backdrop-filter & sticky constraints */}
        {isMounted && isMenuOpen && createPortal(
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div 
              className="fixed inset-0"
              onClick={() => setIsMenuOpen(false)}
            />
            <div 
              ref={mobileSheetRef}
              className="relative bg-white rounded-t-2xl p-4 shadow-2xl border-t border-slate-200 space-y-3 z-10 max-h-[85vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-5 rounded-full bg-emerald-700" />
                  <span className="font-extrabold text-sm text-slate-900">App Navigation & Tools</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 pt-1">
                {/* 1. Destination Catalog */}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentTab('catalog');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    currentTab === 'catalog'
                      ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 font-semibold'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 shrink-0 mt-0.5">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">Destination Catalog</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-900 font-bold">Database</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Manage Kerala destinations, sightseeing catalog & default itineraries.</p>
                  </div>
                </button>

                {/* 3. Import Planner Data */}
                <button
                  type="button"
                  onClick={() => {
                    onOpenImport();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-left transition-all cursor-pointer"
                >
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">Import Planner Data</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">Paste / File</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Paste WhatsApp itinerary or raw text to auto-populate the trip.</p>
                  </div>
                </button>

                {/* 3. Google Sheet Voucher Database */}
                <button
                  type="button"
                  onClick={() => {
                    onOpenGoogleSheets?.();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-start gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 text-left transition-all cursor-pointer"
                >
                  <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0 mt-0.5 shadow-2xs">
                    <Table className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">Voucher Database</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">Google Sheet</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Sync voucher numbers & view auto-logged booking rows in Google Sheets.</p>
                  </div>
                </button>

                {/* 4. Switch to Workspace Hub */}
                <a
                  href="https://travelcaretours.in/invoice/"
                  target="_self"
                  title="Switch to Workspace Hub"
                  className="w-full flex items-start gap-3 p-3 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-100 text-left transition-all cursor-pointer shadow-xs"
                >
                  <div className="p-2 rounded-lg bg-slate-800 text-blue-400 shrink-0 mt-0.5 shadow-2xs">
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">Workspace Hub</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 font-bold border border-blue-700">Billing Portal</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Switch back to Travel Care Tours billing and operations portal.</p>
                  </div>
                </a>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close Menu
              </button>
            </div>
          </div>,
          document.body
        )}
      </div>
    </header>
  );
};

