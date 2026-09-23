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
  Check,
  X,
  Building2
} from 'lucide-react';
import { StaffUser } from '@/types/itinerary';
import { TC_LOGO_BASE64 } from '@/lib/logo';

interface NavbarProps {
  currentTab: 'whatsapp-leads' | 'editor' | 'activities' | 'catalog' | 'hotels' | 'preview' | 'docs';
  setCurrentTab: (tab: 'whatsapp-leads' | 'editor' | 'activities' | 'catalog' | 'hotels' | 'preview' | 'docs') => void;
  staffUser: StaffUser | null;
  onLogout: () => void;
  onOpenLogin: () => void;
  onOpenImport: () => void;
  onOpenGoogleSheets?: () => void;
  onPrint: () => void;
  onShareWhatsApp: () => void;
  voucherNumber: string;
}

const WORKFLOW_STEPS = [
  {
    id: 'whatsapp-leads' as const,
    stepNum: 1,
    title: 'Whatsapp Leads',
    shortTitle: 'Leads',
    icon: MessageSquare,
  },
  {
    id: 'activities' as const,
    stepNum: 2,
    title: 'Activity Selection',
    shortTitle: 'Activities',
    icon: CheckSquare,
  },
  {
    id: 'preview' as const,
    stepNum: 3,
    title: 'PDF Preview',
    shortTitle: 'PDF',
    icon: Sparkles,
  },
] as const;

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
  const getStepNumber = (tab: string) => {
    if (tab === 'whatsapp-leads' || tab === 'editor') return 1;
    if (tab === 'activities') return 2;
    if (tab === 'preview') return 3;
    return 0;
  };
  const activeStepNum = getStepNumber(currentTab);

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
    <header className={`sticky top-0 ${isMenuOpen ? 'z-[9999]' : 'z-50'} bg-white/95 backdrop-blur-md border-b border-emerald-900/10 shadow-xs no-print`}>
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

          {/* Top Navigation Progress Stepper: Step 1 ➔ Step 2 ➔ Step 3 */}
          <div className="hidden md:flex flex-1 items-center justify-center gap-2 lg:gap-3 px-2">
            <nav className="flex items-center gap-1 sm:gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/90 shadow-2xs">
              {WORKFLOW_STEPS.map((step, idx) => {
                const isCurrent = currentTab === step.id || (step.id === 'whatsapp-leads' && currentTab === 'editor');
                const isCompleted = activeStepNum > step.stepNum;

                return (
                  <React.Fragment key={step.id}>
                    {idx > 0 && (
                      <div className="flex items-center px-1 text-slate-300">
                        <ArrowRight className={`w-3.5 h-3.5 transition-colors ${
                          activeStepNum >= step.stepNum ? 'text-emerald-600 stroke-[2.5]' : 'text-slate-300 stroke-[2]'
                        }`} />
                      </div>
                    )}
                    <button
                      id={`nav-step-${step.id}`}
                      type="button"
                      onClick={() => setCurrentTab(step.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-[#0B2545] text-white shadow-xs'
                          : isCompleted
                          ? 'bg-emerald-50 text-emerald-950 hover:bg-emerald-100/80 border border-emerald-200/90'
                          : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
                      }`}
                      title={`Step ${step.stepNum}: ${step.title}`}
                    >
                      {/* Step Number Circle Badge */}
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10.5px] font-black shrink-0 transition-all ${
                        isCurrent
                          ? 'bg-emerald-400 text-emerald-950 shadow-2xs'
                          : isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : step.stepNum}
                      </span>

                      {/* Step Label */}
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className={`text-[10px] uppercase font-black tracking-wider hidden lg:inline ${
                          isCurrent ? 'text-emerald-300' : isCompleted ? 'text-emerald-700' : 'text-slate-400'
                        }`}>
                          Step {step.stepNum}
                        </span>
                        <span className="hidden lg:inline text-slate-400/60 font-light">•</span>
                        <span className="font-bold">{step.title}</span>
                      </div>
                    </button>
                  </React.Fragment>
                );
              })}
            </nav>

            {/* Menu Bar - Standard Hamburger Menu Button */}
            <div className="menu-parent-container relative" ref={menuRef}>
              <button
                id="nav-menu-bar-dropdown"
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border cursor-pointer ${
                  isMenuOpen || currentTab === 'catalog' || currentTab === 'hotels'
                    ? 'bg-slate-900 text-white border-slate-700 shadow-md ring-2 ring-emerald-500/20'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-2xs hover:shadow-xs'
                }`}
                title="Menu"
                aria-label="Menu"
              >
                <Menu className="w-4 h-4 stroke-[2.5]" />
              </button>

              {/* Free-Flowing Menu Dropdown Panel */}
              {isMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-[9998] bg-slate-900/20 backdrop-blur-2xs animate-in fade-in duration-150"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div className="dropdown-menu-workspace border border-slate-200/90 p-3.5 animate-in fade-in-50 slide-in-from-top-3 duration-200 ring-1 ring-slate-900/5">
                    {/* Top Anchor Caret (Desktop only, right-aligned to match button) */}
                    <div className="hidden md:block absolute -top-1.5 right-3.5 w-3 h-3 bg-white border-t border-l border-slate-200/90 rotate-45 rounded-tl-xs shadow-2xs" />

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

                      {/* 2. Hotel & Room Rates Dashboard */}
                      <button
                        type="button"
                        id="menu-item-hotels"
                        onClick={() => {
                          setCurrentTab('hotels');
                          setIsMenuOpen(false);
                        }}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl text-left text-xs transition-all border cursor-pointer group ${
                          currentTab === 'hotels' 
                            ? 'bg-amber-50 border-amber-300 text-amber-950 font-semibold shadow-xs ring-1 ring-amber-400/20' 
                            : 'bg-white hover:bg-amber-50/50 border-slate-200/80 hover:border-amber-200 text-slate-700 hover:shadow-2xs'
                        }`}
                      >
                        <div className="p-2.5 rounded-xl bg-amber-100/80 text-amber-800 shrink-0 mt-0.5 shadow-2xs group-hover:scale-105 transition-transform">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900 text-xs group-hover:text-amber-900 transition-colors">Hotels & Room Rates</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200/60">B2B Tariffs</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Manage hotel properties, room categories, and base B2B contract rates.</p>
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

        {/* Mobile secondary tab strip: Step 1 ➔ Step 2 ➔ Step 3 Stepper */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1.5 border-t border-slate-100 no-scrollbar items-center justify-between">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
            {WORKFLOW_STEPS.map((step, idx) => {
              const isCurrent = currentTab === step.id || (step.id === 'whatsapp-leads' && currentTab === 'editor');
              const isCompleted = activeStepNum > step.stepNum;

              return (
                <React.Fragment key={step.id}>
                  {idx > 0 && (
                    <div className="flex items-center px-0.5 text-slate-300 shrink-0">
                      <ArrowRight className={`w-3 h-3 transition-colors ${
                        activeStepNum >= step.stepNum ? 'text-emerald-600 stroke-[2.5]' : 'text-slate-300 stroke-[2]'
                      }`} />
                    </div>
                  )}
                  <button
                    onClick={() => setCurrentTab(step.id)}
                    className={`flex-1 min-h-[36px] px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#0B2545] text-white shadow-xs'
                        : isCompleted
                        ? 'bg-emerald-50 text-emerald-950 border border-emerald-200/80'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title={`Step ${step.stepNum}: ${step.title}`}
                  >
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      isCurrent
                        ? 'bg-emerald-400 text-emerald-950'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {isCompleted ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : step.stepNum}
                    </span>
                    <span className="text-[11px] font-bold">{step.shortTitle}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
          <button
            ref={mobileTriggerRef}
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`min-h-[40px] w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
              isMenuOpen || currentTab === 'catalog' || currentTab === 'hotels'
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

                {/* 2. Hotel & Room Rates Dashboard */}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentTab('hotels');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    currentTab === 'hotels'
                      ? 'bg-amber-50/80 border-amber-300 text-amber-950 font-semibold'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">Hotels & Room Rates</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">B2B Tariffs</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Manage hotel properties, room categories, and base B2B contract rates.</p>
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

