import React, { useState, useEffect } from 'react';
import { db } from '../services/storage';
import { MemberName } from '../types';
import { MEMBERS } from '../data/categories';
import { X, Target, Save, Check, User, Plus, Minus, Calendar, Zap, Users } from 'lucide-react';
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
  const initialMonth = selectedMonth === 'all' ? '2026-08' : selectedMonth;
  const [activeTargetMonth, setActiveTargetMonth] = useState<string>(initialMonth);
  const [targetMember, setTargetMember] = useState<MemberName>(currentMember);
  const [isGroupBudgetMode, setIsGroupBudgetMode] = useState<boolean>(false);
  const [budgetAmount, setBudgetAmount] = useState<string>(currentBudget.toString());
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // When modal opens or inputs change, sync internal state
  useEffect(() => {
    if (isOpen) {
      const monthKey = selectedMonth === 'all' ? '2026-08' : selectedMonth;
      setActiveTargetMonth(monthKey);
      setTargetMember(currentMember);
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
      : db.getBudget(newMonth, targetMember);
    setBudgetAmount(budgetVal.toString());
    setIsSaved(false);
  };

  // When user switches between personal member or group
  const handleMemberChange = (member: MemberName) => {
    setTargetMember(member);
    setIsGroupBudgetMode(false);
    const budgetVal = db.getBudget(activeTargetMonth, member);
    setBudgetAmount(budgetVal.toString());
    setIsSaved(false);
  };

  const handleToggleGroup = (group: boolean) => {
    setIsGroupBudgetMode(group);
    if (group) {
      const groupVal = db.getGroupBudget(activeTargetMonth);
      setBudgetAmount(groupVal.toString());
    } else {
      const memberVal = db.getBudget(activeTargetMonth, targetMember);
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

  // Personal vs Group Preset options
  const PRESET_AMOUNTS = isGroupBudgetMode 
    ? [15000, 20000, 25000, 30000, 35000, 40000] 
    : [3000, 4000, 5000, 6000, 7500, 10000, 12000, 15000];

  const handleAdjust = (delta: number) => {
    const nextVal = Math.max(numericBudget + delta, 500);
    setBudgetAmount(nextVal.toString());
    setIsSaved(false);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (numericBudget > 0) {
      if (isGroupBudgetMode) {
        db.setGroupBudget(activeTargetMonth, numericBudget);
      } else {
        db.setBudget(activeTargetMonth, numericBudget, targetMember);
      }
      onBudgetUpdated();
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 600);
    }
  };

  const memberInfo = MEMBERS.find(m => m.name === targetMember);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        id="set-budget-modal-container"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${
              isGroupBudgetMode 
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' 
                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
            }`}>
              {isGroupBudgetMode ? <Users className="w-5 h-5" /> : <Target className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {isGroupBudgetMode ? 'Set Room Group Budget' : `Set Personal Budget`}
                </h3>
                {!isGroupBudgetMode && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                    {targetMember}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {isGroupBudgetMode 
                  ? 'Combined monthly budget for all 5 room members' 
                  : `Individual monthly spending limit for ${targetMember}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector: Personal vs Group Budget */}
        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => handleToggleGroup(false)}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              !isGroupBudgetMode 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Personal Budget ({targetMember})</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggleGroup(true)}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              isGroupBudgetMode 
                ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-white shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Room Group Budget</span>
          </button>
        </div>

        {/* Member selection chips if in personal mode */}
        {!isGroupBudgetMode && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Budget Owner:
            </span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {MEMBERS.map(m => {
                const isSelected = m.name === targetMember;
                return (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => handleMemberChange(m.name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 border ${
                      isSelected 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span>{m.avatar}</span>
                    <span>{m.name}</span>
                    {m.name === currentMember && (
                      <span className={`text-[9px] px-1 py-0.2 rounded font-semibold ${isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                        You
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Target Month Selector */}
          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>Target Month:</span>
            </label>
            <select
              value={activeTargetMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {availableMonths.length > 0 ? (
                availableMonths.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} ({m.value})
                  </option>
                ))
              ) : (
                <>
                  <option value="2026-08">Aug 2026</option>
                  <option value="2026-09">Sep 2026</option>
                </>
              )}
            </select>
          </div>

          {/* Amount Input with Step Adjusters */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isGroupBudgetMode ? 'Room Monthly Limit (₹)' : `${targetMember}'s Personal Monthly Budget (₹)`}
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                Type any custom amount
              </span>
            </div>
            
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 font-bold text-lg">₹</span>
              <input
                id="budget-amount-input"
                type="number"
                min="500"
                step="500"
                value={budgetAmount}
                onChange={(e) => {
                  setBudgetAmount(e.target.value);
                  setIsSaved(false);
                }}
                placeholder="5000"
                className="w-full pl-8 pr-24 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-2xl font-extrabold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                autoFocus
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleAdjust(-1000)}
                  title="-₹1,000"
                  className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold hover:bg-slate-300 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjust(1000)}
                  title="+₹1,000"
                  className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold hover:bg-slate-300 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Increment Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-semibold mr-1">Quick Add:</span>
            {['+500', '+1000', '+2000', '+5000'].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleAdjust(parseInt(chip, 10))}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700/60 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Popular Presets */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Preset Limits
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setBudgetAmount(preset.toString());
                    setIsSaved(false);
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                    numericBudget === preset
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                  }`}
                >
                  ₹{(preset / 1000)}k
                </button>
              ))}
            </div>
          </div>

          {/* Calculated Daily Target Box */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50/70 via-indigo-50/40 to-slate-50 dark:from-indigo-950/40 dark:via-indigo-950/20 dark:to-slate-800/40 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                  {isGroupBudgetMode ? 'Room Daily Pace' : `${targetMember}'s Daily Allowance`}
                </span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {formatCurrency(numericBudget)} ÷ {daysInMonth} days
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm sm:text-base font-black text-indigo-600 dark:text-indigo-400">
                {formatCurrency(calculatedDailyTarget)}
              </span>
              <span className="text-[10px] text-slate-400 block font-medium">per day</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={numericBudget <= 0}
              className={`flex-1 py-3 rounded-2xl text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all ${
                isSaved
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-indigo-600/30'
              }`}
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Budget Fixed & Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save {isGroupBudgetMode ? 'Group' : `${targetMember}'s`} Budget</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
