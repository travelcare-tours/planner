'use client';

import React, { useState } from 'react';
import { 
  Database, 
  Check, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Table, 
  Sparkles,
  Link2
} from 'lucide-react';
import { 
  getGoogleSheetWebAppUrl, 
  setGoogleSheetWebAppUrl, 
  fetchLastVoucherNumber,
  isUsingCustomSheetUrl,
  resetToDefaultSheetUrl,
  getDefaultGoogleSheetWebAppUrl,
  DEFAULT_GOOGLE_SHEET_WEBAPP_URL
} from '@/lib/google-sheets-sync';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: (nextVoucherNumber: string) => void;
}

export const APPS_SCRIPT_TEMPLATE = `function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  var lastCode = "TCT-2026-Q0196";
  
  if (lastRow > 1) {
    var val = sheet.getRange(lastRow, 1).getValue().toString();
    if (val && val.indexOf("TCT-") === 0) {
      lastCode = val;
    }
  }
  
  var match = lastCode.match(/(\\d+)$/);
  var nextNum = match ? parseInt(match[1], 10) + 1 : 197;
  var nextCode = "TCT-2026-Q" + ("0000" + nextNum).slice(-4);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    lastVoucherNumber: lastCode,
    nextVoucherNumber: nextCode,
    totalRecords: Math.max(0, lastRow - 1)
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Auto-create headers if first row is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Voucher No", "Last Updated", "Guest Name", "Contact Phone", 
        "Duration", "Travel Dates", "Route Summary", "Vehicle Type", 
        "Hotel Stays", "Quoted Total (₹)", "Net B2B Cost (₹)", "Staff Consultant", "Status"
      ]);
    }
    
    var rowData = [
      data.voucherNumber,
      data.createdAt || Utilities.formatDate(new Date(), "GMT+5:30", "yyyy-MM-dd HH:mm:ss"),
      data.guestName || "Valued Guest",
      data.contactPhone || "",
      data.duration || "",
      data.travelDates || "",
      data.routeSummary || "",
      data.vehicleType || "",
      data.hotelStays || "",
      data.quotedTotal || 0,
      data.netCost || 0,
      data.staffName || "Staff Specialist",
      data.status || "Under Review"
    ];

    // Search if voucherNumber already exists in Column A (In-place row update)
    var lastRow = sheet.getLastRow();
    var updated = false;
    var targetRowIndex = -1;

    if (lastRow > 1) {
      var rangeValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < rangeValues.length; i++) {
        if (String(rangeValues[i][0]).trim() === String(data.voucherNumber).trim()) {
          targetRowIndex = i + 2; // 1-based index, skipping header
          sheet.getRange(targetRowIndex, 1, 1, rowData.length).setValues([rowData]);
          updated = true;
          break;
        }
      }
    }

    if (!updated) {
      sheet.appendRow(rowData);
      targetRowIndex = sheet.getLastRow();
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      action: updated ? "updated" : "inserted",
      rowIndex: targetRowIndex,
      voucherNumber: data.voucherNumber
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`;

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const [url, setUrl] = useState(() => (typeof window !== 'undefined' ? getGoogleSheetWebAppUrl() : ''));
  const [isCustomOverride, setIsCustomOverride] = useState(() => (typeof window !== 'undefined' ? isUsingCustomSheetUrl() : false));
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    lastCode?: string;
    nextCode?: string;
  } | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const defaultUrl = getDefaultGoogleSheetWebAppUrl();

  const handleSave = () => {
    const trimmed = url.trim();
    if (!trimmed || trimmed === defaultUrl) {
      resetToDefaultSheetUrl();
      setIsCustomOverride(false);
      setUrl(defaultUrl);
    } else {
      setGoogleSheetWebAppUrl(trimmed);
      setIsCustomOverride(true);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetToDefault = () => {
    resetToDefaultSheetUrl();
    const fallback = getDefaultGoogleSheetWebAppUrl();
    setUrl(fallback);
    setIsCustomOverride(false);
    setSavedSuccess(true);
    setTestResult(null);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const activeUrl = url.trim() || getGoogleSheetWebAppUrl();
      if (!activeUrl) {
        setTestResult({
          success: false,
          message: 'Please paste your Google Apps Script Web App URL first.',
        });
        setIsTesting(false);
        return;
      }

      // If user typed a custom URL, persist it
      if (activeUrl !== defaultUrl) {
        setGoogleSheetWebAppUrl(activeUrl);
        setIsCustomOverride(true);
      }
      const res = await fetchLastVoucherNumber();

      if (res.isRemote) {
        setTestResult({
          success: true,
          message: `Connected successfully! Last generated voucher is ${res.lastCode}. Next will be ${res.nextCode}.`,
          lastCode: res.lastCode,
          nextCode: res.nextCode,
        });
        if (onSyncComplete) {
          onSyncComplete(res.nextCode);
        }
      } else {
        setTestResult({
          success: false,
          message: 'Could not connect to Google Sheet. Check URL or ensure "Who has access" is set to "Anyone".',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Connection test failed.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } catch {
      // Fallback
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />
      <div className="relative bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">Google Sheets Voucher Database</h3>
              <p className="text-xs text-emerald-200/80">Centralize generated itineraries & synchronize consecutive voucher numbers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* Web App URL Input Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <label className="block font-bold text-slate-800 text-xs sm:text-sm flex items-center justify-between flex-wrap gap-1.5">
              <span className="flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-emerald-600" />
                Google Apps Script Web App URL
              </span>
              {isCustomOverride ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200 font-bold">
                  Device Override (This browser only)
                </span>
              ) : url ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Team Default (All Devices)
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                  Not Configured
                </span>
              )}
            </label>

            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                {savedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                <span>{savedSuccess ? 'Saved!' : 'Save'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-xs rounded-lg border border-emerald-200 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testing Connection...' : 'Test Connection & Fetch Next #'}</span>
                </button>

                {isCustomOverride && defaultUrl && (
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="px-2.5 py-1.5 text-xs text-emerald-700 hover:text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200 rounded-lg font-semibold transition-colors cursor-pointer"
                    title="Revert back to the shared team sheet URL"
                  >
                    Reset to Team Default
                  </button>
                )}
              </div>

              {url && (
                <button
                  type="button"
                  onClick={() => {
                    setUrl('');
                    setGoogleSheetWebAppUrl('');
                    setIsCustomOverride(false);
                    setSavedSuccess(true);
                  }}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                >
                  Clear URL
                </button>
              )}
            </div>

            {!isCustomOverride && url && (
              <p className="text-[11px] text-emerald-700 font-medium">
                ✓ Active across all devices, mobile phones, and GitHub Pages without requiring any setup.
              </p>
            )}

            {/* Test result message */}
            {testResult && (
              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in duration-150 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">{testResult.message}</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Setup Instructions */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center justify-between">
              <span>How to setup your Google Sheet (1 Minute Setup)</span>
              <a 
                href="https://sheets.new" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 text-xs"
              >
                <span>Create New Google Sheet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </h4>

            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-600 leading-relaxed">
              <li>Open a blank Google Sheet at <a href="https://sheets.new" target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-semibold underline">sheets.new</a>.</li>
              <li>Go to <strong>Extensions &gt; Apps Script</strong>.</li>
              <li>Delete everything in the editor, and paste the code below.</li>
              <li>Click <strong>Deploy &gt; New deployment</strong>.</li>
              <li>Click the gear icon next to &quot;Select type&quot; and choose <strong>Web app</strong>.</li>
              <li>Set <strong>Execute as:</strong> <span className="font-semibold text-slate-800">Me</span> and <strong>Who has access:</strong> <span className="font-semibold text-emerald-800">Anyone</span>.</li>
              <li>Click <strong>Deploy</strong>, authorize permissions, and copy the <strong>Web App URL</strong> into the field above!</li>
            </ol>

            {/* Apps Script Code Box */}
            <div className="pt-2">
              <div className="flex items-center justify-between bg-slate-900 text-slate-300 px-3 py-1.5 rounded-t-lg text-xs font-mono">
                <span>Code.gs (Apps Script)</span>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-sans font-bold"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? 'Copied Code!' : 'Copy Script Code'}</span>
                </button>
              </div>
              <textarea
                readOnly
                rows={6}
                value={APPS_SCRIPT_TEMPLATE}
                className="w-full text-[11px] font-mono p-3 bg-slate-950 text-slate-200 rounded-b-lg border border-slate-800 focus:outline-hidden leading-relaxed resize-none"
              />
            </div>

            {/* Pro Tip: Tables & Status Dropdown */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1 text-xs text-slate-700">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                <span>Table Formatting & Status Dropdowns in Google Sheets</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                You can convert your sheet to an official Google Sheet Table (<strong>Format &gt; Convert to table</strong>) and add a dropdown validation to the <strong>Status</strong> column (Column M: <em>Under Review, Quoted, Confirmed, Voucher Issued, Cancelled</em>). 
                All existing and newly added rows will automatically adopt the dropdown and table theme!
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Automatically logs Voucher #, Guest, Contact, Dates, Route, Vehicle & Pricing on generation.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
