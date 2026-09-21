import React, { useState, useEffect } from 'react';
import { db } from '../services/storage';
import { MemberName } from '../types';
import { MEMBERS } from '../data/categories';
import { useMemberAvatars } from '../hooks/useMemberAvatars';
import { X, Target, Save, Check, User, Plus, Minus, Calendar, Zap, Users, Lock } from 'lucide-react';
import { formatCurrency } from '../utils/analytics';

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
  const initialMonth = selectedMonth === 'all' ? '2026-08' : selectedMonth;
  const [activeTargetMonth, setActiveTargetMonth] = useState<string>(initialMonth);
  const [isGroupBudgetMode, setIsGroupBudgetMode] = useState<boolean>(false);
  const [budgetAmount, setBudgetAmount] = useState<string>(currentBudget.toString());
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // When modal opens or inputs change, sync internal state strictly to current authenticated user
  useEffect(() => {
    if (isOpen) {
      const monthKey = selectedMonth === 'all' ? '2026-08' : selectedMonth;
      setActiveTargetMonth(monthKey);
      setIsGroupBudgetMode(false);
      const budgetForMember = db.getBudget(monthKey, currentMember);
      setBudgetAmount(budgetForMember.toString());
      setIsSaved(false);
    }
  }, [isOpen, selectedMonth, currentMember, currentBudget]);

  // When user switches the month dropdown inside the modal
  const handleMonthChange = (newMonth: string) => {
    setActiveTargetMonth(newMonth);
    const budgetVal = isGroupBudgetMode 
      ? db.getGroupBudget(newMonth) 
      : db.getBudget(newMonth, currentMember);
    setBudgetAmount(budgetVal.toString());
    setIsSaved(false);
  };

  const handleToggleGroup = (group: boolean) => {
    setIsGroupBudgetMode(group);
    if (group) {
      const groupVal = db.getGroupBudget(activeTargetMonth);
      setBudgetAmount(groupVal.toString());
    } else {
      const memberVal = db.getBudget(activeTargetMonth, currentMember);
      setBudgetAmount(memberVal.toString());
    }
    setIsSaved(false);
  };

  if (!isOpen) return null;

  const numericBudget = Math.max(parseFloat(budgetAmount) || 0, 0);

  // Calculate days in month & daily allowance preview
  const [yearNum, monthNum] = activeTargetMonth.split('-').map(Number);
  const daysInMonth = (yearNum && monthNum) ? new Date(yearNum, monthNum, 0).getDate() : 30;
  const calculatedDailyTarget = daysInMonth > 0 ? Math.round(numericBudget / daysInMonth) : 0;

  // Personal vs Group Preset options in clean 4-column groupings
  const PRESET_AMOUNTS = isGroupBudgetMode 
    ? [15000, 20000, 30000, 40000] 
    : [3000, 5000, 8000, 10000];

  const QUICK_ADD_VALUES = [500, 1000, 2000, 5000];

  const handleAdjust = (delta: number) => {
    const nextVal = Math.max(numericBudget + delta, 0);
    setBudgetAmount(nextVal.toString());
    setIsSaved(false);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (numericBudget > 0) {
      if (isGroupBudgetMode) {
        db.setGroupBudget(activeTargetMonth, numericBudget);
      } else {
        db.setBudget(activeTargetMonth, numericBudget, currentMember);
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
        className="bg-white dark:bg-[#10162A] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto text-slate-900 dark:text-[#F8FAFC]"
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
                  {isGroupBudgetMode ? 'Room Group Budget' : 'Personal Budget'}
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
                  ? 'Combined monthly budget for all 5 room members' 
                  : `Monthly limit strictly for ${currentMember}`}
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
          {/* BUDGET OWNER Selection Row (Strictly Locked to Logged-in User Only) */}
          {!isGroupBudgetMode && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>BUDGET OWNER</span>
                </label>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-800/50">
                  {currentMember} (Locked)
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {MEMBERS.map((m) => {
                  const isCurrent = m.name === currentMember;
                  return (
                    <button
                      key={m.name}
                      type="button"
                      disabled={!isCurrent}
                      title={isCurrent ? `Active profile: ${m.name}` : `Disabled: Personal budgets are locked to ${currentMember}`}
                      className={`px-2 py-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${
                        isCurrent
                          ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-500/40 cursor-default'
                          : 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-slate-800 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <span className="truncate">{m.name}</span>
                      {isCurrent ? (
                        <span className="text-[9px] font-semibold text-indigo-100">You</span>
                      ) : (
                        <Lock className="w-2.5 h-2.5 text-slate-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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

          {/* Amount Input with Vertically Centered Stepper */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isGroupBudgetMode ? 'Room Monthly Limit' : `${currentMember}'s Monthly Limit`}
              </label>
            </div>
            
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 dark:text-slate-500 font-bold text-lg pointer-events-none select-none">
                ₹
              </span>
              <input
                id="budget-amount-input"
                type="number"
                min="0"
                step="500"
                value={budgetAmount}
                onChange={(e) => {
                  setBudgetAmount(e.target.value);
                  setIsSaved(false);
                }}
                placeholder="5000"
                className="w-full pl-8 pr-22 h-13 bg-slate-50 dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-2xl font-extrabold focus:ring-2 focus:ring-indigo-500 focus:outline-none flex items-center"
                autoFocus
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleAdjust(-1000)}
                  title="Decrease ₹1,000"
                  className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold transition-colors cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjust(1000)}
                  title="Increase ₹1,000"
                  className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Increment 4-Column Grid */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Quick Add
            </span>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_ADD_VALUES.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleAdjust(val)}
                  className="h-8 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-300 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700/60 transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>

          {/* Preset Limits 4-Column Grid */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Preset Limits
            </span>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setBudgetAmount(preset.toString());
                    setIsSaved(false);
                  }}
                  className={`h-9 rounded-xl text-xs font-bold transition-all border flex items-center justify-center cursor-pointer ${
                    numericBudget === preset
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-500'
                  }`}
                >
                  ₹{(preset / 1000)}k
                </button>
              ))}
            </div>
          </div>

          {/* Daily Allowance Breakdown Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50/70 via-indigo-50/40 to-slate-50 dark:from-indigo-950/40 dark:via-indigo-950/20 dark:to-slate-800/40 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block truncate">
                  {isGroupBudgetMode ? 'Room Daily Pace' : `${currentMember}'s Daily Allowance`}
                </span>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate block">
                  {formatCurrency(numericBudget)} ÷ {daysInMonth} days
                </span>
              </div>
            </div>
            <div className="text-right shrink-0 ml-2">
              <span className="text-sm sm:text-base font-black text-indigo-600 dark:text-indigo-400 block leading-none">
                {formatCurrency(calculatedDailyTarget)}
              </span>
              <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">per day</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={numericBudget <= 0}
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
                  <span>Save {isGroupBudgetMode ? 'Group' : 'My'} Budget</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

