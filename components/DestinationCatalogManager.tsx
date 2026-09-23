'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  MapPin, 
  Trash2, 
  Layers, 
  RotateCcw, 
  Check, 
  Search,
  X,
  Pencil,
  GripVertical,
  Sparkles
} from 'lucide-react';
import { DestinationCatalogItem, ActivityItem } from '@/types/itinerary';
import { INITIAL_DESTINATIONS_CATALOG } from '@/lib/sample-data';

interface DestinationCatalogManagerProps {
  catalog: DestinationCatalogItem[];
  onUpdateCatalog: (newCatalog: DestinationCatalogItem[]) => void;
}

export const DestinationCatalogManager: React.FC<DestinationCatalogManagerProps> = ({
  catalog,
  onUpdateCatalog,
}) => {
  const [selectedDestIndex, setSelectedDestIndex] = useState<number>(0);
  const [showAddDestModal, setShowAddDestModal] = useState<boolean>(false);
  const [newDestName, setNewDestName] = useState('');
  const [newDestTagline, setNewDestTagline] = useState('');
  const [newDestDesc, setNewDestDesc] = useState('');

  // Destination Search in Sidebar
  const [searchQuery, setSearchQuery] = useState('');

  // Add activity form toggle & fields (timing and category hidden for now as requested)
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [actTitle, setActTitle] = useState('');
  const [actCategory] = useState<ActivityItem['category']>('Sightseeing');
  const [actTiming] = useState<ActivityItem['timing']>('Morning');
  const [actDesc, setActDesc] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Inline editing state for activities
  const [editingActId, setEditingActId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'title' | 'description' | null>(null);
  const activeEditableRef = useRef<HTMLElement | null>(null);
  const isCancelingEditRef = useRef<boolean>(false);

  // Drag and drop reordering state
  const [draggedActIndex, setDraggedActIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const selectedDestination = catalog[selectedDestIndex] || catalog[0];

  // Auto-focus Activity Title or Description when inline editing is activated
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

  const commitEditing = (actId: string, field: 'title' | 'description', rawText: string) => {
    if (isCancelingEditRef.current) {
      isCancelingEditRef.current = false;
      setEditingActId(null);
      setEditingField(null);
      return;
    }
    if (!editingActId || !editingField || !selectedDestination) return;
    const trimmed = rawText.trim();
    const updated = [...catalog];
    const targetDest = { ...updated[selectedDestIndex] };
    targetDest.defaultActivities = targetDest.defaultActivities.map((a) => {
      if (a.id === actId) {
        if (field === 'title') {
          return { ...a, title: trimmed || a.title };
        } else {
          return { ...a, description: trimmed || undefined };
        }
      }
      return a;
    });
    updated[selectedDestIndex] = targetDest;
    onUpdateCatalog(updated);
    setEditingActId(null);
    setEditingField(null);
  };

  // Drag and drop handlers
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
    if (draggedActIndex === null || draggedActIndex === targetIndex || !selectedDestination) {
      setDraggedActIndex(null);
      setDragOverIndex(null);
      return;
    }
    const updated = [...catalog];
    const targetDest = { ...updated[selectedDestIndex] };
    const acts = [...targetDest.defaultActivities];
    const [movedItem] = acts.splice(draggedActIndex, 1);
    acts.splice(targetIndex, 0, movedItem);
    targetDest.defaultActivities = acts;
    updated[selectedDestIndex] = targetDest;
    onUpdateCatalog(updated);
    setDraggedActIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedActIndex(null);
    setDragOverIndex(null);
  };

  const handleAddDestination = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDestName.trim()) return;

    const newDest: DestinationCatalogItem = {
      destination: newDestName.trim(),
      tagline: newDestTagline.trim() || 'Scenic Kerala Destination',
      description: newDestDesc.trim() || 'Curated travel highlights and experiences by Travel Care Tours.',
      defaultActivities: [],
    };

    const updated = [...catalog, newDest];
    onUpdateCatalog(updated);
    setSelectedDestIndex(updated.length - 1);
    setNewDestName('');
    setNewDestTagline('');
    setNewDestDesc('');
    setShowAddDestModal(false);
  };

  const handleAddActivityToDest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actTitle.trim() || !selectedDestination) return;

    const newAct = {
      id: `${selectedDestination.destination.toLowerCase().slice(0, 3)}-${Date.now()}`,
      title: actTitle.trim(),
      category: actCategory,
      timing: actTiming,
      description: actDesc.trim(),
    };

    const updated = [...catalog];
    updated[selectedDestIndex] = {
      ...selectedDestination,
      defaultActivities: [...selectedDestination.defaultActivities, newAct],
    };

    onUpdateCatalog(updated);
    setActTitle('');
    setActDesc('');
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 2500);
  };

  const handleDeleteActivity = (actId: string) => {
    if (!selectedDestination) return;
    const updated = [...catalog];
    updated[selectedDestIndex] = {
      ...selectedDestination,
      defaultActivities: selectedDestination.defaultActivities.filter((a) => a.id !== actId),
    };
    onUpdateCatalog(updated);
  };

  const handleResetCatalog = () => {
    if (confirm('Reset entire activity catalog to Travel Care Tours official Kerala defaults? Any custom added destinations will be replaced.')) {
      onUpdateCatalog(INITIAL_DESTINATIONS_CATALOG);
      setSelectedDestIndex(0);
    }
  };

  // Filter destinations by search query
  const filteredDestinations = catalog
    .map((item, originalIndex) => ({ item, originalIndex }))
    .filter(({ item }) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.destination.toLowerCase().includes(q) ||
        item.tagline.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-2 border border-emerald-200">
            <Layers className="w-3.5 h-3.5 text-emerald-700" />
            Configurable Activity Engine
          </div>
          <h2 className="text-xl font-bold text-slate-900">Destination &amp; Sightseeing Master Catalog</h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Configure default sightseeing points and add new destinations (e.g., Athirappilly, Poovar, Bekal). When staff build itineraries, these populate as one-click options in the activity builder.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleResetCatalog()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Reset to initial Kerala package catalog"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={() => setShowAddDestModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-900 hover:text-emerald-950 bg-white hover:bg-emerald-50 border-2 border-emerald-800 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-800" />
            New Destination
          </button>
        </div>
      </div>

      {showSuccessToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Activity successfully saved to master catalog! Will be available for all new itineraries.</span>
        </div>
      )}

      {/* Catalog Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Destination List with Search & Hover States in Floating Card */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Available Destinations ({filteredDestinations.length}{searchQuery ? ` / ${catalog.length}` : ''})
            </div>
          </div>

          {/* Search / Filter Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search destinations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-7 py-2 border border-slate-200 bg-slate-50/70 hover:bg-white focus:bg-white rounded-xl placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Destination Cards with Lightened Active Style & Warm Sights Badges */}
          <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
            {filteredDestinations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p>No destinations match &ldquo;{searchQuery}&rdquo;</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-emerald-700 font-bold hover:underline cursor-pointer"
                >
                  Clear search
                </button>
              </div>
            ) : (
              filteredDestinations.map(({ item, originalIndex }) => {
                const isSelected = selectedDestIndex === originalIndex;
                return (
                  <div
                    key={item.destination}
                    onClick={() => setSelectedDestIndex(originalIndex)}
                    className={`p-3 rounded-xl cursor-pointer border transition-all duration-150 ${
                      isSelected
                        ? 'bg-[#E6F4F1] text-emerald-950 border-emerald-300/80 border-l-4 border-l-emerald-800 shadow-xs'
                        : 'bg-slate-50/70 hover:bg-slate-100/90 text-slate-800 border-slate-200/80 hover:border-slate-300 border-l-4 border-l-transparent shadow-2xs hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className={`w-4 h-4 ${isSelected ? 'text-emerald-800' : 'text-emerald-700'}`} />
                        <span className={`font-bold text-sm ${isSelected ? 'text-emerald-950 font-black' : 'text-slate-900'}`}>{item.destination}</span>
                      </div>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold transition-colors ${
                        isSelected 
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs' 
                          : 'bg-slate-200/70 text-slate-700'
                      }`}>
                        {item.defaultActivities.length} sights
                      </span>
                    </div>
                    <p className={`text-xs mt-1 truncate ${isSelected ? 'text-emerald-800 font-medium' : 'text-slate-500'}`}>
                      {item.tagline}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Destination Details & Sightseeing Points */}
        <div className="lg:col-span-8 space-y-5">
          {selectedDestination && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
              {/* Destination Header Banner */}
              <div className="border-b border-slate-100 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl font-black text-slate-900">{selectedDestination.destination}</span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/90 shadow-2xs">
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      Catalog Active
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      ({selectedDestination.defaultActivities.length} default sights)
                    </span>
                  </div>

                  {/* Primary "+ Add Activity" button (Solid Dark Green) */}
                  <button
                    type="button"
                    onClick={() => setShowAddForm(prev => !prev)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer self-start sm:self-auto shrink-0"
                  >
                    <Plus className={`w-3.5 h-3.5 transition-transform duration-200 ${showAddForm ? 'rotate-45' : ''}`} />
                    <span>{showAddForm ? 'Close Form' : 'Add Activity'}</span>
                  </button>
                </div>
                <p className="text-xs text-emerald-900 font-semibold mt-1">{selectedDestination.tagline}</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{selectedDestination.description}</p>
              </div>

              {/* Collapsible / Expandable "Add New Activity" Form */}
              {showAddForm && (
                <div className="bg-slate-50/90 rounded-2xl p-4 sm:p-5 border border-emerald-200/80 shadow-xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 uppercase tracking-wide">
                    <div className="flex items-center gap-1.5 text-emerald-950 font-black">
                      <Plus className="w-4 h-4 text-emerald-700" />
                      <span>Add New Default Activity to {selectedDestination.destination}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                      title="Close form"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <form onSubmit={handleAddActivityToDest} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Sightseeing / Activity Title *
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        placeholder="e.g. Mattupetty Dam & Eco Point"
                        value={actTitle}
                        onChange={(e) => setActTitle(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Description or Travel Tip (Optional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Concise highlights, photo spots, or best visiting hours..."
                        value={actDesc}
                        onChange={(e) => setActDesc(e.target.value)}
                        className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden shadow-2xs"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddForm(false);
                          setActTitle('');
                          setActDesc('');
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save to {selectedDestination.destination}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Master Activities List with Drag-and-Drop & Inline Editing */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Registered Sightseeing Points ({selectedDestination.defaultActivities.length})
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Drag handles (⋮⋮) to reorder default sequence
                  </span>
                </div>

                {selectedDestination.defaultActivities.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-3">
                    <p>No default activities recorded for {selectedDestination.destination} yet.</p>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add First Activity</span>
                    </button>
                  </div>
                ) : (
                  selectedDestination.defaultActivities.map((act, index) => {
                    const isEditingTitle = editingActId === act.id && editingField === 'title';
                    const isEditingDesc = editingActId === act.id && editingField === 'description';
                    const isDragOver = dragOverIndex === index;
                    const isBeingDragged = draggedActIndex === index;

                    return (
                      <div
                        key={act.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`p-3 bg-white rounded-xl border transition-all flex items-start justify-between gap-3 shadow-2xs group ${
                          isDragOver 
                            ? 'border-emerald-600 ring-2 ring-emerald-500/40 bg-emerald-50/40 scale-[1.01]' 
                            : 'border-slate-200 hover:border-slate-300'
                        } ${isBeingDragged ? 'opacity-30 border-dashed border-slate-400' : ''}`}
                      >
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          {/* Drag Handle Icon */}
                          <div
                            className="pt-1 text-slate-300 group-hover:text-slate-500 hover:text-slate-800 cursor-grab active:cursor-grabbing transition-colors shrink-0"
                            title="Drag to reorder default sightseeing sequence"
                          >
                            <GripVertical className="w-4 h-4 stroke-[2.2]" />
                          </div>

                          {/* Sightseeing Number */}
                          <span className="text-xs font-mono font-bold text-slate-400 pt-0.5 shrink-0">
                            #{index + 1}
                          </span>

                          {/* Title & Description with inline editing (same format as Activities tab) */}
                          <div className="flex-1 min-w-0 space-y-1">
                            {/* Title Inline Editable */}
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
                                  commitEditing(act.id, 'title', e.currentTarget.innerText);
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
                                className={`text-xs font-bold leading-tight transition-all ${
                                  isEditingTitle
                                    ? 'text-slate-900 cursor-text shadow-xs'
                                    : 'text-slate-900 hover:bg-emerald-50/80 px-1.5 py-0.5 -mx-1.5 rounded-lg cursor-pointer'
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

                            {/* Description Inline Editable */}
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
                                    commitEditing(act.id, 'description', e.currentTarget.innerText);
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
                                  data-placeholder="Add guidance, highlights, or tips..."
                                  className={`text-[11px] leading-relaxed transition-all whitespace-pre-wrap flex-1 ${
                                    isEditingDesc
                                      ? 'text-slate-800 cursor-text shadow-xs empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:italic'
                                      : 'text-slate-600 hover:bg-emerald-50/80 px-1.5 py-0.5 -mx-1.5 rounded-lg cursor-pointer'
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
                                className="group/desc text-[11px] text-slate-400 italic inline-flex items-center gap-1 hover:text-emerald-700 px-1.5 py-0.5 -mx-1.5 rounded-lg transition-colors cursor-pointer"
                                title="Click to add description or travel tips"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add tips or highlights...</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Action buttons: Pencil Edit & Trash Delete */}
                        <div className="flex items-center gap-1 shrink-0 pt-0.5">
                          <button
                            type="button"
                            onClick={() => startEditing(act.id, 'title')}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              editingActId === act.id
                                ? 'text-emerald-800 bg-emerald-100'
                                : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title="Edit activity inline"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteActivity(act.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove from catalog"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Bottom trigger to add another activity when list is long */}
                {!showAddForm && selectedDestination.defaultActivities.length > 0 && (
                  <div className="pt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(true)}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Another Activity to {selectedDestination.destination}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add New Destination Modal */}
      {showAddDestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-gradient-to-r from-emerald-900 to-teal-900 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-300" />
                <h4 className="font-bold text-sm">Add New Destination to Master Catalog</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDestModal(false)}
                className="text-white/70 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDestination} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Destination Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Poovar Island, Athirappilly, Bekal, Kumarakom"
                  value={newDestName}
                  onChange={(e) => setNewDestName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tagline / Regional Theme
                </label>
                <input
                  type="text"
                  placeholder="e.g. Golden Sands Estuary & Mangrove Boating"
                  value={newDestTagline}
                  onChange={(e) => setNewDestTagline(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Destination Overview
                </label>
                <textarea
                  rows={3}
                  placeholder="Atmosphere, altitude, landscape characteristics..."
                  value={newDestDesc}
                  onChange={(e) => setNewDestDesc(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDestModal(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-sm cursor-pointer"
                >
                  Create Destination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
