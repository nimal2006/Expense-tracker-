import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense } from '../types';
import { generateMonthlyPdf } from '../services/pdfReport';
import { calculateSummaryMetrics, calculateWeeklySpending, getTopSpendingItems, formatCurrency } from '../utils/analytics';
import { db } from '../services/storage';
import {
  FileText,
  Download,
  Share2,
  Table,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  RefreshCw,
  FileSpreadsheet,
  Layers
} from 'lucide-react';

interface ReportsViewProps {
  expenses: Expense[];
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  availableMonths: { value: string; label: string }[];
  onRefreshData: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  expenses,
  selectedMonth,
  onSelectMonth,
  availableMonths,
  onRefreshData
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const reportMonthStr = selectedMonth === 'all' ? '2026-08' : selectedMonth;
  const currentExpenses = expenses.filter(e => e.date.startsWith(reportMonthStr));
  const previousMonthStr = reportMonthStr === '2026-09' ? '2026-08' : '2026-07';
  const previousExpenses = expenses.filter(e => e.date.startsWith(previousMonthStr));

  const summary = calculateSummaryMetrics(currentExpenses, previousExpenses);
  const topItems = getTopSpendingItems(currentExpenses, 10);

  const handleDownloadPdf = () => {
    setIsGenerating(true);
    try {
      const doc = generateMonthlyPdf(expenses, reportMonthStr, previousExpenses);
      doc.save(`Friends_Expense_Report_${reportMonthStr}.pdf`);
      setSuccessToast(`PDF report for ${reportMonthStr} generated and downloaded!`);
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
      e.category,
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
    link.setAttribute('download', `Friends_Expenses_${reportMonthStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSuccessToast(`CSV exported for ${reportMonthStr}!`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(expenses, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `friends_expenses_backup_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setSuccessToast('Full database JSON backup downloaded!');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleResetToAugust = () => {
    if (window.confirm('Reset all records to the original August 2026 dataset (229 transactions, ₹22,430)?')) {
      db.resetToAugustData();
      onRefreshData();
      setSuccessToast('Database restored to August 2026 truth baseline!');
      setTimeout(() => setSuccessToast(null), 3500);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6 pb-16 max-w-5xl mx-auto"
    >
      
      {/* Header Banner & PDF Trigger */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white p-6 rounded-3xl border border-indigo-800/40 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Monthly Expense Reports</h2>
            </div>
            <p className="text-xs text-slate-300">
              Generate pixel-perfect PDF reports with member-classified transaction ledgers and analytical summaries.
            </p>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => onSelectMonth(e.target.value)}
              className="bg-slate-800 text-white font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-2xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {availableMonths.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleDownloadPdf}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isGenerating ? 'Generating PDF...' : `Download PDF Report (${reportMonthStr})`}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold border border-slate-700 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleExportJson}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold border border-slate-700 transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span>JSON Backup</span>
          </motion.button>

          <button
            onClick={handleResetToAugust}
            className="ml-auto text-xs text-slate-400 hover:text-rose-400 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset to August 2026 Baseline</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-sm animate-in slide-in-from-top duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Live Report Preview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Card 1: Executive Summary */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>📋 Executive Summary ({reportMonthStr})</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block mb-0.5">Total Outflow</span>
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
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {formatCurrency(Math.round(summary.avgDailySpending))}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 block mb-0.5">Avg / Transaction</span>
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {formatCurrency(Math.round(summary.avgPerTransaction))}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Member Share Breakdown
            </h4>
            <div className="space-y-2">
              {(['Nimal', 'Etti', 'Dharan', 'Sanjai'] as const).map(member => {
                const data = summary.memberTotals[member];
                return (
                  <div key={member} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{member}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">{data.count} txns</span>
                      <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(data.amount)}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-[10px]">
                        {data.percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card 2: Top 10 Spending Items */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>⭐ Top 10 Major Expenses ({reportMonthStr})</span>
          </h3>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {topItems.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-slate-400 font-bold w-4">{idx + 1}</span>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white truncate">
                      {item.itemName || item.category}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {item.member} • {item.date} • {item.paymentMode}
                    </div>
                  </div>
                </div>
                <div className="text-right font-extrabold text-slate-900 dark:text-white">
                  {formatCurrency(item.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </motion.div>
  );
};
