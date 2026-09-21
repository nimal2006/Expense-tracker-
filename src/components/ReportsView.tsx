import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense, MemberName } from '../types';
import { normalizeCategoryName } from '../data/categories';
import { generateMonthlyPdf } from '../services/pdfReport';
import { calculateSummaryMetrics, getTopSpendingItems, formatCurrency, filterExpenses, sortExpensesDescending, getLocalDateString } from '../utils/analytics';
import { getDailyBudgetSetting, calculateGamificationProfile } from '../utils/gamification';
import { db } from '../services/storage';
import {
  FileText,
  Download,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  User,
  Users,
  Calendar,
  Zap,
  TrendingDown,
  TrendingUp,
  Award,
  Sparkles
} from 'lucide-react';

interface ReportsViewProps {
  expenses: Expense[];
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  availableMonths: { value: string; label: string }[];
  currentMember?: MemberName;
  onRefreshData: () => void;
  onOpenPdfImporter?: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  expenses,
  selectedMonth,
  onSelectMonth,
  availableMonths,
  currentMember = 'Nimal',
  onRefreshData,
  onOpenPdfImporter
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [exportScope, setExportScope] = useState<'group' | MemberName>(currentMember);

  const reportMonthStr = selectedMonth === 'all' ? 'All-Time Summary' : selectedMonth;
  const isPersonal = exportScope !== 'group';
  const targetMember = isPersonal ? exportScope : undefined;

  // Filter current expenses using unified pipeline
  const currentExpenses = sortExpensesDescending(
    filterExpenses(
      expenses,
      selectedMonth,
      undefined,
      targetMember || 'All'
    )
  );

  const previousMonthStr = reportMonthStr === '2026-09' ? '2026-08' : '2026-07';
  const previousExpenses = filterExpenses(
    expenses,
    previousMonthStr,
    undefined,
    targetMember || 'All'
  );

  const summary = calculateSummaryMetrics(currentExpenses, previousExpenses);
  const topItems = getTopSpendingItems(currentExpenses, 10);

  // Payment mode breakdown
  const paymentModeMap = new Map<string, number>();
  currentExpenses.forEach(e => {
    paymentModeMap.set(e.paymentMode, (paymentModeMap.get(e.paymentMode) || 0) + e.amount);
  });
  const paymentBreakdown = Array.from(paymentModeMap.entries())
    .map(([mode, amount]) => ({
      mode,
      amount,
      percentage: summary.totalExpense > 0 ? Math.round((amount / summary.totalExpense) * 100) : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  // 7-day Weekly Budget Health calculation
  const todayDate = new Date();
  const currentMonthKey = selectedMonth === 'all' ? getLocalDateString(todayDate).substring(0, 7) : selectedMonth;
  const activeTargetScope = isPersonal ? (targetMember as MemberName) : 'group';
  const monthlyCap = isPersonal ? db.getBudget(currentMonthKey, targetMember as MemberName) : db.getGroupBudget(currentMonthKey);
  const dailySetting = getDailyBudgetSetting(currentMonthKey, activeTargetScope, monthlyCap);
  const dailyBudgetTarget = dailySetting.amount;

  // Generate last 7 days array
  const weeklyDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - (6 - i));
    const dateStr = getLocalDateString(d);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayDisplay = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    
    // Filter expenses on this day
    const dayExpenses = currentExpenses.filter(e => e.date === dateStr);
    const totalSpent = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
    const isFuture = d > todayDate;

    let status: 'safe' | 'warning' | 'exceeded' | 'no_data' | 'future' = 'safe';
    if (isFuture) {
      status = 'future';
    } else if (totalSpent === 0) {
      status = 'no_data';
    } else if (totalSpent > dailyBudgetTarget) {
      status = 'exceeded';
    } else if (totalSpent >= dailyBudgetTarget * 0.8) {
      status = 'warning';
    } else {
      status = 'safe';
    }

    return {
      dateStr,
      dayName,
      dayDisplay,
      totalSpent,
      dailyBudgetTarget,
      status,
      saved: Math.max(dailyBudgetTarget - totalSpent, 0)
    };
  });

