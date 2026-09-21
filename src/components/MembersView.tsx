import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense, MemberName, Member } from '../types';
import { MEMBERS, CATEGORIES, getCategoryMeta, normalizeCategoryName } from '../data/categories';
import { useMemberAvatars } from '../hooks/useMemberAvatars';
import { MemberAvatarModal } from './MemberAvatarModal';
import { formatCurrency, formatExactCurrency, filterExpenses, sortExpensesDescending, formatTransactionSubtitle, getTransactionDisplay } from '../utils/analytics';
import { TransactionSubtitle } from './TransactionSubtitle';
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  Receipt, 
  PieChart as PieIcon, 
  CreditCard,
  Crown,
  ChevronRight,
  Trash2,
  Edit2,
  Sparkles,
  CheckCircle2,
  Camera
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { db } from '../services/storage';

interface MembersViewProps {
  expenses: Expense[];
  selectedMonth: string;
  currentMember: MemberName;
  onSelectMemberForHistory: (member: MemberName) => void;
  onOpenEditModal?: (expense: Expense) => void;
  onRefreshData?: () => void;
  onDeleteExpense?: (id: string) => void;
}

export const MembersView: React.FC<MembersViewProps> = ({
  expenses,
  selectedMonth,
  currentMember,
  onSelectMemberForHistory,
  onOpenEditModal,
  onRefreshData,
  onDeleteExpense
}) => {
  const { getMember } = useMemberAvatars();
  const [activeMemberTab, setActiveMemberTab] = useState<MemberName>(currentMember);
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<Expense | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editingAvatarMember, setEditingAvatarMember] = useState<Member | null>(null);

  const handleCleanDuplicates = () => {
    const res = db.cleanDuplicateExpenses();
    if (onRefreshData) onRefreshData();
    if (res.removedCount > 0) {
      setToastMessage(`Cleaned up ${res.removedCount} duplicate transaction(s)! (${res.remainingCount} clean entries remaining)`);
    } else {
      setToastMessage(`No duplicate expenses found. All records are unique! (${res.remainingCount} entries)`);
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  const monthExpenses = filterExpenses(expenses, selectedMonth);

  const totalGroupExpense = monthExpenses.reduce((s, e) => s + e.amount, 0);

  // Compute stats for all members
  const memberStats = MEMBERS.map(m => {
    const name = m.name;
    const memExpenses = sortExpensesDescending(monthExpenses.filter(e => e.member === name));
    const totalSpent = memExpenses.reduce((s, e) => s + e.amount, 0);
    const percentage = totalGroupExpense > 0 ? Math.round((totalSpent / totalGroupExpense) * 100) : 0;
    const meta = getMember(m.name);

    // Category breakdown for this member
    const catMap = new Map<string, number>();
    memExpenses.forEach(e => {
      const normCat = normalizeCategoryName(e.category);
      catMap.set(normCat, (catMap.get(normCat) || 0) + e.amount);
    });
    const categories = Array.from(catMap.entries())
      .map(([cat, amt]) => ({ category: cat, amount: amt }))
      .sort((a, b) => b.amount - a.amount);

    return {
      name,
      meta,
      totalSpent,
      percentage,
      txnCount: memExpenses.length,
      avgTxn: memExpenses.length > 0 ? Math.round(totalSpent / memExpenses.length) : 0,
      categories,
      expenses: memExpenses
    };
  });

  const selectedMemberData = memberStats.find(m => m.name === activeMemberTab) || memberStats[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6 pb-28 sm:pb-16 max-w-6xl mx-auto"
    >
      
      {/* Member Summary Cards Grid - 6 members */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {memberStats.map(m => {
          const isSelected = activeMemberTab === m.name;
          return (
            <motion.div
              key={m.name}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveMemberTab(m.name)}
              className={`p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border text-left transition-all relative cursor-pointer flex flex-col justify-between select-none ${
                isSelected
                  ? 'bg-[#151D35] border-cyan-400 ring-1 ring-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
                  : 'bg-[#10162A]/90 border-slate-800 hover:border-slate-700 shadow-xs'
              }`}
            >
              {/* 1. Header Row: Avatar and % share badge neatly aligned on horizontal baseline */}
              <div className="flex items-center justify-between gap-2 w-full">
                <div className="relative group/avatar">
                  <div className={`w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-xl sm:rounded-2xl ${
                    m.meta.avatarUrl ? 'bg-slate-800' : m.meta.avatarColor
                  } text-white flex items-center justify-center text-sm sm:text-base font-bold shadow-xs overflow-hidden`}>
                    {m.meta.avatarUrl ? (
                      <img src={m.meta.avatarUrl} alt={m.name} className="w-full h-full object-cover rounded-xl sm:rounded-2xl" />
                    ) : (
                      m.meta.avatarLetter
                    )}
                  </div>
                  {m.name === currentMember && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingAvatarMember(m.meta);
                      }}
                      title="Change your avatar photo"
                      className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-indigo-600 dark:bg-cyan-500 text-white flex items-center justify-center shadow-xs hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Camera className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-[#151D35] text-cyan-300 border border-slate-700/60 shrink-0 whitespace-nowrap">
                  {m.percentage}% share
                </span>
              </div>

              {/* 2. Body: Name and Total Amount cleanly start-aligned */}
              <div className="mt-3 sm:mt-4 min-w-0 w-full">
                <div className="text-xs sm:text-sm font-bold text-[#F8FAFC] flex items-center gap-1.5 truncate">
                  <span className="truncate">{m.name}</span>
                  {m.name === currentMember && (
                    <span className="text-[9px] sm:text-[10px] uppercase font-bold text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded shrink-0 border border-cyan-800/60">
                      You
                    </span>
                  )}
                </div>
                <div className="text-base sm:text-xl font-extrabold text-[#F8FAFC] mt-1 tracking-tight truncate">
                  {formatCurrency(m.totalSpent)}
                </div>
              </div>

              {/* 3. Metrics Footer Grid: Balanced 2-column grid with uniform bottom margins */}
              <div className="mt-3 pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-1 bg-[#151D35]/60 rounded-xl p-1.5 text-center w-full">
                <div className="min-w-0">
                  <span className="block text-[9px] sm:text-[10px] uppercase font-semibold text-[#94A3B8] truncate">
                    Txns
                  </span>
                  <span className="block text-xs font-bold text-[#F8FAFC] truncate">
                    {m.txnCount}
                  </span>
                </div>
                <div className="min-w-0 border-l border-slate-700/60">
                  <span className="block text-[9px] sm:text-[10px] uppercase font-semibold text-[#94A3B8] truncate">
                    Avg
                  </span>
                  <span className="block text-xs font-bold text-[#F8FAFC] truncate">
                    {formatCurrency(m.avgTxn)}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Selected Member Detail View */}
      <motion.div
        key={selectedMemberData.name}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="relative group/detail-avatar">
              <div className={`w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl ${
                selectedMemberData.meta.avatarUrl ? 'bg-slate-800' : selectedMemberData.meta.avatarColor
              } text-white flex items-center justify-center text-lg sm:text-xl font-bold shadow-sm ring-4 ring-indigo-50 dark:ring-indigo-950/40 overflow-hidden`}>
                {selectedMemberData.meta.avatarUrl ? (
                  <img
                    src={selectedMemberData.meta.avatarUrl}
                    alt={selectedMemberData.name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  selectedMemberData.meta.avatarLetter
                )}
              </div>
              {selectedMemberData.name === currentMember && (
                <button
                  type="button"
                  onClick={() => setEditingAvatarMember(selectedMemberData.meta)}
                  title="Change your avatar photo"
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 dark:bg-cyan-500 text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                </button>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {selectedMemberData.name}'s Spending Breakdown
                </h3>
                {selectedMemberData.name === currentMember && (
                  <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
                    You
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedMonth === 'all' ? 'All-Time records' : `Records for ${selectedMonth}`} • {selectedMemberData.txnCount} transactions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {selectedMemberData.name === currentMember && (
              <button
                type="button"
                onClick={() => setEditingAvatarMember(selectedMemberData.meta)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-indigo-500 dark:text-cyan-400" />
                <span>{selectedMemberData.meta.avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
              </button>
            )}

            <button
              onClick={() => onSelectMemberForHistory(selectedMemberData.name)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors w-full sm:w-auto cursor-pointer"
            >
              <span>View all {selectedMemberData.txnCount} txns in Ledger</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Member Category Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Top Categories for {selectedMemberData.name}
            </h4>
            {selectedMemberData.categories.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400">
                No category expenses recorded for this period
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedMemberData.categories.map((c) => {
                  const catMeta = getCategoryMeta(c.category);
                  const pct = selectedMemberData.totalSpent > 0 ? Math.round((c.amount / selectedMemberData.totalSpent) * 100) : 0;

                  return (
                    <div
                      key={c.category}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: catMeta.color }} />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{c.category}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs shrink-0">
                        <span className="font-extrabold text-slate-900 dark:text-white">{formatCurrency(c.amount)}</span>
                        <span className="text-slate-400 font-semibold w-10 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Member's Recent 6 Transactions */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Recent Transactions by {selectedMemberData.name}
            </h4>
            {selectedMemberData.expenses.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400">
                No transactions recorded for this period
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {selectedMemberData.expenses.slice(0, 6).map((tx, idx) => {
                  const isDeleting = deletingIds.has(String(tx.id));

                  return (
                    <div
                      key={`mem-tx-${tx.id}-${idx}`}
                      className={`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border transition-colors flex items-center justify-between text-xs ${
                        isDeleting
                          ? 'deleting-card-anim border-rose-500/90 shadow-[0_0_20px_rgba(244,63,94,0.5)]'
                          : 'border-slate-100 dark:border-slate-800'
                      }`}
                    >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {getTransactionDisplay(tx).title}
                      </div>
                      <div className="mt-0.5">
                        <TransactionSubtitle expense={tx} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="font-extrabold text-slate-900 dark:text-white">
                        {formatCurrency(tx.amount)}
                      </div>
                      <div className="flex items-center gap-0.5 ml-1">
                        {onOpenEditModal && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              onOpenEditModal(tx);
                            }}
                            title="Edit transaction"
                            className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setDeleteConfirmExpense(tx);
                          }}
                          title="Delete transaction"
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>
        </div>

        {/* One-Click Deduplication Tool Banner */}
        <div className="p-5 rounded-3xl bg-slate-900 dark:bg-slate-950 text-white border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <h4 className="text-sm font-bold">Database Deduplication Tool</h4>
            </div>
            <p className="text-xs text-slate-400">
              Scan all stored expenses across all members and months to instantly merge and purge identical duplicate entries.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCleanDuplicates}
            className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Clean Duplicates</span>
          </button>
        </div>

        {toastMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-sm animate-in slide-in-from-top duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

      </motion.div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Delete Transaction?</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to delete ₹{deleteConfirmExpense.amount} ({deleteConfirmExpense.itemName || deleteConfirmExpense.category}) created by {deleteConfirmExpense.member}?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmExpense(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!deleteConfirmExpense) return;
                  const targetId = String(deleteConfirmExpense.id);
                  setDeleteConfirmExpense(null);

                  // Phase 1 & 2: Add ID to deletingIds immediately so CSS/motion animation triggers
                  setDeletingIds(prev => new Set(prev).add(targetId));

                  // Phase 3: Execute DB deletion after 320ms animation finishes
                  setTimeout(() => {
                    db.deleteExpense(targetId, currentMember);
                    if (onDeleteExpense) onDeleteExpense(targetId);
                    if (onRefreshData) onRefreshData();
                    setDeletingIds(prev => {
                      const next = new Set(prev);
                      next.delete(targetId);
                      return next;
                    });
                  }, 320);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Upload / Selection Modal */}
      {editingAvatarMember && editingAvatarMember.name === currentMember && (
        <MemberAvatarModal
          isOpen={!!editingAvatarMember}
          onClose={() => setEditingAvatarMember(null)}
          member={editingAvatarMember}
          currentMember={currentMember}
          onAvatarUpdated={() => {
            if (onRefreshData) onRefreshData();
          }}
        />
      )}

    </motion.div>
  );
};
