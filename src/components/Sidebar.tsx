import React from 'react';
import { ActiveTab, MemberName } from '../types';
import { MEMBERS } from '../data/categories';
import { PWAInstallButton } from './PWAInstallButton';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  LayoutDashboard,
  PlusCircle,
  Receipt,
  Users,
  FileText,
  PiggyBank,
  Tag,
  CreditCard,
  MapPin,
  Download,
  Settings,
  Moon,
  Sun,
  Wallet,
  WifiOff,
  Wifi
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  currentMember: MemberName;
  onSelectMember: (member: MemberName) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentMember,
  onSelectMember,
  isDarkMode,
  onToggleDarkMode
}) => {
  const { isOnline } = useOnlineStatus();
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'add', label: 'Add Expense', icon: PlusCircle, highlight: true },
    { id: 'history', label: 'My Expenses', icon: Receipt },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'budgets', label: 'Budgets', icon: PiggyBank },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'payment-methods', label: 'Payment Methods', icon: CreditCard, tabTarget: 'history' as ActiveTab },
    { id: 'places', label: 'Places', icon: MapPin, tabTarget: 'history' as ActiveTab },
    { id: 'export', label: 'Export', icon: Download, tabTarget: 'reports' as ActiveTab },
    { id: 'settings', label: 'Settings', icon: Settings, tabTarget: 'reports' as ActiveTab }
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 min-h-screen flex flex-col justify-between border-r border-slate-200 dark:border-slate-800 shrink-0 transition-colors duration-200">
      {/* Top Branding */}
      <div>
        <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Friends</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium -mt-0.5">Expense Tracker</p>
            </div>
          </div>

          {/* Network indicator pill */}
          <div className="flex items-center">
            {isOnline ? (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-500" title="Online: Synced">
                <Wifi className="w-3 h-3" />
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-500" title="Offline Mode Active">
                <WifiOff className="w-3 h-3 animate-pulse" />
              </span>
            )}
          </div>
        </div>

        {/* Main Nav Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const targetTab = item.tabTarget || (item.id as ActiveTab);
            const isActive = activeTab === targetTab;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(targetTab)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Members & Dark Mode */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
        {/* PWA Install Button inside sidebar */}
        <div className="px-1">
          <PWAInstallButton variant="full" className="w-full justify-center py-2" />
        </div>

        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-2">
            MEMBERS
          </span>
          <div className="space-y-1">
            {MEMBERS.map((member) => {
              const isCurrent = currentMember === member.name;
              return (
                <button
                  key={member.id}
                  onClick={() => onSelectMember(member.name)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition-all ${
                    isCurrent
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-full ${member.avatarColor} flex items-center justify-center text-xs font-bold`}>
                      {member.avatarLetter}
                    </div>
                    <span>{member.name}</span>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Theme Mode Switcher */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-2">
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-medium">
            {isDarkMode ? (
              <Moon className="w-4 h-4 text-indigo-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
            <span>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
          </div>
          <button
            onClick={onToggleDarkMode}
            role="switch"
            aria-checked={isDarkMode}
            aria-label="Toggle theme mode"
            className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
              isDarkMode ? 'bg-indigo-600' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                isDarkMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </aside>
  );
};
