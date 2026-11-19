import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Plus, Clock, ChevronRight } from 'lucide-react';
import { NotificationLog } from '../types';

interface NotificationToastProps {
  toast: NotificationLog | null;
  onDismiss: () => void;
  onTapActivity: (log: NotificationLog) => void;
  onTapAddExpense: (log: NotificationLog) => void;
  onTapRemindLater: (log: NotificationLog) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  toast,
  onDismiss,
  onTapActivity,
  onTapAddExpense,
  onTapRemindLater,
}) => {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="fixed top-16 right-3 left-3 sm:left-auto sm:right-5 sm:w-[360px] z-[75] bg-white/95 dark:bg-[#10162A]/95 backdrop-blur-xl border border-[#7C5CFC]/45 dark:border-[#22D3EE]/40 rounded-2xl p-3.5 shadow-2xl"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C5CFC]/20 to-[#22D3EE]/20 border border-[#7C5CFC]/30 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-[#22D3EE]" />
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-extrabold text-slate-900 dark:text-[#F8FAFC]">
                  {toast.title}
                </p>
                <button
                  type="button"
                  onClick={onDismiss}
                  aria-label="Dismiss notification"
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                {toast.message}
              </p>

              {toast.type === 'daily_reminder' ? (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onTapAddExpense(toast)}
                    className="min-h-[34px] px-3 py-1 rounded-lg bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Expense</span>
                  </button>
                  {(toast.attemptNumber || 1) < 2 && (
                    <button
                      type="button"
                      onClick={() => onTapRemindLater(toast)}
                      className="min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Clock className="w-3 h-3" />
                      <span>Later (60m)</span>
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onTapActivity(toast)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#7C5CFC] dark:text-[#22D3EE] hover:underline pt-0.5 cursor-pointer"
                >
                  <span>View Expense Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
