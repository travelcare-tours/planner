'use client';

import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  MapPin, 
  Star, 
  Plus, 
  Trash2, 
  Pencil, 
  RotateCcw, 
  Check, 
  Search, 
  X, 
  Layers, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Bed, 
  IndianRupee,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { HotelModel, RoomModel } from '@/types/itinerary';
import { INITIAL_HOTEL_CATALOG, DEFAULT_KERALA_DESTINATIONS } from '@/lib/sample-data';

interface HotelRoomCatalogManagerProps {
  hotelCatalog: HotelModel[];
  onUpdateHotelCatalog: (updated: HotelModel[]) => void;
}

export const HotelRoomCatalogManager: React.FC<HotelRoomCatalogManagerProps> = ({
  hotelCatalog,
  onUpdateHotelCatalog,
}) => {
  // Filters & Search
  const [selectedDestination, setSelectedDestination] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals & Forms
  const [showHotelModal, setShowHotelModal] = useState<boolean>(false);
  const [editingHotel, setEditingHotel] = useState<HotelModel | null>(null);

  // Form State for Hotel
  const [formDest, setFormDest] = useState<string>('Munnar');
  const [formName, setFormName] = useState<string>('');
  const [formStar, setFormStar] = useState<number | string>(4);
  const [formStatus, setFormStatus] = useState<boolean>(true);

  // Add Room Form state per hotel (hotelId -> { category, rate })
  const [activeAddRoomHotelId, setActiveAddRoomHotelId] = useState<string | null>(null);
  const [newRoomCategory, setNewRoomCategory] = useState<string>('');
  const [newRoomRate, setNewRoomRate] = useState<string>('2800');

  // Inline editing for room rate or category (roomId -> { field, value })
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editRoomCategory, setEditRoomCategory] = useState<string>('');
  const [editRoomRate, setEditRoomRate] = useState<string>('');

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2800);
  };

  // Distinct list of destinations present in the catalog + defaults
  const allDestinations = useMemo(() => {
    const set = new Set<string>();
    hotelCatalog.forEach((h) => {
      if (h.destination) set.add(h.destination.trim());
    });
    DEFAULT_KERALA_DESTINATIONS.forEach((d) => set.add(d));
    return Array.from(set).sort();
  }, [hotelCatalog]);

  // Filtered hotels
  const filteredHotels = useMemo(() => {
    return hotelCatalog.filter((hotel) => {
      // Destination filter
      if (selectedDestination !== 'All' && hotel.destination.toLowerCase() !== selectedDestination.toLowerCase()) {
        return false;
      }
      // Status filter
      if (statusFilter === 'active' && !hotel.status) return false;
      if (statusFilter === 'inactive' && hotel.status) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = hotel.hotel_name.toLowerCase().includes(q);
        const matchesDest = hotel.destination.toLowerCase().includes(q);
        const matchesRoom = hotel.rooms.some((r) => r.room_category.toLowerCase().includes(q));
        if (!matchesName && !matchesDest && !matchesRoom) return false;
      }

      return true;
    });
  }, [hotelCatalog, selectedDestination, statusFilter, searchQuery]);

  // Metrics
  const totalHotels = hotelCatalog.length;
  const activeHotels = hotelCatalog.filter((h) => h.status).length;
  const totalRooms = hotelCatalog.reduce((sum, h) => sum + h.rooms.length, 0);

  // Toggle Hotel Active/Inactive
  const handleToggleHotelStatus = (hotelId: string) => {
    const updated = hotelCatalog.map((h) => {
      if (h.id === hotelId) {
        const newStatus = !h.status;
        showToast(`"${h.hotel_name}" marked as ${newStatus ? 'Active' : 'Inactive'}`);
        return { ...h, status: newStatus };
      }
      return h;
    });
    onUpdateHotelCatalog(updated);
  };

  // Open Create Hotel Modal
  const handleOpenCreateHotel = () => {
    setEditingHotel(null);
    setFormDest(selectedDestination !== 'All' ? selectedDestination : 'Munnar');
    setFormName('');
    setFormStar(4);
    setFormStatus(true);
    setShowHotelModal(true);
  };

  // Open Edit Hotel Modal
  const handleOpenEditHotel = (hotel: HotelModel) => {
    setEditingHotel(hotel);
    setFormDest(hotel.destination);
    setFormName(hotel.hotel_name);
    setFormStar(hotel.star_rating);
    setFormStatus(hotel.status);
    setShowHotelModal(true);
  };

  // Save Hotel (Create or Update)
  const handleSaveHotel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingHotel) {
      // Update existing
      const updated = hotelCatalog.map((h) => {
        if (h.id === editingHotel.id) {
          return {
            ...h,
            destination: formDest.trim(),
            hotel_name: formName.trim(),
            star_rating: formStar,
            status: formStatus,
          };
        }
        return h;
      });
      onUpdateHotelCatalog(updated);
      showToast(`Updated "${formName.trim()}"`);
    } else {
      // Create new
      const newHotelId = `htl-${formDest.toLowerCase().slice(0, 3)}-${Date.now()}`;
      const newHotel: HotelModel = {
        id: newHotelId,
        destination: formDest.trim(),
        hotel_name: formName.trim(),
        star_rating: formStar,
        status: formStatus,
        rooms: [
          {
            id: `rm-${Date.now()}`,
            hotel_id: newHotelId,
            room_category: 'Deluxe Room',
            base_b2b_rate: 2800,
          },
        ],
      };
      onUpdateHotelCatalog([...hotelCatalog, newHotel]);
      showToast(`Added "${formName.trim()}" to ${formDest.trim()}`);
    }

    setShowHotelModal(false);
  };

  // Delete Hotel
  const handleDeleteHotel = (hotelId: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}" from the inventory database? Past quotes with this hotel name will remain unaffected.`)) {
      const updated = hotelCatalog.filter((h) => h.id !== hotelId);
      onUpdateHotelCatalog(updated);
      showToast(`Deleted "${name}"`);
    }
  };

  // Add Room Category to Hotel
  const handleAddRoom = (hotelId: string) => {
    if (!newRoomCategory.trim()) return;
    const rate = Math.max(0, parseInt(newRoomRate, 10) || 0);

    const newRoom: RoomModel = {
      id: `rm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      hotel_id: hotelId,
      room_category: newRoomCategory.trim(),
      base_b2b_rate: rate,
    };

    const updated = hotelCatalog.map((h) => {
      if (h.id === hotelId) {
        return {
          ...h,
          rooms: [...h.rooms, newRoom],
        };
      }
      return h;
    });

    onUpdateHotelCatalog(updated);
    setNewRoomCategory('');
    setNewRoomRate('2800');
    setActiveAddRoomHotelId(null);
    showToast(`Room category added to hotel.`);
  };

  // Delete Room Category
  const handleDeleteRoom = (hotelId: string, roomId: string) => {
    const updated = hotelCatalog.map((h) => {
      if (h.id === hotelId) {
        return {
          ...h,
          rooms: h.rooms.filter((r) => r.id !== roomId),
        };
      }
      return h;
    });
    onUpdateHotelCatalog(updated);
    showToast('Room category removed.');
  };

  // Start Room Inline Edit
  const handleStartEditRoom = (room: RoomModel) => {
    setEditingRoomId(room.id);
    setEditRoomCategory(room.room_category);
    setEditRoomRate(String(room.base_b2b_rate));
  };

  // Save Room Inline Edit
  const handleSaveEditRoom = (hotelId: string, roomId: string) => {
    const updated = hotelCatalog.map((h) => {
      if (h.id === hotelId) {
        return {
          ...h,
          rooms: h.rooms.map((r) => {
            if (r.id === roomId) {
              return {
                ...r,
                room_category: editRoomCategory.trim() || r.room_category,
                base_b2b_rate: Math.max(0, parseInt(editRoomRate, 10) || 0),
              };
            }
            return r;
          }),
        };
      }
      return h;
    });
    onUpdateHotelCatalog(updated);
    setEditingRoomId(null);
    showToast('Room details updated.');
  };

  // Reset entire catalog to Travel Care Tours official Kerala defaults
  const handleResetDefaults = () => {
    if (confirm('Reset entire Hotel & Room Database to Travel Care Tours official Kerala defaults? Any custom added properties will be replaced.')) {
      onUpdateHotelCatalog(INITIAL_HOTEL_CATALOG);
      showToast('Hotel inventory reset to official defaults.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 text-xs font-semibold mb-2 border border-amber-200">
            <Building2 className="w-3.5 h-3.5 text-amber-700" />
            Hotel &amp; Room Rates Engine
          </div>
          <h2 className="text-xl font-bold text-slate-900">Hotel &amp; Room Management Dashboard</h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Configure partner hotels, star categories, room categories, and base B2B rates (CP). These populate dynamically into the quotation builder to automate quoting while allowing manual rate overrides.
          </p>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3 sm:gap-4 mt-3 text-xs flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-slate-700 font-bold bg-slate-100 px-2.5 py-1 rounded-lg">
              <Building2 className="w-3.5 h-3.5 text-slate-600" />
              <span>{totalHotels} Properties</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
              <span>{activeHotels} Active</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-indigo-800 font-bold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
              <Bed className="w-3.5 h-3.5 text-indigo-600" />
              <span>{totalRooms} Room Types</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Reset to default partner hotel catalog"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleOpenCreateHotel}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-900 hover:text-emerald-950 bg-white hover:bg-emerald-50 border-2 border-emerald-800 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-800" />
            New Property
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 animate-in fade-in shadow-2xs">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Split Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Destination Filter Sidebar in Pure White Floating Card */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Destinations ({allDestinations.length})
            </div>
            <button
              type="button"
              onClick={() => setSelectedDestination('All')}
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                selectedDestination === 'All'
                  ? 'bg-emerald-800 text-white'
                  : 'text-slate-500 hover:text-slate-900 bg-slate-100'
              }`}
            >
              All ({totalHotels})
            </button>
          </div>

          {/* Search Properties */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search hotel or room..."
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

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl text-xs border border-slate-200/80">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`flex-1 py-1 rounded-lg font-bold text-center transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`flex-1 py-1 rounded-lg font-bold text-center transition-all cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({activeHotels})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('inactive')}
              className={`flex-1 py-1 rounded-lg font-bold text-center transition-all cursor-pointer ${
                statusFilter === 'inactive'
                  ? 'bg-white text-rose-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inactive
            </button>
          </div>

          {/* Destination List Cards with Lightened Active Style & Warm Badge */}
          <div className="space-y-1.5 max-h-[calc(100vh-360px)] overflow-y-auto pr-1">
            {allDestinations.map((dest) => {
              const isSelected = selectedDestination.toLowerCase() === dest.toLowerCase();
              const destHotels = hotelCatalog.filter((h) => h.destination.toLowerCase() === dest.toLowerCase());
              const activeCount = destHotels.filter((h) => h.status).length;

              return (
                <div
                  key={dest}
                  onClick={() => setSelectedDestination(dest)}
                  className={`p-2.5 sm:p-3 rounded-xl cursor-pointer border transition-all duration-150 ${
                    isSelected
                      ? 'bg-[#E6F4F1] text-emerald-950 border-emerald-300/80 border-l-4 border-l-emerald-800 shadow-xs'
                      : 'bg-slate-50/70 hover:bg-slate-100/90 text-slate-800 border-slate-200/80 hover:border-slate-300 border-l-4 border-l-transparent shadow-2xs hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-800' : 'text-emerald-700'}`} />
                      <span className={`font-bold text-xs sm:text-sm ${isSelected ? 'text-emerald-950 font-black' : 'text-slate-900'}`}>
                        {dest}
                      </span>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                      isSelected
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                        : 'bg-slate-200/70 text-slate-700'
                    }`}>
                      {destHotels.length} {destHotels.length === 1 ? 'hotel' : 'hotels'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] mt-1 text-slate-500">
                    <span>{activeCount} active in quoting</span>
                    <span>{destHotels.reduce((s, h) => s + h.rooms.length, 0)} room types</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Hotel Properties & Room Sub-Tables */}
        <div className="lg:col-span-8 space-y-5">
          {/* Work Area Header */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-black text-slate-900">
                  {selectedDestination === 'All' ? 'All Partner Hotels' : `${selectedDestination} Properties`}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  {filteredHotels.length} Listed
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing partner accommodations with pre-configured B2B base rates for quotation automation.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateHotel}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer self-start sm:self-auto shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Hotel</span>
            </button>
          </div>

          {/* Hotels List */}
          {filteredHotels.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-3 shadow-sm">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No properties match your filter.</p>
              <p className="text-xs text-slate-500">
                Try searching for another hotel name or click below to add a property.
              </p>
              <button
                type="button"
                onClick={handleOpenCreateHotel}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Property to {selectedDestination === 'All' ? 'Catalog' : selectedDestination}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHotels.map((hotel) => (
                <div
                  key={hotel.id}
                  className={`bg-white rounded-2xl border transition-all shadow-sm overflow-hidden ${
                    hotel.status
                      ? 'border-slate-200'
                      : 'border-slate-300/80 bg-slate-50/40 opacity-75'
                  }`}
                >
                  {/* Hotel Header Bar */}
                  <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-base text-slate-900">
                          {hotel.hotel_name}
                        </span>

                        {/* Star Rating Badge */}
                        <span className="inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span>{hotel.star_rating}★</span>
                        </span>

                        {/* Destination Badge */}
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900">
                          {hotel.destination}
                        </span>

                        {/* Status Badge */}
                        <button
                          type="button"
                          onClick={() => handleToggleHotelStatus(hotel.id)}
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition-all ${
                            hotel.status
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                          }`}
                          title="Click to toggle Active/Inactive status for quotes"
                        >
                          {hotel.status ? (
                            <>
                              <Eye className="w-3 h-3 text-emerald-600" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 text-rose-600" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-500">
                        {hotel.rooms.length} room {hotel.rooms.length === 1 ? 'category' : 'categories'} configured • CP Base Rates
                      </div>
                    </div>

                    {/* Actions: Edit Property & Delete */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleOpenEditHotel(hotel)}
                        className="p-1.5 text-slate-500 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer border border-slate-200 shadow-2xs"
                        title="Edit property details"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteHotel(hotel.id, hotel.hotel_name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-slate-200 shadow-2xs"
                        title="Delete property"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Room Management Sub-Table */}
                  <div className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Bed className="w-3.5 h-3.5 text-slate-400" />
                        <span>Room Categories &amp; Base B2B Rates (CP)</span>
                      </div>

                      {activeAddRoomHotelId !== hotel.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveAddRoomHotelId(hotel.id);
                            setNewRoomCategory('');
                            setNewRoomRate('2800');
                          }}
                          className="flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3 h-3 stroke-[2.5]" />
                          <span>Add Room</span>
                        </button>
                      )}
                    </div>

                    {/* Add Room Quick Form */}
                    {activeAddRoomHotelId === hotel.id && (
                      <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl space-y-2.5 animate-in fade-in">
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                          <span>Add New Room Category to {hotel.hotel_name}</span>
                          <button
                            type="button"
                            onClick={() => setActiveAddRoomHotelId(null)}
                            className="text-slate-400 hover:text-slate-700"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <div className="sm:col-span-7">
                            <input
                              type="text"
                              autoFocus
                              placeholder="Room Category (e.g. Premium Valley View)"
                              value={newRoomCategory}
                              onChange={(e) => setNewRoomCategory(e.target.value)}
                              className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                              <input
                                type="number"
                                step={100}
                                placeholder="B2B CP Rate"
                                value={newRoomRate}
                                onChange={(e) => setNewRoomRate(e.target.value)}
                                className="w-full text-xs pl-6 pr-2 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 shadow-2xs"
                              />
                            </div>
                          </div>
                          <div className="sm:col-span-2 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleAddRoom(hotel.id)}
                              className="w-full text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 py-2 rounded-lg transition-colors shadow-2xs cursor-pointer text-center"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveAddRoomHotelId(null)}
                              className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Room Table */}
                    {hotel.rooms.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No room categories defined yet. Click &ldquo;+ Add Room&rdquo; to define rooms and rates.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs bg-white">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 font-extrabold border-b border-slate-200">
                              <th className="py-2.5 px-3">Room Category</th>
                              <th className="py-2.5 px-3 w-40 text-right">Base B2B Rate (CP)</th>
                              <th className="py-2.5 px-3 w-24 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {hotel.rooms.map((room) => {
                              const isEditing = editingRoomId === room.id;

                              return (
                                <tr key={room.id} className="hover:bg-slate-50/70 transition-colors">
                                  {/* Room Category */}
                                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={editRoomCategory}
                                        onChange={(e) => setEditRoomCategory(e.target.value)}
                                        className="w-full px-2 py-1 border border-emerald-400 rounded-md bg-white text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
                                      />
                                    ) : (
                                      <div className="flex items-center gap-1.5">
                                        <Bed className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{room.room_category}</span>
                                      </div>
                                    )}
                                  </td>

                                  {/* Base B2B Rate */}
                                  <td className="py-2.5 px-3 text-right">
                                    {isEditing ? (
                                      <div className="inline-flex items-center gap-1">
                                        <span className="text-slate-400 font-bold">₹</span>
                                        <input
                                          type="number"
                                          step={100}
                                          value={editRoomRate}
                                          onChange={(e) => setEditRoomRate(e.target.value)}
                                          className="w-24 px-2 py-1 text-right border border-emerald-400 rounded-md bg-white text-xs font-bold text-emerald-950 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
                                        />
                                      </div>
                                    ) : (
                                      <span className="font-mono font-bold text-emerald-900 text-xs bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                                        ₹ {room.base_b2b_rate.toLocaleString('en-IN')} / night
                                      </span>
                                    )}
                                  </td>

                                  {/* Actions */}
                                  <td className="py-2.5 px-3 text-center">
                                    {isEditing ? (
                                      <div className="flex items-center justify-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleSaveEditRoom(hotel.id, room.id)}
                                          className="p-1 rounded bg-emerald-800 text-white hover:bg-emerald-900 shadow-2xs"
                                          title="Save room edit"
                                        >
                                          <Check className="w-3 h-3 stroke-[3]" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingRoomId(null)}
                                          className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                                          title="Cancel"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleStartEditRoom(room)}
                                          className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                                          title="Edit room and rate"
                                        >
                                          <Pencil className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteRoom(hotel.id, room.id)}
                                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                          title="Delete room category"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Hotel Modal */}
      {showHotelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-gradient-to-r from-emerald-900 to-teal-900 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-300" />
                <h4 className="font-bold text-sm">
                  {editingHotel ? `Edit "${editingHotel.hotel_name}"` : 'Add Partner Property'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowHotelModal(false)}
                className="text-white/70 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveHotel} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Destination *
                </label>
                <select
                  value={formDest}
                  onChange={(e) => setFormDest(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                >
                  {allDestinations.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hotel / Resort Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. The Leaf Munnar Resort"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Star Category
                  </label>
                  <select
                    value={formStar}
                    onChange={(e) => setFormStar(Number(e.target.value) || e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                  >
                    <option value={3}>3-Star Quality</option>
                    <option value={4}>4-Star Premium</option>
                    <option value={5}>5-Star Luxury</option>
                    <option value="Houseboat">Houseboat Cruiser</option>
                    <option value="Heritage">Heritage Villa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormStatus(!formStatus)}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                      formStatus
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300'
                    }`}
                  >
                    {formStatus ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>{formStatus ? 'Active in Quotes' : 'Inactive (Hidden)'}</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowHotelModal(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-sm cursor-pointer"
                >
                  {editingHotel ? 'Save Changes' : 'Create Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
