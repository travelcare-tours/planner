'use client';

import React, { useState, useRef, useEffect, useId, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  icon?: React.ReactNode;
}

export interface CustomSelectProps {
  value?: string;
  onChange: (value: string) => void;
  options: (string | SelectOption)[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  theme?: 'emerald' | 'rose' | 'navy';
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
  title?: string;
  id?: string;
  searchable?: boolean;
  fullWidth?: boolean;
}

export function CustomSelect({
  value = '',
  onChange,
  options,
  placeholder = 'Select option...',
  disabled = false,
  className = '',
  triggerClassName = '',
  menuClassName = '',
  theme = 'emerald',
  size = 'md',
  ariaLabel,
  title,
  id,
  searchable,
  fullWidth = true,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; openUpward: boolean }>({
    top: 0,
    left: 0,
    width: 0,
    openUpward: false,
  });

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const generatedId = useId();
  const selectId = id || generatedId;

  // Normalize options to SelectOption[]
  const normalizedOptions: SelectOption[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Selected option object
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === (value || ''));
  }, [normalizedOptions, value]);

  // Whether search should be enabled (auto-enabled if options > 7 or explicitly set)
  const isSearchEnabled = searchable !== undefined ? searchable : normalizedOptions.length > 7;

  // Filtered options based on query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q) ||
        (opt.description && opt.description.toLowerCase().includes(q))
    );
  }, [normalizedOptions, searchQuery]);

  // Calculate coordinates for portal positioning
  const updateCoords = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < 260 && spaceAbove > spaceBelow;

    setCoords({
      top: openUpward ? rect.top - 6 : rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 220) - 8)),
      width: Math.max(rect.width, 180),
      openUpward,
    });
  };

  // Open/Close toggle
  const toggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      updateCoords();
      setSearchQuery('');
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updateCoords();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

  // Focus search input when menu opens
  useEffect(() => {
    if (isOpen && isSearchEnabled && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, isSearchEnabled]);

  // Handle option select
  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  // Theme color styles
  const themeStyles = {
    emerald: {
      borderFocus: 'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-600/25',
      activeItem: 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200/80',
      activeIcon: 'text-emerald-700',
      badge: 'bg-emerald-100 text-emerald-800',
      hoverBorder: 'hover:border-emerald-400',
    },
    rose: {
      borderFocus: 'focus:border-rose-500 focus:ring-2 focus:ring-rose-600/25',
      activeItem: 'bg-rose-50 text-rose-950 font-bold border border-rose-200/80',
      activeIcon: 'text-rose-700',
      badge: 'bg-rose-100 text-rose-800',
      hoverBorder: 'hover:border-rose-400',
    },
    navy: {
      borderFocus: 'focus:border-[#0B2545] focus:ring-2 focus:ring-[#0B2545]/25',
      activeItem: 'bg-slate-100 text-slate-900 font-bold border border-slate-300',
      activeIcon: 'text-[#0B2545]',
      badge: 'bg-slate-200 text-slate-800',
      hoverBorder: 'hover:border-slate-400',
    },
  }[theme];

  // Size styles
  const sizeStyles = {
    sm: 'h-9 text-xs px-2.5 rounded-xl',
    md: 'h-10 sm:h-11 text-xs sm:text-sm px-3 rounded-xl',
    lg: 'h-11 sm:h-12 text-xs sm:text-sm px-3.5 rounded-xl',
  }[size];

  return (
    <div className={`relative ${fullWidth ? 'w-full' : 'inline-block'} ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id={selectId}
        aria-label={ariaLabel || title || placeholder}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={toggleOpen}
        title={title}
        className={`w-full flex items-center justify-between gap-2 bg-white border border-slate-300 text-slate-800 font-semibold shadow-2xs transition-all cursor-pointer select-none outline-hidden disabled:opacity-50 disabled:cursor-not-allowed ${sizeStyles} ${themeStyles.hoverBorder} ${themeStyles.borderFocus} ${
          isOpen ? 'ring-2 ring-emerald-600/25 border-emerald-500' : ''
        } ${triggerClassName}`}
      >
        <span className="truncate text-left flex-1">
          {selectedOption ? selectedOption.label : <span className="text-slate-400 font-normal">{placeholder}</span>}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-700' : ''
          }`}
        />
      </button>

      {/* Floating Dropdown Menu (Portal into document.body to prevent table/card overflow clipping) */}
      {isOpen && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label={ariaLabel || placeholder}
            style={{
              position: 'fixed',
              top: coords.openUpward ? undefined : `${coords.top}px`,
              bottom: coords.openUpward ? `${window.innerHeight - coords.top}px` : undefined,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              minWidth: '200px',
              maxWidth: 'calc(100vw - 16px)',
              zIndex: 99999,
            }}
            className={`bg-white/98 backdrop-blur-2xl border border-slate-200/90 rounded-2xl shadow-2xl p-1.5 animate-in fade-in-50 zoom-in-98 duration-150 ring-1 ring-slate-900/5 ${menuClassName}`}
          >
            {/* Optional Search Bar */}
            {isSearchEnabled && (
              <div className="relative p-1.5 pb-2 mb-1 border-b border-slate-100">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to search..."
                  className="w-full h-8 pl-8 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-600 font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto space-y-0.5 overscroll-contain pr-0.5">
              {filteredOptions.length === 0 ? (
                <div className="py-4 px-3 text-center text-xs text-slate-400 font-medium">
                  No matching options found
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm text-left transition-all cursor-pointer group ${
                        isSelected
                          ? themeStyles.activeItem
                          : 'text-slate-700 hover:bg-slate-100/90 hover:text-slate-950 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                        <div className="truncate">
                          <div className="truncate font-semibold">{opt.label}</div>
                          {opt.description && (
                            <div className="text-[11px] text-slate-500 truncate font-normal">
                              {opt.description}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {opt.badge && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${themeStyles.badge}`}>
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && (
                          <Check className={`w-4 h-4 ${themeStyles.activeIcon} stroke-[2.5]`} />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
