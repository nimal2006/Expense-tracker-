import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  Settings,
  X,
  CheckCheck,
  Clock,
  Volume2,
  VolumeX,
  Plus,
  BellRing,
  ShieldAlert,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { MemberName, NotificationLog, NotificationPreferences } from '../types';
import {
  BrowserNotificationPermission,
  playNotificationSound,
} from '../services/notification-service';
import { useMemberAvatars } from '../hooks/useMemberAvatars';
import { formatRelativeTime, formatTime12h } from '../utils/istTime';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'activity' | 'settings';
  currentMember: MemberName;
  logs: NotificationLog[];
  preferences: NotificationPreferences;
  permissionStatus: BrowserNotificationPermission;
  hasLoggedExpenseToday: boolean;
  onUpdatePreferences: (updates: Partial<Omit<NotificationPreferences, 'member' | 'updatedAt'>>) => void;
  onRequestPermission: () => Promise<void>;
  onMarkAllRead: () => void;
  onTapActivityLog: (log: NotificationLog) => void;
  onTapAddExpenseFromReminder: (log: NotificationLog) => void;
  onTapRemindMeLater: (log: NotificationLog) => void;
}

const REMINDER_PRESETS = ['19:00', '20:00', '21:00', '22:00'];

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  initialTab = 'activity',
  currentMember,
  logs,
  preferences,
  permissionStatus,
  hasLoggedExpenseToday,
  onUpdatePreferences,
  onRequestPermission,
  onMarkAllRead,
  onTapActivityLog,
  onTapAddExpenseFromReminder,
  onTapRemindMeLater,
}) => {
  const [activeTab, setActiveTab] = useState<'activity' | 'settings'>(initialTab);
  const [isRequestingPerm, setIsRequestingPerm] = useState(false);
  const { getMember } = useMemberAvatars();

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const unreadCount = logs.filter((l) => !l.read).length;

  const handleEnablePush = async () => {
    setIsRequestingPerm(true);
    try {
      await onRequestPermission();
    } finally {
      setIsRequestingPerm(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-black/55 backdrop-blur-xs">
          {/* Backdrop click-to-close */}
          <button
            type="button"
            aria-label="Close notifications drawer"
            onClick={onClose}
            className="flex-1 cursor-default"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md bg-white dark:bg-[#10162A] border-l border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-2xl"
          >
            {/* Drawer Header */}
            <div className="px-5 pt-5 pb-3 border-b border-slate-200/80 dark:border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C5CFC]/20 to-[#22D3EE]/20 border border-[#7C5CFC]/30 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-[#22D3EE]" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-[#F8FAFC] leading-tight">
                      Notifications
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
                      Preferences &amp; alerts for {currentMember}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close notifications"
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs: Activity | Settings */}
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#080B18]">
                <button
                  type="button"
                  onClick={() => setActiveTab('activity')}
                  className={`min-h-[38px] rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'activity'
                      ? 'bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white shadow-xs'
                      : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>Activity{unreadCount > 0 ? ` (${unreadCount})` : ''}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className={`min-h-[38px] rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'settings'
                      ? 'bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white shadow-xs'
                      : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {activeTab === 'activity' ? (
                <>
                  {/* Today's Reminder Status Strip */}
                  <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#080B18]/80 border border-slate-200/80 dark:border-slate-800/80 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="w-3.5 h-3.5 text-[#22D3EE] shrink-0" />
                      <span className="text-slate-600 dark:text-[#94A3B8] truncate">
                        {hasLoggedExpenseToday
                          ? 'Today logged — daily reminder paused'
                          : preferences.dailyReminderEnabled
                          ? `Daily reminder at ${formatTime12h(preferences.reminderTime)} IST`
                          : 'Daily reminder turned off'}
                      </span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={onMarkAllRead}
                        className="inline-flex items-center gap-1 text-[#7C5CFC] dark:text-[#22D3EE] font-semibold hover:underline cursor-pointer shrink-0"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Mark read</span>
                      </button>
                    )}
                  </div>

                  {/* Activity List */}
                  {logs.length === 0 ? (
                    <div className="py-14 text-center space-y-2">
                      <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-[#080B18] border border-slate-200 dark:border-slate-800 flex items-center justify-center mx-auto">
                        <Bell className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-800 dark:text-[#F8FAFC]">
                        No notifications yet
                      </p>
                      <p className="text-xs text-slate-500 dark:text-[#94A3B8] max-w-xs mx-auto">
                        New friend expenses and daily reminders for {currentMember} will appear here in real time.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {logs.map((log) => {
                        const isReminder = log.type === 'daily_reminder';
                        const actorObj = log.actorMember ? getMember(log.actorMember) : null;
                        const canSnooze =
                          isReminder &&
                          !hasLoggedExpenseToday &&
                          (log.attemptNumber || 1) < 2 &&
                          !log.snoozeUntil;

                        return (
                          <div
                            key={log.id}
                            className={`rounded-2xl border p-3.5 transition-colors ${
                              log.read
                                ? 'bg-slate-50/70 dark:bg-[#080B18]/50 border-slate-200/70 dark:border-slate-800/70'
                                : 'bg-white dark:bg-[#151D35]/90 border-[#7C5CFC]/40 dark:border-[#22D3EE]/35'
                            }`}
                          >
                            {isReminder ? (
                              <div className="space-y-2.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC]">
                                      {log.title}
                                    </p>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                                      {log.message}
                                    </p>
                                  </div>
                                  <span className="text-[10px] font-mono tabular-nums text-slate-400 shrink-0">
                                    {formatRelativeTime(log.createdAt)}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => onTapAddExpenseFromReminder(log)}
                                    className="min-h-[36px] px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add Expense</span>
                                  </button>

                                  {canSnooze && (
                                    <button
                                      type="button"
                                      onClick={() => onTapRemindMeLater(log)}
                                      className="min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer"
                                    >
                                      Remind Me Later (60m)
                                    </button>
                                  )}

                                  {log.snoozeUntil && !hasLoggedExpenseToday && (
                                    <span className="text-[11px] text-cyan-600 dark:text-[#22D3EE] font-medium">
                                      Snoozed for 60 min
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onTapActivityLog(log)}
                                className="w-full text-left flex items-start gap-3 cursor-pointer group"
                              >
                                <div
                                  className={`w-9 h-9 rounded-full ${
                                    actorObj?.avatarColor || 'bg-[#7C5CFC] text-white'
                                  } flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden`}
                                >
                                  {actorObj?.avatarUrl ? (
                                    <img
                                      src={actorObj.avatarUrl}
                                      alt={actorObj.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    actorObj?.avatarLetter || log.actorMember?.slice(0, 1) || 'F'
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC] truncate">
                                      {log.title}
                                    </span>
                                    <span className="text-[10px] font-mono tabular-nums text-slate-400 shrink-0">
                                      {formatRelativeTime(log.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5 leading-snug">
                                    {log.message}
                                  </p>
                                  <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-500 dark:text-[#94A3B8]">
                                    <span className="font-mono tabular-nums">
                                      {log.metadata?.transactionTime
                                        ? formatTime12h(log.metadata.transactionTime)
                                        : log.dateKey}
                                      {log.metadata?.itemName ? ` · ${log.metadata.itemName}` : ''}
                                    </span>
                                    <span className="inline-flex items-center gap-0.5 text-[#7C5CFC] dark:text-[#22D3EE] font-semibold group-hover:translate-x-0.5 transition-transform">
                                      <span>Details</span>
                                      <ChevronRight className="w-3 h-3" />
                                    </span>
                                  </div>
                                </div>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                /* Compact Notification Settings Tab */
                <div className="space-y-4">
                  {/* Android / Browser Permission Card */}
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080B18]/80 p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-[#F8FAFC]">
                          Device Push Permission
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
                          {permissionStatus === 'granted'
                            ? 'System notifications are active on this device.'
                            : permissionStatus === 'denied'
                            ? 'Permission was blocked in browser/Android settings.'
                            : permissionStatus === 'unsupported'
                            ? 'System notifications are not supported in this browser — in-app alerts remain active.'
                            : 'Allow system alerts for reminders and friend activity.'}
                        </p>
                      </div>
                      {permissionStatus === 'granted' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-[#34D399] shrink-0" />
                      ) : permissionStatus === 'denied' ? (
                        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
                      ) : (
                        <Bell className="w-5 h-5 text-[#22D3EE] shrink-0" />
                      )}
                    </div>

                    {permissionStatus === 'default' && (
                      <button
                        type="button"
                        disabled={isRequestingPerm}
                        onClick={handleEnablePush}
                        className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                      >
                        {isRequestingPerm ? 'Requesting Permission...' : 'Enable Notifications on This Device'}
                      </button>
                    )}

                    {permissionStatus === 'denied' && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-300 leading-relaxed">
                        To re-enable on Android Chrome: tap the lock/tune icon in the address bar → Permissions → Notifications → Allow. In-app alerts still work automatically.
                      </p>
                    )}
                  </div>

                  {/* Core Preference Toggles */}
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#080B18]/60 divide-y divide-slate-100 dark:divide-slate-800/80">
                    {/* 1. Daily Expense Reminder */}
                    <div className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">
                          Daily Expense Reminder
                        </p>
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                          Only notifies if {currentMember} hasn&apos;t added an expense today (max 2/day)
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={preferences.dailyReminderEnabled}
                        aria-label="Toggle Daily Expense Reminder"
                        onClick={() =>
                          onUpdatePreferences({
                            dailyReminderEnabled: !preferences.dailyReminderEnabled,
                          })
                        }
                        className={`w-12 h-7 rounded-full transition-colors p-1 shrink-0 cursor-pointer flex items-center ${
                          preferences.dailyReminderEnabled
                            ? 'bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE]'
                            : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                            preferences.dailyReminderEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* 2. Reminder Time (IST) */}
                    <div className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">
                            Reminder Time (IST)
                          </p>
                          <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                            Asia/Kolkata · Default 8:00 PM
                          </p>
                        </div>
                        <input
                          type="time"
                          disabled={!preferences.dailyReminderEnabled}
                          value={preferences.reminderTime}
                          onChange={(e) => {
                            if (e.target.value) {
                              onUpdatePreferences({ reminderTime: e.target.value });
                            }
                          }}
                          className="min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#10162A] border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums text-slate-900 dark:text-white disabled:opacity-40 focus:outline-none focus:border-[#22D3EE]"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {REMINDER_PRESETS.map((preset) => {
                          const isSelected = preferences.reminderTime === preset;
                          return (
                            <button
                              key={preset}
                              type="button"
                              disabled={!preferences.dailyReminderEnabled}
                              onClick={() => onUpdatePreferences({ reminderTime: preset })}
                              className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-colors cursor-pointer disabled:opacity-40 ${
                                isSelected
                                  ? 'bg-[#7C5CFC]/20 text-[#7C5CFC] dark:text-[#22D3EE] border border-[#7C5CFC]/40'
                                  : 'bg-slate-100 dark:bg-[#10162A] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              {formatTime12h(preset)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Friend Activity Notifications */}
                    <div className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">
                          Friend Activity Notifications
                        </p>
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                          Alert when another roommate adds a new expense
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={preferences.friendActivityEnabled}
                        aria-label="Toggle Friend Activity Notifications"
                        onClick={() =>
                          onUpdatePreferences({
                            friendActivityEnabled: !preferences.friendActivityEnabled,
                          })
                        }
                        className={`w-12 h-7 rounded-full transition-colors p-1 shrink-0 cursor-pointer flex items-center ${
                          preferences.friendActivityEnabled
                            ? 'bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE]'
                            : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                            preferences.friendActivityEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* 4. Notify on Edits (Opt-in, OFF by default) */}
                    <div className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC]">
                          Notify on Expense Edits
                        </p>
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                          Off by default — deletes never send alerts
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={preferences.notifyOnEdits}
                        aria-label="Toggle Notify on Expense Edits"
                        disabled={!preferences.friendActivityEnabled}
                        onClick={() =>
                          onUpdatePreferences({
                            notifyOnEdits: !preferences.notifyOnEdits,
                          })
                        }
                        className={`w-12 h-7 rounded-full transition-colors p-1 shrink-0 cursor-pointer flex items-center disabled:opacity-40 ${
                          preferences.notifyOnEdits && preferences.friendActivityEnabled
                            ? 'bg-[#7C5CFC]'
                            : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                            preferences.notifyOnEdits && preferences.friendActivityEnabled
                              ? 'translate-x-5'
                              : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* 5. Sound Toggle */}
                    <div className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] flex items-center gap-1.5">
                          {preferences.soundEnabled ? (
                            <Volume2 className="w-4 h-4 text-[#34D399]" />
                          ) : (
                            <VolumeX className="w-4 h-4 text-slate-400" />
                          )}
                          <span>Sound</span>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                          Subtle chime for incoming alerts
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {preferences.soundEnabled && (
                          <button
                            type="button"
                            onClick={() => playNotificationSound(true)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                          >
                            Test
                          </button>
                        )}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={preferences.soundEnabled}
                          aria-label="Toggle Notification Sound"
                          onClick={() =>
                            onUpdatePreferences({
                              soundEnabled: !preferences.soundEnabled,
                            })
                          }
                          className={`w-12 h-7 rounded-full transition-colors p-1 shrink-0 cursor-pointer flex items-center ${
                            preferences.soundEnabled
                              ? 'bg-emerald-500'
                              : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                              preferences.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Per-member persistence note */}
                  <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] px-1 leading-relaxed">
                    Settings are synced to Firebase independently for <strong className="text-slate-800 dark:text-slate-200">{currentMember}</strong>. Switching members loads their own preferences.
                  </p>
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