  // Calculate weekly metrics
  const activeDays = weeklyDays.filter(d => d.status !== 'future');
  const daysUnderBudget = activeDays.filter(d => d.status === 'safe' || d.status === 'no_data' || d.status === 'warning').length;
  const totalWeeklySaved = activeDays.reduce((sum, d) => sum + (d.status === 'exceeded' ? 0 : d.saved), 0);
  const totalWeeklySpent = activeDays.reduce((sum, d) => sum + d.totalSpent, 0);
  const totalWeeklyLimit = dailyBudgetTarget * Math.max(activeDays.length, 1);
  const weeklyPct = Math.min(Math.round((totalWeeklySpent / Math.max(totalWeeklyLimit, 1)) * 100), 100);
  
  // Best day: lowest non-negative spend
  const sortedDays = [...activeDays].sort((a, b) => a.totalSpent - b.totalSpent);
  const bestDay = sortedDays[0];

  // Trend analysis (first 3 days average vs last 3 days average)
  const firstHalfSpent = activeDays.slice(0, 3).reduce((sum, d) => sum + d.totalSpent, 0) / Math.max(activeDays.slice(0, 3).length, 1);
  const secondHalfSpent = activeDays.slice(-3).reduce((sum, d) => sum + d.totalSpent, 0) / Math.max(activeDays.slice(-3).length, 1);
  const trend = secondHalfSpent < firstHalfSpent ? 'Improving' : secondHalfSpent > firstHalfSpent * 1.15 ? 'Worsening' : 'Stable';

