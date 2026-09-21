import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Expense } from '../types';
import { formatCurrency, getLocalDateString } from '../utils/analytics';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  X, 
  Check, 
  Sparkles
} from 'lucide-react';

interface CalendarPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: string; // '2026-09', '2026-08', 'all'
  onSelectMonth: (month: string) => void;
  selectedDate?: string | null;
  onSelectDate?: (date: string | null) => void;
  expenses: Expense[];
  availableMonths?: { value: string; label: string }[];
}

export const CalendarPopover: React.FC<CalendarPopoverProps> = ({
  isOpen,
  onClose,
  selectedMonth,
  onSelectMonth,
  selectedDate = null,
  onSelectDate,
  expenses
}) => {
  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <CalendarModalContent
          isOpen={isOpen}
          onClose={onClose}
          selectedMonth={selectedMonth}
          onSelectMonth={onSelectMonth}
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
          expenses={expenses}
        />
      )}
    </AnimatePresence>,
    document.body
  );
};

const CalendarModalContent: React.FC<CalendarPopoverProps> = ({
  isOpen,
  onClose,
  selectedMonth,
  onSelectMonth,
  selectedDate = null,
  onSelectDate,
  expenses
}) => {
  const todayStr = getLocalDateString();
  const currentMonthKeyToday = todayStr.substring(0, 7);
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthKey = getLocalDateString(lastMonthDate).substring(0, 7);
  const lastMonthLabel = lastMonthDate.toLocaleString('default', { month: 'short', year: 'numeric' });

  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonthNum, setCurrentMonthNum] = useState<number>(9); // 1-12
  const [tempDate, setTempDate] = useState<string | null>(selectedDate);
  const [tempMonth, setTempMonth] = useState<string>(selectedMonth);

  // Sync internal state when popover opens or props change
  useEffect(() => {
    setTempMonth(selectedMonth);
    setTempDate(selectedDate || null);

    if (selectedMonth && selectedMonth !== 'all') {
      const [y, m] = selectedMonth.split('-').map(Number);
      if (y && m) {
        setCurrentYear(y);
        setCurrentMonthNum(m);
      }
    } else {
      const [y, m] = todayStr.split('-').map(Number);
      if (y && m) {
        setCurrentYear(y);
        setCurrentMonthNum(m);
      }
    }
  }, [selectedMonth, selectedDate, todayStr]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (currentMonthNum === 1) {
      setCurrentMonthNum(12);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonthNum(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthNum === 12) {
      setCurrentMonthNum(1);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonthNum(prev => prev + 1);
    }
  };

  const currentMonthKey = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const currentMonthName = monthNames[currentMonthNum - 1] || 'September';

  // Calculate days for calendar grid
  const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
  const firstDayIndex = (new Date(currentYear, currentMonthNum - 1, 1).getDay() + 6) % 7;

  // Expenses filtering for monthly summary
  const monthExpenses = expenses.filter(e => e.date && e.date.startsWith(currentMonthKey));
  const activeMonthExpenses = tempMonth === 'all' 
    ? expenses 
    : tempDate 
    ? expenses.filter(e => e.date === tempDate)
    : monthExpenses;

  const totalSpent = activeMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const uniqueActiveDays = new Set(monthExpenses.map(e => e.date)).size;
  const totalTransactionsCount = activeMonthExpenses.length;

  const handleShortcutSelect = (shortcutKey: string) => {
    setTempMonth(shortcutKey);
    setTempDate(null);
    if (shortcutKey !== 'all') {
      const [y, m] = shortcutKey.split('-').map(Number);
      if (y && m) {
        setCurrentYear(y);
        setCurrentMonthNum(m);
      }
    }
  };

  const handleDayClick = (dayNum: number) => {
    const dayStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    if (tempDate === dayStr) {
      setTempDate(null);
    } else {
      setTempDate(dayStr);
      setTempMonth(currentMonthKey);
    }
  };

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectMonth(tempMonth);
    if (onSelectDate) {
      onSelectDate(tempDate);
    }
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" 
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative w-full max-w-md my-auto rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Close Button */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-slate-100">Select Time Range</h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Quick Shortcuts Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => handleShortcutSelect(currentMonthKeyToday)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                tempMonth === currentMonthKeyToday && !tempDate
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => handleShortcutSelect(lastMonthKey)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                tempMonth === lastMonthKey && !tempDate
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {lastMonthLabel}
            </button>
            <button
              type="button"
              onClick={() => handleShortcutSelect('all')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                tempMonth === 'all' && !tempDate
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All-Time
            </button>
          </div>

          {/* Month Navigation Controls */}
          <div className="flex items-center justify-between bg-slate-800/50 p-2 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-extrabold tracking-tight">
              {currentMonthName} {currentYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-400 uppercase">
              <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="h-8" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const dayExpenses = expenses.filter(e => e.date === dateStr);
                const hasTransactions = dayExpenses.length > 0;
                const isSelected = tempDate === dateStr;
                const isToday = dateStr === todayStr;

                return (
                  <button
                    key={`day-${dayNum}`}
                    type="button"
                    onClick={() => handleDayClick(dayNum)}
                    className={`h-8 rounded-xl flex flex-col items-center justify-center relative text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30 scale-105 z-10'
                        : isToday
                        ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800'
                        : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <span>{dayNum}</span>
                    {hasTransactions && !isSelected && (
                      <span className="w-1 h-1 rounded-full bg-cyan-400 absolute bottom-1 shadow-[0_0_4px_rgba(34,211,238,0.9)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary Footer */}
          <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{tempDate ? `Day (${tempDate})` : tempMonth === 'all' ? 'All-Time' : `${currentMonthName}`}</span>
              </span>
              <span className="font-black text-white text-sm">
                {formatCurrency(totalSpent)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-700/50">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Active Days:</span>
                <span className="font-bold text-slate-200">{uniqueActiveDays} days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Transactions:</span>
                <span className="font-bold text-slate-200">{totalTransactionsCount} txns</span>
              </div>
            </div>
          </div>

          {/* Apply Button */}
          <button
            type="button"
            onClick={handleApply}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white text-xs font-extrabold shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Apply {tempDate ? `(${tempDate})` : tempMonth === 'all' ? 'All-Time' : `(${currentMonthName.slice(0, 3)} ${currentYear})`}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
