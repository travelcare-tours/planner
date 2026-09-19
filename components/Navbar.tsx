'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  onPrint,
  onShareWhatsApp,
  voucherNumber,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
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
                  isMenuOpen || currentTab === 'editor' || currentTab === 'catalog'
                    ? 'bg-slate-900 text-white border-slate-700 shadow-md ring-2 ring-emerald-500/20'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-2xs'
                }`}
                title="Menu Bar: Access V1 Trip Page, Activity Catalog, and Import Planner Data"
              >
                <div className="p-1 rounded bg-amber-400 text-slate-950 font-black flex items-center justify-center">
                  <Menu className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span>Menu Bar</span>
                {currentTab === 'editor' && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-400 text-slate-950 font-black uppercase">
                    V1 Trip
                  </span>
                )}
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
                    className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-2xs"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div className="absolute left-0 mt-3 w-88 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-3 z-50 animate-in fade-in-50 slide-in-from-top-3 duration-200">
                    <div className="flex items-center justify-between px-2 pb-2.5 mb-1.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-4 rounded-full bg-emerald-600" />
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Menu Bar Workspace
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">Quick Access</span>
                    </div>

                    <div className="space-y-1.5">
                      {/* 1. V1 Trip Page */}
                      <button
                        id="menu-item-v1-trip"
                        onClick={() => {
                          setCurrentTab('editor');
                          setIsMenuOpen(false);
                        }}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl text-left text-xs transition-all border ${
                          currentTab === 'editor' 
                            ? 'bg-amber-50/90 border-amber-300 text-amber-950 font-semibold shadow-2xs' 
                            : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5 shadow-2xs">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-xs">V1 Trip Editor</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">Classic</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Multi-section form for trip details, stays, and pricing customization.</p>
                        </div>
                      </button>

                      {/* 2. Activity Catalog */}
                      <button
                        id="menu-item-catalog"
                        onClick={() => {
                          setCurrentTab('catalog');
                          setIsMenuOpen(false);
                        }}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl text-left text-xs transition-all border ${
                          currentTab === 'catalog' 
                            ? 'bg-indigo-50/90 border-indigo-300 text-indigo-950 font-semibold shadow-2xs' 
                            : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 shrink-0 mt-0.5 shadow-2xs">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-xs">Destination Catalog</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">Database</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Manage destinations, sightseeing activity inventory, and default packages.</p>
                        </div>
                      </button>

                      {/* 3. Import Planner Data */}
                      <button
                        id="menu-item-import-planner"
                        onClick={() => {
                          onOpenImport();
                          setIsMenuOpen(false);
                        }}
                        className="w-full flex items-start gap-3 p-3 rounded-xl text-left text-xs transition-all border border-slate-100 hover:border-emerald-200 bg-white hover:bg-emerald-50/50 text-slate-700"
                      >
                        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0 mt-0.5 shadow-2xs">
                          <Upload className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-xs">Import Planner Data</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">Paste / File</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Import booking details, customer inputs, or restore sample data.</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              id="btn-generate-pdf"
              onClick={() => {
                setCurrentTab('preview');
                setTimeout(() => onPrint(), 250);
              }}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-white bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-900 hover:to-teal-900 rounded-lg shadow-xs transition-all active:scale-[0.98]"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-200" />
              <span>Generate PDF</span>
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
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`min-h-[40px] w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
              isMenuOpen || currentTab === 'editor' || currentTab === 'catalog'
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
        {mounted && isMenuOpen && createPortal(
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div 
              className="fixed inset-0"
              onClick={() => setIsMenuOpen(false)}
            />
            <div className="relative bg-white rounded-t-2xl p-4 shadow-2xl border-t border-slate-200 space-y-3 z-10 max-h-[85vh] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-5 rounded-full bg-emerald-700" />
                  <span className="font-extrabold text-sm text-slate-900">App Navigation & Tools</span>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 pt-1">
                {/* 1. V1 Trip Page */}
                <button
                  onClick={() => {
                    setCurrentTab('editor');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    currentTab === 'editor'
                      ? 'bg-amber-50/80 border-amber-300 text-amber-950 font-semibold'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">V1 Trip Editor</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">Classic</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Classic detailed form for accommodation, inclusion checklists, driver, and routing.</p>
                  </div>
                </button>

                {/* 2. Activity Catalog */}
                <button
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