  const handleDownloadPdf = () => {
    setIsGenerating(true);
    try {
      const doc = generateMonthlyPdf(expenses, selectedMonth, previousExpenses, targetMember || 'all');
      const filename = isPersonal
        ? `Friends_${targetMember}_Report_${reportMonthStr}.pdf`
        : `Friends_Group_Report_${reportMonthStr}.pdf`;
      doc.save(filename);
      setSuccessToast(`PDF report (${isPersonal ? `${targetMember}'s Personal` : 'Group'}) downloaded!`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (e: any) {
      console.error('Error generating PDF:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCsv = () => {
    const headers = ['Date', 'Time', 'Member', 'Category', 'Item Name', 'Quantity', 'Amount', 'Payment Mode', 'Place'];
    const rows = currentExpenses.map(e => [
      e.date,
      e.time || '',
      e.member,
      normalizeCategoryName(e.category),
      `"${(e.itemName || '').replace(/"/g, '""')}"`,
      e.quantity || 1,
      e.amount,
      e.paymentMode,
      `"${(e.place || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const filename = isPersonal
      ? `Friends_${targetMember}_Expenses_${reportMonthStr}.csv`
      : `Friends_Group_Expenses_${reportMonthStr}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSuccessToast(`CSV exported (${isPersonal ? `${targetMember}'s Personal` : 'Group'}) for ${reportMonthStr}!`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleExportJson = () => {
    const rawData = isPersonal
      ? expenses.filter(e => e.member === targetMember)
      : expenses;
    const exportData = rawData.map(e => ({
      ...e,
      category: normalizeCategoryName(e.category)
    }));
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `friends_expenses_backup_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setSuccessToast('Database JSON backup downloaded!');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6 pb-28 sm:pb-16 max-w-5xl mx-auto"
    >
      
      {/* Header Banner & PDF Trigger */}
      <div className="bg-gradient-to-br from-[#10162A] via-[#151D35] to-[#080B18] text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#7C5CFC]/20 text-[#22D3EE] border border-[#7C5CFC]/30">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[#F8FAFC]">Monthly Expense Reports</h2>
            </div>
            <p className="text-xs text-[#94A3B8]">
              Generate pixel-perfect PDF reports and CSV exports with member-classified transaction ledgers.
            </p>
          </div>

          {/* Controls: Month and Scope */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Scope Selector */}
            <div className="flex items-center gap-1.5 bg-[#080B18] p-1 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setExportScope('group')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  exportScope === 'group'
                    ? 'bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Group</span>
              </button>
              <button
                type="button"
                onClick={() => setExportScope(currentMember)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  exportScope === currentMember
                    ? 'bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>My ({currentMember})</span>
              </button>
            </div>

            {/* Month Selector */}
            <select
              value={selectedMonth}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="bg-[#080B18] text-[#F8FAFC] font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-2xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-400"
            >
              {Array.from(
                new Map(
                  [
                    { value: 'all', label: 'All Months' },
                    ...(availableMonths || [])
                  ].map(m => [m.value, m])
                ).values()
              ).map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Symmetrical 2x2 Actions Grid */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadPdf}
            disabled={isGenerating}
            className="w-full h-12 px-3 sm:px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {isGenerating 
                ? 'Generating PDF...' 
                : isPersonal 
                ? `PDF (${targetMember})` 
                : `Group PDF`}
            </span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenPdfImporter}
            className="w-full h-12 px-3 sm:px-4 rounded-2xl bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-200 hover:text-white text-xs sm:text-sm font-bold border border-indigo-700/50 hover:border-indigo-600 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="truncate">Import PDF</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportCsv}
            className="w-full h-12 px-3 sm:px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs sm:text-sm font-bold border border-slate-700 hover:border-slate-600 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">Export CSV</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportJson}
            className="w-full h-12 px-3 sm:px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs sm:text-sm font-bold border border-slate-700 hover:border-slate-600 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Layers className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">JSON Backup</span>
          </motion.button>
        </div>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-sm animate-in slide-in-from-top duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Weekly Budget Health Section (7-Day Performance & Streaks) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {/* Card Header: Vertically Centered Title, Icon & Status Tag */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/60">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                Weekly Budget Health (Last 7 Days)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Daily target pacing: {formatCurrency(dailyBudgetTarget)}/day
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
            {daysUnderBudget}/7 days on track
          </span>
        </div>

        {/* Weekly Spent vs Limit Metrics Bar & Track */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 space-y-2">
          <div className="flex items-baseline justify-between w-full text-xs">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Weekly Spent:
              </span>
              <span className="text-sm font-extrabold font-mono text-slate-900 dark:text-white">
                {formatCurrency(totalWeeklySpent)}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-slate-400 font-mono text-[11px]">Allowance:</span>
              <span className="font-bold font-mono text-slate-700 dark:text-slate-300 text-xs">
                {formatCurrency(totalWeeklyLimit)}
              </span>
            </div>
          </div>

          <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700/80 rounded-full overflow-hidden my-1">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                totalWeeklySpent > totalWeeklyLimit
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400'
              }`}
              style={{ width: `${weeklyPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 font-medium">
            <span>₹0</span>
            <span>{weeklyPct}% Utilized</span>
            <span>Weekly Limit: {formatCurrency(totalWeeklyLimit)}</span>
          </div>
        </div>

        {/* 7-Day Calendar Strip */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {weeklyDays.map((day) => {
            const isSafe = day.status === 'safe' || day.status === 'no_data';
            const isWarning = day.status === 'warning';
            const isExceeded = day.status === 'exceeded';

            return (
              <div
                key={day.dateStr}
                className={`p-2 sm:p-2.5 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${
                  isExceeded
                    ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/80'
                    : isWarning
                    ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80'
                    : isSafe
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80'
                    : 'bg-slate-50/70 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {day.dayName}
                </span>
                <span className="text-[9px] text-slate-400 opacity-80 my-0.5 font-medium">
                  {day.dayDisplay}
                </span>
                <div className="mt-1">
                  <span className={`text-xs sm:text-sm font-extrabold font-mono block ${
                    isExceeded
                      ? 'text-rose-600 dark:text-rose-400'
                      : isWarning
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {day.totalSpent > 0 ? `₹${day.totalSpent}` : '₹0'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4 Summary Stat Pills Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800/80 flex flex-col items-center justify-center text-center space-y-1 h-full">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Days Under Budget</span>
            <span className="text-base font-extrabold text-slate-900 dark:text-white block font-mono">
              {daysUnderBudget} / 7
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800/80 flex flex-col items-center justify-center text-center space-y-1 h-full">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Saved vs Limit</span>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 block font-mono">
              +{formatCurrency(totalWeeklySaved)}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800/80 flex flex-col items-center justify-center text-center space-y-1 h-full">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Best Day</span>
            <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 block font-mono">
              {bestDay ? `${bestDay.dayName} (₹${bestDay.totalSpent})` : '—'}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800/80 flex flex-col items-center justify-center text-center space-y-1 h-full">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Spending Trend</span>
            <span className={`text-base font-extrabold block ${
              trend === 'Improving' ? 'text-emerald-600 dark:text-emerald-400' : trend === 'Worsening' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              {trend === 'Improving' ? 'Improving 📈' : trend === 'Worsening' ? 'Worsening 📉' : 'Stable ➡️'}
            </span>
          </div>
        </div>
      </div>

      {/* Live Report Preview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Card 1: Executive Summary */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>📋 {isPersonal ? `${targetMember}'s Overview` : 'Group Executive Summary'} ({reportMonthStr})</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block mb-0.5">{isPersonal ? 'Personal Outflow' : 'Total Outflow'}</span>
              <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                {formatCurrency(summary.totalExpense)}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block mb-0.5">Transactions Count</span>
              <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                {summary.totalTransactions}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block mb-0.5">Avg Daily Spend</span>
              <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                {formatCurrency(Math.round(summary.avgDailySpending))}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block mb-0.5">Avg / Transaction</span>
              <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                {formatCurrency(Math.round(summary.avgPerTransaction))}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Top Categories & Payment Modes */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>📊 Category Breakdown ({reportMonthStr})</span>
          </h3>

          {summary.categoryArray.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No transactions recorded for this period.
            </div>
          ) : (
            <div className="space-y-3">
              {summary.categoryArray.slice(0, 5).map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{cat.category}</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(cat.amount)} <span className="text-[10px] text-slate-400 font-normal">({cat.percentage}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Payment Mode Distribution with Aligned Bars */}
          {paymentBreakdown.length > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>💳 Payment Modes</span>
              </h4>
              <div className="space-y-2.5">
                {paymentBreakdown.map((pm) => (
                  <div key={pm.mode} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{pm.mode}</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatCurrency(pm.amount)} <span className="text-[10px] text-slate-400 font-normal">({pm.percentage}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(pm.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Card 3: Top 10 Spending Transactions */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          🔝 Top 10 Largest Expenses in Period ({reportMonthStr})
        </h3>

        {topItems.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No expenses found for this month period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Item Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {topItems.map((item, index) => (
                  <tr key={`rep-top-${item.id}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 font-medium">
                    <td className="py-2.5 px-3 text-slate-400">{index + 1}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{item.date}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{item.member}</td>
                    <td className="py-2.5 px-3 text-slate-900 dark:text-white font-semibold">{item.itemName || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{item.category}</td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 dark:text-white">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </motion.div>

    {/* Notification Toasts & Status Overlay */}
    <AnimatePresence>
      {(statusMessage || successToast) && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm"
        >
          <div className={`p-4 rounded-3xl shadow-2xl border flex items-center gap-3 backdrop-blur-md ${
            statusMessage 
              ? 'bg-indigo-600/90 border-indigo-400 text-white' 
              : 'bg-emerald-600/90 border-emerald-400 text-white'
          }`}>
            <div className="shrink-0">
              {statusMessage ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">
                {statusMessage || successToast}
              </p>
            </div>
            {!statusMessage && (
              <button 
                onClick={() => setSuccessToast(null)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <ArrowRight className="w-4 h-4 rotate-45" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};
