import React from 'react';
import { motion } from 'motion/react';
import { MemberName } from '../types';
import { MEMBERS } from '../data/categories';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { PWAInstallButton } from './PWAInstallButton';
import { 
  Wallet, 
  Moon, 
  Sun, 
  ChevronDown, 
  Plus, 
  Calendar,
  WifiOff
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
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  selectedMonth,
  onSelectMonth,
  availableMonths,
  currentMember,
  onSelectMember,
  isDarkMode,
  onToggleDarkMode,
  onOpenAddModal,
  onOpenLoginModal,
  unreadCount = 0
}) => {
  const currentMemberObj = MEMBERS.find(m => m.name === currentMember) || MEMBERS[0];
  const { isOnline } = useOnlineStatus();

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
          
          {/* Logo / Mobile branding */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20 shrink-0">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xs xs:text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">
                  Friends <span className="hidden xs:inline">Expense </span>Tracker
                </h1>
                {!isOnline && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/30">
                    <WifiOff className="w-2.5 h-2.5 animate-pulse" />
                    <span>Offline</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden lg:block -mt-0.5 truncate">
                Continuous shared tracker for Nimal, Etti, Dharan, Sanjai & Santhosh
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            
            {/* PWA Install Button (if installable or on iOS) */}
            <PWAInstallButton variant="compact" />

            {/* Month Filter Selector */}
            <div className="relative">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 gap-1 sm:gap-2 hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-colors cursor-pointer">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                <select
                  value={selectedMonth}
                  onChange={(e) => onSelectMonth(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer pr-0.5 max-w-[82px] xs:max-w-[120px] sm:max-w-none truncate"
                >
                  <option value="all" className="dark:bg-slate-800">All-Time</option>
                  {availableMonths.map((m) => (
                    <option key={m.value} value={m.value} className="dark:bg-slate-800">
                      {m.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 pointer-events-none shrink-0" />
              </div>
            </div>

            {/* Theme Mode Toggle */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={onToggleDarkMode}
              aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="w-8 h-8 sm:w-auto sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-200 hidden lg:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700 hidden lg:inline">Dark</span>
                </>
              )}
            </motion.button>

            {/* Quick Add Expense CTA (Desktop / Tablet) */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.03 }}
              onClick={onOpenAddModal}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </motion.button>

            {/* Active User Switcher / Profile Badge */}
            <div className="relative group">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onOpenLoginModal}
                className="flex items-center gap-1.5 p-1 sm:pl-2 sm:pr-2.5 sm:py-1 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors shrink-0 cursor-pointer"
                title={`Switch active user (Currently ${currentMember})`}
              >
                <div className={`w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-lg ${currentMemberObj.avatarColor} flex items-center justify-center text-[11px] sm:text-xs font-bold shadow-sm shrink-0`}>
                  {currentMemberObj.avatarLetter}
                </div>
                <div className="text-left hidden xs:block">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {currentMember}
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 hidden xs:block" />
              </motion.button>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
