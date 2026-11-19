import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { useAppUpdate } from '../hooks/useAppUpdate';

export const UpdateBanner: React.FC = () => {
  const { updateAvailable, isUpdating, applyUpdate, dismissUpdate } = useAppUpdate();

  return (
    <AnimatePresence>
      {updateAvailable && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          role="status"
          aria-live="polite"
          className="overflow-hidden border-b border-violet-500/25 bg-gradient-to-r from-[#131936] via-[#161D3F] to-[#0F2438] text-slate-100 shadow-lg shadow-violet-950/30"
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex-shrink-0 w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500/25 to-cyan-500/25 border border-violet-400/30 flex items-center justify-center text-cyan-300">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <p className="text-xs sm:text-sm font-semibold text-white truncate">
                New update available – Refresh
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={applyUpdate}
                disabled={isUpdating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] hover:brightness-110 active:scale-[0.98] transition-all shadow-md shadow-violet-500/25 disabled:opacity-70 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                <span>{isUpdating ? 'Updating...' : 'Refresh'}</span>
              </button>

              {!isUpdating && (
                <button
                  type="button"
                  onClick={dismissUpdate}
                  aria-label="Dismiss update notification"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
