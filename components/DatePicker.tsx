'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Clock,
  Sparkles
} from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (formattedDate: string, dateObj: Date) => void;
  label?: string;
  placeholder?: string;
  minDate?: string | Date;
  maxDate?: string | Date;
  rangeStart?: string | Date;
  rangeEnd?: string | Date;
  disabled?: boolean;
  id?: string;
  className?: string;
  badgeText?: string;
  theme?: 'emerald' | 'teal';
  helperText?: string;
  errorMessage?: string;
}

// Helper to safely parse dates from multiple formats
export function parseDateSafe(val: string | Date | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : new Date(val.getFullYear(), val.getMonth(), val.getDate());
  }

  const str = String(val).trim();
  if (!str) return null;

  // 1. Direct YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    const dt = new Date(y, m, d);
    if (!isNaN(dt.getTime())) return dt;
  }

  // 2. Format with ordinal e.g. "19th Sept 2026", "19th September 2026"
  const cleaned = str.replace(/(\d+)(st|nd|rd|th)/gi, '$1').trim();
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  // 3. DD/MM/YYYY or DD-MM-YYYY
  const parts = cleaned.split(/[\/\-\.\s]+/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    const p2 = parseInt(parts[2], 10);
    if (p2 > 1000) {
      const dt = new Date(p2, p1 - 1, p0);
      if (!isNaN(dt.getTime())) return dt;
    } else if (p0 > 1000) {
      const dt = new Date(p0, p1 - 1, p2);
      if (!isNaN(dt.getTime())) return dt;
    }
  }

  return null;
}

