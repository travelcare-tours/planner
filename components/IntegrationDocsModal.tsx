'use client';

import React, { useState } from 'react';
import { 
  Code, 
  Key, 
  Database, 
  FileText, 
  Server, 
  ExternalLink, 
  Check, 
  Copy, 
  Layers,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export const IntegrationDocsModal: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'auth' | 'mapping' | 'endpoints' | 'structure'>('auth');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 text-white rounded-2xl p-6 shadow-md">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-800/60 text-emerald-300 text-xs font-semibold mb-2 border border-emerald-700/50">
          <Code className="w-3.5 h-3.5" />
          Technical & Integration Architecture
        </div>
        <h2 className="text-xl sm:text-2xl font-bold">Travel Care Tours Planner & PDF Engine</h2>
        <p className="text-xs text-emerald-100/80 mt-1 max-w-3xl leading-relaxed">
          Comprehensive guide on connecting the existing staff login at <code className="text-white font-mono bg-white/10 px-1 py-0.5 rounded">travelcaretours.in/invoice</code>, mapping planner form fields into the multi-page PDF template, and utilizing the REST API endpoints.
        </p>

        {/* Section Tabs */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-emerald-800/60 text-xs font-semibold">
          <button
            onClick={() => setActiveSection('auth')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeSection === 'auth' ? 'bg-emerald-400 text-emerald-950 font-bold' : 'text-emerald-200 hover:bg-white/10'
            }`}
          >
            1. Invoice Login Reuse
          </button>
          <button
            onClick={() => setActiveSection('mapping')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeSection === 'mapping' ? 'bg-emerald-400 text-emerald-950 font-bold' : 'text-emerald-200 hover:bg-white/10'
            }`}
          >
            2. Planner Form Data Mapping
          </button>
          <button
            onClick={() => setActiveSection('endpoints')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeSection === 'endpoints' ? 'bg-emerald-400 text-emerald-950 font-bold' : 'text-emerald-200 hover:bg-white/10'
            }`}
          >
            3. API Endpoints
          </button>
          <button
            onClick={() => setActiveSection('structure')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeSection === 'structure' ? 'bg-emerald-400 text-emerald-950 font-bold' : 'text-emerald-200 hover:bg-white/10'
            }`}
          >
            4. Project Structure & PDF Template
          </button>
        </div>
      </div>

      {/* Content Container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        {/* Section 1: Auth Reuse */}
        {activeSection === 'auth' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-2">
              <Key className="w-5 h-5 text-emerald-700" />
              How to Connect Existing Staff Login from travelcaretours.in/invoice
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Because <code className="font-mono text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded">travelcaretours.in/invoice</code> and <code className="font-mono text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded">travelcaretours.in/planner</code> live on the same root domain (<code className="font-mono text-slate-800">.travelcaretours.in</code>), staff authentication is shared seamlessly using three standard options:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Option A: Shared Cookie (Recommended)
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  When staff signs in at <code className="font-mono">/invoice</code>, the server sets a root domain cookie:
                </p>
                <div className="p-2 bg-slate-900 text-emerald-300 font-mono text-[10px] rounded">
                  Set-Cookie: tct_staff_jwt=...; Domain=.travelcaretours.in; Path=/; HttpOnly; Secure; SameSite=Lax
                </div>
                <p className="text-slate-500 text-[11px]">
                  When staff navigates to <code className="font-mono">/planner</code>, Next.js middleware automatically reads <code className="font-mono">tct_staff_jwt</code> to authorize itinerary generation with zero extra logins.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-teal-600" />
                  Option B: Auth Bridge / Token Redirect
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  The invoice portal dashboard includes a button &ldquo;Open Itinerary Planner&rdquo;:
                </p>
                <div className="p-2 bg-slate-900 text-emerald-300 font-mono text-[10px] rounded">
                  {'window.location.href = "https://travelcaretours.in/planner?sso_token=" + sessionToken;'}
                </div>
                <p className="text-slate-500 text-[11px]">
                  The planner exchanges the single-use token against <code className="font-mono">/api/auth/login</code> and establishes the staff session.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-600" />
                  Option C: Unified Staff Database API
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  The planner calls the existing invoice backend endpoint:
                </p>
                <div className="p-2 bg-slate-900 text-emerald-300 font-mono text-[10px] rounded">
                  POST https://travelcaretours.in/api/staff/verify
                  Authorization: Bearer [token]
                </div>
                <p className="text-slate-500 text-[11px]">
                  This verifies staff credentials against the existing database tables for operations team members.
                </p>
              </div>
            </div>

            {/* Code Snippet for Next.js Middleware */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Next.js Staff Protection Middleware (<code className="font-mono">middleware.ts</code>)</span>
                <button
                  onClick={() => copyToClipboard(`import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const staffCookie = request.cookies.get('tct_staff_jwt')?.value;
  const isPlannerRoute = request.nextUrl.pathname.startsWith('/planner') || 
                         request.nextUrl.pathname.startsWith('/api/itineraries');

  if (isPlannerRoute && !staffCookie) {
    const loginUrl = new URL('/invoice/login', request.url);
    loginUrl.searchParams.set('redirect_to', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}`, 'mw')}
                  className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 text-xs font-semibold"
                >
                  {copiedKey === 'mw' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'mw' ? 'Copied' : 'Copy Middleware Code'}
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-slate-900 text-emerald-300 text-xs font-mono overflow-x-auto">
{`import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const staffCookie = request.cookies.get('tct_staff_jwt')?.value;
  const isPlannerRoute = request.nextUrl.pathname.startsWith('/planner');

  // If unauthenticated staff attempts to access /planner, redirect to invoice login
  if (isPlannerRoute && !staffCookie) {
    const loginUrl = new URL('https://travelcaretours.in/invoice/login', request.url);
    loginUrl.searchParams.set('redirect_to', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}`}
              </pre>
            </div>
          </div>
        )}

        {/* Section 2: Data Mapping */}
        {activeSection === 'mapping' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-2">
              <Database className="w-5 h-5 text-emerald-700" />
              How to Map Planner Form Data into the Multi-Page PDF
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              The planner form on <code className="font-mono text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded">travelcaretours.in/planner</code> sends a JSON payload. The mapping table below specifies how each form field transforms into the corresponding PDF section:
            </p>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-emerald-900 text-white font-semibold">
                  <tr>
                    <th className="p-3">Planner Form Input Key</th>
                    <th className="p-3">Data Type</th>
                    <th className="p-3">Destination PDF Section</th>
                    <th className="p-3">Rendering Behavior in PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2.5 font-mono text-emerald-950 font-bold">guest_name</td>
                    <td className="p-2.5 text-slate-600">String</td>
                    <td className="p-2.5 font-semibold text-slate-800">Section 1 (Cover) & Section 5 (Voucher)</td>
                    <td className="p-2.5 text-slate-600">Personalized greeting & lead passenger identity</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="p-2.5 font-mono text-emerald-950 font-bold">pax_adults, pax_children</td>
                    <td className="p-2.5 text-slate-600">Number & String</td>
                    <td className="p-2.5 font-semibold text-slate-800">Section 1 & Section 5</td>
                    <td className="p-2.5 text-slate-600">Calculates vehicle capacity & hotel bed configuration</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-emerald-950 font-bold">pickup_date, drop_date</td>
                    <td className="p-2.5 text-slate-600">ISO Date string</td>
                    <td className="p-2.5 font-semibold text-slate-800">Section 1 (Cover), Section 2 (Stays)</td>
                    <td className="p-2.5 text-slate-600">Generates trip duration (X Days / Y Nights)</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="p-2.5 font-mono text-emerald-950 font-bold">stays[]</td>
                    <td className="p-2.5 text-slate-600">Array of Hotel Stays</td>
                    <td className="p-2.5 font-semibold text-slate-800">Section 2: Accommodation Table</td>
                    <td className="p-2.5 text-slate-600">Renders high-end table with Destination, Hotel, Nights & Meal Plan</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-emerald-950 font-bold">activities[].isSelected</td>
                    <td className="p-2.5 text-slate-600">Boolean (true/false)</td>
                    <td className="p-2.5 font-semibold text-slate-800">Section 3: Day-by-Day Scenic Journey</td>
                    <td className="p-2.5 text-emerald-700 font-bold">CRITICAL: Only true items are rendered in PDF</td>
                  </tr>
                  <tr className="bg-slate-50/50">
                    <td className="p-2.5 font-mono text-emerald-950 font-bold">total_cost, voucher_no</td>
                    <td className="p-2.5 text-slate-600">Currency & Alphanumeric</td>
                    <td className="p-2.5 font-semibold text-slate-800">Section 5 (Commercials) & Section 7 (Bank/UPI)</td>
                    <td className="p-2.5 text-slate-600">Official billing confirmation with payment instructions</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 3: API Endpoints */}
        {activeSection === 'endpoints' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-2">
              <Server className="w-5 h-5 text-emerald-700" />
              REST API Endpoints Available
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-xs font-bold">POST</span>
                    <code className="text-xs font-mono font-bold text-slate-900">/api/planner/import</code>
                  </div>
                  <span className="text-xs text-slate-500">Form Submission Ingestion</span>
                </div>
                <p className="text-xs text-slate-600">
                  Accepts raw JSON from the customer-facing or internal trip inquiry form, transforms fields, matches destination activities, and returns structured Itinerary state.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-xs font-bold">GET / POST</span>
                    <code className="text-xs font-mono font-bold text-slate-900">/api/destinations</code>
                  </div>
                  <span className="text-xs text-slate-500">Configurable Activity Catalog</span>
                </div>
                <p className="text-xs text-slate-600">
                  Returns the master sightseeing catalog for Munnar, Thekkady, Alleppey, Kovalam, etc., and allows staff to register new Kerala destinations without source code modifications.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono text-xs font-bold">POST</span>
                    <code className="text-xs font-mono font-bold text-slate-900">/api/auth/login</code>
                  </div>
                  <span className="text-xs text-slate-500">Staff Authentication</span>
                </div>
                <p className="text-xs text-slate-600">
                  Authenticates staff credentials or validates invoice portal SSO tokens to grant itinerary authoring rights.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Project Structure */}
        {activeSection === 'structure' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base border-b border-slate-100 pb-2">
              <Layers className="w-5 h-5 text-emerald-700" />
              Full Production Project Structure
            </div>

            <p className="text-xs text-slate-600">
              Clean modular Next.js App Router architecture organizing the visual identity, PDF generator, activity manager, and backend endpoints:
            </p>

            <pre className="p-4 rounded-xl bg-slate-900 text-emerald-300 text-xs font-mono overflow-x-auto leading-relaxed">
{`travel-care-tours/
├── app/
│   ├── api/
│   │   ├── auth/login/route.ts       # Staff authentication & SSO session validator
│   │   ├── destinations/route.ts     # Configurable activity catalog CRUD
│   │   └── planner/import/route.ts   # Form payload ingestion endpoint
│   ├── globals.css                   # Tailwind v4 + @media print A4 page-break rules
│   ├── layout.tsx                    # Typography, OpenGraph & meta tags
│   ├── page.tsx                      # Root redirects to /planner dashboard
│   └── planner/page.tsx              # Main Travel Care Tours Planner Studio
├── components/
│   ├── Navbar.tsx                    # Branding, address header, mode switchers
│   ├── ActivityManager.tsx           # CRITICAL: Sightseeing tick/untick, reorder, custom acts
│   ├── DestinationCatalogManager.tsx # Configurable destination & activity pool editor
│   ├── TripDetailsForm.tsx           # Guest data, vehicles, accommodations table
│   ├── PdfTemplate.tsx               # HTML/CSS Multi-page PDF Template (8 exact sections)
│   ├── AuthModal.tsx                 # Staff login & invoice SSO bridge
│   ├── ImportPlannerModal.tsx        # JSON importer for planner form
│   └── IntegrationDocsModal.tsx      # Technical setup & integration manual
├── lib/
│   ├── sample-data.ts                # Company details, Kerala catalog & sample trips
│   └── utils.ts                      # Class merging & formatters
└── types/
    └── itinerary.ts                  # Strong TypeScript models`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
