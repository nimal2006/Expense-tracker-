import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Calendar,
  Clock,
  CreditCard,
  Tag,
  MapPin,
  FileText,
  Edit3,
  Receipt,
} from 'lucide-react';
import { Expense } from '../types';
import { useMemberAvatars } from '../hooks/useMemberAvatars';
import { formatTime12h } from '../utils/istTime';

interface ExpenseDetailModalProps {
  expense: Expense | null;
  onClose: () => void;
  onEditExpense?: (expense: Expense) => void;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  expense,
  onClose,
  onEditExpense,
}) => {
  const { getMember } = useMemberAvatars();
  const memberObj = expense ? getMember(expense.member) : null;

  return (
    <AnimatePresence>
      {expense && memberObj && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2 }}
            className="w-full sm:max-w-md bg-white dark:bg-[#10162A] border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-11 h-11 rounded-2xl ${memberObj.avatarColor} flex items-center justify-center font-bold text-sm text-white shrink-0 overflow-hidden`}
                >
                  {memberObj.avatarUrl ? (
                    <img
                      src={memberObj.avatarUrl}
                      alt={memberObj.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    memberObj.avatarLetter
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-[#F8FAFC] truncate">
                    {expense.member}&apos;s Expense
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                    {expense.category} · {expense.paymentMode}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close expense details"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Amount Hero */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#080B18]/85 border border-slate-200/80 dark:border-slate-800 flex items-baseline justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8]">
                Amount Spent
              </span>
              <span className="text-3xl font-black font-mono tabular-nums text-slate-900 dark:text-[#F8FAFC]">
                ₹{Number(expense.amount).toLocaleString('en-IN')}
              </span>
            </div>

            {/* Structured Details */}
            <div className="space-y-2.5 text-xs sm:text-sm">
              {expense.itemName && (
                <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800/70">
                  <span className="text-slate-500 dark:text-[#94A3B8] flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#7C5CFC]" />
                    Item
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-[#F8FAFC] text-right">
                    {expense.itemName}
                    {expense.quantity && expense.quantity > 1 ? ` (×${expense.quantity})` : ''}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800/70">
                <span className="text-slate-500 dark:text-[#94A3B8] flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#22D3EE]" />
                  Category
                </span>
                <span className="font-semibold text-slate-900 dark:text-[#F8FAFC]">
                  {expense.category}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800/70">
                <span className="text-slate-500 dark:text-[#94A3B8] flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#34D399]" />
                  Payment Mode
                </span>
                <span className="font-semibold text-slate-900 dark:text-[#F8FAFC]">
                  {expense.paymentMode}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800/70">
                <span className="text-slate-500 dark:text-[#94A3B8] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#7C5CFC]" />
                  Date &amp; Time
                </span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-[#F8FAFC]">
                  {expense.date}
                  {expense.time ? ` · ${formatTime12h(expense.time)}` : ''}
                </span>
              </div>

              {expense.place && (
                <div className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800/70">
                  <span className="text-slate-500 dark:text-[#94A3B8] flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#22D3EE]" />
                    Place
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-[#F8FAFC] text-right">
                    {expense.place}
                  </span>
                </div>
              )}

              {expense.notes && (
                <div className="pt-1 space-y-1">
                  <span className="text-slate-500 dark:text-[#94A3B8] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    Notes
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#080B18]/70 rounded-xl p-3 border border-slate-200/70 dark:border-slate-800">
                    {expense.notes}
                  </p>
                </div>
              )}

              {expense.receiptUrl && (
                <div className="pt-2">
                  <img
                    src={expense.receiptUrl}
                    alt="Expense receipt"
                    className="w-full max-h-48 object-contain rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#080B18]"
                  />
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              {onEditExpense && (
                <button
                  type="button"
                  onClick={() => {
                    const target = expense;
                    onClose();
                    onEditExpense(target);
                  }}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="min-h-[42px] px-5 py-2 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
