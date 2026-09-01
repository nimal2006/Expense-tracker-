import React from 'react';
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
  formatExactCurrency 
} from '../utils/analytics';
import {
  Wallet,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Calendar,
  PieChart as PieChartIcon,
  Trophy,
  Plus,
  ArrowRight,
  Sparkles,
  Receipt,
  QrCode,
  Banknote,
  CreditCard,
  Users,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Tag,
  Target
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
  Line,
  Legend
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
  monthlyBudget = 25000,
  onOpenBudgetModal
}) => {
  // Filter expenses for current selected month
  const currentMonthExpenses = selectedMonth === 'all'
    ? expenses
    : expenses.filter(e => e.date.startsWith(selectedMonth));

  // Determine previous month for comparison
  let previousMonthStr = '2026-08';
  if (selectedMonth === '2026-09') {
    previousMonthStr = '2026-08';
  } else if (selectedMonth === '2026-08') {
    previousMonthStr = '2026-07';
  }
  const previousMonthExpenses = expenses.filter(e => e.date.startsWith(previousMonthStr));

  const summary = calculateSummaryMetrics(currentMonthExpenses, previousMonthExpenses);
  const dailyData = calculateDailySpending(currentMonthExpenses, selectedMonth === 'all' ? '2026-08' : selectedMonth);
  const weeklyData = calculateWeeklySpending(currentMonthExpenses, selectedMonth === 'all' ? '2026-08' : selectedMonth);
  const monthlyTrendData = calculateMonthlyTrend(expenses, '2026');
  const insights = generateSmartInsights(currentMonthExpenses, selectedMonth, previousMonthExpenses);

  // Recent transactions (top 5 newest)
  const recentTransactions = [...currentMonthExpenses]
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

  // Member comparison chart dataset
  const memberComparisonData = MEMBERS.map(m => ({
    name: m.name,
    amount: summary.memberTotals[m.name]?.amount || 0,
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

  // Daily spending chart dataset (every 2-3 days sample for clean rendering)
  const dailyChartData = dailyData.map(d => ({
    day: d.day,
    amount: d.amount,
    date: d.date
  }));

  const budgetSpentPct = monthlyBudget > 0 ? Math.min(Math.round((summary.totalExpense / monthlyBudget) * 100), 100) : 0;
  const budgetRemaining = Math.max(monthlyBudget - summary.totalExpense, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6 pb-12"
    >
      
      {/* ========================================================
          1. TOP STATS CARDS (Total Expense + Members + Total Txns)
          ======================================================== */}
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
                Group
              </span>
            </div>
            <div className="mt-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Total Expense
              </span>
              <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
                {formatCurrency(summary.totalExpense)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                {selectedMonth === 'all' ? 'All Months' : selectedMonth}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Active records</span>
          </div>
        </motion.div>

        {/* Dynamic Member Total Cards */}
        {MEMBERS.map((member) => {
          const data = summary.memberTotals[member.name] || { amount: 0, count: 0, percentage: 0 };
          return (
            <motion.div
              key={member.id}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.18 }}
              className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectMemberFilter && onSelectMemberFilter(member.name)}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-xl ${member.avatarColor} flex items-center justify-center text-xs font-bold shadow-sm`}>
                    {member.avatarLetter}
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {data.percentage}%
                  </span>
                </div>
                <div className="mt-3">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {member.name} Total
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
                <span>{data.percentage}% of total</span>
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
                Total
              </span>
            </div>
            <div className="mt-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Total Transactions
              </span>
              <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
                {summary.totalTransactions}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Entries recorded
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
            <span>100% verified ledger</span>
          </div>
        </motion.div>

      </div>

      {/* ========================================================
          2. SECOND ROW STATS & QUICK CTA
          ======================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Today's Expense */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">
              Today's Expense
            </span>
            <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              {formatCurrency(summary.todayTotal)}
            </div>
          </div>
        </div>

        {/* This Week's Expense */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">
              This Week's
            </span>
            <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              {formatCurrency(summary.thisWeekTotal)}
            </div>
          </div>
        </div>

        {/* Avg Daily Spending */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">
              Avg Daily Spend
            </span>
            <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              {formatCurrency(Math.round(summary.avgDailySpending))}
            </div>
          </div>
        </div>

        {/* Avg / Transaction */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <PieChartIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">
              Avg / Txn
            </span>
            <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
              {formatExactCurrency(summary.avgPerTransaction)}
            </div>
          </div>
        </div>

        {/* Top Category */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">
              Top Category
            </span>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
              {summary.topCategory.category}
            </div>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
              {summary.topCategory.percentage}% of total
            </span>
          </div>
        </div>

        {/* Add Expense Quick CTA Card */}
        <button
          onClick={onOpenAddExpense}
          className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white p-4 rounded-3xl shadow-md shadow-indigo-600/20 flex items-center justify-between text-left transition-transform active:scale-[0.98] group"
        >
          <div className="min-w-0 pr-1">
            <div className="flex items-center gap-1 text-xs font-bold text-indigo-200">
              <Plus className="w-3.5 h-3.5" />
              <span>Add Expense</span>
            </div>
            <div className="text-[11px] text-indigo-100/90 font-medium mt-0.5 truncate">
              Quick 3-tap entry
            </div>
          </div>
          <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:translate-x-0.5 transition-transform">
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>

      </div>

      {/* ========================================================
          3. THIRD ROW CHARTS: Category Donut + Member Bar + Payment Donut
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Category Distribution (Donut Chart) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🍩 Category Distribution</span>
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">Spending breakdown by category</p>
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

        {/* Member Comparison (Bar Chart) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>👥 Member Comparison</span>
              </h3>
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
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-4 gap-1 pt-3 border-t border-slate-100 dark:border-slate-800 text-center text-xs">
            {memberComparisonData.map((m) => (
              <div key={m.name}>
                <span className="text-[11px] text-slate-400 block">{m.name}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(m.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Method Analysis (Donut Chart) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>💳 Payment Method Analysis</span>
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
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              📊 Weekly Spending ({selectedMonth === 'all' ? 'Aug 2026' : selectedMonth})
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
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              📈 Daily Spending Trend (Day of Month)
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
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              📉 Monthly Trend (2026 Continuous)
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
                🥇 Top 10 Categories
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
                  <th className="py-2.5 px-3">% of Total</th>
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
          
          {/* Recent Transactions Card (Matching Uploaded Design) */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Recent Transactions
              </h3>
              <button
                onClick={onNavigateToHistory}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                View All
              </button>
            </div>

            <div className="space-y-2.5">
              {recentTransactions.map((tx) => {
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
              })}
            </div>
          </div>

          {/* Monthly Budget Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Monthly Budget
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
                <span className="text-slate-900 dark:text-white">Budget: {formatCurrency(monthlyBudget)}</span>
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

          {/* Tip Card (Replicating the reference design tip card) */}
          <div className="bg-gradient-to-tr from-indigo-50 to-indigo-100/60 dark:from-indigo-950/40 dark:to-slate-900 p-4 rounded-3xl border border-indigo-200/60 dark:border-indigo-900/40 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-300">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Tip 💡</span>
            </div>
            <p className="text-xs text-indigo-800 dark:text-indigo-200 leading-relaxed font-medium">
              Change the Month/Year filters above — every card, chart, insight and breakdown on this page updates instantly from live database records.
            </p>
          </div>

          {/* Smart Insights Factual Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Smart Insights</span>
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
