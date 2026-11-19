import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ActiveTab,
  BusSchedule,
  Expense,
  ExpensePrefill,
  MemberName,
  NotificationLog,
  NotificationPreferences,
} from './types';
import { db } from './services/storage';
import { validateFirestoreConnection } from './services/firebase-service';
import { subscribeToBusSchedules } from './services/bus-service';
import {
  BrowserNotificationPermission,
  dispatchFriendExpenseNotifications,
  evaluateDailyExpenseReminder,
  getBrowserNotificationPermission,
  getDefaultPreferences,
  markAllNotificationsRead,
  markNotificationDeliveredLocally,
  markNotificationLogRead,
  playNotificationSound,
  registerMemberDeviceToken,
  requestNotificationPermission,
  saveNotificationPreferences,
  showSystemNotification,
  snoozeDailyReminderBy60Minutes,
  subscribeToMemberNotificationLogs,
  subscribeToNotificationPreferences,
  unregisterCurrentDeviceToken,
} from './services/notification-service';
import { getLocalDateString } from './utils/analytics';
import { getISTDateString } from './utils/istTime';
import { recordMemberAppOpen, seedHistoricalAppOpensIfMissing } from './utils/gamification';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { AddExpenseView } from './components/AddExpenseView';
import { DashboardView } from './components/DashboardView';
import { HistoryView } from './components/HistoryView';
import { ReportsView } from './components/ReportsView';
import { MembersView } from './components/MembersView';
import { BusScheduleView } from './components/BusScheduleView';
import { NotificationDrawer } from './components/NotificationDrawer';
import { ExpenseDetailModal } from './components/ExpenseDetailModal';
import { NotificationToast } from './components/NotificationToast';
import { LoginModal } from './components/LoginModal';
import { MemberAvatarModal } from './components/MemberAvatarModal';
import { EditExpenseModal } from './components/EditExpenseModal';
import { BudgetModal } from './components/BudgetModal';
import { PdfImporterModal } from './components/PdfImporterModal';
import { SyncStatusBanner } from './components/SyncStatusBanner';
import { UpdateBanner } from './components/UpdateBanner';
import { SplashScreen } from './components/SplashScreen';
import { AppLogo } from './components/AppLogo';
import { useMemberAvatars } from './hooks/useMemberAvatars';
import { auth } from './lib/firebase';

