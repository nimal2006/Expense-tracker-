import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bus,
  Plus,
  Search,
  Star,
  Clock,
  ArrowRight,
  ArrowUpDown,
  Edit3,
  Trash2,
  X,
  Receipt,
  GitCompareArrows,
  Info,
  Check,
  MapPin,
  CalendarDays,
  FileText,
} from 'lucide-react';
import {
  BusOperator,
  BusSchedule,
  BusType,
  ExpensePrefill,
  MemberName,
  WeekdayShort,
} from '../types';
import {
  ALL_WEEKDAYS,
  DepartureTimeWindow,
  addBusSchedule,
  deleteBusSchedule,
  formatOperatingDays,
  getDepartureWindow,
  getRouteKey,
  isBusUpcomingToday,
  updateBusSchedule,
} from '../services/bus-service';
import {
  computeDurationMinutes,
  formatDurationCompact,
  formatTime12h,
  getISTDateString,
  parseHHMMToMinutes,
} from '../utils/istTime';

interface BusScheduleViewProps {
  buses: BusSchedule[];
  currentMember: MemberName;
  favouriteBusIds: string[];
  onToggleFavouriteBus: (busId: string) => void;
  onAddTicketToExpenses: (prefill: ExpensePrefill) => void;
}

type SortOption = 'departure' | 'price_asc' | 'price_desc';

interface BusFormState {
  busName: string;
  busNumber: string;
  operator: BusOperator;
  fromLocation: string;
  toLocation: string;
  departureTime: string;
  arrivalTime: string;
  ticketPrice: string;
  busType: BusType;
  operatingDays: WeekdayShort[];
  notes: string;
}

const EMPTY_FORM: BusFormState = {
  busName: '',
  busNumber: '',
  operator: 'Government',
  fromLocation: '',
  toLocation: '',
  departureTime: '08:00',
  arrivalTime: '09:00',
  ticketPrice: '',
  busType: 'Ordinary',
  operatingDays: [...ALL_WEEKDAYS],
  notes: '',
};

const TIME_FILTERS: { id: DepartureTimeWindow | 'favourites'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'favourites', label: 'Favourites' },
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
  { id: 'night', label: 'Night' },
];

