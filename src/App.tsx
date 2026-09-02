import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ActiveTab, MemberName, Expense } from './types';
import { db } from './services/storage';
import { getLocalDateString } from './utils/analytics';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { AddExpenseView } from './components/AddExpenseView';
import { DashboardView } from './components/DashboardView';
import { HistoryView } from './components/HistoryView';
import { ReportsView } from './components/ReportsView';
import { MembersView } from './components/MembersView';
import { LoginModal } from './components/LoginModal';
import { EditExpenseModal } from './components/EditExpenseModal';
import { BudgetModal } from './components/BudgetModal';
import { OfflineIndicator } from './components/OfflineIndicator';

export const App: React.FC = () => {
  // Navigation & User state
  const [activeTab, setActiveTabState] = useState<ActiveTab>(() => {
    const saved = localStorage.getItem('friends_active_tab') as ActiveTab;
    if (saved && ['dashboard', 'add', 'history', 'members', 'reports'].includes(saved)) {
      return saved;
    }
    return 'dashboard';
  });

  const setActiveTab = (tab: ActiveTab) => {
    setActiveTabState(tab);
    if (tab !== 'budgets') {
      localStorage.setItem('friends_active_tab', tab);
    }
  };

  const [currentMember, setCurrentMember] = useState<MemberName>(db.getCurrentUser());
  const [isInitialSetup, setIsInitialSetup] = useState<boolean>(() => !db.hasSavedUser());
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('friends_dark_mode') === 'true';
  });

  // Month filtering state (Defaults to current calendar month, persists across refresh)
  const currentCalMonth = getLocalDateString().substring(0, 7);
  const [selectedMonth, setSelectedMonthState] = useState<string>(() => {
    const saved = localStorage.getItem('friends_selected_month');
    return saved || currentCalMonth;
  });

  const setSelectedMonth = (month: string) => {
    setSelectedMonthState(month);
    localStorage.setItem('friends_selected_month', month);
  };

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgetVersion, setBudgetVersion] = useState<number>(0);

  // Modals state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(() => !db.hasSavedUser());
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState<boolean>(false);

  // Cross-view filters
  const [initialCategoryFilter, setInitialCategoryFilter] = useState<string | undefined>(undefined);
  const [initialMemberFilter, setInitialMemberFilter] = useState<MemberName | undefined>(undefined);

  // Sync dark mode class with DOM
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('friends_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('friends_dark_mode', 'false');
    }
  }, [isDarkMode]);

  // Load expenses on mount and refresh
  const reloadData = () => {
    const all = db.getAllExpenses();
    setExpenses(all);
  };

  useEffect(() => {
    const unsubscribe = db.subscribe((updatedExpenses) => {
      setExpenses(updatedExpenses);
    });
    return () => unsubscribe();
  }, []);

  // Compute available months dynamically from expenses and current calendar date
  const availableMonths = React.useMemo(() => {
    const monthSet = new Set<string>();
    // Always include current calendar month dynamically from device clock
    const currentCalMonth = getLocalDateString().substring(0, 7);
    monthSet.add(currentCalMonth);
    monthSet.add('2026-08');
    monthSet.add('2026-09');

    expenses.forEach(e => {
      if (e.date && e.date.length >= 7) {
        monthSet.add(e.date.substring(0, 7));
      }
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return Array.from(monthSet).sort().reverse().map(m => {
      const [y, mNum] = m.split('-');
      const name = monthNames[parseInt(mNum, 10) - 1] || mNum;
      return {
        value: m,
        label: `${name} ${y}`
      };
    });
  }, [expenses]);

  const handleToggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const handleSelectMember = (member: MemberName) => {
    setCurrentMember(member);
    db.setCurrentUser(member);
  };

  const handleOpenEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setIsEditModalOpen(true);
  };

  const handleNavigateToMemberHistory = (member: MemberName) => {
    setInitialMemberFilter(member);
    setActiveTab('history');
  };

  const currentBudget = React.useMemo(() => {
    return db.getBudget(selectedMonth === 'all' ? '2026-08' : selectedMonth, currentMember);
  }, [selectedMonth, currentMember, budgetVersion]);

  const handleBudgetUpdated = () => {
    setBudgetVersion(prev => prev + 1);
    reloadData();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row antialiased font-sans transition-colors duration-200">
      
      {/* Desktop Sidebar (Left side, matching reference UI screenshot) */}
      <div className="hidden md:block">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            if (tab === 'budgets') {
              setIsBudgetModalOpen(true);
            } else {
              setActiveTab(tab);
            }
          }}
          currentMember={currentMember}
          onSelectMember={handleSelectMember}
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <Header
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
          availableMonths={availableMonths}
          currentMember={currentMember}
          onSelectMember={handleSelectMember}
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
          onOpenAddModal={() => setActiveTab('add')}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
        />

        {/* View Switcher Container */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 pb-20 md:pb-8 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* 1. Dashboard View */}
              {activeTab === 'dashboard' && (
                <DashboardView
                  expenses={expenses}
                  selectedMonth={selectedMonth}
                  currentMember={currentMember}
                  onOpenAddExpense={() => setActiveTab('add')}
                  onNavigateToHistory={() => setActiveTab('history')}
                  monthlyBudget={currentBudget}
                  onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
                />
              )}

              {/* 2. Add Expense View (Fast 3-tap daily entry) */}
              {activeTab === 'add' && (
                <AddExpenseView
                  currentMember={currentMember}
                  onExpenseAdded={reloadData}
                  onNavigateToHistory={() => setActiveTab('history')}
                />
              )}

              {/* 3. History / Transactions View */}
              {activeTab === 'history' && (
                <HistoryView
                  expenses={expenses}
                  currentMember={currentMember}
                  onRefreshData={reloadData}
                  onOpenEditModal={handleOpenEditModal}
                  initialCategoryFilter={initialCategoryFilter}
                  initialMemberFilter={initialMemberFilter}
                />
              )}

              {/* 4. Members View */}
              {activeTab === 'members' && (
                <MembersView
                  expenses={expenses}
                  selectedMonth={selectedMonth}
                  currentMember={currentMember}
                  onSelectMemberForHistory={handleNavigateToMemberHistory}
                />
              )}

              {/* 5. Reports & PDF Export View */}
              {activeTab === 'reports' && (
                <ReportsView
                  expenses={expenses}
                  selectedMonth={selectedMonth}
                  onSelectMonth={setSelectedMonth}
                  availableMonths={availableMonths}
                  onRefreshData={reloadData}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <BottomNav
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />

      </div>

      {/* Global Modals */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false);
          setIsInitialSetup(false);
        }}
        currentMember={currentMember}
        onSelectMember={(member) => {
          handleSelectMember(member);
          setIsInitialSetup(false);
        }}
        isInitialSetup={isInitialSetup}
      />

      <EditExpenseModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        expense={editingExpense}
        currentMember={currentMember}
        onExpenseUpdated={reloadData}
      />

      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        selectedMonth={selectedMonth}
        currentMember={currentMember}
        currentBudget={currentBudget}
        availableMonths={availableMonths}
        onBudgetUpdated={handleBudgetUpdated}
      />

      {/* Offline Connectivity Toast & Alerts */}
      <OfflineIndicator />

    </div>
  );
};

export default App;
