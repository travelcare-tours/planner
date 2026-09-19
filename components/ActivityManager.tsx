'use client';

import React, { useState, useRef } from 'react';
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Sparkles, 
  Clock, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Tag
} from 'lucide-react';
import { TripDetails, DayItinerary, ActivityItem, DestinationCatalogItem } from '@/types/itinerary';

interface ActivityManagerProps {
  trip: TripDetails;
  onUpdateTrip: (updated: TripDetails) => void;
  catalog: DestinationCatalogItem[];
  onNavigateToPreview: () => void;
}

export const ActivityManager: React.FC<ActivityManagerProps> = ({
  trip,
  onUpdateTrip,
  catalog,
  onNavigateToPreview,
}) => {
  const [activeDayIndex, setActiveDayIndex] = useState<number>(0);
  const daySelectorRef = useRef<HTMLDivElement>(null);
  const customizationSectionRef = useRef<HTMLDivElement>(null);

  const handleSelectDay = (idx: number) => {
    setActiveDayIndex(idx);
    setTimeout(() => {
      customizationSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
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
    onUpdateTrip({ ...trip, days: updatedDays });
  };

  // Reorder: move up
  const moveActivityUp = (dayIdx: number, actIdx: number) => {
    if (actIdx === 0) return;
    const updatedDays = [...trip.days];
    const targetDay = { ...updatedDays[dayIdx] };
    const acts = [...targetDay.activities];
    const [moved] = acts.splice(actIdx, 1);
    acts.splice(actIdx - 1, 0, moved);
    targetDay.activities = acts;
    updatedDays[dayIdx] = targetDay;
    onUpdateTrip({ ...trip, days: updatedDays });
  };

  // Reorder: move down
  const moveActivityDown = (dayIdx: number, actIdx: number) => {
    const targetDay = trip.days[dayIdx];
    if (actIdx >= targetDay.activities.length - 1) return;
    const updatedDays = [...trip.days];
    const copyDay = { ...updatedDays[dayIdx] };
    const acts = [...copyDay.activities];
    const [moved] = acts.splice(actIdx, 1);
    acts.splice(actIdx + 1, 0, moved);
    copyDay.activities = acts;
    updatedDays[dayIdx] = copyDay;
    onUpdateTrip({ ...trip, days: updatedDays });
  };

  // Remove activity
  const removeActivity = (dayIdx: number, actId: string) => {
    const updatedDays = [...trip.days];
    const targetDay = { ...updatedDays[dayIdx] };
    targetDay.activities = targetDay.activities.filter((act) => act.id !== actId);
    updatedDays[dayIdx] = targetDay;
    onUpdateTrip({ ...trip, days: updatedDays });
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
    onUpdateTrip({ ...trip, days: updatedDays });
  };

  // Add custom activity to current day
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
    onUpdateTrip({ ...trip, days: updatedDays });

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
    onUpdateTrip({ ...trip, days: updatedDays });
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
              onClick={onNavigateToPreview}
              className="ml-2 px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-bold text-xs rounded-lg transition-all shadow-sm shadow-emerald-950/30 whitespace-nowrap"
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
                          ? 'bg-emerald-800 text-emerald-100 border border-emerald-700' 
                          : selectedCount > 0 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-500'
                      }`}>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
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
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    {currentDay.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Route: <span className="font-medium text-slate-700">{currentDay.route}</span>
                  </p>
                </div>

                {/* Bulk controls & Up Arrow to Day Selector */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => daySelectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
                    title="Return up to Day Selector"
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-emerald-700 stroke-[2.5]" />
                    <span>Day Selector</span>
                  </button>

                  <button
                    id="btn-select-all-day"
                    onClick={() => setAllSelected(activeDayIndex, true)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Tick all activities for this day"
                  >
                    Select All
                  </button>
                  <button
                    id="btn-deselect-all-day"
                    onClick={() => setAllSelected(activeDayIndex, false)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Untick all activities"
                  >
                    Deselect All
                  </button>
                  <button
                    id="btn-sync-catalog"
                    onClick={syncFromCatalog}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                    title="Pull more sightseeing spots from master catalog"
                  >
                    <RotateCcw className="w-3 h-3 text-emerald-600" />
                    Load Catalog
                  </button>
                  <button
                    id="btn-add-custom-act"
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-2xs transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Activity
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200/70 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-slate-700 font-medium">
                    Showing <strong className="text-emerald-900">{currentDay.activities.filter(a => a.isSelected).length}</strong> selected out of <strong>{currentDay.activities.length}</strong> available sightseeing points.
                  </span>
                </div>
                <span className="text-slate-400 text-[11px] hidden sm:inline">Use arrows to sequence itinerary timing</span>
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
                        className="px-3 py-1.5 text-xs font-bold bg-emerald-800 text-white rounded-lg"
                      >
                        Load {currentDay.destination} Catalog
                      </button>
                    </div>
                  </div>
                ) : (
                  currentDay.activities.map((act, actIdx) => (
                    <div
                      key={act.id}
                      id={`activity-item-${act.id}`}
                      className={`relative rounded-xl border p-4 transition-all ${
                        act.isSelected
                          ? 'bg-white border-emerald-300 shadow-xs ring-1 ring-emerald-500/10'
                          : 'bg-slate-50/70 border-slate-200 opacity-60 hover:opacity-90'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleActivitySelection(activeDayIndex, act.id)}
                          className={`mt-0.5 rounded-md p-1 transition-all ${
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
                        <div className="text-slate-400 text-xs font-mono font-bold pt-1 w-5 text-center">
                          #{actIdx + 1}
                        </div>

                        {/* Activity details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className={`text-sm font-bold leading-tight ${act.isSelected ? 'text-slate-900' : 'text-slate-600 line-through'}`}>
                              {act.title}
                            </h4>

                            {act.isCustom && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 uppercase">
                                Custom
                              </span>
                            )}
                          </div>

                          {act.description && (
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                              {act.description}
                            </p>
                          )}
                        </div>

                        {/* Reordering and Delete controls */}
                        <div className="flex items-center gap-1 pl-2">
                          <button
                            type="button"
                            onClick={() => moveActivityUp(activeDayIndex, actIdx)}
                            disabled={actIdx === 0}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              actIdx === 0 
                                ? 'opacity-30 cursor-not-allowed border-slate-100 text-slate-300' 
                                : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                            }`}
                            title="Move earlier in the day"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => moveActivityDown(activeDayIndex, actIdx)}
                            disabled={actIdx === currentDay.activities.length - 1}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              actIdx === currentDay.activities.length - 1
                                ? 'opacity-30 cursor-not-allowed border-slate-100 text-slate-300' 
                                : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                            }`}
                            title="Move later in the day"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => removeActivity(activeDayIndex, act.id)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition-colors ml-1"
                            title="Remove activity from day"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
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
                    onUpdateTrip({ ...trip, days: updatedDays });
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
                  <select
                    value={newTiming}
                    onChange={(e) => setNewTiming(e.target.value as ActivityItem['timing'])}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-hidden bg-white"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Evening">Evening</option>
                    <option value="Full Day">Full Day</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ActivityItem['category'])}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-hidden bg-white"
                  >
                    <option value="Sightseeing">Sightseeing</option>
                    <option value="Nature">Nature</option>
                    <option value="Cultural">Cultural</option>
                    <option value="Adventure">Adventure</option>
                    <option value="Relaxation">Relaxation</option>
                    <option value="Heritage">Heritage</option>
                    <option value="Shopping">Shopping</option>
                  </select>
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

      {/* Floating Day Selector Interactive Dock */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 no-print max-w-[95vw]">
        <div className="bg-slate-900/95 text-white backdrop-blur-md px-3 py-2 rounded-2xl shadow-2xl border border-slate-700/90 flex items-center gap-1.5 overflow-x-auto no-scrollbar ring-1 ring-white/10">
          <div className="flex items-center gap-1 shrink-0 pr-1.5 border-r border-slate-700/80">
            <button
              type="button"
              onClick={() => daySelectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Scroll to full Day Overview"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">
              Days
            </span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {trip.days.map((day, idx) => {
              const isCurrent = activeDayIndex === idx;
              const selectedCount = day.activities.filter((a) => a.isSelected).length;

              return (
                <button
                  key={day.dayNumber}
                  type="button"
                  onClick={() => handleSelectDay(idx)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    isCurrent
                      ? 'bg-emerald-500 text-slate-950 shadow-md ring-2 ring-emerald-400/40'
                      : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200'
                  }`}
                  title={`Day ${day.dayNumber}: ${day.destination} (${selectedCount} acts)`}
                >
                  <span>D{day.dayNumber}</span>
                  {isCurrent && (
                    <span className="text-[10px] font-medium max-w-[80px] sm:max-w-[110px] truncate opacity-90">
                      {day.destination}
                    </span>
                  )}
                  <span className={`text-[9px] px-1 py-0.2 rounded-full ${
                    isCurrent ? 'bg-emerald-700 text-white' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {selectedCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
