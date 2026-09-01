import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense, MemberName } from '../types';
import { MEMBERS, CATEGORIES } from '../data/categories';
import { formatCurrency, formatExactCurrency } from '../utils/analytics';
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  Receipt, 
  PieChart as PieIcon, 
  CreditCard,
  Crown,
  ChevronRight
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface MembersViewProps {
  expenses: Expense[];
  selectedMonth: string;
  currentMember: MemberName;
  onSelectMemberForHistory: (member: MemberName) => void;
}

export const MembersView: React.FC<MembersViewProps> = ({
  expenses,
  selectedMonth,
  currentMember,
  onSelectMemberForHistory
}) => {
  const [activeMemberTab, setActiveMemberTab] = useState<MemberName>(currentMember);

  const monthExpenses = selectedMonth === 'all'
    ? expenses
    : expenses.filter(e => e.date.startsWith(selectedMonth));

  const totalGroupExpense = monthExpenses.reduce((s, e) => s + e.amount, 0);

  // Compute stats for all members
  const memberStats = MEMBERS.map(m => {
    const name = m.name;
    const memExpenses = monthExpenses.filter(e => e.member === name);
    const totalSpent = memExpenses.reduce((s, e) => s + e.amount, 0);
    const percentage = totalGroupExpense > 0 ? Math.round((totalSpent / totalGroupExpense) * 100) : 0;
    const meta = m;

    // Category breakdown for this member
    const catMap = new Map<string, number>();
    memExpenses.forEach(e => catMap.set(e.category, (catMap.get(e.category) || 0) + e.amount));
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
      className="space-y-6 pb-16 max-w-6xl mx-auto"
    >
      
      {/* Member Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {memberStats.map(m => {
          const isSelected = activeMemberTab === m.name;
          return (
            <motion.button
              key={m.name}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveMemberTab(m.name)}
              className={`p-5 rounded-3xl border text-left transition-all relative cursor-pointer ${
                isSelected
                  ? 'bg-white dark:bg-slate-900 border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-600/30 shadow-lg'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-12 h-12 rounded-2xl ${m.meta.avatarColor} flex items-center justify-center text-lg font-bold shadow-sm`}>
                  {m.meta.avatarLetter}
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {m.percentage}% share
                </span>
              </div>

              <div className="mt-4">
                <div className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{m.name}</span>
                  {m.name === currentMember && (
                    <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded">
                      You
                    </span>
                  )}
                </div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {formatCurrency(m.totalSpent)}
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                  <span>{m.txnCount} transactions</span>
                  <span>Avg {formatCurrency(m.avgTxn)}</span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Selected Member Detail View */}
      <motion.div
        key={selectedMemberData.name}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl ${selectedMemberData.meta.avatarColor} flex items-center justify-center text-lg font-bold shadow-sm`}>
              {selectedMemberData.meta.avatarLetter}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {selectedMemberData.name}'s Spending Breakdown
              </h3>
              <p className="text-xs text-slate-400">
                {selectedMonth === 'all' ? 'All-Time records' : `Records for ${selectedMonth}`}
              </p>
            </div>
          </div>

          <button
            onClick={() => onSelectMemberForHistory(selectedMemberData.name)}
            className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            <span>View all {selectedMemberData.txnCount} transactions in Ledger</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Member Category Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Top Categories for {selectedMemberData.name}
            </h4>
            <div className="space-y-2.5">
              {selectedMemberData.categories.map((c) => {
                const catMeta = CATEGORIES.find(cat => cat.name === c.category);
                const pct = selectedMemberData.totalSpent > 0 ? Math.round((c.amount / selectedMemberData.totalSpent) * 100) : 0;

                return (
                  <div
                    key={c.category}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: catMeta?.color || '#6366F1' }} />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{c.category}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-extrabold text-slate-900 dark:text-white">{formatCurrency(c.amount)}</span>
                      <span className="text-slate-400 font-semibold w-10 text-right">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Member's Recent 5 Transactions */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Recent Transactions by {selectedMemberData.name}
            </h4>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {selectedMemberData.expenses.slice(0, 6).map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {tx.itemName || tx.category}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {tx.date} • {tx.paymentMode} {tx.place && `• ${tx.place}`}
                    </div>
                  </div>
                  <div className="font-extrabold text-slate-900 dark:text-white">
                    {formatCurrency(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </motion.div>

    </motion.div>
  );
};