// Format date into human-readable e.g. "19th Sept 2026"
export function formatDisplayDate(d: Date): string {
  if (!d || isNaN(d.getTime())) return '';
  const day = d.getDate();
  const suffix = (day === 1 || day === 21 || day === 31) ? 'st' :
                 (day === 2 || day === 22) ? 'nd' :
                 (day === 3 || day === 23) ? 'rd' : 'th';
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day}${suffix} ${month} ${year}`;
}

export function formatISODate(d: Date): string {
  if (!d || isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDayOfWeekName(d: Date): string {
  if (!d || isNaN(d.getTime())) return '';
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[d.getDay()];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function DatePicker({
  value,
  onChange,
  label,
  placeholder = 'Select Date',
  minDate,
  maxDate,
  rangeStart,
  rangeEnd,
  disabled = false,
  id,
  className = '',
  badgeText,
  theme = 'emerald',
  helperText,
  errorMessage,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = parseDateSafe(value);
  const minParsed = parseDateSafe(minDate);
  const maxParsed = parseDateSafe(maxDate);
  const rangeStartParsed = parseDateSafe(rangeStart);
  const rangeEndParsed = parseDateSafe(rangeEnd);

  // Current view month & year in calendar derived from selection or manual navigation
  const baseViewDate = selectedDate || minParsed || new Date();
  const [navYearMonth, setNavYearMonth] = useState<{ year: number; month: number } | null>(null);

  const viewYear = navYearMonth?.year ?? baseViewDate.getFullYear();
  const viewMonth = navYearMonth?.month ?? baseViewDate.getMonth();

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setNavYearMonth(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setNavYearMonth(null);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setNavYearMonth({ year: viewYear - 1, month: 11 });
    } else {
      setNavYearMonth({ year: viewYear, month: viewMonth - 1 });
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setNavYearMonth({ year: viewYear + 1, month: 0 });
    } else {
      setNavYearMonth({ year: viewYear, month: viewMonth + 1 });
    }
  };

  const isDateDisabled = (d: Date): boolean => {
    const time = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (minParsed) {
      const minTime = new Date(minParsed.getFullYear(), minParsed.getMonth(), minParsed.getDate()).getTime();
      if (time < minTime) return true;
    }
    if (maxParsed) {
      const maxTime = new Date(maxParsed.getFullYear(), maxParsed.getMonth(), maxParsed.getDate()).getTime();
      if (time > maxTime) return true;
    }
    return false;
  };

  const isDateSelected = (d: Date): boolean => {
    if (!selectedDate) return false;
    return (
      d.getFullYear() === selectedDate.getFullYear() &&
      d.getMonth() === selectedDate.getMonth() &&
      d.getDate() === selectedDate.getDate()
    );
  };

  const isToday = (d: Date): boolean => {
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  };

  const isDateInRange = (d: Date): boolean => {
    if (!rangeStartParsed || !rangeEndParsed) return false;
    const time = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const start = new Date(rangeStartParsed.getFullYear(), rangeStartParsed.getMonth(), rangeStartParsed.getDate()).getTime();
    const end = new Date(rangeEndParsed.getFullYear(), rangeEndParsed.getMonth(), rangeEndParsed.getDate()).getTime();
    return time >= start && time <= end;
  };

  const handleSelectDate = (d: Date) => {
    if (isDateDisabled(d)) return;
    const formatted = formatDisplayDate(d);
    onChange(formatted, d);
    setNavYearMonth(null);
    setIsOpen(false);
  };

  // Generate calendar day cells
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const calendarDays: { date: Date; isCurrentMonth: boolean }[] = [];

  // Leading days from previous month
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const prevDate = new Date(viewYear, viewMonth - 1, daysInPrevMonth - i);
    calendarDays.push({ date: prevDate, isCurrentMonth: false });
  }

  // Days in current month
  for (let i = 1; i <= daysInMonth; i++) {
    const currDate = new Date(viewYear, viewMonth, i);
    calendarDays.push({ date: currDate, isCurrentMonth: true });
  }

  // Trailing days for next month to fill grid (up to 35 or 42 cells)
  const remainingCells = 42 - calendarDays.length;
  for (let i = 1; i <= remainingCells && calendarDays.length < 42; i++) {
    const nextDate = new Date(viewYear, viewMonth + 1, i);
    calendarDays.push({ date: nextDate, isCurrentMonth: false });
  }

  // Quick preset options
  const handleQuickAddDays = (daysToAdd: number) => {
    const base = minParsed || new Date();
    const target = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    target.setDate(target.getDate() + daysToAdd);
    if (!isDateDisabled(target)) {
      handleSelectDate(target);
    }
  };

  const themePrimaryBg = theme === 'teal' ? 'bg-teal-800 hover:bg-teal-900' : 'bg-emerald-800 hover:bg-emerald-900';
  const themeSelectedBg = theme === 'teal' ? 'bg-teal-800 text-white' : 'bg-emerald-800 text-white';
  const themeRangeBg = theme === 'teal' ? 'bg-teal-100/60 text-teal-950' : 'bg-emerald-100/60 text-emerald-950';
  const themeBorderFocus = theme === 'teal' ? 'focus:ring-teal-600 border-teal-500' : 'focus:ring-emerald-600 border-emerald-500';

  return (
    <div className={`relative ${className}`} ref={containerRef} id={id}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-bold text-slate-700">
            {label}
          </label>
          {badgeText && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
              theme === 'teal' ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}>
              {badgeText}
            </span>
          )}
        </div>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left p-2.5 sm:p-3 min-h-[46px] rounded-xl border transition-all flex items-center justify-between gap-2 ${
          isOpen
            ? `ring-2 ${theme === 'teal' ? 'ring-teal-500/20 border-teal-500 bg-teal-50/20' : 'ring-emerald-500/20 border-emerald-500 bg-emerald-50/20'} shadow-xs`
            : 'border-slate-300 bg-white hover:border-slate-400 shadow-2xs'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${
            theme === 'teal' ? 'bg-teal-100/70 text-teal-800' : 'bg-emerald-100/70 text-emerald-800'
          }`}>
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              {selectedDate ? formatDisplayDate(selectedDate) : <span className="text-slate-400 font-normal">{placeholder}</span>}
            </div>
            {selectedDate && (
              <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                <span>{getDayOfWeekName(selectedDate)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-slate-700' : ''}`} />
        </div>
      </button>

      {/* Helper text / error */}
      {errorMessage && (
        <p className="text-[11px] text-rose-600 font-semibold mt-1">
          {errorMessage}
        </p>
      )}
      {!errorMessage && helperText && (
        <p className="text-[11px] text-slate-500 font-medium mt-1">
          {helperText}
        </p>
      )}

      {/* Calendar Popover */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 left-0 w-[calc(100vw-3rem)] max-w-xs sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 sm:p-3.5 space-y-2.5 sm:space-y-3 animate-in fade-in zoom-in-95 duration-150">
          {/* Header with Month/Year Navigation */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 font-bold text-slate-800 text-sm">
              <span>{MONTH_NAMES[viewMonth]}</span>
              <span>{viewYear}</span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick presets (e.g. +3 Days, +5 Days, +7 Days) */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-semibold text-slate-600 scrollbar-none">
            <span className="text-[10px] text-slate-400 uppercase font-bold pr-0.5 shrink-0">Quick:</span>
            {[
              { label: 'Today', days: 0 },
              { label: 'Tomorrow', days: 1 },
              { label: '+3 Days', days: 3 },
              { label: '+5 Days', days: 5 },
              { label: '+7 Days', days: 7 },
            ].map((preset) => {
              const base = minParsed || new Date();
              const target = new Date(base.getFullYear(), base.getMonth(), base.getDate());
              target.setDate(target.getDate() + preset.days);
              const disabledPreset = isDateDisabled(target);

              return (
                <button
                  key={preset.label}
                  type="button"
                  disabled={disabledPreset}
                  onClick={() => handleQuickAddDays(preset.days)}
                  className={`px-2 py-0.5 rounded-md border text-[10px] whitespace-nowrap transition-colors ${
                    disabledPreset
                      ? 'opacity-30 cursor-not-allowed bg-slate-50 border-slate-100 text-slate-400'
                      : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Weekday Row */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-[11px] font-bold text-slate-400 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.slice(0, (firstDayOfMonth + daysInMonth > 35 ? 42 : 35)).map(({ date, isCurrentMonth }, idx) => {
              const disabledDay = isDateDisabled(date);
              const selectedDay = isDateSelected(date);
              const todayDay = isToday(date);
              const inRange = isDateInRange(date);

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={disabledDay || !isCurrentMonth}
                  onClick={() => handleSelectDate(date)}
                  className={`h-8 w-8 mx-auto rounded-lg text-xs font-semibold flex items-center justify-center transition-all relative ${
                    !isCurrentMonth
                      ? 'text-slate-300 cursor-default opacity-40'
                      : disabledDay
                      ? 'text-slate-300 cursor-not-allowed bg-slate-50/50 line-through opacity-50'
                      : selectedDay
                      ? `${themeSelectedBg} font-bold shadow-2xs scale-105 z-10`
                      : inRange
                      ? `${themeRangeBg} font-bold`
                      : 'text-slate-700 hover:bg-slate-100 cursor-pointer'
                  } ${todayDay && !selectedDay ? 'ring-1.5 ring-emerald-600 font-black' : ''}`}
                >
                  <span>{date.getDate()}</span>
                  {todayDay && !selectedDay && (
                    <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-emerald-600" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Popover Footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="text-[11px] text-slate-500 font-medium truncate">
              {selectedDate ? (
                <span className="font-semibold text-slate-800">
                  {formatDisplayDate(selectedDate)}
                </span>
              ) : (
                'Choose a date'
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
