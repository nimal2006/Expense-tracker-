import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense, MemberName, CategoryName, PaymentMode } from '../types';
import { MEMBERS, CATEGORIES, PAYMENT_MODES } from '../data/categories';
import { filterExpenses, formatCurrency, formatExactCurrency, getLocalDateString, formatDateDisplay } from '../utils/analytics';
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
  AlertCircle
} from 'lucide-react';

interface HistoryViewProps {
  expenses: Expense[];
  currentMember: MemberName;
  onRefreshData: () => void;
  onOpenEditModal: (expense: Expense) => void;
  initialCategoryFilter?: string;
  initialMemberFilter?: MemberName;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  expenses,
  currentMember,
  onRefreshData,
  onOpenEditModal,
  initialCategoryFilter,
  initialMemberFilter
}) => {
  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<MemberName | 'All'>(initialMemberFilter || 'All');
  const [selectedCategory, setSelectedCategory] = useState<CategoryName | 'All'>((initialCategoryFilter as CategoryName) || 'All');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMode | 'All'>('All');
  const [placeFilter, setPlaceFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [quickFilter, setQuickFilter] = useState<'all' | 'mine' | 'today' | 'upi' | 'cash'>('all');

  // Security / Feedback state
  const [toastMessage, setToastMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Apply Quick Filter Logic
  let memberFilter = selectedMember;
  let paymentFilter = selectedPayment;
  let startDateFilter: string | undefined = undefined;
  let endDateFilter: string | undefined = undefined;

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
  }

  const filtered = filterExpenses(
    expenses,
    selectedMonth,
    'all',
    memberFilter,
    selectedCategory,
    paymentFilter,
    searchQuery,
    placeFilter,
    startDateFilter,
    endDateFilter
  );

  const filteredSum = filtered.reduce((s, e) => s + e.amount, 0);

  const handleEditClick = (expense: Expense) => {
    if (expense.member !== currentMember) {
      setToastMessage({
        type: 'error',
        text: `RLS Ownership Guard: You can only edit your own transactions. This record was created by ${expense.member}.`
      });
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    onOpenEditModal(expense);
  };

  const handleDeleteClick = (expense: Expense) => {
    if (expense.member !== currentMember) {
      setToastMessage({
        type: 'error',
        text: `RLS Ownership Guard: You cannot delete ${expense.member}'s transactions. Log in as ${expense.member} to delete.`
      });
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }
    setDeleteConfirmId(expense.id);
  };

  const confirmDelete = () => {
    if (!deleteConfirmId) return;
    const res = db.deleteExpense(deleteConfirmId, currentMember);
    if (res.success) {
      setToastMessage({ type: 'success', text: 'Transaction deleted successfully.' });
      setDeleteConfirmId(null);
      onRefreshData();
      setTimeout(() => setToastMessage(null), 3000);
    } else {
      setToastMessage({ type: 'error', text: res.error || 'Failed to delete transaction.' });
      setDeleteConfirmId(null);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedMonth('all');
    setSelectedMember('All');
    setSelectedCategory('All');
    setSelectedPayment('All');
    setPlaceFilter('');
    setQuickFilter('all');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5 pb-16 max-w-6xl mx-auto"
    >
      
      {/* Search & Quick Controls Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          
          {/* Main Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by item, place, category, member, amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Toggle Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border text-xs font-bold transition-colors ${
                showAdvancedFilters || selectedCategory !== 'All' || selectedMember !== 'All' || selectedPayment !== 'All'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
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

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Quick:</span>
          {[
            { id: 'all', label: 'All Records' },
            { id: 'mine', label: `My Entries (${currentMember})` },
            { id: 'today', label: 'Today' },
            { id: 'upi', label: 'UPI' },
            { id: 'cash', label: 'Cash' }
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setQuickFilter(pill.id as any)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                quickFilter === pill.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 duration-150">
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
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
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
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Summary Bar */}
      <div className="flex items-center justify-between px-2">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Showing <span className="font-bold text-slate-900 dark:text-white">{filtered.length}</span> transactions
        </div>
        <div className="text-sm font-extrabold text-slate-900 dark:text-white">
          Total: <span className="text-indigo-600 dark:text-indigo-400">{formatCurrency(filteredSum)}</span>
        </div>
      </div>

      {/* Transactions List: Mobile Cards + Desktop Table */}
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
      ) : (
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
                  {filtered.map((item) => {
                    const memberObj = MEMBERS.find(m => m.name === item.member) || MEMBERS[0];
                    const catMeta = CATEGORIES.find(c => c.name === item.category);
                    const isOwnExpense = item.member === currentMember;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                      >
                        {/* Date */}
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          <div className="font-semibold">{formatDateDisplay(item.date)}</div>
                          {item.time && <div className="text-[10px] text-slate-400">{item.time}</div>}
                        </td>

                        {/* Member */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-lg ${memberObj.avatarColor} flex items-center justify-center text-[11px] font-bold`}>
                              {memberObj.avatarLetter}
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

                        {/* Actions (RLS protected) */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEditClick(item)}
                              title={isOwnExpense ? 'Edit transaction' : `Created by ${item.member} (Read-only)`}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isOwnExpense
                                  ? 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50'
                                  : 'text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(item)}
                              title={isOwnExpense ? 'Delete transaction' : `Created by ${item.member} (Read-only)`}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isOwnExpense
                                  ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                                  : 'text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-3">
            {filtered.map((item) => {
              const memberObj = MEMBERS.find(m => m.name === item.member) || MEMBERS[0];
              const catMeta = CATEGORIES.find(c => c.name === item.category);
              const isOwnExpense = item.member === currentMember;

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl ${memberObj.avatarColor} flex items-center justify-center font-bold text-xs shadow-sm`}>
                        {memberObj.avatarLetter}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {item.member}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatDateDisplay(item.date)} {item.time && `• ${item.time}`}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-extrabold text-slate-900 dark:text-white">
                        {formatCurrency(item.amount)}
                      </div>
                      <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">
                        {item.paymentMode}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: catMeta?.color || '#6366F1' }}
                      >
                        {item.category}
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {item.itemName || '—'}
                      </span>
                      {item.place && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-0.5 shrink-0">
                          <MapPin className="w-3 h-3" />
                          {item.place}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleEditClick(item)}
                        className={`p-1.5 rounded-xl ${
                          isOwnExpense
                            ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            : 'text-slate-300 dark:text-slate-700'
                        }`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(item)}
                        className={`p-1.5 rounded-xl ${
                          isOwnExpense
                            ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                            : 'text-slate-300 dark:text-slate-700'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

    </motion.div>
  );
};
