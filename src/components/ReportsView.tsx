import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense, MemberName } from '../types';
import { MEMBERS } from '../data/categories';
import { generateMonthlyPdf } from '../services/pdfReport';
import { calculateSummaryMetrics, calculateWeeklySpending, getTopSpendingItems, formatCurrency, filterExpenses } from '../utils/analytics';
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
  Layers,
  User,
  Users
} from 'lucide-react';

interface ReportsViewProps {
  expenses: Expense[];
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  availableMonths: { value: string; label: string }[];
  currentMember?: MemberName;
  onRefreshData: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  expenses,
  selectedMonth,
  onSelectMonth,
  availableMonths,
  currentMember = 'Nimal',
  onRefreshData
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [exportScope, setExportScope] = useState<'group' | MemberName>('group');

  const reportMonthStr = selectedMonth === 'all' ? '2026-08' : selectedMonth;
  const isPersonal = exportScope !== 'group';
  const targetMember = isPersonal ? exportScope : undefined;

  // Filter current expenses using unified pipeline
  const currentExpenses = filterExpenses(
    expenses,
    selectedMonth,
    undefined,
    targetMember || 'All'
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
    const exportData = isPersonal
      ? expenses.filter(e => e.member === targetMember)
      : expenses;
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
              Generate pixel-perfect PDF reports and CSV exports with member-classified transaction ledgers.
            </p>
          </div>

          {/* Controls: Month and Scope */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Scope Selector */}
            <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-2xl border border-slate-700">
              <button
                type="button"
                onClick={() => setExportScope('group')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  exportScope === 'group'
                    ? 'bg-indigo-600 text-white shadow-sm'
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
                    ? 'bg-indigo-600 text-white shadow-sm'
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
              className="bg-slate-800 text-white font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-2xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Months</option>
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
            <span>
              {isGenerating 
                ? 'Generating PDF...' 
                : isPersonal 
                ? `Download ${targetMember}'s PDF (${reportMonthStr})` 
                : `Download Group PDF (${reportMonthStr})`}
            </span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold border border-slate-700 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV {isPersonal ? `(${targetMember})` : '(Group)'}</span>
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

        {/* Card 2: Top Categories in Period */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>📊 Top Categories ({reportMonthStr})</span>
          </h3>

          {summary.categoryArray.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No transactions recorded for this period.
            </div>
          ) : (
            <div className="space-y-2.5">
              {summary.categoryArray.slice(0, 5).map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{cat.category}</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(cat.amount)} <span className="text-[10px] text-slate-400 font-normal">({cat.percentage}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
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
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 font-medium">
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
  );
};
