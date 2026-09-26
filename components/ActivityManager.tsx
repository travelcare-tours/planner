'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  Sparkles, 
  Clock, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  RotateCcw,
  RefreshCw,
  Tag,
  GripVertical,
  Pencil,
  ArrowRightCircle
} from 'lucide-react';
import { TripDetails, DayItinerary, ActivityItem, DestinationCatalogItem } from '@/types/itinerary';
import { syncDaysWithAccommodationsAndPickup } from '@/components/TripDetailsForm';
import { CustomSelect } from '@/components/CustomSelect';

interface ActivityManagerProps {
  trip: TripDetails;
  onUpdateTrip: (updated: TripDetails) => void;
  catalog: DestinationCatalogItem[];
  onUpdateCatalog?: (newCatalog: DestinationCatalogItem[]) => void;
  onNavigateToPreview: () => void;
}

export const ActivityManager: React.FC<ActivityManagerProps> = ({
  trip,
  onUpdateTrip,
  catalog,
  onUpdateCatalog,
  onNavigateToPreview,
}) => {
  const [activeDayIndex, setActiveDayIndex] = useState<number>(0);
  const daySelectorRef = useRef<HTMLDivElement>(null);
  const customizationSectionRef = useRef<HTMLDivElement>(null);

  const handleSelectDay = (idx: number) => {
    setIsEditingDayTitle(false);
    setActiveDayIndex(idx);
    setTimeout(() => {
      customizationSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  };

  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);

  // Auto-sync days with accommodations if day count or destinations mismatch
  useEffect(() => {
    const totalNights = trip.accommodations.reduce((sum, a) => sum + (Number(a.nights) || 1), 0);
    const expectedDaysCount = totalNights + 1;

    // Check if destinations for each day match current accommodation schedule
    let destinationsMatch = true;
    if (trip.days && trip.days.length === expectedDaysCount) {
      let dIdx = 0;
      for (const acc of trip.accommodations) {
        const n = Math.max(1, Number(acc.nights) || 1);
        const normAccDest = (acc.destination || '').trim().toLowerCase();
        for (let i = 0; i < n; i++) {
          const day = trip.days[dIdx];
          const normDayDest = (day?.destination || '').trim().toLowerCase();
          if (
            !day ||
            !normDayDest ||
            (!normDayDest.includes(normAccDest) && !normAccDest.includes(normDayDest))
          ) {
            destinationsMatch = false;
            break;
          }
          dIdx++;
        }
        if (!destinationsMatch) break;
      }
    } else {
      destinationsMatch = false;
    }

    if (!destinationsMatch || !trip.days || trip.days.length !== expectedDaysCount) {
      const synced = syncDaysWithAccommodationsAndPickup(
        trip.days || [],
        trip.accommodations,
        trip.pickupDate,
        trip.dropoffLocation
      );
      onUpdateTrip({
        ...trip,
        durationNights: totalNights,
        durationDays: synced.length,
        days: synced,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.accommodations, trip.pickupDate, trip.dropoffLocation]);

  // One-click manual sync of all days and activities directly from current stay destinations
  const handleSyncAllDaysFromDestinations = () => {
    setIsSyncingAll(true);
    const totalNights = trip.accommodations.reduce((sum, a) => sum + (a.nights || 1), 0);
    const updatedDays = syncDaysWithAccommodationsAndPickup(
      trip.days || [],
      trip.accommodations,
      trip.pickupDate,
      trip.dropoffLocation
    );
    onUpdateTrip({
      ...trip,
      durationNights: totalNights,
      durationDays: updatedDays.length,
      days: updatedDays,
    });
    setTimeout(() => {
      setIsSyncingAll(false);
    }, 400);
  };

  // Auto-Save / Sync Status indicator state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSave = (updated: TripDetails) => {
    setSaveStatus('saving');
    onUpdateTrip(updated);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSaveStatus('saved');
    }, 450);
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Inline Editing state & refs for contenteditable
  const [editingActId, setEditingActId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'title' | 'description' | null>(null);
  const activeEditableRef = useRef<HTMLElement | null>(null);
  const isCancelingEditRef = useRef<boolean>(false);

  // Day Heading (Title) inline editing state
  const [isEditingDayTitle, setIsEditingDayTitle] = useState<boolean>(false);
  const dayHeadingRef = useRef<HTMLHeadingElement | null>(null);

  // Auto-focus Day Heading when editing is activated
  useEffect(() => {
    if (isEditingDayTitle && dayHeadingRef.current) {
      const el = dayHeadingRef.current;
      el.focus();
      try {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(el);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      } catch {
        // fallback
      }
    }
  }, [isEditingDayTitle]);

  // Auto-focus Activity Title or Description when editing is activated
  useEffect(() => {
    if (editingActId && editingField && activeEditableRef.current) {
      const el = activeEditableRef.current;
      el.focus();
      try {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(el);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      } catch {
        // fallback
      }
    }
  }, [editingActId, editingField]);

  const startEditing = (actId: string, field: 'title' | 'description') => {
    setEditingActId(actId);
    setEditingField(field);
  };

  const commitEditingDirect = (dayIdx: number, actId: string, field: 'title' | 'description', rawText: string) => {
    if (isCancelingEditRef.current) {
      isCancelingEditRef.current = false;
      setEditingActId(null);
      setEditingField(null);
      return;
    }
    if (!editingActId || !editingField) return;
    const trimmed = rawText.trim();
    const updatedDays = [...trip.days];
    const targetDay = { ...updatedDays[dayIdx] };
    targetDay.activities = targetDay.activities.map((a) => {
      if (a.id === actId) {
        if (field === 'title') {
          return { ...a, title: trimmed || a.title };
        } else {
          return { ...a, description: trimmed || undefined };
        }
      }
      return a;
    });
    updatedDays[dayIdx] = targetDay;
    triggerSave({ ...trip, days: updatedDays });
    setEditingActId(null);
    setEditingField(null);
  };

  const commitDayTitleDirect = (dayIdx: number, rawText: string) => {
    if (isCancelingEditRef.current) {
      isCancelingEditRef.current = false;
      setIsEditingDayTitle(false);
      return;
    }
    if (!isEditingDayTitle) return;
    const trimmed = rawText.trim();
    const updatedDays = [...trip.days];
    const targetDay = { ...updatedDays[dayIdx] };
    targetDay.title = trimmed || targetDay.title || `Day ${targetDay.dayNumber}: ${targetDay.destination}`;
    updatedDays[dayIdx] = targetDay;
    triggerSave({ ...trip, days: updatedDays });
    setIsEditingDayTitle(false);
  };

  // Drag and drop reordering state
  const [draggedActIndex, setDraggedActIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedActIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedActIndex === null || draggedActIndex === targetIndex) {
      setDraggedActIndex(null);
      setDragOverIndex(null);
      return;
    }
    const updatedDays = [...trip.days];
    const targetDay = { ...updatedDays[activeDayIndex] };
    const acts = [...targetDay.activities];
    const [movedItem] = acts.splice(draggedActIndex, 1);
    acts.splice(targetIndex, 0, movedItem);
    targetDay.activities = acts;
    updatedDays[activeDayIndex] = targetDay;
    triggerSave({ ...trip, days: updatedDays });
    setDraggedActIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedActIndex(null);
    setDragOverIndex(null);
  };

  // Quick move activity to next day
  const moveActivityToNextDay = (currentDayIdx: number, actId: string) => {
    if (currentDayIdx >= trip.days.length - 1) return;
    const updatedDays = [...trip.days];
    const currentDayObj = { ...updatedDays[currentDayIdx] };
    const nextDayObj = { ...updatedDays[currentDayIdx + 1] };

    const targetAct = currentDayObj.activities.find(a => a.id === actId);
    if (!targetAct) return;

    // Remove from current day
    currentDayObj.activities = currentDayObj.activities.filter(a => a.id !== actId);
    // Append to next day
    nextDayObj.activities = [...nextDayObj.activities, { ...targetAct, isSelected: true }];

    updatedDays[currentDayIdx] = currentDayObj;
    updatedDays[currentDayIdx + 1] = nextDayObj;

    triggerSave({ ...trip, days: updatedDays });
  };

  // Optional activity helper
  const isActivityOptional = (act: ActivityItem) => {
    const t = (act.title || '').toLowerCase();
    const d = (act.description || '').toLowerCase();
    return t.includes('(optional)') || t.includes('[optional]') || d.includes('(optional)') || d.includes('[optional]');
  };

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ActivityItem['category']>('Sightseeing');
  const [newTiming, setNewTiming] = useState<ActivityItem['timing']>('Morning');
  const [newDescription, setNewDescription] = useState('');

  const currentDay: DayItinerary | undefined = trip.days[activeDayIndex];

  // Helper to toggle activity selection
  const toggleActivitySelection = (dayIdx: number, actId: string) => {
    const updatedDays = [...trip.days];
    const targetDay = { ...updatedDays[dayIdx] };
    targetDay.activities = targetDay.activities.map((act) => 
      act.id === actId ? { ...act, isSelected: !act.isSelected } : act
    );
    updatedDays[dayIdx] = targetDay;
    triggerSave({ ...trip, days: updatedDays });
  };



  // Remove activity
  const removeActivity = (dayIdx: number, actId: string) => {
    const updatedDays = [...trip.days];
    const targetDay = { ...updatedDays[dayIdx] };
    targetDay.activities = targetDay.activities.filter((act) => act.id !== actId);
    updatedDays[dayIdx] = targetDay;
    triggerSave({ ...trip, days: updatedDays });
  };

  // Select all or deselect all for current day
  const setAllSelected = (dayIdx: number, select: boolean) => {
    const updatedDays = [...trip.days];
    const targetDay = { ...updatedDays[dayIdx] };
    targetDay.activities = targetDay.activities.map((act) => ({
      ...act,
      isSelected: select,
    }));
    updatedDays[dayIdx] = targetDay;
    triggerSave({ ...trip, days: updatedDays });
  };

  // Add custom activity to current day with automatic persistence
  const handleAddCustomActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newActivity: ActivityItem = {
      id: `custom-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      timing: newTiming,
      description: newDescription.trim() || undefined,
      isSelected: true,
      isCustom: true,
    };

    const updatedDays = [...trip.days];
    const targetDay = { ...updatedDays[activeDayIndex] };
    targetDay.activities = [...targetDay.activities, newActivity];
    updatedDays[activeDayIndex] = targetDay;
    
    // 1. Auto-save to current trip & session
    triggerSave({ ...trip, days: updatedDays });

    // 2. Auto-save to master destination catalog so it is remembered for future itineraries
    try {
      if (targetDay.destination) {
        const destKey = targetDay.destination.toLowerCase().trim();
        if (onUpdateCatalog && catalog && catalog.length > 0) {
          const updatedCatalog = catalog.map((cat) => {
            if (
              cat.destination.toLowerCase().includes(destKey) ||
              destKey.includes(cat.destination.toLowerCase())
            ) {
              const alreadyExists = cat.defaultActivities.some(
                (a) => a.title.toLowerCase() === newActivity.title.toLowerCase()
              );
              if (!alreadyExists) {
                return {
                  ...cat,
                  defaultActivities: [...cat.defaultActivities, newActivity],
                };
              }
            }
            return cat;
          });
          onUpdateCatalog(updatedCatalog);
        }

        // 3. Persist to custom activities pool in localStorage
        if (typeof window !== 'undefined') {
          const storedCustom = localStorage.getItem('tct_custom_activities_pool');
          const customPool: ActivityItem[] = storedCustom ? JSON.parse(storedCustom) : [];
          if (!customPool.some((a) => a.title.toLowerCase() === newActivity.title.toLowerCase())) {
            customPool.push(newActivity);
            localStorage.setItem('tct_custom_activities_pool', JSON.stringify(customPool));
          }
        }
      }
    } catch (err) {
      console.warn('Auto-save custom activity pool notice:', err);
    }

    // Reset modal
    setNewTitle('');
    setNewDescription('');
    setShowAddModal(false);
  };

  // Sync / pull all activities from catalog for this destination
  const syncFromCatalog = () => {
    if (!currentDay) return;
    const destName = currentDay.destination.toLowerCase();
    const matched = catalog.find(
      (c) => destName.includes(c.destination.toLowerCase()) || c.destination.toLowerCase().includes(destName)
    );

    if (!matched) {
      alert(`No default catalog found matching destination "${currentDay.destination}". You can add one in the Destination Catalog tab!`);
      return;
    }

    const existingTitles = new Set(currentDay.activities.map((a) => a.title.toLowerCase()));
    const newItems: ActivityItem[] = matched.defaultActivities
      .filter((def) => !existingTitles.has(def.title.toLowerCase()))
      .map((def) => ({
        ...def,
        isSelected: true,
      }));

    if (newItems.length === 0) {
      alert('All activities from the destination catalog are already added to this day.');
      return;
    }

    const updatedDays = [...trip.days];
    const targetDay = { ...updatedDays[activeDayIndex] };
    targetDay.activities = [...targetDay.activities, ...newItems];
    updatedDays[activeDayIndex] = targetDay;
    triggerSave({ ...trip, days: updatedDays });
  };

  // Calculate totals across all days
  const totalActivitiesCount = trip.days.reduce((acc, d) => acc + d.activities.length, 0);
  const selectedActivitiesCount = trip.days.reduce(
    (acc, d) => acc + d.activities.filter((a) => a.isSelected).length, 
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Instructions */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-800/80 text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-2 border border-emerald-700/50">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Critical Feature: Activity Management
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Curate Sightseeing & Activities
            </h2>
            <p className="text-sm text-emerald-100/80 mt-1 max-w-2xl leading-relaxed">
              Tick or untick points of interest for each day. Only <span className="text-emerald-300 font-semibold underline underline-offset-2">checked activities</span> will be rendered in the final multi-page PDF itinerary for the guest. Reorder them in sequence to match travel timing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/15">
            <div className="text-center px-3 border-r border-white/20">
              <div className="text-2xl font-black text-white">{selectedActivitiesCount}</div>
              <div className="text-[11px] text-emerald-200 uppercase font-medium">Selected</div>
            </div>
            <div className="text-center px-3">
              <div className="text-2xl font-black text-emerald-300">{totalActivitiesCount}</div>
              <div className="text-[11px] text-emerald-200 uppercase font-medium">Available</div>
            </div>
            <button
              type="button"
              onClick={() => handleSyncAllDaysFromDestinations()}
              disabled={isSyncingAll}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-lg transition-all border border-white/25 whitespace-nowrap cursor-pointer"
              title="Re-synchronize all days and activities directly from current stay destinations"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-300 ${isSyncingAll ? 'animate-spin' : ''}`} />
              <span>Sync from Destinations</span>
            </button>
            <button
              onClick={() => onNavigateToPreview()}
              className="ml-1 px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-bold text-xs rounded-lg transition-all shadow-sm shadow-emerald-950/30 whitespace-nowrap"
            >
              Preview in PDF →
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Days Navigator on Left / Current Day Activities on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Day Selection tabs - sticky on desktop */}
        <div ref={daySelectorRef} id="day-selector-section" className="lg:col-span-4 space-y-3 scroll-mt-20 lg:sticky lg:top-20 lg:self-start">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Trip Itinerary Days ({trip.days.length} Days)
            </h3>
            <span className="text-[11px] text-emerald-700 font-medium">Click day to customize</span>
          </div>

          <div className="space-y-2">
            {trip.days.map((day, idx) => {
              const selectedCount = day.activities.filter((a) => a.isSelected).length;
              const isCurrent = activeDayIndex === idx;
              const isDayHighPace = selectedCount > 5;

              return (
                <div
                  key={day.dayNumber}
                  id={`day-nav-tab-${day.dayNumber}`}
                  onClick={() => handleSelectDay(idx)}
                  className={`group cursor-pointer rounded-xl p-3.5 transition-all border ${
                    isCurrent
                      ? 'bg-emerald-900 text-white border-emerald-950 shadow-md ring-2 ring-emerald-600/30'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                        isCurrent ? 'bg-emerald-500 text-emerald-950' : 'bg-slate-100 text-slate-700'
                      }`}>
                        D{day.dayNumber}
                      </span>
                      <div>
                        <div className="font-semibold text-sm leading-tight group-hover:text-emerald-700 transition-colors">
                          <span className={isCurrent ? 'text-white' : 'text-slate-900'}>{day.destination}</span>
                        </div>
                        <div className={`text-[11px] ${isCurrent ? 'text-emerald-200' : 'text-slate-500'}`}>
                          {day.date}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        isCurrent 
                          ? isDayHighPace ? 'bg-amber-500 text-slate-950 font-bold border border-amber-400' : 'bg-emerald-800 text-emerald-100 border border-emerald-700' 
                          : isDayHighPace
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                            : selectedCount > 0 
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                              : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isDayHighPace && <AlertTriangle className="w-3 h-3 mr-1 text-amber-600 shrink-0 inline" />}
                        {selectedCount} / {day.activities.length} acts
                      </span>
                    </div>
                  </div>

                  <p className={`text-xs mt-2 line-clamp-1 ${isCurrent ? 'text-emerald-100/90' : 'text-slate-600'}`}>
                    {day.title}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Quick tip box */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-950">
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              Staff Verification Note
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              Always review the guest pace. For elderly guests or infants, keep 2–3 relaxing activities per day. For active honeymooners or youth, 4–5 activities work best.
            </p>
          </div>
        </div>

        {/* Right Column: Active Day Activity Customization Panel */}
        <div ref={customizationSectionRef} id="customization-section" className="lg:col-span-8 space-y-4 scroll-mt-20">
          {currentDay && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-5">
              {/* Day Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-xs">
                      Day {currentDay.dayNumber}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {currentDay.date}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      {currentDay.destination}
                    </span>
                    {currentDay.activities.filter(a => a.isSelected).length > 5 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Pace Warning ({currentDay.activities.filter(a => a.isSelected).length} acts)
                      </span>
                    )}
                  </div>
                  <div className="group/dayhead relative flex items-center gap-2 max-w-full">
                    <h3
                      ref={dayHeadingRef}
                      contentEditable={isEditingDayTitle}
                      suppressContentEditableWarning={true}
                      onClick={() => {
                        if (!isEditingDayTitle) {
                          setIsEditingDayTitle(true);
                        }
                      }}
                      onBlur={(e) => {
                        commitDayTitleDirect(activeDayIndex, e.currentTarget.innerText);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          isCancelingEditRef.current = true;
                          e.currentTarget.innerText = currentDay.title || `Day ${currentDay.dayNumber}: ${currentDay.destination}`;
                          setIsEditingDayTitle(false);
                          e.currentTarget.blur();
                        }
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const text = e.clipboardData.getData('text/plain');
                        document.execCommand('insertText', false, text);
                      }}
                      style={
                        isEditingDayTitle
                          ? {
                              outline: '2px dashed #008080',
                              padding: '4px 8px',
                              background: '#f8fcfc',
                              borderRadius: '6px',
                            }
                          : undefined
                      }
                      className={`text-lg font-bold leading-snug transition-all ${
                        isEditingDayTitle
                          ? 'text-slate-900 cursor-text shadow-xs'
                          : 'text-slate-900 hover:bg-emerald-50/80 px-2 py-1 -mx-2 rounded-xl cursor-pointer'
                      }`}
                      title={isEditingDayTitle ? 'Press Enter or click outside to save' : 'Click to edit day heading'}
                    >
                      {currentDay.title || `Day ${currentDay.dayNumber}: ${currentDay.destination}`}
                    </h3>
                    {!isEditingDayTitle && (
                      <button
                        type="button"
                        onClick={() => setIsEditingDayTitle(true)}
                        className="p-1 text-slate-400 hover:text-emerald-700 opacity-0 group-hover/dayhead:opacity-100 transition-opacity shrink-0 cursor-pointer"
                        title="Edit day heading"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Route: <span className="font-medium text-slate-700">{currentDay.route}</span>
                  </p>
                </div>

                {/* Right controls: Auto-Save Status, Load Catalog, Add Activity */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Auto-Save Status Indicator */}
                  <div 
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-600 shadow-2xs"
                    title={saveStatus === 'saving' ? 'Saving edits...' : 'All changes are automatically synced to session'}
                  >
                    {saveStatus === 'saving' ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                        <span className="text-slate-600 text-[11px] font-bold">Syncing...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-800 text-[11px] font-bold">All changes saved</span>
                      </>
                    )}
                  </div>

                  <button
                    id="btn-sync-catalog"
                    type="button"
                    onClick={syncFromCatalog}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                    title="Pull more sightseeing spots from master catalog"
                  >
                    <RotateCcw className="w-3 h-3 text-emerald-600" />
                    Load Catalog
                  </button>
                  <button
                    id="btn-add-custom-act"
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-2xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Activity
                  </button>
                </div>
              </div>

              {/* Status Banner with Grouped Bulk Actions & Automated Pace Warning */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200/70 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-slate-700 font-medium">
                      Showing <strong className="text-emerald-900">{currentDay.activities.filter(a => a.isSelected).length}</strong> selected out of <strong>{currentDay.activities.length}</strong> available sightseeing points.
                    </span>
                  </div>

                  {/* Grouped Bulk Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <button
                      id="btn-select-all-day"
                      type="button"
                      onClick={() => setAllSelected(activeDayIndex, true)}
                      className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-emerald-900 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
                      title="Tick all activities for this day"
                    >
                      Select All
                    </button>
                    <button
                      id="btn-deselect-all-day"
                      type="button"
                      onClick={() => setAllSelected(activeDayIndex, false)}
                      className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-rose-900 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
                      title="Untick all activities"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Automated Pace Warning Banner */}
                {currentDay.activities.filter(a => a.isSelected).length > 5 && (
                  <div className="flex items-start gap-2.5 bg-amber-50/90 border border-amber-300 rounded-xl px-4 py-2.5 text-xs text-amber-950 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="font-bold">Automated Pace Warning: </span>
                      <span>This day has <strong>{currentDay.activities.filter(a => a.isSelected).length} activities selected</strong>. Staff guidelines advise 2–3 relaxing activities for elderly guests/infants and 4–5 for active youth. Consider unchecking non-essential spots or moving some to the next day.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Activities List */}
              <div className="space-y-3">
                {currentDay.activities.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No activities listed for this day yet.</p>
                    <p className="text-xs text-slate-500 mt-1">Click &ldquo;Load Catalog&rdquo; to pull destination sights or &ldquo;Add Activity&rdquo; to create one.</p>
                    <div className="mt-4 flex justify-center gap-2">
                      <button
                        onClick={syncFromCatalog}
                        className="px-3 py-1.5 text-xs font-bold bg-emerald-800 text-white rounded-lg cursor-pointer hover:bg-emerald-900"
                      >
                        Load {currentDay.destination} Catalog
                      </button>
                    </div>
                  </div>
                ) : (
                  currentDay.activities.map((act, actIdx) => {
                    const isOptional = isActivityOptional(act);
                    const isEditingTitle = editingActId === act.id && editingField === 'title';
                    const isEditingDesc = editingActId === act.id && editingField === 'description';
                    const isDragOver = dragOverIndex === actIdx;
                    const isBeingDragged = draggedActIndex === actIdx;

                    return (
                      <div
                        key={act.id}
                        id={`activity-item-${act.id}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, actIdx)}
                        onDragOver={(e) => handleDragOver(e, actIdx)}
                        onDrop={(e) => handleDrop(e, actIdx)}
                        onDragEnd={handleDragEnd}
                        className={`relative rounded-xl border p-3.5 sm:p-4 transition-all group ${
                          isOptional
                            ? act.isSelected
                              ? 'bg-amber-50/25 border-dashed border-amber-300 shadow-xs ring-1 ring-amber-400/20'
                              : 'bg-slate-50/70 border-dashed border-slate-200 opacity-60 hover:opacity-90'
                            : act.isSelected
                              ? 'bg-white border-emerald-300 shadow-xs ring-1 ring-emerald-500/10'
                              : 'bg-slate-50/70 border-slate-200 opacity-60 hover:opacity-90'
                        } ${isDragOver ? 'border-emerald-600 ring-2 ring-emerald-500/40 bg-emerald-50/40 scale-[1.01]' : ''} ${
                          isBeingDragged ? 'opacity-30 border-dashed border-slate-400' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2.5 sm:gap-3">
                          {/* Drag Handle Icon */}
                          <div 
                            className="pt-1 text-slate-300 group-hover:text-slate-500 hover:text-slate-800 cursor-grab active:cursor-grabbing transition-colors shrink-0"
                            title="Drag to reorder activity sequence"
                          >
                            <GripVertical className="w-4 h-4 stroke-[2.2]" />
                          </div>

                          {/* Checkbox */}
                          <button
                            type="button"
                            onClick={() => toggleActivitySelection(activeDayIndex, act.id)}
                            className={`mt-0.5 rounded-md p-1 transition-all shrink-0 cursor-pointer ${
                              act.isSelected
                                ? 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200'
                                : 'text-slate-400 bg-white border border-slate-300 hover:border-slate-400'
                            }`}
                            title={act.isSelected ? 'Click to untick (remove from PDF)' : 'Click to tick (include in PDF)'}
                          >
                            {act.isSelected ? (
                              <CheckSquare className="w-5 h-5" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>

                          {/* Order badge */}
                          <div className="text-slate-400 text-xs font-mono font-bold pt-1 w-5 text-center shrink-0">
                            #{actIdx + 1}
                          </div>

                          {/* Activity Details: Live Inline Editable */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Inline Title Editing with contenteditable */}
                              <div className="group/title inline-flex items-center gap-1.5 max-w-full">
                                <h4
                                  ref={(node) => {
                                    if (isEditingTitle) {
                                      activeEditableRef.current = node;
                                    }
                                  }}
                                  contentEditable={isEditingTitle}
                                  suppressContentEditableWarning={true}
                                  onClick={() => {
                                    if (!isEditingTitle) {
                                      startEditing(act.id, 'title');
                                    }
                                  }}
                                  onBlur={(e) => {
                                    commitEditingDirect(activeDayIndex, act.id, 'title', e.currentTarget.innerText);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      e.currentTarget.blur();
                                    }
                                    if (e.key === 'Escape') {
                                      e.preventDefault();
                                      isCancelingEditRef.current = true;
                                      e.currentTarget.innerText = act.title;
                                      setEditingActId(null);
                                      setEditingField(null);
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  onPaste={(e) => {
                                    e.preventDefault();
                                    const text = e.clipboardData.getData('text/plain');
                                    document.execCommand('insertText', false, text);
                                  }}
                                  style={
                                    isEditingTitle
                                      ? {
                                          outline: '2px dashed #008080',
                                          padding: '4px 6px',
                                          background: '#f8fcfc',
                                          borderRadius: '6px',
                                        }
                                      : undefined
                                  }
                                  className={`text-sm font-bold leading-tight transition-all ${
                                    isEditingTitle
                                      ? 'text-slate-900 cursor-text shadow-xs'
                                      : `${act.isSelected ? 'text-slate-900' : 'text-slate-600 line-through'} hover:bg-emerald-50/80 px-1.5 py-0.5 -mx-1.5 rounded-lg cursor-pointer`
                                  }`}
                                  title={isEditingTitle ? 'Press Enter or click outside to save' : 'Click to edit activity name'}
                                >
                                  {act.title}
                                </h4>
                                {!isEditingTitle && (
                                  <button
                                    type="button"
                                    onClick={() => startEditing(act.id, 'title')}
                                    className="p-0.5 text-slate-400 hover:text-emerald-700 opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0 cursor-pointer"
                                    title="Edit activity name"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                )}
                              </div>

                              {/* Badges */}
                              {act.isCustom && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 uppercase tracking-wide">
                                  Custom
                                </span>
                              )}

                              {isOptional && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                                  Optional
                                </span>
                              )}
                            </div>

                            {/* Inline Description Editing with contenteditable */}
                            {act.description || isEditingDesc ? (
                              <div className="group/desc relative flex items-start justify-between gap-2 max-w-full">
                                <p
                                  ref={(node) => {
                                    if (isEditingDesc) {
                                      activeEditableRef.current = node;
                                    }
                                  }}
                                  contentEditable={isEditingDesc}
                                  suppressContentEditableWarning={true}
                                  onClick={() => {
                                    if (!isEditingDesc) {
                                      startEditing(act.id, 'description');
                                    }
                                  }}
                                  onBlur={(e) => {
                                    commitEditingDirect(activeDayIndex, act.id, 'description', e.currentTarget.innerText);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      e.currentTarget.blur();
                                    }
                                    if (e.key === 'Escape') {
                                      e.preventDefault();
                                      isCancelingEditRef.current = true;
                                      e.currentTarget.innerText = act.description || '';
                                      setEditingActId(null);
                                      setEditingField(null);
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  onPaste={(e) => {
                                    e.preventDefault();
                                    const text = e.clipboardData.getData('text/plain');
                                    document.execCommand('insertText', false, text);
                                  }}
                                  style={
                                    isEditingDesc
                                      ? {
                                          outline: '2px dashed #008080',
                                          padding: '4px 6px',
                                          background: '#f8fcfc',
                                          borderRadius: '6px',
                                        }
                                      : undefined
                                  }
                                  data-placeholder="Add guidance, photography notes, or details..."
                                  className={`text-xs leading-relaxed transition-all whitespace-pre-wrap flex-1 ${
                                    isEditingDesc
                                      ? 'text-slate-800 cursor-text shadow-xs empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:italic'
                                      : 'text-slate-600 hover:bg-emerald-50/80 px-1.5 py-1 -mx-1.5 rounded-lg cursor-pointer'
                                  }`}
                                  title={isEditingDesc ? 'Shift+Enter for newline, Enter or click outside to save' : 'Click to edit activity description'}
                                >
                                  {act.description || ''}
                                </p>
                                {!isEditingDesc && (
                                  <button
                                    type="button"
                                    onClick={() => startEditing(act.id, 'description')}
                                    className="p-0.5 text-slate-400 hover:text-emerald-700 opacity-0 group-hover/desc:opacity-100 transition-opacity shrink-0 mt-0.5 cursor-pointer"
                                    title="Edit description"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEditing(act.id, 'description')}
                                className="group/desc text-[11px] text-slate-400 italic inline-flex items-center gap-1 hover:text-emerald-700 px-1.5 py-1 -mx-1.5 rounded-lg transition-colors cursor-pointer"
                                title="Click to add notes or guidance"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add notes or guidance...</span>
                              </button>
                            )}
                          </div>

                          {/* Action Controls: Move to Next Day, Up, Down, Delete */}
                          <div className="flex items-center gap-1 pl-1 shrink-0">
                            {/* Move to Next Day */}
                            {activeDayIndex < trip.days.length - 1 && (
                              <button
                                type="button"
                                onClick={() => moveActivityToNextDay(activeDayIndex, act.id)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 text-slate-500 hover:text-emerald-800 transition-colors cursor-pointer"
                                title={`Move to Next Day (Day ${currentDay.dayNumber + 1})`}
                              >
                                <ArrowRightCircle className="w-3.5 h-3.5" />
                              </button>
                            )}


                            <button
                              type="button"
                              onClick={() => removeActivity(activeDayIndex, act.id)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition-colors ml-0.5 cursor-pointer"
                              title="Remove activity from day"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Day Narrative Summary */}
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                  Day Scenic Narrative / Route Summary
                </label>
                <textarea
                  rows={3}
                  value={currentDay.summary}
                  onChange={(e) => {
                    const updatedDays = [...trip.days];
                    updatedDays[activeDayIndex] = {
                      ...updatedDays[activeDayIndex],
                      summary: e.target.value,
                    };
                    triggerSave({ ...trip, days: updatedDays });
                  }}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden transition-all text-slate-800 leading-relaxed"
                  placeholder="Scenic overview of the drive, climate, stops, and evening arrangements..."
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Custom Activity Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-emerald-900 to-teal-900 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-300" />
                <h4 className="font-bold text-sm">Add Custom Activity to Day {currentDay?.dayNumber}</h4>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-white/70 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomActivity} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Activity Name / Sightseeing Point *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kathakali Dance Drama or Chithirapuram View Point"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Timing
                  </label>
                  <CustomSelect
                    value={newTiming}
                    onChange={(val) => setNewTiming(val as ActivityItem['timing'])}
                    options={['Morning', 'Afternoon', 'Evening', 'Full Day']}
                    theme="emerald"
                    size="md"
                    ariaLabel="Activity Timing"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category
                  </label>
                  <CustomSelect
                    value={newCategory}
                    onChange={(val) => setNewCategory(val as ActivityItem['category'])}
                    options={[
                      'Sightseeing',
                      'Nature',
                      'Cultural',
                      'Adventure',
                      'Relaxation',
                      'Heritage',
                      'Shopping'
                    ]}
                    theme="emerald"
                    size="md"
                    ariaLabel="Activity Category"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description / Guest Guidance
                </label>
                <textarea
                  rows={3}
                  placeholder="Specific details, photography tips, ticket notes, or clothing recommendations..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-sm"
                >
                  Add to Itinerary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Vertical Day Selector Pill (True Frosted Glass Glassmorphism) */}
      <div className="fixed right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-40 no-print">
        <div 
          className="relative rounded-full p-1.5 sm:p-2 flex flex-col items-center gap-1.5 max-h-[85vh] overflow-y-auto no-scrollbar border border-white/70 shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.8)]"
          style={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          {trip.days.map((day, idx) => {
            const isCurrent = activeDayIndex === idx;
            const selectedCount = day.activities.filter((a) => a.isSelected).length;
            const isDayHighPace = selectedCount > 5;

            return (
              <button
                key={day.dayNumber}
                type="button"
                onClick={() => handleSelectDay(idx)}
                className={`flex flex-col items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full text-xs font-bold transition-all shrink-0 relative group cursor-pointer ${
                  isCurrent
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-700/30 ring-2 ring-white/90 scale-105 z-10'
                    : 'bg-transparent hover:bg-teal-600/10 active:bg-teal-600/20 text-slate-800'
                }`}
                title={`Day ${day.dayNumber}: ${day.destination} (${selectedCount} acts)`}
              >
                {isCurrent ? (
                  <>
                    <span className="text-[12px] font-black tracking-tight text-white leading-none">
                      D{day.dayNumber}
                    </span>
                    <span className="text-[10px] font-extrabold text-teal-100 leading-none mt-0.5">
                      {selectedCount}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[12px] font-black tracking-tight text-slate-800 group-hover:text-teal-900 leading-none transition-colors">
                      D{day.dayNumber}
                    </span>
                    <span className="text-[10px] font-extrabold text-teal-700 group-hover:text-teal-900 leading-none mt-0.5 transition-colors">
                      {selectedCount}
                    </span>
                  </>
                )}

                {/* Desktop Tooltip on hover */}
                <span className="absolute right-full mr-3.5 px-3 py-1.5 rounded-xl bg-slate-900/95 text-white text-[11px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-150 shadow-xl border border-white/20 backdrop-blur-md z-50">
                  Day {day.dayNumber}: {day.destination} ({selectedCount} acts{isDayHighPace ? ' • High Pace ⚠️' : ''})
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
