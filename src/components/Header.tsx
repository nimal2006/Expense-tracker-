import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Expense, MemberName } from '../types';
import { MEMBERS } from '../data/categories';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useMemberAvatars } from '../hooks/useMemberAvatars';
import { PWAInstallButton } from './PWAInstallButton';
import { AppLogo } from './AppLogo';
import { CalendarPopover } from './CalendarPopover';
import { CloudStatus } from './CloudStatus';
import { 
  Moon, 
  Sun, 
  ChevronDown, 
  Plus, 
  Calendar
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
  expenses?: Expense[];
  selectedDate?: string | null;
  onSelectDate?: (date: string | null) => void;
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
  expenses = [],
  selectedDate = null,
  onSelectDate
}) => {
  const { getMember } = useMemberAvatars();
  const currentMemberObj = getMember(currentMember);
  const { isOnline } = useOnlineStatus();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Compute label for calendar button
  const currentMonthObj = availableMonths.find(m => m.value === selectedMonth);
  let displayLabel = selectedMonth === 'all' ? 'All-Time' : currentMonthObj ? currentMonthObj.label : selectedMonth;
  if (selectedDate) {
    displayLabel = selectedDate;
  }

  return (
    <header className="sticky top-0 z-50 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 px-4 bg-white/85 dark:bg-[#080B18]/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/60 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 min-h-[38px]">
        
        {/* Left Side: Official Friends Tr$cker Brand Mark & Title */}
        <div className="flex items-center gap-2.5 shrink-0 min-w-0">
          <div className="flex items-center gap-2 select-none group">
            <AppLogo
              size={34}
              className="transition-transform group-hover:scale-105 rounded-xl shadow-xs shrink-0"
              alt="Friends Tr$cker Logo"
            />
            <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white flex items-center leading-none">
              <span className="hidden xs:inline sm:inline mr-1 text-slate-900 dark:text-white font-bold">Friends</span>
              <span>Tr</span>
              <span className="text-emerald-500 dark:text-emerald-400 font-extrabold">$</span>
              <span>cker</span>
            </span>
          </div>
          <CloudStatus />
        </div>

        {/* Right Controls Container */}
        <div className="flex items-center gap-2 shrink-0 relative">
          
          {/* PWA Install Button */}
          <PWAInstallButton variant="compact" className="h-9" />

          {/* Month/Date Selector Capsule */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsCalendarOpen(prev => !prev);
            }}
            className="flex items-center justify-between h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium shadow-xs hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors cursor-pointer min-w-[125px] sm:min-w-[155px]"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span className="truncate">{displayLabel || "Select Range"}</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0 ml-1 transition-transform duration-200 ${isCalendarOpen ? 'rotate-180' : ''}`} />
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

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-colors shrink-0 cursor-pointer"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600 shrink-0" />
            )}
          </button>

          {/* Quick Add Expense CTA */}
          <button
            type="button"
            onClick={onOpenAddModal}
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] text-white text-xs font-bold shadow-xs hover:opacity-95 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>

          {/* Active Profile Avatar Button */}
          <button
            type="button"
            onClick={onOpenLoginModal}
            className="h-9 px-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
            title={`Switch active user (Currently ${currentMember})`}
          >
            <div className={`w-6 h-6 rounded-full ${currentMemberObj.avatarColor} flex items-center justify-center font-bold text-[11px] text-white shadow-xs shrink-0 overflow-hidden`}>
              {currentMemberObj.avatarUrl ? (
                <img src={currentMemberObj.avatarUrl} alt={currentMemberObj.name} className="w-full h-full object-cover rounded-full" />
              ) : (
                currentMemberObj.avatarLetter
              )}
            </div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 hidden xs:inline max-w-[64px] truncate">
              {currentMember}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-500 dark:text-slate-400 hidden xs:inline shrink-0" />
          </button>

        </div>

      </div>
    </header>
  );
};

