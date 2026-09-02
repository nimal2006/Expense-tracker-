import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Expense, MemberName } from '../types';
import { MEMBERS, CATEGORIES, PAYMENT_MODES } from '../data/categories';
import { 
  calculateSummaryMetrics, 
  calculateDailySpending, 
  calculateWeeklySpending, 
  calculateMonthlyTrend, 
  generateSmartInsights, 
  formatCurrency, 
  formatExactCurrency,
  getLocalDateString
} from '../utils/analytics';
import { db } from '../services/storage';
import {
  Wallet,
  FileSpreadsheet,
  TrendingUp,
  Calendar,
  PieChart as PieChartIcon,
  Trophy,
  Plus,
  ArrowRight,
  Sparkles,
  Users,
  User,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Target,
  Flame,
  Zap,
  DollarSign,
  Percent
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

interface DashboardViewProps {
  expenses: Expense[];
  selectedMonth: string; // '2026-08', '2026-09', or 'all'
  currentMember: MemberName;
  onOpenAddExpense: () => void;
  onNavigateToHistory: () => void;
  onSelectCategoryFilter?: (category: string) => void;
  onSelectMemberFilter?: (member: MemberName) => void;
  monthlyBudget?: number;
  onOpenBudgetModal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  expenses,
  selectedMonth,
  currentMember,
  onOpenAddExpense,
  onNavigateToHistory,
  onSelectCategoryFilter,
  onSelectMemberFilter,
  monthlyBudget,
  onOpenBudgetModal
}) => {
  // View Scope: 'my' (individual personal mode) vs 'group' (all 5 friends combined)
  const [viewScope, setViewScope] = useState<'my' | 'group'>('my');

  // Filter expenses for current selected month
  const currentMonthAllExpenses = selectedMonth === 'all'
    ? expenses
    : expenses.filter(e => e.date.startsWith(selectedMonth));

  // Determine previous month for comparison
  let previousMonthStr = '2026-08';
  if (selectedMonth === '2026-09') {
    previousMonthStr = '2026-08';
  } else if (selectedMonth === '2026-08') {
    previousMonthStr = '2026-07';
  }
  const previousMonthAllExpenses = expenses.filter(e => e.date.startsWith(previousMonthStr));

  // Group Summary across all friends
  const groupSummary = calculateSummaryMetrics(currentMonthAllExpenses, previousMonthAllExpenses);

  // Active Expenses based on selected view scope (Personal vs Group)
  const activeCurrentExpenses = viewScope === 'my'
    ? currentMonthAllExpenses.filter(e => e.member === currentMember)
    : currentMonthAllExpenses;

  const activePreviousExpenses = viewScope === 'my'
    ? previousMonthAllExpenses.filter(e => e.member === currentMember)
    : previousMonthAllExpenses;

  const summary = calculateSummaryMetrics(activeCurrentExpenses, activePreviousExpenses);
  const dailyData = calculateDailySpending(activeCurrentExpenses, selectedMonth === 'all' ? '2026-08' : selectedMonth);
  const weeklyData = calculateWeeklySpending(activeCurrentExpenses, selectedMonth === 'all' ? '2026-08' : selectedMonth);
  const monthlyTrendData = calculateMonthlyTrend(
    viewScope === 'my' ? expenses.filter(e => e.member === currentMember) : expenses, 
    '2026'
  );
  const insights = generateSmartInsights(activeCurrentExpenses, selectedMonth, activePreviousExpenses);

  // Active Budget for the active mode
  const monthKey = selectedMonth === 'all' ? '2026-08' : selectedMonth;
  const activeBudget = viewScope === 'my'
    ? (monthlyBudget || db.getBudget(monthKey, currentMember))
    : db.getGroupBudget(monthKey);

  // Recent transactions (top 5 newest)
  const recentTransactions = [...activeCurrentExpenses]
    .sort((a, b) => new Date(`${b.date}T${b.time || '00:00'}:00`).getTime() - new Date(`${a.date}T${a.time || '00:00'}:00`).getTime())
    .slice(0, 5);

  // Colors for member charts
  const memberColors: Record<MemberName, string> = {
    Nimal: '#6366F1', // Indigo/Purple
    Etti: '#10B981',  // Emerald
    Dharan: '#F59E0B', // Orange/Amber
    Sanjai: '#3B82F6',  // Blue
    Santhosh: '#8B5CF6' // Purple/Violet
  };

  // Member comparison chart dataset (in group mode)
  const memberComparisonData = MEMBERS.map(m => ({
    name: m.name,
    amount: groupSummary.memberTotals[m.name]?.amount || 0,
    fill: memberColors[m.name] || '#6366F1'
  }));

  // Category Donut Chart dataset
  const categoryChartData = summary.categoryArray.slice(0, 6).map(c => {
    const meta = CATEGORIES.find(cat => cat.name === c.category);
    return {
      name: c.category,
      value: c.amount,
      color: meta?.color || '#94A3B8',
      percentage: c.percentage
    };
  });

  // Payment method chart dataset
  const paymentChartData = summary.paymentBreakdown.map(p => {
    const meta = PAYMENT_MODES.find(m => m.name === p.mode);
    return {
      name: p.mode,
      value: p.amount,
      color: meta?.color || '#64748B',
      percentage: p.percentage
    };
  });

  // Weekly spending chart dataset
  const weeklyChartData = weeklyData.map(w => ({
    name: w.shortLabel,
    amount: w.amount,
    fullLabel: w.label
  }));

  // Daily spending chart dataset
  const dailyChartData = dailyData.map(d => ({
    day: d.day,
    amount: d.amount,
    date: d.date
  }));

  // Monthly Budget metrics
  const budgetSpentPct = activeBudget > 0 ? Math.min(Math.round((summary.totalExpense / activeBudget) * 100), 100) : 0;
  const budgetRemaining = Math.max(activeBudget - summary.totalExpense, 0);

  // Daily Budget metrics
  const todayStr = getLocalDateString(new Date());
  const activeMonthStr = selectedMonth === 'all' ? todayStr.substring(0, 7) : selectedMonth;
  const [yearNum, monthNum] = activeMonthStr.split('-').map(Number);
  const daysInMonth = (yearNum && monthNum) ? new Date(yearNum, monthNum, 0).getDate() : 30;
  const targetDailyBudget = Math.max(Math.round(activeBudget / daysInMonth), 1);
  
  // Today's spend for active mode
  const activeTodaySpent = summary.todayTotal;
  const dailySpentPct = targetDailyBudget > 0 ? Math.round((activeTodaySpent / targetDailyBudget) * 100) : 0;
  const clampedDailyPct = Math.min(dailySpentPct, 100);
  const dailyRemaining = Math.max(targetDailyBudget - activeTodaySpent, 0);
  const isDailyOver = activeTodaySpent > targetDailyBudget;
  const dailyOverspend = Math.max(activeTodaySpent - targetDailyBudget, 0);

  // User share percentage in room group
  const myTotalSpent = groupSummary.memberTotals[currentMember]?.amount || 0;
  const roomTotalSpent = groupSummary.totalExpense;
  const mySharePct = roomTotalSpent > 0 ? Math.round((myTotalSpent / roomTotalSpent) * 100) : 0;

  const currentMemberObj = MEMBERS.find(m => m.name === currentMember) || MEMBERS[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6 pb-12"
    >

      {/* ========================================================
          DASHBOARD SCOPE HEADER: Personal View vs Room Group Toggle
          ======================================================== */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl ${
            viewScope === 'my' 
              ? `${currentMemberObj.avatarColor} text-white` 
              : 'bg-gradient-to-tr from-amber-500 to-indigo-600 text-white'
          } flex items-center justify-center font-bold text-lg shadow-md shrink-0`}>
            {viewScope === 'my' ? currentMemberObj.avatarLetter : '👥'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {viewScope === 'my' ? `${currentMember}'s Personal Dashboard` : 'Room Group Dashboard'}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                viewScope === 'my' 
                  ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' 
                  : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}>
                {viewScope === 'my' ? `👤 Personal Spend (${currentMember})` : '👥 All 5 Friends'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {viewScope === 'my' 
                ? `Tracking your individual expenses & personal budget for ${selectedMonth === 'all' ? 'all months' : selectedMonth}` 
                : `Combined outflow & expense distribution for all 5 room members`}
            </p>
          </div>
        </div>

        {/* View Switcher Segmented Control */}
        <div className="flex bg-slate-100 dark:bg-slate-800/90 p-1 rounded-2xl shrink-0 self-start sm:self-center border border-slate-200/60 dark:border-slate-700/60">
          <button
            onClick={() => setViewScope('my')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewScope === 'my'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>My Expenses ({currentMember})</span>
          </button>
          <button
            onClick={() => setViewScope('group')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewScope === 'group'
                ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Room Group (All 5)</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          0. DAILY SPENDING PROGRESS BAR (Personal or Group Pace)
          ======================================================== */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.18 }}
        className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
              isDailyOver 
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400' 
                : dailySpentPct > 75 
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' 
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
            }`}>
              {isDailyOver ? (
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              ) : dailySpentPct > 75 ? (
                <Flame className="w-5 h-5" />
              ) : (
                <Zap className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {viewScope === 'my' ? `${currentMember}'s Daily Spending Progress` : 'Room Group Daily Progress'}
                </h2>
                {isDailyOver ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                    <AlertCircle className="w-3 h-3" />
                    <span>Daily Cap Exceeded (+{formatCurrency(dailyOverspend)})</span>
                  </span>
                ) : dailySpentPct > 75 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                    <span>Nearing Daily Cap ({dailySpentPct}%)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Within Daily Budget ({dailySpentPct}%)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {viewScope === 'my'
                  ? `Your personal today spend vs your daily allowance (${formatCurrency(activeBudget)} / ${daysInMonth} days)`
                  : `Total room outflow today compared to group pace (${formatCurrency(activeBudget)} / ${daysInMonth} days)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {onOpenBudgetModal && (
              <button
                onClick={onOpenBudgetModal}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-200/60 dark:border-slate-700/60"
                title="Adjust your spending limit"
              >
                <Target className="w-3.5 h-3.5 text-indigo-500" />
                <span>{viewScope === 'my' ? `Set My Budget` : `Set Group Budget`}</span>
              </button>
            )}
            <button
              onClick={onOpenAddExpense}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>

        {/* Visual Progress Bar with markers */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-end text-xs">
            <div className="flex items-baseline gap-1.5">
              <span className="font-extrabold text-slate-900 dark:text-white text-base">
                {formatCurrency(activeTodaySpent)}
              </span>
              <span className="text-slate-400 text-xs font-medium">
                {viewScope === 'my' ? 'spent by you today' : 'spent by room today'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 dark:text-slate-400 text-xs">
                {viewScope === 'my' ? 'Your Daily Target: ' : 'Group Daily Target: '}
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {formatCurrency(targetDailyBudget)} / day
              </span>
            </div>
          </div>

          {/* Progress Track */}
          <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50 relative">
            <div
              className={`h-full rounded-full transition-all duration-500 shadow-sm ${
                isDailyOver
                  ? 'bg-gradient-to-r from-rose-500 to-red-600'
                  : dailySpentPct > 75
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500'
              }`}
              style={{ width: `${clampedDailyPct}%` }}
            />
          </div>

          {/* Context Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {viewScope === 'my' ? 'You Spent Today' : 'Today Spent'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {formatCurrency(activeTodaySpent)}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Daily Allowance
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                {formatCurrency(targetDailyBudget)} / day
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isDailyOver ? 'Over Budget' : 'Remaining Today'}
              </span>
              <span className={`text-xs sm:text-sm font-bold mt-0.5 block ${
                isDailyOver 
                  ? 'text-rose-600 dark:text-rose-400' 
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {isDailyOver ? `+${formatCurrency(dailyOverspend)}` : `${formatCurrency(dailyRemaining)} left`}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {viewScope === 'my' ? 'Your Monthly Cap' : 'Group Monthly Cap'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5 block truncate">
                {formatCurrency(activeBudget)} ({budgetSpentPct}% used)
              </span>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* ========================================================
          1. TOP STATS CARDS (Personal Mode or Group Mode)
          ======================================================== */}
      {viewScope === 'my' ? (
        /* PERSONAL MODE STATS CARDS FOR LOGGED IN MEMBER */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* 1. My Total Expense */}
          <motion.div
            whileHover={{ y: -3 }}
            transition={{ duration: 0.18 }}
            className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {currentMember}
                </span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  My Total Spent
                </span>
                <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {formatCurrency(summary.totalExpense)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {selectedMonth === 'all' ? 'All Months' : selectedMonth}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
              <span>{summary.totalTransactions} transactions</span>
            </div>
          </motion.div>

          {/* 2. My Monthly Budget Limit */}
          <motion.div
            whileHover={{ y: -3 }}
            transition={{ duration: 0.18 }}
            onClick={onOpenBudgetModal}
            className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">
                  Edit ✏️
                </span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  My Budget Limit
                </span>
                <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {formatCurrency(activeBudget)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {budgetRemaining > 0 ? `${formatCurrency(budgetRemaining)} left` : 'Budget reached'}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span>{budgetSpentPct}% utilized</span>
            </div>
          </motion.div>

          {/* 3. My Daily Average Spend */}
          <motion.div
            whileHover={{ y: -3 }}
            transition={{ duration: 0.18 }}
            className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Pace
                </span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  My Daily Avg
                </span>
                <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {formatCurrency(Math.round(summary.avgDailySpending))}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  per day
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
              <span>Avg ₹{Math.round(summary.avgPerTransaction)}/txn</span>
            </div>
          </motion.div>

          {/* 4. My Top Category */}
          <motion.div
            whileHover={{ y: -3 }}
            transition={{ duration: 0.18 }}
            className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Trophy className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                  {summary.topCategory.percentage}%
                </span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  My Top Category
                </span>
                <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5 truncate">
                  {summary.topCategory.category}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {formatCurrency(summary.topCategory.amount)} spent
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
              <span>Rank #1 Category</span>
            </div>
          </motion.div>

          {/* 5. Room Contribution Share */}
          <motion.div
            whileHover={{ y: -3 }}
            transition={{ duration: 0.18 }}
            className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Percent className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  Room
                </span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  My Room Share
                </span>
                <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {mySharePct}%
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                  of ₹{formatCurrency(roomTotalSpent)} room total
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              <span>5-person share</span>
            </div>
          </motion.div>

          {/* 6. Quick CTA */}
          <button
            onClick={onOpenAddExpense}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white p-4 rounded-3xl shadow-md shadow-indigo-600/20 flex flex-col justify-between text-left transition-transform active:scale-[0.98] group"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-xs font-bold text-indigo-200">
                  Record New
                </span>
                <div className="text-base font-black text-white mt-0.5">
                  Add Expense
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-white/20 text-[11px] text-indigo-100 font-medium">
              3-tap instant entry
            </div>
          </button>
        </div>
      ) : (
        /* ROOM GROUP MODE STATS CARDS (ALL 5 FRIENDS) */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4">
          {/* Total Expense Card */}
          <motion.div
            whileHover={{ y: -3 }}
            transition={{ duration: 0.18 }}
            className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Room Total
                </span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Total Room Spend
                </span>
                <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {formatCurrency(groupSummary.totalExpense)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {selectedMonth === 'all' ? 'All Months' : selectedMonth}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>All 5 friends combined</span>
            </div>
          </motion.div>

          {/* Dynamic Member Total Cards */}
          {MEMBERS.map((member) => {
            const data = groupSummary.memberTotals[member.name] || { amount: 0, count: 0, percentage: 0 };
            const isUser = member.name === currentMember;
            return (
              <motion.div
                key={member.id}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.18 }}
                className={`bg-white dark:bg-slate-900 p-4 rounded-3xl border shadow-sm flex flex-col justify-between hover:shadow-md transition-all cursor-pointer ${
                  isUser ? 'border-indigo-300 dark:border-indigo-800 ring-1 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800'
                }`}
                onClick={() => onSelectMemberFilter && onSelectMemberFilter(member.name)}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className={`w-8 h-8 rounded-xl ${member.avatarColor} flex items-center justify-center text-xs font-bold shadow-sm`}>
                      {member.avatarLetter}
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      isUser ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      {data.percentage}% {isUser && '• You'}
                    </span>
                  </div>
                  <div className="mt-3">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {member.name}
                    </span>
                    <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
                      {formatCurrency(data.amount)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {data.count} transactions
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span>{data.percentage}% of room</span>
                </div>
              </motion.div>
            );
          })}

          {/* Total Transactions Card */}
          <motion.div
            whileHover={{ y: -3 }}
            transition={{ duration: 0.18 }}
            className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Entries
                </span>
              </div>
              <div className="mt-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Total Txns
                </span>
                <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {groupSummary.totalTransactions}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Verified records
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
              <span>Full room ledger</span>
            </div>
          </motion.div>
        </div>
      )}

      {/* ========================================================
          3. CHARTS ROW: Category Donut + Member/Personal Bar + Payment Donut
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Category Distribution (Donut Chart) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🍩 {viewScope === 'my' ? `My Category Distribution` : `Room Category Distribution`}</span>
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              {viewScope === 'my' ? `Where you spent your money` : `Room spending breakdown by category`}
            </p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Amount']}
                    contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No expenses recorded</div>
            )}
          </div>

          {/* Custom Legend */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            {categoryChartData.slice(0, 4).map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                <span className="text-slate-600 dark:text-slate-300 truncate font-medium">{item.name}</span>
                <span className="text-slate-400 ml-auto font-bold">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Member Comparison (Bar Chart in Group Mode, or Personal Contribution in My Mode) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>👥 {viewScope === 'my' ? `Room Members Comparison` : `Member Comparison`}</span>
              </h3>
              {viewScope === 'my' && (
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
                  You: {mySharePct}%
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-4">Total spent per friend (₹)</p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={memberComparisonData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Total Spent']}
                  contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {memberComparisonData.map((entry, index) => (
                    <Cell 
                      key={`bar-${index}`} 
                      fill={entry.fill} 
                      opacity={viewScope === 'my' && entry.name !== currentMember ? 0.45 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-5 gap-1 pt-3 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
            {memberComparisonData.map((m) => (
              <div key={m.name}>
                <span className={`text-[11px] block truncate ${m.name === currentMember ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                  {m.name}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(m.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Method Analysis (Donut Chart) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>💳 {viewScope === 'my' ? `My Payment Modes` : `Room Payment Analysis`}</span>
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">UPI vs Cash vs Card vs Friend Paid</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {paymentChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {paymentChartData.map((entry, index) => (
                      <Cell key={`cell-pay-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Amount']}
                    contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No payment data</div>
            )}
          </div>

          {/* Payment Custom Legend */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            {paymentChartData.map((p) => (
              <div key={p.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }}></span>
                <span className="text-slate-600 dark:text-slate-300 font-medium">{p.name}</span>
                <span className="text-slate-400 ml-auto font-bold">{p.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ========================================================
          4. FOURTH ROW TREND CHARTS: Weekly Spending + Daily Trend + Monthly 2026 Trend
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Weekly Spending */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              📊 {viewScope === 'my' ? `My Weekly Spending` : `Room Weekly Spending`}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">Outflow across 5 weeks of the month</p>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Total']}
                  contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="amount" stroke="#6366F1" strokeWidth={3} dot={{ r: 4, fill: '#6366F1' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Spending Trend */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              📈 {viewScope === 'my' ? `My Daily Spending Curve` : `Room Daily Spending Curve`}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">Day 1 to 31 expense curve</p>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Spend']}
                  labelFormatter={(lbl) => `Day ${lbl}`}
                  contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="amount" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3, fill: '#10B981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Trend 2026 */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              📉 {viewScope === 'my' ? `My Continuous Trend (2026)` : `Room Monthly Trend (2026)`}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">Continuous year comparison</p>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Total Spent']}
                  contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="amount" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ========================================================
          5. FIFTH ROW: Top 10 Categories Table & Right Sidebar Cards
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left 2 Columns: Top 10 Categories Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                🥇 {viewScope === 'my' ? `My Top Categories` : `Room Top Categories`}
              </h3>
              <p className="text-xs text-slate-400">Ranked by total expenditure</p>
            </div>
            <button
              onClick={onNavigateToHistory}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Amount (₹)</th>
                  <th className="py-2.5 px-3">% of Spend</th>
                  <th className="py-2.5 px-3">Transactions</th>
                  <th className="py-2.5 px-3">Avg / Txn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {summary.categoryArray.slice(0, 10).map((cat, idx) => {
                  const meta = CATEGORIES.find(c => c.name === cat.category);
                  return (
                    <tr key={cat.category} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta?.color || '#94A3B8' }} />
                          <span className="font-bold text-slate-900 dark:text-white">{cat.category}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-extrabold text-slate-900 dark:text-slate-100">
                        {formatCurrency(cat.amount)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${cat.percentage}%`, backgroundColor: meta?.color || '#6366F1' }}
                            />
                          </div>
                          <span className="text-slate-500 dark:text-slate-400">{cat.percentage}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{cat.count}</td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{formatCurrency(cat.avgPerTxn)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Column: Recent Transactions, Smart Insights, Tip, Monthly Budget */}
        <div className="space-y-4">
          
          {/* Recent Transactions Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {viewScope === 'my' ? `My Recent Transactions` : `Recent Room Transactions`}
              </h3>
              <button
                onClick={onNavigateToHistory}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                View All
              </button>
            </div>

            <div className="space-y-2.5">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((tx) => {
                  const catMeta = CATEGORIES.find(c => c.name === tx.category);
                  const memberObj = MEMBERS.find(m => m.name === tx.member) || MEMBERS[0];

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-slate-100 dark:border-slate-800/60"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl ${memberObj.avatarColor} flex items-center justify-center font-bold text-xs shrink-0 shadow-sm`}>
                          {memberObj.avatarLetter}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {tx.itemName || tx.category}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                            <span>{tx.member}</span>
                            <span>•</span>
                            <span>{tx.category}</span>
                            <span>•</span>
                            <span>{tx.date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {formatCurrency(tx.amount)}
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase">
                          {tx.paymentMode}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  No personal expenses recorded yet this month.
                </div>
              )}
            </div>
          </div>

          {/* Monthly Budget Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {viewScope === 'my' ? `${currentMember}'s Monthly Budget` : 'Room Monthly Budget'}
                </h3>
              </div>
              {onOpenBudgetModal && (
                <button
                  onClick={onOpenBudgetModal}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  Edit Budget
                </button>
              )}
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-500">Spent: {formatCurrency(summary.totalExpense)}</span>
                <span className="text-slate-900 dark:text-white">Budget: {formatCurrency(activeBudget)}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    budgetSpentPct > 90 ? 'bg-rose-500' : budgetSpentPct > 75 ? 'bg-amber-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${budgetSpentPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 mt-1.5">
                <span>{budgetSpentPct}% utilized</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(budgetRemaining)} remaining
                </span>
              </div>
            </div>
          </div>

          {/* Smart Insights Factual Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{viewScope === 'my' ? `Smart Insights for ${currentMember}` : 'Room Insights'}</span>
            </div>

            <div className="space-y-2">
              {insights.map((ins, i) => (
                <div
                  key={i}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{ins.title}</span>
                    {ins.badgeText && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        {ins.badgeText}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    {ins.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </motion.div>
  );
};
