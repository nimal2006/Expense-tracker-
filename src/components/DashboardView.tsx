import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense, MemberName } from '../types';
import { MEMBERS, CATEGORIES, PAYMENT_MODES, getCategoryMeta } from '../data/categories';
import { useMemberAvatars } from '../hooks/useMemberAvatars';
import { useCountUp } from '../hooks/useCountUp';
import { 
  calculateSummaryMetrics, 
  calculateDailySpending, 
  calculateWeeklySpending, 
  calculateMonthlyTrend, 
  generateSmartInsights, 
  formatCurrency, 
  formatExactCurrency,
  getLocalDateString,
  filterExpenses,
  sortExpensesDescending,
  formatTransactionSubtitle,
  getTransactionDisplay
} from '../utils/analytics';
import { TransactionSubtitle } from './TransactionSubtitle';
import { TransactionCard } from './TransactionCard';
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
  Percent,
  Trash2,
  Edit2,
  BarChart2
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
  onOpenEditModal?: (expense: Expense) => void;
  onDeleteExpense?: (id: string) => void;
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
  onOpenBudgetModal,
  onOpenEditModal,
  onDeleteExpense
}) => {
  // View Scope: 'my' (individual personal mode) vs 'group' (all 5 friends combined)
  const [viewScope, setViewScope] = useState<'my' | 'group'>('my');
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<Expense | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Filter expenses for current selected month with robust date range filtering
  const currentMonthAllExpenses = filterExpenses(expenses, selectedMonth);

  // Determine previous month for comparison
  let previousMonthStr = '2026-08';
  if (selectedMonth === '2026-09') {
    previousMonthStr = '2026-08';
  } else if (selectedMonth === '2026-08') {
    previousMonthStr = '2026-07';
  }
  const previousMonthAllExpenses = filterExpenses(expenses, previousMonthStr);

  // Group Summary across all friends
  const groupSummary = calculateSummaryMetrics(currentMonthAllExpenses, previousMonthAllExpenses);

  // Active Expenses based on selected view scope (Personal vs Group)
  const activeCurrentExpenses = viewScope === 'my'
    ? currentMonthAllExpenses.filter(e => e.member === currentMember)
    : currentMonthAllExpenses;

  const activePreviousExpenses = viewScope === 'my'
    ? previousMonthAllExpenses.filter(e => e.member === currentMember)
    : previousMonthAllExpenses;

  const allExpensesInScope = React.useMemo(() => {
    return viewScope === 'my'
      ? expenses.filter(e => e.member === currentMember)
      : expenses;
  }, [expenses, viewScope, currentMember]);

  // Determine which month to show for daily/weekly trends (especially if 'all' is selected)
  const latestMonthWithData = React.useMemo(() => {
    const list = allExpensesInScope.length > 0 ? allExpensesInScope : expenses;
    if (list.length === 0) return getLocalDateString().substring(0, 7);
    const validExpenses = list.filter(e => e.date && e.date.length >= 7);
    if (validExpenses.length === 0) return getLocalDateString().substring(0, 7);
    const sorted = [...validExpenses].sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0].date.substring(0, 7);
  }, [allExpensesInScope, expenses]);

  const chartMonth = selectedMonth === 'all' ? latestMonthWithData : selectedMonth;

  const summary = calculateSummaryMetrics(activeCurrentExpenses, activePreviousExpenses);

  const dailyData = calculateDailySpending(allExpensesInScope, chartMonth);
  const weeklyData = calculateWeeklySpending(allExpensesInScope, chartMonth);
  const insights = generateSmartInsights(activeCurrentExpenses, selectedMonth, activePreviousExpenses);

  // Active Budget for the active mode
  const budgetMonthKey = selectedMonth === 'all' ? latestMonthWithData : selectedMonth;
  const activeBudget = viewScope === 'my'
    ? (monthlyBudget || db.getBudget(budgetMonthKey, currentMember))
    : db.getGroupBudget(budgetMonthKey);

  // Animated number values
  const animatedTotalExpense = useCountUp(summary.totalExpense, 650);
  const animatedTodaySpent = useCountUp(summary.todayTotal, 550);
  const animatedAvgExpense = useCountUp(summary.avgPerTransaction, 550);
  const animatedBudget = useCountUp(activeBudget, 600);
  const animatedRemaining = useCountUp(Math.max(activeBudget - summary.totalExpense, 0), 600);

  // Recent transactions (top 5 newest)
  const recentTransactions = React.useMemo(() => {
    return sortExpensesDescending(activeCurrentExpenses).slice(0, 5);
  }, [activeCurrentExpenses]);

  // Stable Colors for member charts
  const memberColors: Record<MemberName, string> = {
    Nimal: '#7C5CFC',   // Violet
    Etti: '#10B981',    // Emerald
    Dharan: '#F97316',  // Orange
    Sanjai: '#3B82F6',  // Blue
    Santhosh: '#EC4899',// Pink
    Sujhay: '#22D3EE'   // Cyan
  };

  // Member comparison chart dataset (in group mode)
  const memberComparisonData = MEMBERS.map(m => ({
    name: m.name,
    amount: groupSummary.memberTotals[m.name]?.amount || 0,
    fill: memberColors[m.name] || '#6366F1'
  }));

  // 1. Category Donut Chart dataset (strictly value > 0 and valid hex colors)
  const categoryChartData = React.useMemo(() => {
    return summary.categoryArray
      .filter(c => Number(c.amount) > 0)
      .slice(0, 6)
      .map(c => {
        const meta = getCategoryMeta(c.category);
        return {
          name: String(c.category),
          value: Number(c.amount),
          color: meta.color || '#6366F1',
          percentage: c.percentage || 0
        };
      });
  }, [summary.categoryArray]);

  // 2. Payment Modes dataset (properly aggregated UPI vs Cash)
  const paymentChartData = React.useMemo(() => {
    let upiTotal = 0;
    let cashTotal = 0;

    activeCurrentExpenses.forEach(e => {
      const mode = (e.paymentMode || '').toUpperCase();
      if (mode.includes('CASH')) {
        cashTotal += e.amount;
      } else {
        upiTotal += e.amount;
      }
    });

    const total = upiTotal + cashTotal;
    const upiMeta = PAYMENT_MODES.find(m => m.name === 'UPI');
    const cashMeta = PAYMENT_MODES.find(m => m.name === 'Cash');

    const result = [
      {
        name: 'UPI',
        value: upiTotal,
        color: upiMeta?.color || '#6366F1',
        percentage: total > 0 ? Math.round((upiTotal / total) * 100) : 0
      },
      {
        name: 'Cash',
        value: cashTotal,
        color: cashMeta?.color || '#10B981',
        percentage: total > 0 ? Math.round((cashTotal / total) * 100) : 0
      }
    ];

    // Include other payment modes if present
    summary.paymentBreakdown.forEach(p => {
      if (p.mode !== 'UPI' && p.mode !== 'Cash' && p.amount > 0) {
        const meta = PAYMENT_MODES.find(m => m.name === p.mode);
        result.push({
          name: p.mode,
          value: p.amount,
          color: meta?.color || '#F59E0B',
          percentage: p.percentage
        });
      }
    });

    return result;
  }, [activeCurrentExpenses, summary.paymentBreakdown]);

  // For the Pie chart, pass only non-zero entries
  const paymentPieData = React.useMemo(() => {
    return paymentChartData.filter(p => p.value > 0);
  }, [paymentChartData]);

  // 3. Weekly spending chart dataset
  const weeklyChartData = React.useMemo(() => {
    return weeklyData.map(w => ({
      name: w.shortLabel,
      amount: Number(w.amount) || 0,
      fullLabel: w.label
    }));
  }, [weeklyData]);

  // 4. Daily spending chart dataset
  const dailyChartData = React.useMemo(() => {
    return dailyData.map(d => ({
      day: d.day,
      amount: Number(d.amount) || 0,
      date: d.date
    }));
  }, [dailyData]);

  // 5. Monthly Trend (2026) dataset: all 12 months with valid numeric values
  const monthlyTrendData = React.useMemo(() => {
    const raw = calculateMonthlyTrend(allExpensesInScope, '2026');
    return raw.map(m => ({
      month: m.month || m.name,
      name: m.name,
      amount: Number(m.amount) || 0,
      count: m.count || 0
    }));
  }, [allExpensesInScope]);

  const hasCategoryData = categoryChartData.length > 0 && categoryChartData.some(c => c.value > 0);
  const hasMemberData = memberComparisonData.some(m => m.amount > 0);
  const hasPaymentData = paymentPieData.length > 0 && paymentPieData.some(p => p.value > 0);
  const hasWeeklyData = weeklyChartData.length > 0 && weeklyChartData.some(w => w.amount > 0);
  const hasDailyData = dailyChartData.length > 0 && dailyChartData.some(d => d.amount > 0);
  const hasMonthlyData = monthlyTrendData.length > 0 && monthlyTrendData.some(m => m.amount > 0);

  // Monthly Budget metrics
  const budgetSpentPct = activeBudget > 0 ? Math.min(Math.round((summary.totalExpense / activeBudget) * 100), 100) : 0;
  const budgetRawPct = activeBudget > 0 ? Math.round((summary.totalExpense / activeBudget) * 100) : 0;
  const isBudgetExceeded = summary.totalExpense > activeBudget;
  const budgetRemaining = Math.max(activeBudget - summary.totalExpense, 0);

  // Daily Budget metrics & Monthly timeline pacing
  const todayStr = getLocalDateString(new Date());
  const activeMonthStr = selectedMonth === 'all' ? todayStr.substring(0, 7) : selectedMonth;
  const [yearNum, monthNum] = activeMonthStr.split('-').map(Number);
  const daysInMonth = (yearNum && monthNum) ? new Date(yearNum, monthNum, 0).getDate() : 30;
  const currentDayNum = new Date().getDate();
  const daysRemainingInMonth = Math.max(daysInMonth - currentDayNum, 1);
  const targetDailyBudget = Math.max(Math.round(activeBudget / daysInMonth), 1);
  const dailySafeRemainingBudget = Math.max(Math.round(budgetRemaining / daysRemainingInMonth), 0);
  
  // Today's spend for active mode
  const activeTodaySpent = summary.todayTotal;
  const dailySpentPct = targetDailyBudget > 0 ? Math.round((activeTodaySpent / targetDailyBudget) * 100) : 0;
  const clampedDailyPct = Math.min(dailySpentPct, 100);
  const isDailyOver = activeTodaySpent > targetDailyBudget;
  const dailyRemaining = Math.max(targetDailyBudget - activeTodaySpent, 0);
  const dailyOverspend = Math.max(activeTodaySpent - targetDailyBudget, 0);

  // User share percentage in room group (used in Member Comparison chart)
  const myTotalSpent = groupSummary.memberTotals[currentMember]?.amount || 0;
  const roomTotalSpent = groupSummary.totalExpense;
  const mySharePct = roomTotalSpent > 0 ? Math.round((myTotalSpent / roomTotalSpent) * 100) : 0;

  const { getMember } = useMemberAvatars();
  const currentMemberObj = getMember(currentMember);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4 pb-28 sm:pb-16"
    >
      {/* ========================================================
          1. DASHBOARD SCOPE HEADER: Personal View vs Room Group Toggle
          ======================================================== */}
      <div className="bg-white dark:bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-xl ${
            viewScope === 'my' 
              ? `${currentMemberObj.avatarColor} text-white` 
              : 'bg-gradient-to-tr from-amber-500 to-indigo-600 text-white'
          } flex items-center justify-center font-bold text-base shadow-xs shrink-0 overflow-hidden`}>
            {viewScope === 'my' ? (
              currentMemberObj.avatarUrl ? (
                <img src={currentMemberObj.avatarUrl} alt={currentMemberObj.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                currentMemberObj.avatarLetter
              )
            ) : '👥'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                {viewScope === 'my' ? `${currentMember}'s Personal Dashboard` : 'Room Group Dashboard'}
              </h1>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center shrink-0 ${
                viewScope === 'my' 
                  ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' 
                  : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}>
                {viewScope === 'my' ? `${currentMember}` : `All ${MEMBERS.length} Members`}
              </span>
            </div>
          </div>
        </div>

        {/* View Switcher Segmented Control with spring animation */}
        <div className="w-full md:w-auto max-w-md mx-auto md:mx-0 grid grid-cols-2 bg-slate-100 dark:bg-[#151D35]/90 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-xs gap-1 relative">
          <button
            onClick={() => setViewScope('my')}
            className={`relative px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center z-10 ${
              viewScope === 'my'
                ? 'text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {viewScope === 'my' && (
              <motion.div
                layoutId="activeScopePill"
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] shadow-md shadow-indigo-500/25 -z-[1]"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">My Expenses ({currentMember})</span>
          </button>
          <button
            onClick={() => setViewScope('group')}
            className={`relative px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center z-10 ${
              viewScope === 'group'
                ? 'text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {viewScope === 'group' && (
              <motion.div
                layoutId="activeScopePill"
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 shadow-md shadow-amber-500/25 -z-[1]"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Room Group ({MEMBERS.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          2. CONSOLIDATED ELEGANT HERO CARD WITH BUDGET PROGRESS
          ======================================================== */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.18 }}
        className="bg-white/90 dark:bg-[#11192D]/85 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] space-y-4 relative overflow-hidden"
      >
        {/* Top Header Row: Spent vs Budget Target & Status Pill */}
        <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                {viewScope === 'my' ? `${currentMember}'s Total Outflow` : 'Room Group Total Outflow'}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                isBudgetExceeded 
                  ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' 
                  : budgetSpentPct >= 80 
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' 
                    : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              }`}>
                {isBudgetExceeded ? 'Over Limit' : budgetSpentPct >= 80 ? 'Approaching Limit' : 'On Track'}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">
                {formatCurrency(animatedTotalExpense)}
              </span>
              <span className="text-xs font-medium text-slate-400 font-mono tabular-nums">
                of {formatCurrency(activeBudget)} budget
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenBudgetModal && (
              <button
                onClick={onOpenBudgetModal}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#151D35] hover:bg-slate-200 dark:hover:bg-[#1C2646] text-slate-700 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700/60 inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <Target className="w-3.5 h-3.5 text-cyan-500" />
                <span>Set Budget</span>
              </button>
            )}
          </div>
        </div>

        {/* Master Monthly Visual Progress Bar with Threshold Markers */}
        <div className="space-y-2 relative z-10">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className={`flex items-center gap-1.5 font-mono ${
              isBudgetExceeded ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'
            }`}>
              <span>{budgetRawPct}% utilized</span>
              <span className="text-[10px] text-slate-400 font-normal">({formatCurrency(summary.totalExpense)} / {formatCurrency(activeBudget)})</span>
            </span>
            <span className={`font-mono ${
              isBudgetExceeded ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'
            }`}>
              {isBudgetExceeded
                ? `Exceeded by ${formatCurrency(summary.totalExpense - activeBudget)}`
                : `${formatCurrency(budgetRemaining)} remaining`}
            </span>
          </div>

          <div className="relative">
            {/* Visual Progress Bar Track */}
            <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/60 dark:border-slate-700/60 relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(budgetSpentPct, 100)}%` }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className={`h-full rounded-full relative transition-colors ${
                  isBudgetExceeded
                    ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                    : budgetSpentPct >= 80
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500 shadow-sm shadow-amber-500/30'
                    : 'bg-gradient-to-r from-[#7C5CFC] via-indigo-500 to-[#22D3EE] shadow-sm shadow-indigo-500/30'
                }`}
              >
                {/* Subtle sheen highlight */}
                <div className="absolute inset-0 bg-white/15 rounded-full" />
              </motion.div>
            </div>

            {/* Threshold Milestone Markers (25%, 50%, 75%) */}
            <div className="absolute inset-y-0 left-[25%] w-[1px] bg-slate-300 dark:bg-slate-600/80 pointer-events-none" title="25% Milestone" />
            <div className="absolute inset-y-0 left-[50%] w-[1px] bg-slate-300 dark:bg-slate-600/80 pointer-events-none" title="50% Milestone" />
            <div className="absolute inset-y-0 left-[75%] w-[1px] bg-slate-300 dark:bg-slate-600/80 pointer-events-none" title="75% Milestone" />
          </div>

          {/* Sub-bar Pacing Guidance */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
            <span className="flex items-center gap-1 font-medium">
              <span>📅</span>
              <span>Day {currentDayNum} of {daysInMonth} ({daysRemainingInMonth}d left)</span>
            </span>
            <span className="font-medium font-mono text-cyan-600 dark:text-cyan-400">
              Safe Pace: {formatCurrency(dailySafeRemainingBudget)}/day
            </span>
          </div>
        </div>

        {/* Today's Daily Target & Spending Progress */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs relative z-10">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/80 dark:bg-[#151D35]/60 border border-slate-100 dark:border-slate-800/80 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Spend</span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                  {formatCurrency(animatedTodaySpent)}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  / {formatCurrency(targetDailyBudget)} target
                </span>
              </div>
              <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${
                isDailyOver 
                  ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900/60' 
                  : dailySpentPct >= 80 
                    ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900/60' 
                    : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900/60'
              }`}>
                {dailySpentPct}% of target
              </span>
            </div>

            {/* Daily Mini Progress Bar */}
            <div className="space-y-1">
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700/80 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isDailyOver
                      ? 'bg-rose-500'
                      : dailySpentPct >= 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${clampedDailyPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>{isDailyOver ? `Exceeded target by ₹${dailyOverspend}` : `₹${dailyRemaining} remaining for today`}</span>
                <span>{clampedDailyPct}% utilized</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ========================================================
          3. CHARTS ROW: Category Donut + Member/Personal Bar + Payment Donut
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Category Distribution (Donut Chart) */}
        <div className="bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex flex-col justify-between min-w-0 overflow-hidden">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-3">
              🍩 {viewScope === 'my' ? `Category Distribution` : `Room Category Distribution`}
            </h3>
          </div>

          <div className="w-full h-[260px] min-h-[260px] flex-none flex items-center justify-center min-w-0">
            {hasCategoryData ? (
              <ResponsiveContainer width="100%" height={260} minHeight={260} className="min-h-[260px]">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#6366F1'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Amount']}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      padding: '8px 12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.6)'
                    }}
                    itemStyle={{ color: '#e2e8f0', fontWeight: 500, fontSize: '0.75rem' }}
                    labelStyle={{ color: '#38bdf8', fontWeight: 600, marginBottom: '4px', fontSize: '0.75rem' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800">
                <PieChartIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">No category spending</span>
                <span className="text-[11px] text-slate-400 mt-0.5">No data available for this selection</span>
              </div>
            )}
          </div>

          {/* Centered 2-column inline legend */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            {hasCategoryData && categoryChartData.slice(0, 6).map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 dark:text-slate-300 truncate font-medium">{item.name}</span>
                <span className="text-slate-400 ml-auto font-bold text-[11px] font-mono">{item.percentage}%</span>
              </div>
            ))}
            {!hasCategoryData && (
              <div className="col-span-2 text-center text-slate-400 text-[11px] py-1">
                No data available for this selection
              </div>
            )}
          </div>
        </div>

        {/* Member Comparison (Compact Horizontal Bars) */}
        <div className="bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex flex-col justify-between min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>👥</span> Member Comparison
            </h3>
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-800/50">
              You: {mySharePct}%
            </span>
          </div>

          <div className="w-full h-[260px] min-h-[260px] flex-none flex flex-col justify-center space-y-2.5 py-1 min-w-0">
            {hasMemberData ? (
              memberComparisonData.map((m) => {
                const maxAmt = Math.max(...memberComparisonData.map(d => d.amount), 1);
                const pct = Math.round((m.amount / maxAmt) * 100);
                const isCurrent = m.name === currentMember;
                return (
                  <div key={m.name} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className={`font-bold flex items-center gap-1.5 ${isCurrent ? 'text-indigo-600 dark:text-cyan-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.fill }} />
                        {m.name} {isCurrent && '(You)'}
                      </span>
                      <span className="font-extrabold text-slate-900 dark:text-white font-mono">{formatCurrency(m.amount)}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%`, backgroundColor: m.fill }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800">
                <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">No member expenses</span>
                <span className="text-[11px] text-slate-400 mt-0.5">No data available for this selection</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Room Total Outflow</span>
            <span className="font-extrabold text-slate-900 dark:text-white font-mono">{formatCurrency(groupSummary.totalExpense)}</span>
          </div>
        </div>

        {/* Payment Method Analysis (Donut Chart) */}
        <div className="bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex flex-col justify-between min-w-0 overflow-hidden">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-3">
              💳 Payment Modes
            </h3>
          </div>

          <div className="w-full h-[260px] min-h-[260px] flex-none flex items-center justify-center min-w-0">
            {hasPaymentData ? (
              <ResponsiveContainer width="100%" height={260} minHeight={260} className="min-h-[260px]">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={paymentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {paymentPieData.map((entry, index) => (
                      <Cell key={`cell-pay-${index}`} fill={entry.color || '#6366F1'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Amount']}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      padding: '8px 12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.6)'
                    }}
                    itemStyle={{ color: '#e2e8f0', fontWeight: 500, fontSize: '0.75rem' }}
                    labelStyle={{ color: '#38bdf8', fontWeight: 600, marginBottom: '4px', fontSize: '0.75rem' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800">
                <Wallet className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">No payment data</span>
                <span className="text-[11px] text-slate-400 mt-0.5">No data available for this selection</span>
              </div>
            )}
          </div>

          {/* Centered 2-column inline legend */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            {hasPaymentData && paymentChartData.map((p) => (
              <div key={p.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <span className="text-slate-600 dark:text-slate-300 font-medium truncate">{p.name}</span>
                <span className="text-slate-400 ml-auto font-bold text-[11px] font-mono">{p.percentage}%</span>
              </div>
            ))}
            {!hasPaymentData && (
              <div className="col-span-2 text-center text-slate-400 text-[11px] py-1">
                No data available for this selection
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ========================================================
          4. FOURTH ROW TREND CHARTS
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly Spending */}
        <div className="bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex flex-col justify-between min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>📊</span> Weekly Outflow
            </h3>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
              {chartMonth}
            </span>
          </div>
          <div className="w-full h-[260px] min-h-[260px] flex-none flex items-center justify-center min-w-0">
            {hasWeeklyData ? (
              <ResponsiveContainer width="100%" height={260} minHeight={260} className="min-h-[260px]">
                <LineChart data={weeklyChartData} margin={{ top: 10, right: 15, left: -5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.25} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Outflow']}
                    labelFormatter={(lbl, payload) => payload?.[0]?.payload?.fullLabel || lbl}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      padding: '8px 12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.6)'
                    }}
                    itemStyle={{ color: '#e2e8f0', fontWeight: 500, fontSize: '0.75rem' }}
                    labelStyle={{ color: '#38bdf8', fontWeight: 600, marginBottom: '4px', fontSize: '0.75rem' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#6366f1' }}
                    activeDot={{ r: 6 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800">
                <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">No weekly outflow data</span>
                <span className="text-[11px] text-slate-400 mt-0.5">No data available for this selection</span>
              </div>
            )}
          </div>
        </div>

        {/* Daily Spending Trend */}
        <div className="bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex flex-col justify-between min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>📈</span> Daily Spending Curve
            </h3>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
              {chartMonth}
            </span>
          </div>
          <div className="w-full h-[260px] min-h-[260px] flex-none flex items-center justify-center min-w-0">
            {hasDailyData ? (
              <ResponsiveContainer width="100%" height={260} minHeight={260} className="min-h-[260px]">
                <LineChart data={dailyChartData} margin={{ top: 10, right: 15, left: -5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.25} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval={3} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Daily Spend']}
                    labelFormatter={(lbl) => `Day ${lbl} (${chartMonth}-${String(lbl).padStart(2, '0')})`}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      padding: '8px 12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.6)'
                    }}
                    itemStyle={{ color: '#e2e8f0', fontWeight: 500, fontSize: '0.75rem' }}
                    labelStyle={{ color: '#38bdf8', fontWeight: 600, marginBottom: '4px', fontSize: '0.75rem' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ r: 2.5, fill: '#10B981' }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800">
                <TrendingUp className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">No daily spending curve</span>
                <span className="text-[11px] text-slate-400 mt-0.5">No data available for this selection</span>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Trend 2026 */}
        <div className="bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs flex flex-col justify-between min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>📉</span> Monthly Trend (2026)
            </h3>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
              All 12 Months
            </span>
          </div>
          <div className="w-full h-[260px] min-h-[260px] flex-none flex items-center justify-center min-w-0">
            {hasMonthlyData ? (
              <ResponsiveContainer width="100%" height={260} minHeight={260} className="min-h-[260px]">
                <LineChart data={monthlyTrendData} margin={{ top: 10, right: 15, left: -5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.25} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Total Spent']}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      padding: '8px 12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.6)'
                    }}
                    itemStyle={{ color: '#e2e8f0', fontWeight: 500, fontSize: '0.75rem' }}
                    labelStyle={{ color: '#38bdf8', fontWeight: 600, marginBottom: '4px', fontSize: '0.75rem' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#6366f1' }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800">
                <BarChart2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">No monthly trend data</span>
                <span className="text-[11px] text-slate-400 mt-0.5">No data available for this selection</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================
          5. FIFTH ROW: Top 10 Categories Table & Right Sidebar Cards
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left 2 Columns: Top 10 Categories Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                🥇 {viewScope === 'my' ? `My Top Categories` : `Room Top Categories`}
              </h3>
              <p className="text-xs text-slate-400">Ranked by total expenditure</p>
            </div>
            <button
              onClick={onNavigateToHistory}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
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
                  const meta = getCategoryMeta(cat.category);
                  return (
                    <tr key={cat.category} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                          <span className="font-bold text-slate-900 dark:text-white">{cat.category}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                        {formatCurrency(cat.amount)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${cat.percentage}%`, backgroundColor: meta.color }}
                            />
                          </div>
                          <span className="text-slate-500 dark:text-slate-400 font-mono">{cat.percentage}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{cat.count}</td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-mono">{formatCurrency(cat.avgPerTxn)}</td>
                    </tr>
                  );
                })}
                {summary.categoryArray.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      No category spending recorded for this range
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Column: Recent Transactions, Smart Insights, Tip, Monthly Budget */}
        <div className="space-y-4">
          
          {/* Recent Transactions Card */}
          <div className="bg-white/90 dark:bg-[#11192D]/85 backdrop-blur-xl p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {viewScope === 'my' ? `My Recent Transactions` : `Recent Room Transactions`}
              </h3>
              <button
                onClick={onNavigateToHistory}
                className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-2.5">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((tx, idx) => {
                  const isDeleting = deletingIds.has(String(tx.id));

                  return (
                    <TransactionCard
                      key={`recent-tx-${tx.id}-${idx}`}
                      item={tx}
                      index={idx}
                      currentMember={currentMember}
                      isDeleting={isDeleting}
                      onEdit={onOpenEditModal}
                      onDelete={(item) => setDeleteConfirmExpense(item)}
                    />
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  No {viewScope === 'my' ? `${currentMember}'s` : 'room'} expenses recorded for this range.
                </div>
              )}
            </div>
          </div>

          {/* Monthly Budget Card */}
          <div className="bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-3">
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
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
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
          <div className="bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{viewScope === 'my' ? `Smart Insights for ${currentMember}` : 'Room Insights'}</span>
            </div>

            <div className="space-y-2">
              {insights.map((ins, i) => (
                <div
                  key={`insight-${ins.type}-${i}`}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs space-y-1"
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmExpense && (
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
                  Are you sure you want to delete ₹{deleteConfirmExpense.amount} ({deleteConfirmExpense.itemName || deleteConfirmExpense.category}) created by {deleteConfirmExpense.member}?
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmExpense(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                      setDeletingIds(prev => {
                        const next = new Set(prev);
                        next.delete(targetId);
                        return next;
                      });
                    }, 320);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};
