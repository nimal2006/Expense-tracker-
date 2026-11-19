import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense, MemberName } from '../types';
import { useMemberAvatars } from '../hooks/useMemberAvatars';
import { auth } from '../lib/firebase';
import { PWAInstallButton } from './PWAInstallButton';
import { AppLogo } from './AppLogo';
import { CalendarPopover } from './CalendarPopover';
import { CloudStatus } from './CloudStatus';
import {
  Moon,
  Sun,
  ChevronDown,
  Plus,
  Calendar,
  Bus,
  Bell,
  User,
  Settings,
  BellRing,
  LogOut,
} from 'lucide-react';

interface HeaderProps {
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  availableMonths: { value: string; label: string }[];
  currentMember: MemberName;
  onSelectMember: (member: MemberName) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAddModal: () => void;
  onOpenLoginModal: () => void;
  onOpenMyProfile?: () => void;
  onOpenAccountSettings?: () => void;
  onOpenNotificationSettings?: () => void;
  onLogout?: () => void;
  onOpenBuses?: () => void;
  isBusesActive?: boolean;
  onOpenNotifications?: () => void;
  unreadCount?: number;
  expenses?: Expense[];
  selectedDate?: string | null;
  onSelectDate?: (date: string | null) => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedMonth,
  onSelectMonth,
  availableMonths,
  currentMember,
  isDarkMode,
  onToggleDarkMode,
  onOpenAddModal,
  onOpenLoginModal,
  onOpenMyProfile,
  onOpenAccountSettings,
  onOpenNotificationSettings,
  onLogout,
  onOpenBuses,
  isBusesActive = false,
  onOpenNotifications,
  unreadCount = 0,
  expenses = [],
  selectedDate = null,
  onSelectDate,
}) => {
  const { getMember } = useMemberAvatars();
  const currentMemberObj = getMember(currentMember);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  // Firebase profile photo: prefer member's Firestore avatar, fallback to Firebase Auth photoURL
  const profilePhotoUrl = !avatarLoadError
    ? currentMemberObj.avatarUrl || auth.currentUser?.photoURL || undefined
    : undefined;

  // Reset image load error whenever photo source or member changes
  useEffect(() => {
    setAvatarLoadError(false);
  }, [currentMember, currentMemberObj.avatarUrl]);

  // Close profile menu on outside click or Escape
  useEffect(() => {
    if (!isProfileMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  // Compute label for calendar button
  const currentMonthObj = availableMonths.find((m) => m.value === selectedMonth);
  let displayLabel =
    selectedMonth === 'all' ? 'All-Time' : currentMonthObj ? currentMonthObj.label : selectedMonth;
  if (selectedDate) {
    displayLabel = selectedDate;
  }

  // Compact month label on narrow mobile screens (e.g., "Sep 26" instead of "Sep 2026")
  const compactMobileLabel = displayLabel
    ? displayLabel.replace(/\b20(\d{2})\b/, "'$1")
    : 'Range';

  return (
    <header className="sticky top-0 z-50 pt-[max(0.65rem,env(safe-area-inset-top))] pb-2.5 sm:pb-3 px-2.5 sm:px-4 bg-white/85 dark:bg-[#080B18]/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/60 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-3 min-h-[38px]">
        {/* Left Side: Official Friends Tr$cker Brand Mark & Title */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink">
          <div className="flex items-center gap-1.5 sm:gap-2 select-none group min-w-0">
            <AppLogo
              size={30}
              className="sm:w-[34px] sm:h-[34px] transition-transform group-hover:scale-105 rounded-xl shadow-xs shrink-0"
              alt="Friends Tr$cker Logo"
            />
            <span className="font-bold text-[13px] sm:text-lg tracking-tight text-slate-900 dark:text-white flex items-center leading-none whitespace-nowrap">
              <span className="hidden sm:inline mr-1 text-slate-900 dark:text-white font-bold">
                Friends
              </span>
              <span>Tr</span>
              <span className="text-emerald-500 dark:text-emerald-400 font-extrabold">$</span>
              <span>cker</span>
            </span>
          </div>
          <CloudStatus className="shrink-0" />
        </div>

        {/* Right Controls Container — Strictly Sized for 360px–430px Mobile & Desktop */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 relative">
          {/* PWA Install Button (hidden on narrow mobile to keep top bar uncluttered) */}
          <PWAInstallButton variant="compact" className="hidden sm:inline-flex h-9" />

          {/* Month/Date Selector Capsule */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsProfileMenuOpen(false);
              setIsCalendarOpen((prev) => !prev);
            }}
            className="flex items-center justify-between h-8 sm:h-9 px-2 sm:px-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 text-[11px] sm:text-sm font-medium shadow-xs hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors cursor-pointer max-w-[88px] sm:max-w-none sm:min-w-[148px] shrink-0"
          >
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span className="truncate sm:hidden">{compactMobileLabel}</span>
              <span className="truncate hidden sm:inline">{displayLabel || 'Select Range'}</span>
            </div>
            <ChevronDown
              className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500 dark:text-slate-400 shrink-0 ml-0.5 sm:ml-1 transition-transform duration-200 ${
                isCalendarOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Rich Interactive Calendar Popover */}
          <CalendarPopover
            isOpen={isCalendarOpen}
            onClose={() => setIsCalendarOpen(false)}
            selectedMonth={selectedMonth}
            onSelectMonth={onSelectMonth}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
            expenses={expenses}
            availableMonths={availableMonths}
          />

          {/* Bus Schedule Shortcut Button */}
          {onOpenBuses && (
            <button
              type="button"
              onClick={() => {
                setIsProfileMenuOpen(false);
                onOpenBuses();
              }}
              aria-label="Open Bus Schedule and Fare Tracker"
              title="Bus Schedule & Fare Tracker"
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border transition-colors shrink-0 cursor-pointer ${
                isBusesActive
                  ? 'bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] border-transparent text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 text-cyan-600 dark:text-[#22D3EE] hover:bg-slate-200/80 dark:hover:bg-slate-800'
              }`}
            >
              <Bus className="w-4 h-4 shrink-0" />
            </button>
          )}

          {/* Notification Bell Button with Unread Badge */}
          {onOpenNotifications && (
            <button
              type="button"
              onClick={() => {
                setIsProfileMenuOpen(false);
                onOpenNotifications();
              }}
              aria-label={`Open notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              title="Notifications & Settings"
              className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            >
              <Bell className="w-4 h-4 shrink-0" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] px-1 rounded-full bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white text-[9px] sm:text-[10px] font-extrabold font-mono tabular-nums flex items-center justify-center ring-2 ring-white dark:ring-[#080B18]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors shrink-0 cursor-pointer"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600 shrink-0" />
            )}
          </button>

          {/* Quick Add Expense CTA (Desktop only) */}
          <button
            type="button"
            onClick={onOpenAddModal}
            className="hidden md:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white text-xs font-bold shadow-xs hover:opacity-95 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>

          {/* Restored Top-Right Circular Profile Avatar & Profile Menu */}
          <div ref={profileMenuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsCalendarOpen(false);
                setIsProfileMenuOpen((prev) => !prev);
              }}
              aria-label={`Open profile menu for ${currentMember}`}
              aria-haspopup="menu"
              aria-expanded={isProfileMenuOpen}
              title={`${currentMember} — Profile Menu`}
              className={`group relative w-9 h-9 rounded-full p-[2px] transition-all duration-200 cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22D3EE] active:scale-95 ${
                isProfileMenuOpen
                  ? 'bg-gradient-to-tr from-[#7C5CFC] via-[#22D3EE] to-[#34D399] shadow-[0_0_16px_rgba(34,211,238,0.5),0_0_24px_rgba(124,92,252,0.35)]'
                  : 'bg-gradient-to-tr from-[#7C5CFC]/70 to-[#22D3EE]/70 hover:from-[#7C5CFC] hover:to-[#22D3EE] hover:shadow-[0_0_14px_rgba(124,92,252,0.45),0_0_20px_rgba(34,211,238,0.35)]'
              }`}
            >
              <div
                className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center font-extrabold text-xs tracking-tight ring-2 ring-white dark:ring-[#080B18] ${
                  profilePhotoUrl
                    ? 'bg-[#10162A]'
                    : `${currentMemberObj.avatarColor} text-white`
                }`}
              >
                {profilePhotoUrl ? (
                  <img
                    src={profilePhotoUrl}
                    alt={`${currentMember} profile`}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarLoadError(true)}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="select-none leading-none">
                    {currentMemberObj.avatarLetter || currentMember.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </button>

            {/* Profile Menu Dropdown */}
            <AnimatePresence>
              {isProfileMenuOpen && (
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 mt-2.5 w-60 rounded-2xl bg-white/95 dark:bg-[#10162A]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-700/80 shadow-[0_16px_40px_rgba(0,0,0,0.2)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.65)] overflow-hidden z-[60]"
                >
                  {/* Profile Header Identity */}
                  <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-bold text-sm shrink-0 border border-[#7C5CFC]/40 ${
                        profilePhotoUrl ? 'bg-[#080B18]' : `${currentMemberObj.avatarColor} text-white`
                      }`}
                    >
                      {profilePhotoUrl ? (
                        <img
                          src={profilePhotoUrl}
                          alt={currentMember}
                          referrerPolicy="no-referrer"
                          onError={() => setAvatarLoadError(true)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        currentMemberObj.avatarLetter || currentMember.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-slate-900 dark:text-[#F8FAFC] truncate">
                        {currentMember}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] truncate">
                        {auth.currentUser?.email || 'Friends Tracker Member'}
                      </p>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="p-1.5 space-y-0.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (onOpenMyProfile) {
                          onOpenMyProfile();
                        } else {
                          onOpenLoginModal();
                        }
                      }}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl flex items-center gap-2.5 text-left text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#151D35] transition-colors cursor-pointer"
                    >
                      <User className="w-4 h-4 text-[#22D3EE] shrink-0" />
                      <span>My Profile</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (onOpenAccountSettings) {
                          onOpenAccountSettings();
                        } else {
                          onOpenLoginModal();
                        }
                      }}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl flex items-center gap-2.5 text-left text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#151D35] transition-colors cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-[#7C5CFC] shrink-0" />
                      <span>Account Settings</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (onOpenNotificationSettings) {
                          onOpenNotificationSettings();
                        } else if (onOpenNotifications) {
                          onOpenNotifications();
                        }
                      }}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl flex items-center justify-between gap-2.5 text-left text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#151D35] transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <BellRing className="w-4 h-4 text-[#34D399] shrink-0" />
                        <span>Notification Settings</span>
                      </span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-mono font-bold text-[#7C5CFC] dark:text-[#22D3EE]">
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    <div className="my-1 border-t border-slate-200/80 dark:border-slate-800/80" />

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (onLogout) {
                          onLogout();
                        } else {
                          onOpenLoginModal();
                        }
                      }}
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl flex items-center gap-2.5 text-left text-xs sm:text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      <span>Logout</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};
