import React, { useState, useEffect } from 'react';
import { Expense, MemberName, CategoryName, PaymentMode } from '../types';
import { CATEGORIES, PAYMENT_MODES, normalizeCategoryName } from '../data/categories';
import { db } from '../services/storage';
import { getLocalDateString } from '../utils/analytics';
import { X, Check, Lock, Save, Trash2, Plus, Minus } from 'lucide-react';

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  currentMember: MemberName;
  onExpenseUpdated: () => void;
  onDeleteExpense?: (id: string) => void;
}

const EditExpenseContent: React.FC<Omit<EditExpenseModalProps, 'isOpen'>> = ({
  onClose,
  expense,
  currentMember,
  onExpenseUpdated,
  onDeleteExpense
}) => {
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<CategoryName>('Food');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [date, setDate] = useState<string>('');
  const [itemName, setItemName] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [place, setPlace] = useState<string>('');
  const [error, setError] = useState<string>('');

  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);

  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString());
      setCategory(normalizeCategoryName(expense.category));
      setPaymentMode(expense.paymentMode);
      setDate(expense.date);
      setItemName(expense.itemName || '');
      setQuantity(expense.quantity || 1);
      setPlace(expense.place || '');
      setError('');
      setIsConfirmingDelete(false);
    }
  }, [expense]);

  if (!expense) return null;

  const handleDelete = () => {
    const targetId = String(expense.id);
    const res = db.deleteExpense(targetId, currentMember);
    if (res.success) {
      if (onDeleteExpense) onDeleteExpense(targetId);
      onExpenseUpdated();
      onClose();
    } else {
      setError(res.error || 'Failed to delete transaction.');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0 || isNaN(parseFloat(amount))) {
      setError('Please enter a valid amount.');
      return;
    }

    const res = db.updateExpense(
      expense.id,
      {
        amount: parseFloat(amount),
        category,
        paymentMode,
        date,
        itemName: itemName.trim() || undefined,
        quantity: quantity > 0 ? quantity : 1,
        place: place.trim() || undefined
      },
      currentMember
    );

    if (res.success) {
      onExpenseUpdated();
      onClose();
    } else {
      setError(res.error || 'Failed to update transaction.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-[#10162A] border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#F8FAFC]">Edit Transaction</h3>
            <p className="text-xs text-[#94A3B8]">Created by {expense.member} on {expense.date}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isConfirmingDelete ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 space-y-3">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs">
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>Are you sure you want to delete this expense?</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              This will permanently delete ₹{expense.amount} ({expense.itemName || expense.category}) recorded by {expense.member}.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30 cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            
            {/* Amount */}
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Amount (₹)</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-lg font-bold text-slate-400 select-none pointer-events-none">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-xl font-bold pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
              >
                {CATEGORIES.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Payment Mode */}
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Payment Mode</label>
              <div className="grid grid-cols-4 gap-2">
                {PAYMENT_MODES.map(m => (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => setPaymentMode(m.name)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      paymentMode === m.name
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Date & Item Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Date</label>
                <input
                  type="date"
                  max={getLocalDateString(new Date())}
                  value={date}
                  onChange={(e) => {
                    const val = e.target.value;
                    const maxVal = getLocalDateString(new Date());
                    setDate(val > maxVal ? maxVal : val);
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Quantity</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, (quantity || 1) - 1))}
                    disabled={quantity <= 1}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setQuantity(isNaN(val) ? 1 : Math.max(1, val));
                    }}
                    className="w-full text-center p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((quantity || 1) + 1)}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Item Name / Note</label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Place</label>
              <input
                type="text"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>

            {error && (
              <div className="text-xs text-rose-500 font-semibold p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl">
                {error}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="px-3 h-11 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                title="Delete transaction"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};

export const EditExpenseModal: React.FC<EditExpenseModalProps> = (props) => {
  if (!props.isOpen || !props.expense) return null;
  return <EditExpenseContent {...props} />;
};

