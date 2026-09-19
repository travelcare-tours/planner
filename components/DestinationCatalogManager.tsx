'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  MapPin, 
  Tag, 
  Trash2, 
  Layers, 
  Sparkles, 
  RotateCcw, 
  Save, 
  Check, 
  Info,
  Clock
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

  // Add activity form inside selected destination
  const [actTitle, setActTitle] = useState('');
  const [actCategory, setActCategory] = useState<ActivityItem['category']>('Sightseeing');
  const [actTiming, setActTiming] = useState<ActivityItem['timing']>('Morning');
  const [actDesc, setActDesc] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const selectedDestination = catalog[selectedDestIndex] || catalog[0];

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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-2 border border-emerald-200">
            <Layers className="w-3.5 h-3.5 text-emerald-700" />
            Configurable Activity Engine
          </div>
          <h2 className="text-xl font-bold text-slate-900">Destination & Sightseeing Master Catalog</h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Configure default activities and add brand-new destinations (e.g., Athirappilly, Poovar, Bekal) without needing code changes. When staff build itineraries, these populate as one-click options.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetCatalog}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="Reset to initial Kerala package catalog"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            Reset Defaults
          </button>
          <button
            onClick={() => setShowAddDestModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
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
        {/* Destination List */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1 mb-2">
            Available Destinations ({catalog.length})
          </div>

          <div className="space-y-1.5">
            {catalog.map((item, idx) => {
              const isSelected = selectedDestIndex === idx;
              return (
                <div
                  key={item.destination}
                  onClick={() => setSelectedDestIndex(idx)}
                  className={`p-3 rounded-xl cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-emerald-900 text-white border-emerald-950 shadow-sm'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className={`w-4 h-4 ${isSelected ? 'text-emerald-300' : 'text-emerald-700'}`} />
                      <span className="font-bold text-sm">{item.destination}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-emerald-800 text-emerald-200' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.defaultActivities.length} sights
                    </span>
                  </div>
                  <p className={`text-xs mt-1 truncate ${isSelected ? 'text-emerald-200/80' : 'text-slate-500'}`}>
                    {item.tagline}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Destination Details & Activities */}
        <div className="lg:col-span-8 space-y-5">
          {selectedDestination && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-slate-900">{selectedDestination.destination}</span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Catalog Active
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {selectedDestination.defaultActivities.length} default activities
                  </span>
                </div>
                <p className="text-xs text-emerald-900 font-medium mt-1">{selectedDestination.tagline}</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{selectedDestination.description}</p>
              </div>

              {/* Add Activity Form to Master Catalog */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
                  <Plus className="w-3.5 h-3.5 text-emerald-700" />
                  Add New Default Activity to {selectedDestination.destination}
                </div>

                <form onSubmit={handleAddActivityToDest} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6">
                      <input
                        type="text"
                        required
                        placeholder="Sightseeing / Activity Title *"
                        value={actTitle}
                        onChange={(e) => setActTitle(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <select
                        value={actTiming}
                        onChange={(e) => setActTiming(e.target.value as ActivityItem['timing'])}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                      >
                        <option value="Morning">Morning</option>
                        <option value="Afternoon">Afternoon</option>
                        <option value="Evening">Evening</option>
                        <option value="Full Day">Full Day</option>
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <select
                        value={actCategory}
                        onChange={(e) => setActCategory(e.target.value as ActivityItem['category'])}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
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
                    <input
                      type="text"
                      placeholder="Concise description or travel tip for this spot..."
                      value={actDesc}
                      onChange={(e) => setActDesc(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors shadow-2xs"
                    >
                      Save to {selectedDestination.destination} Catalog
                    </button>
                  </div>
                </form>
              </div>

              {/* Master Activities List */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Registered Sightseeing Points
                </div>

                {selectedDestination.defaultActivities.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No default activities recorded for {selectedDestination.destination} yet. Use the form above to add some.
                  </div>
                ) : (
                  selectedDestination.defaultActivities.map((act, index) => (
                    <div
                      key={act.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors flex items-start justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-xs font-mono font-bold text-slate-400 pt-0.5">#{index + 1}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{act.title}</span>
                            {act.timing && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                                {act.timing}
                              </span>
                            )}
                            {act.category && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-50 text-teal-800 border border-teal-200/60 font-semibold">
                                {act.category}
                              </span>
                            )}
                          </div>
                          {act.description && (
                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                              {act.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteActivity(act.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remove from catalog"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
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
                onClick={() => setShowAddDestModal(false)}
                className="text-white/70 hover:text-white text-lg font-bold"
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
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-sm"
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
