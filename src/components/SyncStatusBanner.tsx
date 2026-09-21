import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CloudOff, AlertCircle, WifiOff, Database } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useDatabaseStatus } from '../hooks/useDatabaseStatus';

export const SyncStatusBanner: React.FC = () => {
  const { isOnline } = useOnlineStatus();
  const { isQuotaExceeded, isOffline } = useDatabaseStatus();

  const showBanner = !isOnline || isQuotaExceeded || isOffline;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className={`overflow-hidden border-b ${isQuotaExceeded ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}
        >
          <div className={`max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-2 text-[10px] sm:text-xs font-medium ${isQuotaExceeded ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {!isOnline ? (
              <>
                <WifiOff className="w-3 h-3" />
                <span>Device Offline: Changes saved locally.</span>
              </>
            ) : isQuotaExceeded ? (
              <>
                <CloudOff className="w-3 h-3" />
                <span>Cloud Sync Paused: Daily quota limit reached. Data is safe locally.</span>
              </>
            ) : (
              <>
                <Database className="w-3 h-3" />
                <span>Cloud Connection Issue: Operating in offline mode. Changes saved locally.</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
