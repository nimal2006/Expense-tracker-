import React, { useState, useEffect } from 'react';
import { db } from '../services/storage';
import { MemberName } from '../types';
import { MEMBERS } from '../data/categories';
import { useMemberAvatars } from '../hooks/useMemberAvatars';
import { X, Target, Save, Check, User, Plus, Minus, Calendar, Zap, Users, Lock, Sparkles } from 'lucide-react';
import { formatCurrency } from '../utils/analytics';
import { getDailyBudgetSetting, setDailyBudgetSetting } from '../utils/gamification';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: string;
  currentMember: MemberName;
  currentBudget: number;
  availableMonths?: { value: string; label: string }[];
  onBudgetUpdated: () => void;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  selectedMonth,
  currentMember,
  currentBudget,
  availableMonths = [],
  onBudgetUpdated
}) => {
  const { getMember } = useMemberAvatars();
  const initialMonth = selectedMonth === 'all' ? '2026-09' : selectedMonth;
  const [activeTargetMonth, setActiveTargetMonth] = useState<string>(initialMonth);
  const [isGroupBudgetMode, setIsGroupBudgetMode] = useState<boolean>(false);
  const [budgetTab, setBudgetTab] = useState<'daily' | 'monthly'>('daily');
  const [monthlyBudgetAmount, setMonthlyBudgetAmount] = useState<string>(currentBudget.toString());
  const [dailyBudgetAmount, setDailyBudgetAmount] = useState<string>('200');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // When modal opens or inputs change, sync internal state strictly to current authenticated user
  useEffect(() => {
    if (isOpen) {
      const monthKey = selectedMonth === 'all' ? '2026-09' : selectedMonth;
      setActiveTargetMonth(monthKey);
      setIsGroupBudgetMode(false);
      const budgetForMember = db.getBudget(monthKey, currentMember);
      setMonthlyBudgetAmount(budgetForMember.toString());
      
      const dailySetting = getDailyBudgetSetting(monthKey, currentMember, budgetForMember);
      setDailyBudgetAmount(dailySetting.amount.toString());
      setIsSaved(false);
    }
  }, [isOpen, selectedMonth, currentMember, currentBudget]);

  // When user switches the month dropdown inside the modal
  const handleMonthChange = (newMonth: string) => {
    setActiveTargetMonth(newMonth);
    const budgetVal = isGroupBudgetMode 
      ? db.getGroupBudget(newMonth) 
      : db.getBudget(newMonth, currentMember);
    setMonthlyBudgetAmount(budgetVal.toString());
    
    const dailySetting = getDailyBudgetSetting(newMonth, isGroupBudgetMode ? 'group' : currentMember, budgetVal);
    setDailyBudgetAmount(dailySetting.amount.toString());
    setIsSaved(false);
  };

  const handleToggleGroup = (group: boolean) => {
    setIsGroupBudgetMode(group);
    const targetKey = group ? 'group' : currentMember;
    if (group) {
      const groupVal = db.getGroupBudget(activeTargetMonth);
      setMonthlyBudgetAmount(groupVal.toString());
      const dailySetting = getDailyBudgetSetting(activeTargetMonth, 'group', groupVal);
      setDailyBudgetAmount(dailySetting.amount.toString());
    } else {
      const memberVal = db.getBudget(activeTargetMonth, currentMember);
      setMonthlyBudgetAmount(memberVal.toString());
      const dailySetting = getDailyBudgetSetting(activeTargetMonth, currentMember, memberVal);
      setDailyBudgetAmount(dailySetting.amount.toString());
    }
    setIsSaved(false);
  };

  if (!isOpen) return null;

  const numericMonthlyBudget = Math.max(parseFloat(monthlyBudgetAmount) || 0, 0);
  const numericDailyBudget = Math.max(parseFloat(dailyBudgetAmount) || 0, 0);

  // Calculate days in month & daily allowance preview
  const [yearNum, monthNum] = activeTargetMonth.split('-').map(Number);
  const daysInMonth = (yearNum && monthNum) ? new Date(yearNum, monthNum, 0).getDate() : 30;

  // Daily budget preset quick options
  const DAILY_PRESETS = [100, 200, 300, 500, 1000];

  // Monthly presets
  const MONTHLY_PRESETS = isGroupBudgetMode 
    ? [15000, 20000, 30000, 40000] 
    : [3000, 5000, 8000, 10000];

  const handleDailyPresetClick = (preset: number) => {
    setDailyBudgetAmount(preset.toString());
    // Also sync monthly
    setMonthlyBudgetAmount((preset * daysInMonth).toString());
    setIsSaved(false);
  };

  const handleMonthlyPresetClick = (preset: number) => {
    setMonthlyBudgetAmount(preset.toString());
    setDailyBudgetAmount(Math.round(preset / daysInMonth).toString());
    setIsSaved(false);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (numericMonthlyBudget > 0 || numericDailyBudget > 0) {
      const finalDaily = numericDailyBudget > 0 ? numericDailyBudget : Math.max(Math.round(numericMonthlyBudget / daysInMonth), 1);
      const finalMonthly = numericMonthlyBudget > 0 ? numericMonthlyBudget : finalDaily * daysInMonth;

      if (isGroupBudgetMode) {
        db.setGroupBudget(activeTargetMonth, finalMonthly);
        setDailyBudgetSetting(activeTargetMonth, 'group', finalDaily);
      } else {
        db.setBudget(activeTargetMonth, finalMonthly, currentMember);
        setDailyBudgetSetting(activeTargetMonth, currentMember, finalDaily);
      }
      onBudgetUpdated();
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 600);
    }
  };

  const currentMemberObj = getMember(currentMember);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="set-budget-modal-container"
        className="bg-white dark:bg-[#10162A] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto text-slate-900 dark:text-[#F8FAFC]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              isGroupBudgetMode 
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50' 
                : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50'
            }`}>
              {isGroupBudgetMode ? <Users className="w-5 h-5" /> : <Target className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight">
                  {isGroupBudgetMode ? 'Room Group Budget' : 'Daily & Monthly Budget'}
                </h3>
                {!isGroupBudgetMode && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 shrink-0">
                    <span className={`w-2 h-2 rounded-full ${currentMemberObj.avatarColor}`} />
                    {currentMember} (You)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {isGroupBudgetMode 
                  ? 'Set daily limit and monthly cap for all room members' 
                  : `Configure daily target & monthly budget for ${currentMember}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector: Personal vs Group Budget */}
        <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => handleToggleGroup(false)}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
              !isGroupBudgetMode 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Personal Budget</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggleGroup(true)}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
              isGroupBudgetMode 
                ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-white shadow-xs' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Room Group</span>
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Target Month Selector */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>Target Month</span>
            </label>
            <select
              value={activeTargetMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
            >
              {availableMonths && availableMonths.filter(m => m.value !== 'all').length > 0 ? (
                Array.from(
                  new Map(
                    availableMonths
                      .filter(m => m.value !== 'all')
                      .map(m => [m.value, m])
                  ).values()
                ).map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} ({m.value})
                  </option>
                ))
              ) : (
                <>
                  <option value="2026-09">Sep 2026 (2026-09)</option>
                  <option value="2026-08">Aug 2026 (2026-08)</option>
                </>
              )}
            </select>
          </div>

          {/* Section: Daily Budget Configuration */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-indigo-500" />
                <span>Daily Target (₹/day)</span>
              </label>
              <span className="text-[10px] text-slate-400">Used for streaks & gamification</span>
            </div>

            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 dark:text-slate-500 font-bold text-base pointer-events-none select-none">
                ₹
              </span>
              <input
                id="daily-budget-input"
                type="number"
                min="1"
                step="10"
                value={dailyBudgetAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  setDailyBudgetAmount(val);
                  const num = parseFloat(val) || 0;
                  setMonthlyBudgetAmount((num * daysInMonth).toString());
                  setIsSaved(false);
                }}
                placeholder="200"
                className="w-full pl-8 pr-4 h-11 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-lg font-extrabold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Quick Daily Presets */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Quick Options:
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                {DAILY_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleDailyPresetClick(preset)}
                    className={`h-8 rounded-lg text-xs font-bold transition-all border flex items-center justify-center cursor-pointer ${
                      numericDailyBudget === preset
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:border-indigo-400'
                    }`}
                  >
                    ₹{preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Monthly Budget */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isGroupBudgetMode ? 'Room Monthly Total' : `${currentMember}'s Monthly Total`}
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {daysInMonth} days in month
              </span>
            </div>
            
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 dark:text-slate-500 font-bold text-base pointer-events-none select-none">
                ₹
              </span>
              <input
                id="budget-amount-input"
                type="number"
                min="0"
                step="500"
                value={monthlyBudgetAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  setMonthlyBudgetAmount(val);
                  const num = parseFloat(val) || 0;
                  setDailyBudgetAmount(Math.round(num / daysInMonth).toString());
                  setIsSaved(false);
                }}
                placeholder="6000"
                className="w-full pl-8 pr-4 h-11 bg-slate-50 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-lg font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={numericMonthlyBudget <= 0 && numericDailyBudget <= 0}
              className={`flex-1 h-11 rounded-2xl text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isSaved
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-indigo-600/30'
              }`}
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Budget Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Budget</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

