import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ActiveTab, MemberName, Expense } from './types';
import { db } from './services/storage';
import { validateFirestoreConnection } from './services/firebase-service';
import { getLocalDateString } from './utils/analytics';
import { recordMemberAppOpen, seedHistoricalAppOpensIfMissing } from './utils/gamification';
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
import { PdfImporterModal } from './components/PdfImporterModal';
import { SyncStatusBanner } from './components/SyncStatusBanner';
import { SplashScreen } from './components/SplashScreen';
import { AppLogo } from './components/AppLogo';

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
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    const savedLegacy = localStorage.getItem('friends_dark_mode');
    if (savedLegacy !== null) {
      return savedLegacy === 'true';
    }
    return true; // default to dark
  });

  // Month filtering state (Defaults to latest month with data or current calendar month)
  const currentCalMonth = getLocalDateString().substring(0, 7);
  const [selectedMonth, setSelectedMonthState] = useState<string>(() => {
    const saved = localStorage.getItem('friends_selected_month');
    if (saved) return saved;
    
    // If no saved preference, intelligently pick the best month to show
    const localExpenses = db.getAllExpenses();
    if (localExpenses.length === 0) return 'all';
    
    // Check if current month has records
    const hasCurrentMonthData = localExpenses.some(e => e.date.startsWith(currentCalMonth));
    if (hasCurrentMonthData) return currentCalMonth;
    
    // Otherwise, find the latest month that actually has transactions
    const sortedDates = [...localExpenses]
      .filter(e => e.date && e.date.length >= 7)
      .sort((a, b) => b.date.localeCompare(a.date));
    
    if (sortedDates.length > 0) {
      return sortedDates[0].date.substring(0, 7);
    }
    
    return 'all';
  });

  const setSelectedMonth = (month: string) => {
    setSelectedMonthState(month);
    localStorage.setItem('friends_selected_month', month);
  };

  // IMMEDIATELY load from local cache to prevent ₹0 flicker
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const all = db.getAllExpenses();
    if (all.length === 0) {
      // Emergency fallback: If DB is empty, try seeding historical data immediately
      db.seedAllMissingHistoricalData();
      return db.getAllExpenses();
    }
    return all;
  });
  const [budgetVersion, setBudgetVersion] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Modals state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(() => !db.hasSavedUser());
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState<boolean>(false);
  const [isPdfImporterOpen, setIsPdfImporterOpen] = useState<boolean>(false);

  // Cross-view filters
  const [initialCategoryFilter, setInitialCategoryFilter] = useState<string | undefined>(undefined);
  const [initialMemberFilter, setInitialMemberFilter] = useState<MemberName | undefined>(undefined);

  // Sync dark mode class with DOM and localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('friends_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      localStorage.setItem('friends_dark_mode', 'false');
    }
  }, [isDarkMode]);

  // Load expenses on mount and refresh
  const reloadData = () => {
    const all = db.getAllExpenses();
    setExpenses(all);
  };

  const handleDeleteExpense = (id: string) => {
    const targetId = String(id);
    db.deleteExpense(targetId, currentMember);
    setExpenses(prev => prev.filter(e => String(e.id) !== targetId));
  };

  // Initialize Shared Cloud Connection and Real-time Listeners
  useEffect(() => {
    // 1. Validate connection and seed data
    validateFirestoreConnection();
    db.seedAllMissingHistoricalData();
    reloadData();

    // 2. Setup unified real-time listener (receives both local optimistic writes and Firestore cloud changes)
    const unsubDb = db.subscribe((updatedExpenses) => {
      setExpenses(updatedExpenses);
      setBudgetVersion(prev => prev + 1);
      setIsLoading(false);
      seedHistoricalAppOpensIfMissing(updatedExpenses);
    });

    return () => {
      unsubDb();
    };
  }, []);

  // Record active member app open on load and member switch
  useEffect(() => {
    if (currentMember) {
      recordMemberAppOpen(currentMember);
    }
  }, [currentMember]);

  // Compute available months dynamically from expenses and current calendar date
  const availableMonths = React.useMemo(() => {
    const monthSet = new Set<string>();
    // Always include current calendar month dynamically from device clock
    const currentCalMonth = getLocalDateString().substring(0, 7);
    monthSet.add(currentCalMonth);

    expenses.forEach(e => {
      if (e.date && e.date.length >= 7) {
        monthSet.add(e.date.substring(0, 7));
      }
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months = Array.from(monthSet).sort().reverse().map(m => {
      const [y, mNum] = m.split('-');
      const name = monthNames[parseInt(mNum, 10) - 1] || mNum;
      return {
        value: m,
        label: `${name} ${y}`
      };
    });

    return [{ value: 'all', label: 'All Months' }, ...months];
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#080B18] text-slate-900 dark:text-[#F8FAFC] flex flex-col md:flex-row antialiased font-sans transition-colors duration-200">
      
      {/* 1. Official App Splash Screen with exact Friends Tr$cker branding */}
      {showSplash && (
        <SplashScreen
          onComplete={() => setShowSplash(false)}
          minDisplayDuration={1400}
        />
      )}

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
          expenses={expenses}
        />

        {/* Loading State Overlay */}
        {isLoading && expenses.length === 0 && (
          <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-[#10162A] border border-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 text-center">
              <AppLogo size={56} glow alt="Friends Tr$cker" />
              <div className="space-y-1">
                <p className="text-base font-bold text-white">Friends Tr<span className="text-emerald-400">$</span>cker</p>
                <p className="text-xs font-medium text-slate-400">Syncing Cloud Ledger...</p>
              </div>
            </div>
          </div>
        )}

        {/* Non-blocking top offline/quota banner */}
        <SyncStatusBanner />

        {/* View Switcher Container */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 pb-28 md:pb-12 mt-3 sm:mt-4 max-w-7xl w-full mx-auto">
          <div key={activeTab}>
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
                onOpenEditModal={handleOpenEditModal}
                onDeleteExpense={handleDeleteExpense}
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
                selectedMonth={selectedMonth}
                onSelectMonth={setSelectedMonth}
                availableMonths={availableMonths}
                onRefreshData={reloadData}
                onOpenEditModal={handleOpenEditModal}
                onDeleteExpense={handleDeleteExpense}
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
                onOpenEditModal={handleOpenEditModal}
                onRefreshData={reloadData}
                onDeleteExpense={handleDeleteExpense}
              />
            )}

            {/* 5. Reports & PDF Export View */}
            {activeTab === 'reports' && (
              <ReportsView
                expenses={expenses}
                selectedMonth={selectedMonth}
                onSelectMonth={setSelectedMonth}
                availableMonths={availableMonths}
                currentMember={currentMember}
                onRefreshData={reloadData}
                onOpenPdfImporter={() => setIsPdfImporterOpen(true)}
              />
            )}
          </div>
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
        onDeleteExpense={handleDeleteExpense}
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

      <PdfImporterModal
        isOpen={isPdfImporterOpen}
        onClose={() => setIsPdfImporterOpen(false)}
        currentMember={currentMember}
        onExpensesMerged={reloadData}
      />

    </div>
  );
};

export default App;
