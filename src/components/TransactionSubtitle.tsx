import React from 'react';
import { Expense } from '../types';
import { formatRelativeDate } from '../utils/analytics';

export function getPaymentModeTextClass(paymentMode?: string): string {
  const modeUpper = (paymentMode || '').toUpperCase();
  if (modeUpper === 'UPI') {
    return 'text-cyan-600 dark:text-cyan-400 font-bold';
  } else if (modeUpper === 'CASH') {
    return 'text-emerald-600 dark:text-emerald-400 font-bold';
  } else if (modeUpper === 'CARD') {
    return 'text-indigo-600 dark:text-indigo-400 font-bold';
  } else {
    return 'text-slate-600 dark:text-slate-300 font-bold';
  }
}

export function getPaymentBadgeClass(paymentMode?: string): string {
  return getPaymentModeTextClass(paymentMode);
}

export const TransactionSubtitle: React.FC<{ expense: Expense }> = ({ expense }) => {
  const mode = (expense.paymentMode || 'Cash').toUpperCase();
  const modeClass = getPaymentModeTextClass(mode);

  const rawDate = expense.date || (expense.createdAt ? expense.createdAt.substring(0, 10) : '');
  const datePart = formatRelativeDate(rawDate);

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 min-w-0 font-medium whitespace-nowrap overflow-hidden leading-tight">
      <span className={`${modeClass} shrink-0`}>{mode}</span>
      <span className="text-slate-300 dark:text-slate-600 shrink-0">•</span>
      <span className="shrink-0">{datePart}</span>
    </div>
  );
};