export const App: React.FC = () => {
  // Navigation & User state
  const [activeTab, setActiveTabState] = useState<ActiveTab>(() => {
    const saved = localStorage.getItem('friends_active_tab') as ActiveTab;
    if (saved && ['dashboard', 'add', 'history', 'members', 'reports', 'buses'].includes(saved)) {
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

  // New Feature States: Bus Schedules, Prefill Draft, Notifications & Settings
  const [busSchedules, setBusSchedules] = useState<BusSchedule[]>([]);
  const [expensePrefill, setExpensePrefill] = useState<ExpensePrefill | null>(null);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(() =>
    getDefaultPreferences(db.getCurrentUser())
  );
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState<boolean>(false);
  const [notificationDrawerTab, setNotificationDrawerTab] = useState<'activity' | 'settings'>('activity');
  const [isMyProfileModalOpen, setIsMyProfileModalOpen] = useState<boolean>(false);
  const { getMember: getMemberObj } = useMemberAvatars();
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [liveToast, setLiveToast] = useState<NotificationLog | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<BrowserNotificationPermission>(() =>
    getBrowserNotificationPermission()
  );

  const hydratedLogMemberRef = useRef<MemberName | null>(null);
  const knownLogIdsRef = useRef<Set<string>>(new Set());
  const latestPrefsRef = useRef<NotificationPreferences>(notificationPrefs);
  const latestExpensesRef = useRef<Expense[]>(expenses);
  const latestLogsRef = useRef<NotificationLog[]>(notificationLogs);

  useEffect(() => {
    latestPrefsRef.current = notificationPrefs;
  }, [notificationPrefs]);

  useEffect(() => {
    latestExpensesRef.current = expenses;
  }, [expenses]);

  useEffect(() => {
    latestLogsRef.current = notificationLogs;
  }, [notificationLogs]);

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

  // Subscribe to Shared Group Bus Schedules
  useEffect(() => {
    const unsubBuses = subscribeToBusSchedules((updated) => {
      setBusSchedules(updated);
    });
    return () => unsubBuses();
  }, []);

  // Subscribe to Per-Member Notification Preferences & Register FCM Token if permitted
  useEffect(() => {
    const unsubPrefs = subscribeToNotificationPreferences(currentMember, (prefs) => {
      setNotificationPrefs(prefs);
    });
    const perm = getBrowserNotificationPermission();
    setPermissionStatus(perm);
    if (perm === 'granted') {
      registerMemberDeviceToken(currentMember).catch(() => {});
    }
    return () => unsubPrefs();
  }, [currentMember]);

  // Subscribe to Real-Time Notification Logs for Current Member
  useEffect(() => {
    hydratedLogMemberRef.current = null;
    knownLogIdsRef.current = new Set();

    const unsubLogs = subscribeToMemberNotificationLogs(currentMember, (logs) => {
      setNotificationLogs(logs);

      if (hydratedLogMemberRef.current !== currentMember) {
        // First snapshot for this member: seed known IDs so old logs don't fire popups
        hydratedLogMemberRef.current = currentMember;
        knownLogIdsRef.current = new Set(logs.map((l) => l.id));
        return;
      }

      // Detect newly arrived unread friend activity notifications
      const prefs = latestPrefsRef.current;
      for (const log of logs) {
        if (knownLogIdsRef.current.has(log.id)) continue;
        knownLogIdsRef.current.add(log.id);

        if (
          log.type === 'friend_activity' &&
          !log.read &&
          log.actorMember !== currentMember &&
          prefs.friendActivityEnabled &&
          (!log.metadata?.isEdit || prefs.notifyOnEdits)
        ) {
          const isNewDelivery = markNotificationDeliveredLocally(log.id);
          if (isNewDelivery) {
            playNotificationSound(prefs.soundEnabled);
            setLiveToast(log);
            showSystemNotification({
              title: log.title,
              body: log.message,
              tag: log.id,
              silent: !prefs.soundEnabled,
              data: {
                type: 'friend_activity',
                expenseId: log.expenseId || '',
                logId: log.id,
              },
            }).catch(() => {});
          }
        }
      }
    });

    return () => unsubLogs();
  }, [currentMember]);

  // Check whether currentMember already logged an expense on today's IST calendar day
  const hasLoggedExpenseToday = React.useMemo(() => {
    const todayIST = getISTDateString();
    return expenses.some((e) => e.member === currentMember && e.date === todayIST);
  }, [expenses, currentMember]);

  // Stop active daily reminder toast immediately if member logs an expense today
  useEffect(() => {
    if (hasLoggedExpenseToday && liveToast?.type === 'daily_reminder') {
      setLiveToast(null);
    }
  }, [hasLoggedExpenseToday, liveToast]);

  // Smart Daily Expense Reminder Evaluator (Asia/Kolkata, checks on load, changes, and every 60s)
  useEffect(() => {
    let cancelled = false;

    const runCheck = async () => {
      if (cancelled) return;
      const triggered = await evaluateDailyExpenseReminder({
        member: currentMember,
        expenses: latestExpensesRef.current,
        preferences: latestPrefsRef.current,
        existingLogs: latestLogsRef.current,
      });
      if (!cancelled && triggered) {
        setLiveToast(triggered);
      }
    };

    const startupTimer = setTimeout(runCheck, 2500);
    const interval = setInterval(runCheck, 60_000);
    return () => {
      cancelled = true;
      clearTimeout(startupTimer);
      clearInterval(interval);
    };
  }, [currentMember, notificationPrefs.dailyReminderEnabled, notificationPrefs.reminderTime, hasLoggedExpenseToday]);

  // Deep-link handling from Service Worker notification clicks & URL query params
  useEffect(() => {
    const openExpenseById = (expenseId: string) => {
      const found = latestExpensesRef.current.find((e) => String(e.id) === String(expenseId));
      if (found) {
        setViewingExpense(found);
      } else {
        setActiveTab('history');
      }
    };

    const handleSnoozeById = (logId: string) => {
      const target = latestLogsRef.current.find((l) => l.id === logId) ||
        latestLogsRef.current.find((l) => l.type === 'daily_reminder' && l.dateKey === getISTDateString());
      if (target) {
        snoozeDailyReminderBy60Minutes(target, currentMember).catch(() => {});
        setLiveToast(null);
      }
    };

    // Handle initial URL params if launched from a background notification
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const urlExpenseId = params.get('expenseId');
    const urlLogId = params.get('logId');

    if (action === 'add-expense') {
      setActiveTab('add');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (action === 'remind-later' && urlLogId) {
      setTimeout(() => handleSnoozeById(urlLogId), 1000);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (urlExpenseId) {
      setTimeout(() => openExpenseById(urlExpenseId), 600);
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Listen to Service Worker postMessage events
    const onSwMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'FRIENDS_TRACKER_OPEN_ADD_EXPENSE') {
        setActiveTab('add');
      } else if (msg.type === 'FRIENDS_TRACKER_OPEN_EXPENSE' && msg.expenseId) {
        openExpenseById(msg.expenseId);
      } else if (msg.type === 'FRIENDS_TRACKER_REMIND_LATER' && msg.logId) {
        handleSnoozeById(msg.logId);
      }
    };

    const onCustomAdd = () => setActiveTab('add');
    const onCustomExpense = (e: Event) => {
      const detail = (e as CustomEvent<{ expenseId?: string }>).detail;
      if (detail?.expenseId) openExpenseById(detail.expenseId);
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', onSwMessage);
    }
    window.addEventListener('friends-tracker:open-add-expense', onCustomAdd);
    window.addEventListener('friends-tracker:open-expense', onCustomExpense);

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onSwMessage);
      }
      window.removeEventListener('friends-tracker:open-add-expense', onCustomAdd);
      window.removeEventListener('friends-tracker:open-expense', onCustomExpense);
    };
  }, [currentMember]);

  // Auto-dismiss live toast after 7 seconds for friend activity (keep reminders slightly longer)
  useEffect(() => {
    if (!liveToast) return;
    const ms = liveToast.type === 'daily_reminder' ? 12000 : 7000;
    const timer = setTimeout(() => setLiveToast(null), ms);
    return () => clearTimeout(timer);
  }, [liveToast]);

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

  // New Feature Handlers
  const unreadNotificationsCount = React.useMemo(
    () => notificationLogs.filter((l) => !l.read).length,
    [notificationLogs]
  );

  const handleToggleFavouriteBus = async (busId: string) => {
    const exists = notificationPrefs.favouriteBusIds.includes(busId);
    const nextFavs = exists
      ? notificationPrefs.favouriteBusIds.filter((id) => id !== busId)
      : [...notificationPrefs.favouriteBusIds, busId];
    const updated = await saveNotificationPreferences(currentMember, { favouriteBusIds: nextFavs });
    setNotificationPrefs(updated);
  };

  const handleAddTicketToExpenses = (prefill: ExpensePrefill) => {
    setExpensePrefill(prefill);
    setActiveTab('add');
  };

  const handleUpdateNotificationPrefs = async (
    updates: Partial<Omit<NotificationPreferences, 'member' | 'updatedAt'>>
  ) => {
    const updated = await saveNotificationPreferences(currentMember, updates);
    setNotificationPrefs(updated);
    if (!updated.dailyReminderEnabled && !updated.friendActivityEnabled) {
      unregisterCurrentDeviceToken().catch(() => {});
    } else if (getBrowserNotificationPermission() === 'granted') {
      registerMemberDeviceToken(currentMember).catch(() => {});
    }
  };

  const handleRequestPushPermission = async () => {
    const res = await requestNotificationPermission(currentMember);
    setPermissionStatus(res.permission);
  };

  const handleTapActivityLog = (log: NotificationLog) => {
    markNotificationLogRead(log.id, currentMember).catch(() => {});
    setIsNotificationDrawerOpen(false);
    setLiveToast(null);
    if (log.expenseId) {
      const target = expenses.find((e) => String(e.id) === String(log.expenseId));
      if (target) {
        setViewingExpense(target);
        return;
      }
    }
    setActiveTab('history');
  };

  const handleTapAddExpenseFromReminder = (log: NotificationLog) => {
    markNotificationLogRead(log.id, currentMember).catch(() => {});
    setIsNotificationDrawerOpen(false);
    setLiveToast(null);
    setActiveTab('add');
  };

  const handleTapRemindMeLater = async (log: NotificationLog) => {
    await snoozeDailyReminderBy60Minutes(log, currentMember);
    setLiveToast(null);
  };

  const handleExpenseCreated = (expense: Expense) => {
    dispatchFriendExpenseNotifications(expense, 'create').catch(() => {});
    if (expense.date === getISTDateString() && liveToast?.type === 'daily_reminder') {
      setLiveToast(null);
    }
  };

  const handleOpenNotificationsTab = (tab: 'activity' | 'settings') => {
    setNotificationDrawerTab(tab);
    setIsNotificationDrawerOpen(true);
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('friends_expense_current_user_v2');
      if (auth.currentUser) {
        await auth.signOut();
      }
    } catch {
      // ignore auth signOut errors when operating in local profile mode
    }
    setIsInitialSetup(true);
    setIsLoginModalOpen(true);
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
          onOpenNotifications={() => handleOpenNotificationsTab('activity')}
          unreadCount={unreadNotificationsCount}
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
          onOpenMyProfile={() => setIsMyProfileModalOpen(true)}
          onOpenAccountSettings={() => setIsLoginModalOpen(true)}
          onOpenNotificationSettings={() => handleOpenNotificationsTab('settings')}
          onLogout={handleLogout}
          onOpenBuses={() => setActiveTab('buses')}
          isBusesActive={activeTab === 'buses'}
          onOpenNotifications={() => handleOpenNotificationsTab('activity')}
          unreadCount={unreadNotificationsCount}
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

        {/* Non-blocking PWA/Build Update Banner */}
        <UpdateBanner />

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
                onExpenseCreated={handleExpenseCreated}
                onNavigateToHistory={() => setActiveTab('history')}
                prefillDraft={expensePrefill}
                onClearPrefill={() => setExpensePrefill(null)}
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

            {/* 6. Smart Bus Schedule & Fare Tracker View */}
            {activeTab === 'buses' && (
              <BusScheduleView
                buses={busSchedules}
                currentMember={currentMember}
                favouriteBusIds={notificationPrefs.favouriteBusIds}
                onToggleFavouriteBus={handleToggleFavouriteBus}
                onAddTicketToExpenses={handleAddTicketToExpenses}
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

      {/* My Profile / Avatar Modal (Opened from Header Profile Menu) */}
      <MemberAvatarModal
        isOpen={isMyProfileModalOpen}
        onClose={() => setIsMyProfileModalOpen(false)}
        member={getMemberObj(currentMember)}
        currentMember={currentMember}
      />

      {/* Notifications Drawer (Activity Feed + Compact Per-Member Settings) */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        initialTab={notificationDrawerTab}
        currentMember={currentMember}
        logs={notificationLogs}
        preferences={notificationPrefs}
        permissionStatus={permissionStatus}
        hasLoggedExpenseToday={hasLoggedExpenseToday}
        onUpdatePreferences={handleUpdateNotificationPrefs}
        onRequestPermission={handleRequestPushPermission}
        onMarkAllRead={() => markAllNotificationsRead(notificationLogs, currentMember)}
        onTapActivityLog={handleTapActivityLog}
        onTapAddExpenseFromReminder={handleTapAddExpenseFromReminder}
        onTapRemindMeLater={handleTapRemindMeLater}
      />

      {/* Expense Quick-Detail Modal (Opened from Friend Activity Notifications) */}
      <ExpenseDetailModal
        expense={viewingExpense}
        onClose={() => setViewingExpense(null)}
        onEditExpense={handleOpenEditModal}
      />

      {/* Real-Time Floating Notification Toast */}
      <NotificationToast
        toast={liveToast}
        onDismiss={() => setLiveToast(null)}
        onTapActivity={handleTapActivityLog}
        onTapAddExpense={handleTapAddExpenseFromReminder}
        onTapRemindLater={handleTapRemindMeLater}
      />

    </div>
  );
};

export default App;
