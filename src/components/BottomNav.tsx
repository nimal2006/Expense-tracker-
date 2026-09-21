import React from 'react';
import { motion } from 'motion/react';
import { ActiveTab } from '../types';
import { LayoutDashboard, Plus, Receipt, FileText, Users } from 'lucide-react';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'history' as ActiveTab, label: 'Expenses', icon: Receipt },
    { id: 'add' as ActiveTab, label: 'Add', icon: Plus, isPrimary: true },
    { id: 'members' as ActiveTab, label: 'Members', icon: Users },
    { id: 'reports' as ActiveTab, label: 'Reports', icon: FileText }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#10162A]/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_32px_rgba(0,0,0,0.5)] transition-colors">
      <div className="flex items-center justify-around h-15 px-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.isPrimary) {
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.06 }}
                onClick={() => onSelectTab(item.id)}
                className="flex flex-col items-center justify-center -mt-4 relative group transition-transform duration-200 cursor-pointer"
                aria-label="Add new expense"
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all bg-gradient-to-tr from-[#7C5CFC] to-[#22D3EE] text-white ring-4 ring-slate-50 dark:ring-[#080B18] ${
                    isActive
                      ? 'animate-logo-glow ring-[#7C5CFC]/40 shadow-[0_0_24px_rgba(34,211,238,0.6)]'
                      : 'animate-breathing-glow shadow-[0_4px_16px_rgba(124,92,252,0.4)] hover:shadow-[0_0_24px_rgba(34,211,238,0.55)]'
                  }`}
                >
                  <Plus className="w-6 h-6 stroke-[2.5] transition-transform duration-200 group-hover:rotate-90" />
                </div>
                <span className={`text-[10px] font-bold mt-0.5 tracking-tight ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  Add
                </span>
              </motion.button>
            );
          }

          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.94 }}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all duration-200 relative cursor-pointer ${
                isActive
                  ? 'text-cyan-600 dark:text-cyan-400 font-bold -translate-y-0.5'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative flex flex-col items-center">
                <Icon
                  className={`w-5 h-5 transition-all duration-200 ${
                    isActive
                      ? 'stroke-[2.3] scale-110 text-cyan-600 dark:text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]'
                      : 'stroke-[1.8] group-hover:scale-105'
                  }`}
                />
                {isActive && (
                  <motion.span
                    layoutId="activeNavIndicator"
                    className="absolute -bottom-1.5 w-4 h-0.5 rounded-full bg-gradient-to-r from-[#7C5CFC] to-[#22D3EE] shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </div>
              <span className={`text-[10px] leading-none mt-1.5 tracking-tight transition-colors ${
                isActive ? 'text-slate-900 dark:text-slate-100 font-bold' : 'font-medium'
              }`}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