export const BusScheduleView: React.FC<BusScheduleViewProps> = ({
  buses,
  currentMember,
  favouriteBusIds,
  onToggleFavouriteBus,
  onAddTicketToExpenses,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<DepartureTimeWindow | 'favourites'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('departure');
  const [compareRouteKey, setCompareRouteKey] = useState<string | null>(null);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<BusSchedule | null>(null);
  const [form, setForm] = useState<BusFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedBus, setSelectedBus] = useState<BusSchedule | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const favSet = useMemo(() => new Set(favouriteBusIds), [favouriteBusIds]);

  const showToastFeedback = (msg: string) => {
    setFeedbackBanner(msg);
    setTimeout(() => setFeedbackBanner(null), 3000);
  };

  // Group routes with 2+ buses for instant fare comparison
  const comparableRoutes = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; from: string; to: string; buses: BusSchedule[]; minFare: number }
    >();
    buses.forEach((bus) => {
      const key = getRouteKey(bus.fromLocation, bus.toLocation);
      const existing = groups.get(key);
      if (existing) {
        existing.buses.push(bus);
        if (bus.ticketPrice < existing.minFare) existing.minFare = bus.ticketPrice;
      } else {
        groups.set(key, {
          key,
          from: bus.fromLocation,
          to: bus.toLocation,
          buses: [bus],
          minFare: bus.ticketPrice,
        });
      }
    });
    return Array.from(groups.values())
      .filter((g) => g.buses.length >= 2)
      .sort((a, b) => b.buses.length - a.buses.length);
  }, [buses]);

  const activeCompareGroup = useMemo(() => {
    if (!compareRouteKey) return null;
    const found = comparableRoutes.find((r) => r.key === compareRouteKey);
    if (!found) return null;
    return {
      ...found,
      buses: [...found.buses].sort((a, b) => a.ticketPrice - b.ticketPrice),
    };
  }, [compareRouteKey, comparableRoutes]);

  // Summary metrics
  const stats = useMemo(() => {
    const uniqueRoutes = new Set(buses.map((b) => getRouteKey(b.fromLocation, b.toLocation))).size;
    const upcomingCount = buses.filter((b) => isBusUpcomingToday(b)).length;
    const favCount = buses.filter((b) => favSet.has(b.id)).length;
    return {
      totalBuses: buses.length,
      uniqueRoutes,
      upcomingCount,
      favCount,
    };
  }, [buses, favSet]);

  // Filtered and sorted bus list
  const filteredBuses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const matched = buses.filter((bus) => {
      if (q) {
        const hay = `${bus.busName} ${bus.busNumber} ${bus.fromLocation} ${bus.toLocation} ${bus.operator} ${bus.busType}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (activeFilter === 'favourites') {
        if (!favSet.has(bus.id)) return false;
      } else if (activeFilter === 'upcoming') {
        if (!isBusUpcomingToday(bus)) return false;
      } else if (activeFilter !== 'all') {
        if (getDepartureWindow(bus.departureTime) !== activeFilter) return false;
      }

      return true;
    });

    return matched.sort((a, b) => {
      if (sortBy === 'price_asc') {
        return a.ticketPrice - b.ticketPrice || parseHHMMToMinutes(a.departureTime) - parseHHMMToMinutes(b.departureTime);
      }
      if (sortBy === 'price_desc') {
        return b.ticketPrice - a.ticketPrice || parseHHMMToMinutes(a.departureTime) - parseHHMMToMinutes(b.departureTime);
      }
      return parseHHMMToMinutes(a.departureTime) - parseHHMMToMinutes(b.departureTime);
    });
  }, [buses, searchQuery, activeFilter, sortBy, favSet]);

  const openAddModal = () => {
    setEditingBus(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEditModal = (bus: BusSchedule) => {
    setEditingBus(bus);
    setForm({
      busName: bus.busName,
      busNumber: bus.busNumber,
      operator: bus.operator,
      fromLocation: bus.fromLocation,
      toLocation: bus.toLocation,
      departureTime: bus.departureTime,
      arrivalTime: bus.arrivalTime,
      ticketPrice: String(bus.ticketPrice),
      busType: bus.busType,
      operatingDays: [...bus.operatingDays],
      notes: bus.notes || '',
    });
    setFormError(null);
    setSelectedBus(null);
    setIsFormOpen(true);
  };

  const handleToggleDay = (day: WeekdayShort) => {
    setForm((prev) => {
      const exists = prev.operatingDays.includes(day);
      const next = exists
        ? prev.operatingDays.filter((d) => d !== day)
        : [...prev.operatingDays, day];
      return { ...prev, operatingDays: next };
    });
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedPrice = Number(form.ticketPrice);
    if (form.ticketPrice.trim() === '' || Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setFormError('Please enter a valid ticket price (₹0 or above).');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      busName: form.busName,
      busNumber: form.busNumber,
      operator: form.operator,
      fromLocation: form.fromLocation,
      toLocation: form.toLocation,
      departureTime: form.departureTime,
      arrivalTime: form.arrivalTime,
      ticketPrice: parsedPrice,
      busType: form.busType,
      operatingDays: form.operatingDays,
      notes: form.notes,
    };

    const res = editingBus
      ? await updateBusSchedule(editingBus, payload)
      : await addBusSchedule(payload, currentMember);

    setIsSubmitting(false);

    if (!res.success) {
      setFormError(res.error || 'Could not save bus schedule.');
      return;
    }

    setIsFormOpen(false);
    setEditingBus(null);
    showToastFeedback(editingBus ? 'Bus schedule updated.' : 'Bus schedule added to group list.');
  };

  const handleConfirmDelete = async (busId: string) => {
    await deleteBusSchedule(busId);
    setConfirmDeleteId(null);
    setSelectedBus(null);
    showToastFeedback('Bus schedule removed.');
  };

  const handleTriggerTicketExpense = (bus: BusSchedule) => {
    const itemLabel = `${bus.busName} (${bus.fromLocation} → ${bus.toLocation})`;
    onAddTicketToExpenses({
      category: 'Transportation',
      itemName: itemLabel,
      amount: bus.ticketPrice,
      date: getISTDateString(),
      place: `${bus.fromLocation} to ${bus.toLocation}`,
      notes: bus.busNumber ? `Bus ${bus.busNumber} · ${bus.operator} ${bus.busType}` : `${bus.operator} ${bus.busType}`,
      sourceLabel: `${bus.busName} · ${formatTime12h(bus.departureTime)}`,
    });
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C5CFC]/20 to-[#22D3EE]/20 border border-[#7C5CFC]/30 flex items-center justify-center shrink-0">
              <Bus className="w-5 h-5 text-[#22D3EE]" />
            </span>
            <span>Bus Schedule &amp; Fare Tracker</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
            Shared room timetables &amp; fares with personal favourites for {currentMember}
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white text-sm font-bold shadow-md shadow-[#7C5CFC]/25 hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Bus Schedule</span>
        </button>
      </div>

      {/* Inline Feedback Toast */}
      <AnimatePresence>
        {feedbackBanner && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-[#34D399] text-xs font-semibold"
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{feedbackBanner}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Entry Disclaimer Notice */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-slate-100/80 dark:bg-[#10162A]/80 border border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-600 dark:text-[#94A3B8]">
        <Info className="w-4 h-4 text-[#22D3EE] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Bus timings and ticket fares listed here are manually entered and maintained by your group — not live GPS tracking or official operator feeds.
        </p>
      </div>

      {/* Compact Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Saved Buses', value: stats.totalBuses, accent: 'text-slate-900 dark:text-[#F8FAFC]' },
          { label: 'Routes Covered', value: stats.uniqueRoutes, accent: 'text-[#7C5CFC] dark:text-[#a78bfa]' },
          { label: 'Upcoming Today', value: stats.upcomingCount, accent: 'text-cyan-600 dark:text-[#22D3EE]' },
          { label: 'Your Favourites', value: stats.favCount, accent: 'text-emerald-600 dark:text-[#34D399]' },
        ].map((metric) => (
          <div
            key={metric.label}
            className="bg-white/90 dark:bg-[#10162A]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-800/80 px-4 py-3"
          >
            <p className="text-[11px] font-medium text-slate-500 dark:text-[#94A3B8]">{metric.label}</p>
            <p className={`text-xl sm:text-2xl font-extrabold font-mono tabular-nums mt-0.5 ${metric.accent}`}>
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      {/* Search, Sort & Route Comparison Bar */}
      <div className="bg-white/90 dark:bg-[#10162A]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destination, origin, bus name or number..."
              className="w-full min-h-[44px] pl-10 pr-9 py-2 rounded-xl bg-slate-50 dark:bg-[#080B18]/80 border border-slate-200 dark:border-slate-700/80 text-sm text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 focus:outline-none focus:border-[#22D3EE] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Select */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex-1 sm:flex-initial">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort buses"
                className="w-full sm:w-auto min-h-[44px] pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-[#080B18]/80 border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#22D3EE] cursor-pointer"
              >
                <option value="departure">Earliest Departure</option>
                <option value="price_asc">Ticket Price: Low to High</option>
                <option value="price_desc">Ticket Price: High to Low</option>
              </select>
            </div>

            {comparableRoutes.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setCompareRouteKey((prev) => (prev ? null : comparableRoutes[0].key))
                }
                className={`min-h-[44px] px-3.5 rounded-xl text-xs sm:text-sm font-semibold border inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  compareRouteKey
                    ? 'bg-[#7C5CFC]/15 border-[#7C5CFC]/50 text-[#7C5CFC] dark:text-[#c4b5fd]'
                    : 'bg-slate-50 dark:bg-[#080B18]/80 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-[#22D3EE]/50'
                }`}
              >
                <GitCompareArrows className="w-4 h-4" />
                <span>Compare ({comparableRoutes.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Departure Time & Favourites Filter Bar (Interactive Segmented Buttons) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {TIME_FILTERS.map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id)}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-[#080B18]/70 text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Route Fare Comparison Matrix */}
      <AnimatePresence>
        {activeCompareGroup && (
          <motion.section
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="bg-white/95 dark:bg-[#10162A]/95 backdrop-blur-xl rounded-2xl border border-[#7C5CFC]/35 p-4 sm:p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-2">
                  <GitCompareArrows className="w-4 h-4 text-[#22D3EE]" />
                  <span>Route Fare &amp; Timing Comparison</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                  Comparing {activeCompareGroup.buses.length} buses on{' '}
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">
                    {activeCompareGroup.from} → {activeCompareGroup.to}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {comparableRoutes.length > 1 && (
                  <select
                    value={activeCompareGroup.key}
                    onChange={(e) => setCompareRouteKey(e.target.value)}
                    aria-label="Choose route to compare"
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#080B18] border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    {comparableRoutes.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.from} → {r.to} ({r.buses.length})
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => setCompareRouteKey(null)}
                  aria-label="Close comparison"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full text-left border-collapse min-w-[540px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8]">
                    <th className="py-2 pr-3">Bus</th>
                    <th className="py-2 px-3">Operator &amp; Type</th>
                    <th className="py-2 px-3">Departure → Arrival</th>
                    <th className="py-2 px-3">Duration</th>
                    <th className="py-2 px-3 text-right">Fare</th>
                    <th className="py-2 pl-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs sm:text-sm">
                  {activeCompareGroup.buses.map((bus) => {
                    const isLowest = bus.ticketPrice === activeCompareGroup.minFare;
                    const durationMins = computeDurationMinutes(bus.departureTime, bus.arrivalTime);
                    return (
                      <tr key={bus.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 pr-3">
                          <div className="font-semibold text-slate-900 dark:text-[#F8FAFC]">{bus.busName}</div>
                          {bus.busNumber && (
                            <div className="text-[11px] font-mono text-slate-500 dark:text-[#94A3B8]">{bus.busNumber}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-300">
                          {bus.operator} · {bus.busType}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-xs text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {formatTime12h(bus.departureTime)} → {formatTime12h(bus.arrivalTime)}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-xs text-slate-500 dark:text-[#94A3B8]">
                          {formatDurationCompact(durationMins)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                          <span className={`font-bold ${isLowest ? 'text-emerald-600 dark:text-[#34D399]' : 'text-slate-900 dark:text-[#F8FAFC]'}`}>
                            ₹{bus.ticketPrice.toLocaleString('en-IN')}
                          </span>
                          {isLowest && (
                            <span className="block text-[10px] font-sans font-semibold text-emerald-600 dark:text-[#34D399]">
                              Lowest fare
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pl-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleTriggerTicketExpense(bus)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#7C5CFC]/15 hover:bg-[#7C5CFC]/25 text-[#7C5CFC] dark:text-[#c4b5fd] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Log Ticket
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Bus Schedule List or Empty State */}
      {filteredBuses.length === 0 ? (
        <div className="bg-white/90 dark:bg-[#10162A]/90 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-8 sm:p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#080B18] border border-slate-200 dark:border-slate-800 flex items-center justify-center mx-auto">
            <Bus className="w-6 h-6 text-[#22D3EE]" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC]">
              {buses.length === 0 ? 'No bus schedules added yet' : 'No buses match your filter'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8]">
              {buses.length === 0
                ? 'Save the bus timings and ticket fares your group actually uses so everyone can check departures, compare fares, and add tickets to expenses in seconds.'
                : 'Try clearing your search query or switching to "All" departure times.'}
            </p>
          </div>
          {buses.length === 0 ? (
            <button
              type="button"
              onClick={openAddModal}
              className="mt-2 inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white text-sm font-bold shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Bus Schedule</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveFilter('all');
              }}
              className="mt-2 inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {filteredBuses.map((bus) => {
            const isFav = favSet.has(bus.id);
            const upcoming = isBusUpcomingToday(bus);
            const durationMins = computeDurationMinutes(bus.departureTime, bus.arrivalTime);
            const routeKey = getRouteKey(bus.fromLocation, bus.toLocation);
            const routeComparable = comparableRoutes.find((r) => r.key === routeKey);

            return (
              <motion.article
                key={bus.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="bg-white/95 dark:bg-[#10162A]/95 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-slate-800/80 hover:border-[#7C5CFC]/45 dark:hover:border-[#22D3EE]/40 p-4 transition-colors flex flex-col justify-between gap-3.5"
              >
                {/* Card Top: Bus Name, Clean Unboxed Metadata, Fare & Favourite */}
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedBus(bus)}
                    className="text-left min-w-0 flex-1 cursor-pointer group"
                  >
                    <h3 className="text-base font-bold text-slate-900 dark:text-[#F8FAFC] group-hover:text-[#7C5CFC] dark:group-hover:text-[#22D3EE] transition-colors truncate">
                      {bus.busName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                      <span>{bus.operator}</span>
                      <span aria-hidden="true">·</span>
                      <span>{bus.busType}</span>
                      {bus.busNumber && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{bus.busNumber}</span>
                        </>
                      )}
                      {upcoming && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-cyan-600 dark:text-[#22D3EE] font-semibold">Upcoming today</span>
                        </>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-lg sm:text-xl font-extrabold font-mono tabular-nums text-emerald-600 dark:text-[#34D399] leading-none">
                        ₹{bus.ticketPrice.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[10px] text-slate-400">per ticket</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleFavouriteBus(bus.id)}
                      aria-label={isFav ? 'Remove from favourites' : 'Save to favourites'}
                      title={isFav ? 'Remove from your favourites' : 'Save to your favourites'}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors cursor-pointer ${
                        isFav
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-500'
                          : 'bg-slate-50 dark:bg-[#080B18]/70 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-amber-400'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Route & Timing Strip */}
                <button
                  type="button"
                  onClick={() => setSelectedBus(bus)}
                  className="w-full text-left flex items-center justify-between gap-2 py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-[#080B18]/70 border border-slate-200/70 dark:border-slate-800/70 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-[#F8FAFC]">
                      {formatTime12h(bus.departureTime)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-[#94A3B8] truncate max-w-[130px] sm:max-w-[170px]">
                      {bus.fromLocation}
                    </div>
                  </div>

                  <div className="flex flex-col items-center shrink-0 px-1">
                    <span className="text-[10px] font-mono tabular-nums text-slate-400">
                      {formatDurationCompact(durationMins)}
                    </span>
                    <div className="flex items-center gap-1 text-[#22D3EE] mt-0.5">
                      <span className="w-6 sm:w-10 h-px bg-slate-300 dark:bg-slate-700" />
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div className="min-w-0 text-right">
                    <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-[#F8FAFC]">
                      {formatTime12h(bus.arrivalTime)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-[#94A3B8] truncate max-w-[130px] sm:max-w-[170px]">
                      {bus.toLocation}
                    </div>
                  </div>
                </button>

                {/* Operating Days & Actions Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/70">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#94A3B8] min-w-0">
                    <span className="truncate">{formatOperatingDays(bus.operatingDays)}</span>
                    {routeComparable && (
                      <>
                        <span aria-hidden="true">·</span>
                        <button
                          type="button"
                          onClick={() => setCompareRouteKey(routeComparable.key)}
                          className="text-[#7C5CFC] dark:text-[#22D3EE] font-semibold hover:underline cursor-pointer whitespace-nowrap"
                        >
                          Compare ({routeComparable.buses.length})
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(bus)}
                      aria-label={`Edit ${bus.busName}`}
                      className="min-h-[38px] min-w-[38px] rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTriggerTicketExpense(bus)}
                      className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white text-xs font-bold shadow-xs hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Add Ticket to Expenses</span>
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {/* Bus Details Modal */}
      <AnimatePresence>
        {selectedBus && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.2 }}
              className="w-full sm:max-w-lg bg-white dark:bg-[#10162A] border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                    {selectedBus.busName}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                    {selectedBus.operator} · {selectedBus.busType}
                    {selectedBus.busNumber ? ` · ${selectedBus.busNumber}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBus(null);
                    setConfirmDeleteId(null);
                  }}
                  aria-label="Close bus details"
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#080B18]/80 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-[#94A3B8]">Departure</div>
                    <div className="text-lg font-extrabold font-mono tabular-nums text-slate-900 dark:text-[#F8FAFC]">
                      {formatTime12h(selectedBus.departureTime)}
                    </div>
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-[#7C5CFC]" />
                      {selectedBus.fromLocation}
                    </div>
                  </div>
                  <div className="text-center px-2">
                    <Clock className="w-4 h-4 text-[#22D3EE] mx-auto" />
                    <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-[#94A3B8] mt-0.5">
                      {formatDurationCompact(
                        computeDurationMinutes(selectedBus.departureTime, selectedBus.arrivalTime)
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 dark:text-[#94A3B8]">Arrival</div>
                    <div className="text-lg font-extrabold font-mono tabular-nums text-slate-900 dark:text-[#F8FAFC]">
                      {formatTime12h(selectedBus.arrivalTime)}
                    </div>
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                      {selectedBus.toLocation}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-[#94A3B8]">Ticket Fare</span>
                  <span className="text-xl font-black font-mono tabular-nums text-emerald-600 dark:text-[#34D399]">
                    ₹{selectedBus.ticketPrice.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 text-xs sm:text-sm">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <CalendarDays className="w-4 h-4 text-[#22D3EE] shrink-0" />
                  <span>
                    <strong className="text-slate-900 dark:text-white">Operating Days:</strong>{' '}
                    {formatOperatingDays(selectedBus.operatingDays)}
                  </span>
                </div>
                {selectedBus.notes && (
                  <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                    <FileText className="w-4 h-4 text-[#7C5CFC] shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-900 dark:text-white">Notes:</strong> {selectedBus.notes}
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-slate-400">
                  Added by {selectedBus.createdBy} · Manual group schedule
                </p>
              </div>

              {/* Primary CTA */}
              <button
                type="button"
                onClick={() => {
                  const target = selectedBus;
                  setSelectedBus(null);
                  handleTriggerTicketExpense(target);
                }}
                className="w-full min-h-[46px] px-4 py-3 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                <span>Add Ticket to Expenses (₹{selectedBus.ticketPrice.toLocaleString('en-IN')})</span>
              </button>

              {/* Secondary Actions */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleFavouriteBus(selectedBus.id)}
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        favSet.has(selectedBus.id) ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                      }`}
                    />
                    <span>{favSet.has(selectedBus.id) ? 'Favourited' : 'Favourite'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(selectedBus)}
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                </div>

                {confirmDeleteId === selectedBus.id ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmDelete(selectedBus.id)}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Confirm Delete
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(selectedBus.id)}
                    className="min-h-[42px] px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add / Edit Bus Schedule Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 28 }}
              transition={{ duration: 0.2 }}
              className="w-full sm:max-w-xl bg-white dark:bg-[#10162A] border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                    {editingBus ? 'Edit Bus Schedule' : 'Add Bus Schedule'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                    Manually enter accurate timings and fare for the group
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  aria-label="Close form"
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSaveForm} className="space-y-4">
                {/* Bus Name & Bus Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Bus Name *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={form.busName}
                      onChange={(e) => setForm({ ...form, busName: e.target.value })}
                      placeholder="e.g., TNSTC Express / PKS"
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#080B18] border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#22D3EE]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Bus Number
                    </label>
                    <input
                      type="text"
                      maxLength={40}
                      value={form.busNumber}
                      onChange={(e) => setForm({ ...form, busNumber: e.target.value })}
                      placeholder="e.g., 10A / TN-38-N-2411"
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#080B18] border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#22D3EE]"
                    />
                  </div>
                </div>

                {/* Operator & Bus Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Bus Operator *
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#080B18]">
                      {(['Government', 'Private'] as BusOperator[]).map((op) => (
                        <button
                          key={op}
                          type="button"
                          onClick={() => setForm({ ...form, operator: op })}
                          className={`min-h-[36px] rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            form.operator === op
                              ? 'bg-[#7C5CFC] text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {op}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Bus Type *
                    </label>
                    <select
                      value={form.busType}
                      onChange={(e) => setForm({ ...form, busType: e.target.value as BusType })}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#080B18] border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#22D3EE] cursor-pointer"
                    >
                      <option value="Ordinary">Ordinary</option>
                      <option value="Express">Express</option>
                      <option value="AC">AC</option>
                      <option value="Deluxe">Deluxe</option>
                    </select>
                  </div>
                </div>

                {/* From & To */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      From Location *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={form.fromLocation}
                      onChange={(e) => setForm({ ...form, fromLocation: e.target.value })}
                      placeholder="e.g., Gandhipuram"
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#080B18] border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#22D3EE]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      To Location *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={form.toLocation}
                      onChange={(e) => setForm({ ...form, toLocation: e.target.value })}
                      placeholder="e.g., Pollachi"
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#080B18] border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#22D3EE]"
                    />
                  </div>
                </div>

                {/* Departure, Arrival & Ticket Price */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Departure *
                    </label>
                    <input
                      type="time"
                      required
                      value={form.departureTime}
                      onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
                      className="w-full min-h-[42px] px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-[#080B18] border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-[#22D3EE]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Arrival *
                    </label>
                    <input
                      type="time"
                      required
                      value={form.arrivalTime}
                      onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })}
                      className="w-full min-h-[42px] px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-[#080B18] border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-[#22D3EE]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Fare (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={50000}
                      step="1"
                      inputMode="decimal"
                      value={form.ticketPrice}
                      onChange={(e) => setForm({ ...form, ticketPrice: e.target.value })}
                      placeholder="45"
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#080B18] border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-[#34D399]"
                    />
                  </div>
                </div>

                {/* Operating Days */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Operating Days *
                    </label>
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, operatingDays: [...ALL_WEEKDAYS] })}
                        className="text-[#7C5CFC] dark:text-[#22D3EE] font-semibold hover:underline cursor-pointer"
                      >
                        Daily
                      </button>
                      <span className="text-slate-400">·</span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, operatingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] })
                        }
                        className="text-[#7C5CFC] dark:text-[#22D3EE] font-semibold hover:underline cursor-pointer"
                      >
                        Weekdays
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {ALL_WEEKDAYS.map((day) => {
                      const active = form.operatingDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleToggleDay(day)}
                          className={`min-h-[38px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            active
                              ? 'bg-[#7C5CFC] text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-[#080B18] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Additional Notes
                  </label>
                  <textarea
                    rows={2}
                    maxLength={400}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Boarding bay, via stops, student pass info..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#080B18] border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#22D3EE] resize-none"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-h-[44px] px-5 py-2 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white text-sm font-bold shadow-md disabled:opacity-60 cursor-pointer"
                  >
                    {isSubmitting ? 'Saving...' : editingBus ? 'Update Schedule' : 'Save Schedule'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
