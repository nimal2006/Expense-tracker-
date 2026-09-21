import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useDatabaseStatus } from '../hooks/useDatabaseStatus';
import { CloudOff, Loader2, Check } from 'lucide-react';

interface CloudStatusProps {
  className?: string;
  showText?: boolean;
}

export const CloudStatus: React.FC<CloudStatusProps> = ({ className = '', showText = false }) => {
  const { isOnline } = useOnlineStatus();
  const { 
    state, 
    hasPendingWrites, 
    isFromCache, 
    isQuotaExceeded, 
    isOffline, 
    pendingCount 
  } = useDatabaseStatus();

  // Distinguish tri-state: Green ('synced'), Amber ('saving'), Red ('offline')
  let statusMode: 'synced' | 'saving' | 'offline';
  let title = '';

  if (!isOnline || isOffline || isQuotaExceeded || state === 'offline' || state === 'error') {
    statusMode = 'offline';
    if (!isOnline) {
      title = 'Offline / Error: Device is offline. Changes queued in local storage.';
    } else if (isQuotaExceeded) {
      title = 'Offline / Error: Cloud Firestore quota exceeded. Operating locally.';
    } else {
      title = 'Offline / Error: Network failure reaching Cloud Firestore. Operating in local mode.';
    }
  } else if (hasPendingWrites || isFromCache || pendingCount > 0 || state === 'saving') {
    statusMode = 'saving';
    title = pendingCount > 0
      ? `Saving / Local: ${pendingCount} change${pendingCount > 1 ? 's' : ''} pending sync to cloud.`
      : 'Saving / Local: Local changes pending upload to cloud...';
  } else {
    statusMode = 'synced';
    title = 'Synced: All writes committed to cloud.';
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 transition-all select-none ${className}`}
      title={title}
    >
      {statusMode === 'synced' && (
        <span className="relative flex h-2.5 w-2.5 items-center justify-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        </span>
      )}

      {statusMode === 'saving' && (
        <span className="relative flex h-2.5 w-2.5 items-center justify-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
        </span>
      )}

      {statusMode === 'offline' && (
        <span className="relative flex h-2.5 w-2.5 items-center justify-center">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
        </span>
      )}

      {showText && (
        <span className="text-[11px] font-semibold">
          {statusMode === 'synced' && (
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3" /> Synced
            </span>
          )}
          {statusMode === 'saving' && (
            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving / Local
            </span>
          )}
          {statusMode === 'offline' && (
            <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <CloudOff className="w-3 h-3" /> Offline / Error
            </span>
          )}
        </span>
      )}
    </div>
  );
};
