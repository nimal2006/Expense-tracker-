import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense, MemberName, CategoryName, PaymentMode } from '../types';
import { MEMBERS, CATEGORIES, PAYMENT_MODES, getCategoryMeta } from '../data/categories';
import { useMemberAvatars } from '../hooks/useMemberAvatars';
import { useCountUp } from '../hooks/useCountUp';
import { filterExpenses, sortExpensesDescending, formatCurrency, formatExactCurrency, getLocalDateString, formatDateDisplay, formatTransactionSubtitle, getTransactionDisplay } from '../utils/analytics';
import { TransactionSubtitle } from './TransactionSubtitle';
import { TransactionCard } from './TransactionCard';
import { db } from '../services/storage';
import {
  Search,
  Filter,
  Trash2,
  Edit2,
  Calendar,
  X,
  Lock,
  Tag,
  MapPin,
  Clock,
  ArrowUpDown,
  Download,
  Check,
  AlertCircle,
  LayoutGrid,
  List
} from 'lucide-react';

interface HistoryViewProps {
  expenses: Expense[];
  currentMember: MemberName;
  onRefreshData: () => void;
  onOpenEditModal: (expense: Expense) => void;
  onDeleteExpense?: (id: string) => void;
  initialCategoryFilter?: string;
  initialMemberFilter?: MemberName;
  selectedMonth?: string;
  onSelectMonth?: (month: string) => void;
  availableMonths?: { value: string; label: string }[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  expenses,
  currentMember,
  onRefreshData,
  onOpenEditModal,
  onDeleteExpense,
  initialCategoryFilter,
  initialMemberFilter,
  selectedMonth: propSelectedMonth,
  onSelectMonth,
  availableMonths
}) => {
  const { getMember } = useMemberAvatars();

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [localSelectedMonth, setLocalSelectedMonth] = useState<string>('all');
  const activeMonth = propSelectedMonth !== undefined ? propSelectedMonth : localSelectedMonth;

  const handleMonthChange = (month: string) => {
    if (onSelectMonth) {
      onSelectMonth(month);
    } else {
      setLocalSelectedMonth(month);
    }
  };

  const [selectedMember, setSelectedMember] = useState<MemberName | 'All'>(initialMemberFilter || 'All');
  const [selectedCategory, setSelectedCategory] = useState<CategoryName | 'All'>((initialCategoryFilter as CategoryName) || 'All');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMode | 'All'>('All');
  const [placeFilter, setPlaceFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [quickFilter, setQuickFilter] = useState<'all' | 'mine' | 'today' | 'upi' | 'cash' | 'gt500'>('all');

  // Security / Feedback state
  const [toastMessage, setToastMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Selection & View Mode
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Apply Quick Filter Logic
  let memberFilter = selectedMember;
  let paymentFilter = selectedPayment;
  let startDateFilter: string | undefined = undefined;
  let endDateFilter: string | undefined = undefined;
  let minAmountFilter: number | undefined = undefined;

  const todayIso = getLocalDateString(new Date());

  if (quickFilter === 'mine') {
    memberFilter = currentMember;
  } else if (quickFilter === 'today') {
    startDateFilter = todayIso;
    endDateFilter = todayIso;
  } else if (quickFilter === 'upi') {
    paymentFilter = 'UPI';
  } else if (quickFilter === 'cash') {
    paymentFilter = 'Cash';
  } else if (quickFilter === 'gt500') {
    minAmountFilter = 500;
  }

  // Unified Filter Pipeline:
  // All Transactions → Selected Month → User Filter → Quick Filter → Search → Sort → Display
  const filtered = sortExpensesDescending(
    filterExpenses(
      expenses,
      activeMonth,
      'all',
      memberFilter,
      selectedCategory,
      paymentFilter,
      searchQuery,
      placeFilter,
      startDateFilter,
      endDateFilter,
      minAmountFilter
    )
  );

  const filteredSum = filtered.reduce((s, e) => s + e.amount, 0);
  const animatedTotal = useCountUp(filteredSum, 650);

  const handleEditClick = (expense: Expense) => {
    onOpenEditModal(expense);
  };

  const handleDeleteClick = (expense: Expense) => {
    setDeleteConfirmId(String(expense.id));
  };

  const confirmDelete = () => {
    if (!deleteConfirmId) return;
    const targetId = String(deleteConfirmId);
    setDeleteConfirmId(null);

    // Phase 1 & 2: Add ID to deletingIds immediately so CSS/motion animation triggers
    setDeletingIds(prev => new Set(prev).add(targetId));

    // Phase 3: Execute DB deletion after 320ms animation finishes
    setTimeout(() => {
      const res = db.deleteExpense(targetId, currentMember);
      if (res.success) {
        if (selectedCardId === targetId) {
          setSelectedCardId(null);
        }
        if (onDeleteExpense) {
          onDeleteExpense(targetId);
        }
        setToastMessage({ type: 'success', text: 'Transaction permanently deleted.' });
        onRefreshData();
        setTimeout(() => setToastMessage(null), 3000);
      } else {
        setToastMessage({ type: 'error', text: res.error || 'Failed to delete transaction.' });
      }
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }, 320);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    handleMonthChange('all');
    setSelectedMember('All');
    setSelectedCategory('All');
    setSelectedPayment('All');
    setPlaceFilter('');
    setQuickFilter('all');
  };

  const renderTransactionCard = (item: Expense, index: number = 0) => {
    const isSelected = selectedCardId === item.id;
    const targetIdStr = String(item.id);
    const isDeleting = deletingIds.has(targetIdStr);

    return (
      <TransactionCard
        key={`tx-card-${item.id}-${index}`}
        item={item}
        index={index}
        currentMember={currentMember}
        isSelected={isSelected}
        isDeleting={isDeleting}
        onSelect={(exp) => setSelectedCardId(prev => (prev === exp.id ? null : String(exp.id)))}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onDenialToast={(msg) => {
          setToastMessage({ type: 'info', text: msg });
          setTimeout(() => setToastMessage(null), 3000);
        }}
      />
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5 pb-28 sm:pb-16 max-w-6xl mx-auto"
    >
      
      {/* Search & Quick Controls Bar */}
      <div className="bg-white/90 dark:bg-[#10162A]/90 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          
          {/* Main Search Input with subtle cyan glow on hover/focus */}
          <div className="relative flex-1 w-full group">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-cyan-500 dark:group-focus-within:text-cyan-400 transition-all duration-200" />
            <input
              type="text"
              placeholder="Search by item, place, category, member, amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-[#151D35]/80 hover:border-cyan-500/30 dark:hover:border-cyan-400/40 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-sm text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 focus:bg-white dark:focus:bg-[#17213C] focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 dark:focus:ring-cyan-400/25 focus:outline-none transition-all duration-200 shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Toggle Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${
                showAdvancedFilters || selectedCategory !== 'All' || selectedMember !== 'All' || selectedPayment !== 'All'
                  ? 'bg-indigo-50 dark:bg-cyan-950/60 border-indigo-500 dark:border-cyan-400 text-indigo-700 dark:text-cyan-300 shadow-xs'
                  : 'bg-slate-50 dark:bg-[#151D35] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Filter className={`w-3.5 h-3.5 transition-transform duration-200 ${showAdvancedFilters ? 'rotate-180 text-cyan-400' : ''}`} />
              <span>Filters</span>
            </button>

            {(selectedCategory !== 'All' || selectedMember !== 'All' || selectedPayment !== 'All' || searchQuery || placeFilter) && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-rose-500 font-semibold hover:underline"
              >
                Reset All
              </button>
            )}
          </div>

        </div>

        {/* Quick Filter Pills with Smooth Animated Active Background */}
        <div className="flex flex-wrap items-center gap-2 pt-2 pb-1 px-3 bg-slate-50 dark:bg-[#151D35]/50 rounded-2xl border border-slate-200 dark:border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">Quick:</span>
          {[
            { id: 'all', label: 'All' },
            { id: 'upi', label: 'UPI' },
            { id: 'cash', label: 'Cash' },
            { id: 'gt500', label: '> ₹500' },
            { id: 'mine', label: `My Entries (${currentMember})` },
            { id: 'today', label: 'Today' }
          ].map((pill) => {
            const isActive = quickFilter === pill.id;
            return (
              <motion.button
                key={pill.id}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => setQuickFilter(pill.id as any)}
                className={`relative px-3 py-1 rounded-xl text-xs font-bold transition-colors duration-200 ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-[#10162A] border border-slate-200 dark:border-slate-800/80'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeQuickFilterPill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] shadow-md shadow-indigo-500/25 -z-[1]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{pill.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 duration-150">
            {/* Month Filter */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Month Period</label>
              <select
                value={activeMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold p-2 rounded-xl border border-slate-200 dark:border-slate-700"
              >
                {Array.from(
                  new Map(
                    [
                      { value: 'all', label: 'All Months' },
                      ...(availableMonths || [])
                    ].map(m => [m.value, m])
                  ).values()
                ).map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Member Filter */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Member</label>
              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold p-2 rounded-xl border border-slate-200 dark:border-slate-700"
              >
                <option value="All">All Members</option>
                {MEMBERS.map((m) => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold p-2 rounded-xl border border-slate-200 dark:border-slate-700"
              >
                <option value="All">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Payment Mode Filter */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Payment Mode</label>
              <select
                value={selectedPayment}
                onChange={(e) => setSelectedPayment(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold p-2 rounded-xl border border-slate-200 dark:border-slate-700"
              >
                <option value="All">All Modes</option>
                {PAYMENT_MODES.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Place / Location Filter */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Place / City</label>
              <input
                type="text"
                placeholder="e.g. TOLL, MKCE..."
                value={placeFilter}
                onChange={(e) => setPlaceFilter(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold p-2 rounded-xl border border-slate-200 dark:border-slate-700"
              >
              </input>
            </div>
          </div>
        )}
      </div>

      {/* Toast / RLS Message Alert */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md animate-in slide-in-from-top duration-150 ${
            toastMessage.type === 'error'
              ? 'bg-rose-500 text-white'
              : toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-indigo-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white dark:bg-[#10162A] p-6 rounded-3xl max-w-sm w-full border border-slate-200 dark:border-rose-500/30 shadow-[0_0_40px_rgba(244,63,94,0.15)] space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-inner">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Delete Transaction?</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Are you sure you want to permanently delete this expense record? This action cannot be undone.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Live Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2">
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Showing <span className="font-bold text-slate-900 dark:text-white">{filtered.length}</span> transactions
          </div>
          {selectedCardId && (
            <button
              onClick={() => setSelectedCardId(null)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-cyan-950/50 text-[11px] font-semibold text-indigo-600 dark:text-cyan-400 hover:bg-indigo-100 dark:hover:bg-cyan-900/60 transition-colors cursor-pointer"
            >
              <span>1 selected</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              title="Cards View"
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="text-[11px]">Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="Table View"
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="text-[11px]">Table</span>
            </button>
          </div>

          <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">Total:</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-extrabold font-mono tabular-nums text-base drop-shadow-[0_0_12px_rgba(34,211,238,0.3)]">
              {formatCurrency(animatedTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Transactions List: Cards or Table */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Transactions Found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search query, clearing filters, or logging a new expense.
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards View (Grid on Desktop/Tablet, Stack on Mobile) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((item, idx) => renderTransactionCard(item, idx))}
        </div>
      ) : (
        /* Table View for Desktop + Cards Fallback for Mobile */
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Item / Description</th>
                    <th className="py-3 px-4">Qty</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Place</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filtered.map((item, idx) => {
                    const memberObj = getMember(item.member);
                    const catMeta = getCategoryMeta(item.category);
                    const isOwnExpense = item.member === currentMember;
                    const isSelected = selectedCardId === item.id;

                    return (
                      <tr
                        key={`tbl-row-${item.id}-${idx}`}
                        onClick={() => setSelectedCardId(prev => prev === item.id ? null : item.id)}
                        className={`transition-colors group cursor-pointer ${
                          deletingIds.has(String(item.id))
                            ? 'deleting-card-anim border-rose-500'
                            : isSelected
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 ring-1 ring-inset ring-indigo-500/30'
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Date */}
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          <div className="font-semibold">{formatDateDisplay(item.date)}</div>
                          {item.time && <div className="text-[10px] text-slate-400">{item.time}</div>}
                        </td>

                        {/* Member */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-lg ${memberObj.avatarColor} flex items-center justify-center text-[11px] font-bold overflow-hidden shrink-0`}>
                              {memberObj.avatarUrl ? (
                                <img src={memberObj.avatarUrl} alt={item.member} className="w-full h-full object-cover rounded-lg" />
                              ) : (
                                memberObj.avatarLetter
                              )}
                            </div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{item.member}</span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white shadow-xs"
                            style={{ backgroundColor: catMeta?.color || '#6366F1' }}
                          >
                            {item.category}
                          </span>
                        </td>

                        {/* Item Name */}
                        <td className="py-3.5 px-4 text-slate-900 dark:text-white font-semibold max-w-xs truncate">
                          {item.itemName || '—'}
                        </td>

                        {/* Quantity */}
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                          {item.quantity && item.quantity > 1 ? item.quantity : '1'}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 font-extrabold text-sm text-slate-900 dark:text-white whitespace-nowrap">
                          {formatExactCurrency(item.amount)}
                        </td>

                        {/* Payment */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {item.paymentMode}
                          </span>
                        </td>

                        {/* Place */}
                        <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                          {item.place || '—'}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {item.member === currentMember && (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleEditClick(item);
                                }}
                                title="Edit transaction"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleDeleteClick(item);
                                }}
                                title="Delete transaction"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
          </div>

          {/* Mobile Card List View in Table Mode */}
          <div className="md:hidden space-y-3">
            {filtered.map((item, idx) => renderTransactionCard(item, idx))}
          </div>
        </>
      )}

    </motion.div>
  );
};
