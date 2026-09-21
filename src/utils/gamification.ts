import { Expense, MemberName } from '../types';
import { getLocalDateString } from './analytics';
import { MEMBERS } from '../data/categories';

export type BudgetStatus = 'SAFE' | 'WARNING' | 'EXCEEDED';

export interface DailyBudgetInfo {
  dailyLimit: number;
  todaySpent: number;
  remaining: number;
  overAmount: number;
  percentage: number;
  clampedPercentage: number;
  status: BudgetStatus;
  isCustomDaily: boolean;
}

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  xpReward: number;
  isUnlocked: boolean;
  progress: number;
  target: number;
  unlockedAt?: string;
}

export interface CosmeticReward {
  id: string;
  icon: string;
  name: string;
  requiredXp: number;
  type: 'frame' | 'badge' | 'theme' | 'glow';
  previewClass: string;
  isUnlocked: boolean;
}

export const STORAGE_KEY_EQUIPPED_REWARDS = 'friends_expense_equipped_rewards_v1';

export interface DailyActivityRecord {
  date: string;
  appOpened: boolean;
  totalSpent: number;
  dailyBudget: number;
  withinBudget: boolean;
  hasRecordedExpense: boolean;
  isNoSpendConfirmed: boolean;
  streakEligible: boolean;
}

export interface LeaderboardMemberStats {
  member: MemberName;
  rank: number;
  totalPersonalExpense: number;
  currentStreak: number;
  budgetSuccessDays: number;
  totalEvaluatedDays: number;
  successRate: number; // 0..100 %
  noSpendDays: number;
  isCurrentUser: boolean;
}

export interface GamificationProfile {
  totalXp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  levelProgressPct: number;
  currentStreak: number;
  longestStreak: number;
  lastSuccessfulDate?: string;
  isMissedToday: boolean;
  hasTrackedToday: boolean;
  hasNoSpendConfirmedToday: boolean;
  todayEligible: boolean;
  noSpendDays: number;
  achievements: Achievement[];
  dailyActivityHistory: DailyActivityRecord[];
}

const STORAGE_KEY_DAILY_BUDGETS = 'friends_expense_daily_budgets_v1';
const STORAGE_KEY_APP_OPEN_LOG = 'friends_expense_app_open_log_v2';
const STORAGE_KEY_SEEDED_INITIAL_LOGS = 'friends_expense_seeded_open_logs_v2';
const STORAGE_KEY_NO_SPEND_CONFIRMATIONS = 'friends_expense_no_spend_confirmations_v1';

/**
 * Record an explicit "I spent ₹0 today" confirmation for a member on a local calendar date.
 */
export function confirmMemberNoSpendToday(member: MemberName, customDateStr?: string): void {
  try {
    const targetDate = customDateStr || getLocalDateString(new Date());
    const raw = localStorage.getItem(STORAGE_KEY_NO_SPEND_CONFIRMATIONS);
    const log: Record<string, string[]> = raw ? JSON.parse(raw) : {};

    if (!log[member]) {
      log[member] = [];
    }

    if (!log[member].includes(targetDate)) {
      log[member].push(targetDate);
      localStorage.setItem(STORAGE_KEY_NO_SPEND_CONFIRMATIONS, JSON.stringify(log));
    }
  } catch (e) {
    console.warn('Error saving no-spend confirmation:', e);
  }
}

/**
 * Check if a member explicitly confirmed a no-spend day on a specific date
 */
export function didMemberConfirmNoSpendOnDate(member: MemberName | 'All', dateStr: string): boolean {
  if (member === 'All') return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NO_SPEND_CONFIRMATIONS);
    if (!raw) return false;
    const log: Record<string, string[]> = JSON.parse(raw);
    const dates = log[member] || [];
    return dates.includes(dateStr);
  } catch {
    return false;
  }
}

/**
 * Record that a member has opened/logged into the application today (Local Calendar Day).
 * Multiple opens on the same calendar day count as ONE activity day.
 */
export function recordMemberAppOpen(member: MemberName): void {
  try {
    const todayStr = getLocalDateString(new Date());
    const raw = localStorage.getItem(STORAGE_KEY_APP_OPEN_LOG);
    const log: Record<string, string[]> = raw ? JSON.parse(raw) : {};

    if (!log[member]) {
      log[member] = [];
    }

    if (!log[member].includes(todayStr)) {
      log[member].push(todayStr);
      // Keep up to 90 days of history
      if (log[member].length > 90) {
        log[member] = log[member].slice(-90);
      }
      localStorage.setItem(STORAGE_KEY_APP_OPEN_LOG, JSON.stringify(log));
    }
  } catch (e) {
    console.warn('Error recording member app open:', e);
  }
}

/**
 * Check if the member opened the app on a specific local date
 */
export function didMemberOpenAppOnDate(member: MemberName | 'All', dateStr: string): boolean {
  if (member === 'All') return true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_APP_OPEN_LOG);
    if (!raw) return false;
    const log: Record<string, string[]> = JSON.parse(raw);
    const dates = log[member] || [];
    return dates.includes(dateStr);
  } catch {
    return false;
  }
}

/**
 * Ensure historical transaction dates for initial datasets have corresponding app open records
 * so existing sample data behaves realistically without breaking user expectations on fresh load.
 */
export function seedHistoricalAppOpensIfMissing(expenses: Expense[]): void {
  try {
    const alreadySeeded = localStorage.getItem(STORAGE_KEY_SEEDED_INITIAL_LOGS);
    if (alreadySeeded === 'true') return;

    const raw = localStorage.getItem(STORAGE_KEY_APP_OPEN_LOG);
    const log: Record<string, string[]> = raw ? JSON.parse(raw) : {};

    expenses.forEach(e => {
      if (e.member && e.date) {
        if (!log[e.member]) log[e.member] = [];
        if (!log[e.member].includes(e.date)) {
          log[e.member].push(e.date);
        }
      }
    });

    localStorage.setItem(STORAGE_KEY_APP_OPEN_LOG, JSON.stringify(log));
    localStorage.setItem(STORAGE_KEY_SEEDED_INITIAL_LOGS, 'true');
  } catch (e) {
    console.warn('Error seeding historical app opens:', e);
  }
}

// Level thresholds
export const LEVEL_THRESHOLDS = [
  { level: 1, minXp: 0, maxXp: 100 },
  { level: 2, minXp: 100, maxXp: 250 },
  { level: 3, minXp: 250, maxXp: 400 },
  { level: 4, minXp: 400, maxXp: 600 },
  { level: 5, minXp: 600, maxXp: 850 },
  { level: 6, minXp: 850, maxXp: 1150 },
  { level: 7, minXp: 1150, maxXp: 1500 },
  { level: 8, minXp: 1500, maxXp: 2000 },
  { level: 9, minXp: 2000, maxXp: 3000 },
  { level: 10, minXp: 3000, maxXp: 5000 },
];

export const COSMETIC_REWARDS: CosmeticReward[] = [
  {
    id: 'neon_frame',
    icon: '✨',
    name: 'Neon Avatar Frame',
    requiredXp: 100,
    type: 'frame',
    previewClass: 'ring-3 ring-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.7)]',
    isUnlocked: false
  },
  {
    id: 'gold_badge',
    icon: '👑',
    name: 'Gold Badge',
    requiredXp: 300,
    type: 'badge',
    previewClass: 'ring-3 ring-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.7)]',
    isUnlocked: false
  },
  {
    id: 'elite_theme',
    icon: '🌌',
    name: 'Elite Profile Theme',
    requiredXp: 500,
    type: 'theme',
    previewClass: 'ring-3 ring-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.7)]',
    isUnlocked: false
  },
  {
    id: 'diamond_frame',
    icon: '💎',
    name: 'Premium Diamond Frame',
    requiredXp: 750,
    type: 'frame',
    previewClass: 'ring-4 ring-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.8)]',
    isUnlocked: false
  },
  {
    id: 'special_glow',
    icon: '⚡',
    name: 'Special Profile Glow',
    requiredXp: 1000,
    type: 'glow',
    previewClass: 'ring-4 ring-fuchsia-500 shadow-[0_0_22px_rgba(217,70,239,0.9)]',
    isUnlocked: false
  }
];

/**
 * Get configured daily budget or calculate from monthly budget
 */
export function getDailyBudgetSetting(
  month: string,
  member: MemberName | 'group',
  monthlyBudget: number
): { amount: number; isCustom: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DAILY_BUDGETS);
    if (raw) {
      const map = JSON.parse(raw);
      const key = `${month}_${member}`;
      if (typeof map[key] === 'number' && map[key] > 0) {
        return { amount: map[key], isCustom: true };
      }
    }
  } catch (e) {
    console.warn('Error reading daily budget setting:', e);
  }

  // Calculate default daily budget from monthly budget
  const [yearNum, monthNum] = (month === 'all' ? getLocalDateString().substring(0, 7) : month).split('-').map(Number);
  const daysInMonth = yearNum && monthNum ? new Date(yearNum, monthNum, 0).getDate() : 30;
  const calculated = Math.max(Math.round(monthlyBudget / daysInMonth), 1);
  return { amount: calculated, isCustom: false };
}

/**
 * Set and persist custom daily budget
 */
export function setDailyBudgetSetting(
  month: string,
  member: MemberName | 'group',
  dailyAmount: number
): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DAILY_BUDGETS);
    const map = raw ? JSON.parse(raw) : {};
    const key = `${month}_${member}`;
    map[key] = Math.max(dailyAmount, 1);
    localStorage.setItem(STORAGE_KEY_DAILY_BUDGETS, JSON.stringify(map));
  } catch (e) {
    console.warn('Error saving daily budget setting:', e);
  }
}

/**
 * Calculate today's exact budget status
 */
export function calculateDailyBudgetMetrics(
  todaySpent: number,
  dailyLimit: number,
  isCustomDaily: boolean = false
): DailyBudgetInfo {
  const limit = Math.max(dailyLimit, 1);
  const remaining = Math.max(limit - todaySpent, 0);
  const overAmount = Math.max(todaySpent - limit, 0);
  const percentage = Math.round((todaySpent / limit) * 100);
  const clampedPercentage = Math.min(percentage, 100);

  let status: BudgetStatus = 'SAFE';
  if (percentage > 100) {
    status = 'EXCEEDED';
  } else if (percentage >= 80) {
    status = 'WARNING';
  }

  return {
    dailyLimit: limit,
    todaySpent,
    remaining,
    overAmount,
    percentage,
    clampedPercentage,
    status,
    isCustomDaily
  };
}

/**
 * Calculate historical daily streaks, activity records, and budget performance
 * ONLY ONE STREAK:
 * A day counts toward the streak ONLY when:
 * 1. User opened the app on that day (appOpened === true)
 * 2. User has tracked spending <= dailyBudget OR explicitly confirmed "I spent ₹0 today"
 */
export function calculateBudgetStreakAndHistory(
  expenses: Expense[],
  member: MemberName | 'All',
  dailyLimit: number
): {
  currentStreak: number;
  longestStreak: number;
  lastSuccessfulDate?: string;
  isMissedToday: boolean;
  hasTrackedToday: boolean;
  hasNoSpendConfirmedToday: boolean;
  todayEligible: boolean;
  totalDaysUnderBudget: number;
  totalSavingsUnderBudget: number;
  noSpendDaysCount: number;
  dailyHistory: { date: string; spent: number; limit: number; status: BudgetStatus }[];
  dailyActivityHistory: DailyActivityRecord[];
} {
  const safeLimit = Math.max(dailyLimit, 1);
  const todayStr = getLocalDateString(new Date());
  const memberExpenses = member === 'All' ? expenses : expenses.filter(e => e.member === member);

  // Group by date
  const dateMap = new Map<string, number>();
  const dateCountMap = new Map<string, number>();
  memberExpenses.forEach(e => {
    const d = e.date || (e.createdAt ? e.createdAt.substring(0, 10) : todayStr);
    dateMap.set(d, (dateMap.get(d) || 0) + e.amount);
    dateCountMap.set(d, (dateCountMap.get(d) || 0) + 1);
  });

  // Today's dynamic status
  const todaySpent = dateMap.get(todayStr) || 0;
  const todayCount = dateCountMap.get(todayStr) || 0;
  const hasTrackedToday = todayCount > 0;
  const isExceededToday = todaySpent > safeLimit;
  const appOpenedToday = didMemberOpenAppOnDate(member, todayStr);
  const hasNoSpendConfirmedToday = didMemberConfirmNoSpendOnDate(member, todayStr);

  // Today is eligible if app opened AND (has tracked within budget OR explicitly confirmed no spend)
  const todayEligible = appOpenedToday && (hasTrackedToday || hasNoSpendConfirmedToday) && !isExceededToday;
  const isMissedToday = isExceededToday;

  // Build daily history for last 60 days
  const dailyHistory: { date: string; spent: number; limit: number; status: BudgetStatus }[] = [];
  const dailyActivityHistory: DailyActivityRecord[] = [];
  let totalDaysUnderBudget = 0;
  let totalSavingsUnderBudget = 0;
  let noSpendDaysCount = 0;

  const now = new Date();
  
  // Calculate records backwards for up to 60 days
  for (let i = 0; i < 60; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateString(d);
    const spent = dateMap.get(dateStr) || 0;
    const count = dateCountMap.get(dateStr) || 0;
    const opened = didMemberOpenAppOnDate(member, dateStr);
    const hasRecorded = count > 0;
    const noSpendConfirmed = didMemberConfirmNoSpendOnDate(member, dateStr);
    const withinBudget = spent <= safeLimit;
    
    // Condition 1 (App Opened) + Condition 2 (Recorded Expenses within budget OR Explicit ₹0 Confirmation)
    const streakEligible = opened && (hasRecorded || noSpendConfirmed) && withinBudget;

    let status: BudgetStatus = 'SAFE';
    if (spent > safeLimit) {
      status = 'EXCEEDED';
    } else if (spent >= safeLimit * 0.8) {
      status = 'WARNING';
    }

    if (noSpendConfirmed) {
      noSpendDaysCount++;
    }

    if (streakEligible) {
      totalDaysUnderBudget++;
      totalSavingsUnderBudget += Math.max(safeLimit - spent, 0);
    }

    const record: DailyActivityRecord = {
      date: dateStr,
      appOpened: opened,
      totalSpent: spent,
      dailyBudget: safeLimit,
      withinBudget,
      hasRecordedExpense: hasRecorded,
      isNoSpendConfirmed: noSpendConfirmed,
      streakEligible
    };

    dailyActivityHistory.push(record);

    if (i < 30) {
      dailyHistory.push({
        date: dateStr,
        spent,
        limit: safeLimit,
        status
      });
    }
  }

  // Calculate current active streak backwards from today
  let currentStreak = 0;
  let lastSuccessfulDate: string | undefined;

  // Day 0 is Today
  const todayRecord = dailyActivityHistory[0];
  if (todayRecord && todayRecord.streakEligible) {
    currentStreak++;
    lastSuccessfulDate = todayRecord.date;
  }

  // Check preceding consecutive days starting from yesterday (Day 1)
  for (let i = 1; i < dailyActivityHistory.length; i++) {
    const rec = dailyActivityHistory[i];
    if (rec.streakEligible) {
      currentStreak++;
      if (!lastSuccessfulDate) {
        lastSuccessfulDate = rec.date;
      }
    } else {
      // Missing day or budget exceeded breaks the active streak chain
      break;
    }
  }

  // Calculate longest historical streak across all recorded days in chronology
  let longestStreak = 0;
  let tempStreak = 0;
  const chronologicalHistory = [...dailyActivityHistory].reverse();

  chronologicalHistory.forEach(rec => {
    if (rec.streakEligible) {
      tempStreak++;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
    }
  });

  longestStreak = Math.max(longestStreak, currentStreak);

  return {
    currentStreak,
    longestStreak,
    lastSuccessfulDate,
    isMissedToday,
    hasTrackedToday,
    hasNoSpendConfirmedToday,
    todayEligible,
    totalDaysUnderBudget,
    totalSavingsUnderBudget,
    noSpendDaysCount,
    dailyHistory,
    dailyActivityHistory
  };
}

/**
 * Calculate full Gamification Profile (XP, Level, Achievements)
 * Unified single streak: currentStreak & longestStreak
 */
export function calculateGamificationProfile(
  expenses: Expense[],
  member: MemberName,
  dailyLimit: number
): GamificationProfile {
  const {
    currentStreak,
    longestStreak,
    lastSuccessfulDate,
    isMissedToday,
    hasTrackedToday,
    hasNoSpendConfirmedToday,
    todayEligible,
    totalDaysUnderBudget,
    totalSavingsUnderBudget,
    noSpendDaysCount,
    dailyActivityHistory
  } = calculateBudgetStreakAndHistory(expenses, member, dailyLimit);

  // Calculate XP based on real positive budget rules
  let calculatedXp = 0;

  // +10 XP for each day that successfully qualified for the streak (App Opened + Budget Success)
  calculatedXp += totalDaysUnderBudget * 10;

  // Streak milestone bonuses
  const evaluatedStreak = Math.max(currentStreak, longestStreak);
  if (evaluatedStreak >= 3) calculatedXp += 25;
  if (evaluatedStreak >= 7) calculatedXp += 50;
  if (evaluatedStreak >= 14) calculatedXp += 100;
  if (evaluatedStreak >= 30) calculatedXp += 200;

  // Minimum base XP for active member
  const totalXp = Math.max(calculatedXp, 10);

  // Calculate Level from XP
  let level = 1;
  let currentLevelXp = 0;
  let nextLevelXp = 100;
  let levelProgressPct = 0;

  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    const t = LEVEL_THRESHOLDS[i];
    if (totalXp >= t.minXp) {
      level = t.level;
      currentLevelXp = totalXp - t.minXp;
      const range = t.maxXp - t.minXp;
      nextLevelXp = t.maxXp;
      levelProgressPct = Math.min(Math.round((currentLevelXp / range) * 100), 100);
    }
  }

  // Evaluate Achievements using the single unified streak
  const achievements: Achievement[] = [
    {
      id: 'first_step',
      icon: '🌱',
      title: 'First Step',
      description: 'Open app & stay within daily budget for 1 day',
      xpReward: 10,
      isUnlocked: totalDaysUnderBudget >= 1,
      progress: Math.min(totalDaysUnderBudget, 1),
      target: 1
    },
    {
      id: 'saver_3day',
      icon: '🔥',
      title: '3-Day Streak',
      description: '3 consecutive successful budget tracking days',
      xpReward: 25,
      isUnlocked: evaluatedStreak >= 3,
      progress: Math.min(evaluatedStreak, 3),
      target: 3
    },
    {
      id: 'saver_7day',
      icon: '⭐',
      title: '7-Day Streak',
      description: '7 consecutive successful budget tracking days',
      xpReward: 50,
      isUnlocked: evaluatedStreak >= 7,
      progress: Math.min(evaluatedStreak, 7),
      target: 7
    },
    {
      id: 'saver_14day',
      icon: '⚡',
      title: '14-Day Streak',
      description: '14 consecutive successful budget tracking days',
      xpReward: 100,
      isUnlocked: evaluatedStreak >= 14,
      progress: Math.min(evaluatedStreak, 14),
      target: 14
    },
    {
      id: 'budget_master',
      icon: '👑',
      title: '30-Day Streak',
      description: '30 consecutive successful days on budget',
      xpReward: 200,
      isUnlocked: evaluatedStreak >= 30 || totalDaysUnderBudget >= 30,
      progress: Math.min(Math.max(evaluatedStreak, totalDaysUnderBudget), 30),
      target: 30
    },
    {
      id: 'smart_saver',
      icon: '💰',
      title: 'Smart Saver',
      description: 'Accumulate ₹1,000 in daily budget savings',
      xpReward: 40,
      isUnlocked: totalSavingsUnderBudget >= 1000,
      progress: Math.min(totalSavingsUnderBudget, 1000),
      target: 1000
    },
    {
      id: 'comeback',
      icon: '🚀',
      title: 'Comeback Saver',
      description: 'Return to staying within budget after exceeding',
      xpReward: 20,
      isUnlocked: !isMissedToday && totalDaysUnderBudget > 0,
      progress: !isMissedToday && totalDaysUnderBudget > 0 ? 1 : 0,
      target: 1
    }
  ];

  return {
    totalXp,
    level,
    currentLevelXp,
    nextLevelXp,
    levelProgressPct,
    currentStreak,
    longestStreak,
    lastSuccessfulDate,
    isMissedToday,
    hasTrackedToday,
    hasNoSpendConfirmedToday,
    todayEligible,
    noSpendDays: noSpendDaysCount,
    achievements,
    dailyActivityHistory
  };
}

/**
 * Calculate Leaderboard ranking for room group members
 * Ranking Criteria:
 * 1. Total Personal Expense for the selected period (LOWEST EXPENSE = #1)
 * 2. Deterministic string sort by member name if expenses are equal
 */
export function calculateLeaderboard(
  expenses: Expense[],
  currentMember: MemberName,
  timePeriod: 'this_month' | 'last_month' | 'all_time' = 'this_month',
  dailyLimit: number = 200
): LeaderboardMemberStats[] {
  const now = new Date();
  const thisMonthStr = getLocalDateString(now).substring(0, 7);
  
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = getLocalDateString(lastMonthDate).substring(0, 7);

  const rawStats: {
    member: MemberName;
    totalPersonalExpense: number;
    currentStreak: number;
    budgetSuccessDays: number;
    totalEvaluatedDays: number;
    successRate: number;
    noSpendDays: number;
  }[] = [];

  MEMBERS.forEach(memObj => {
    const mem = memObj.name as MemberName;
    const memExpenses = expenses.filter(e => e.member === mem);

    let periodExpenses = memExpenses;
    if (timePeriod === 'this_month') {
      periodExpenses = memExpenses.filter(e => e.date.startsWith(thisMonthStr));
    } else if (timePeriod === 'last_month') {
      periodExpenses = memExpenses.filter(e => e.date.startsWith(lastMonthStr));
    }

    const totalPersonalExpense = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

    const { currentStreak, dailyActivityHistory } = calculateBudgetStreakAndHistory(memExpenses, mem, dailyLimit);

    let filteredHistory = dailyActivityHistory;
    if (timePeriod === 'this_month') {
      filteredHistory = dailyActivityHistory.filter(r => r.date.startsWith(thisMonthStr));
    } else if (timePeriod === 'last_month') {
      filteredHistory = dailyActivityHistory.filter(r => r.date.startsWith(lastMonthStr));
    }

    const totalEvaluatedDays = filteredHistory.length || 1;
    const budgetSuccessDays = filteredHistory.filter(r => r.streakEligible).length;
    const noSpendDays = filteredHistory.filter(r => r.isNoSpendConfirmed).length;
    const successRate = Math.round((budgetSuccessDays / totalEvaluatedDays) * 100);

    rawStats.push({
      member: mem,
      totalPersonalExpense,
      currentStreak,
      budgetSuccessDays,
      totalEvaluatedDays,
      successRate,
      noSpendDays
    });
  });

  // Sort strictly by totalPersonalExpense ASCENDING (lowest expense = #1)
  rawStats.sort((a, b) => {
    if (a.totalPersonalExpense !== b.totalPersonalExpense) {
      return a.totalPersonalExpense - b.totalPersonalExpense;
    }
    return a.member.localeCompare(b.member);
  });

  return rawStats.map((item, idx) => ({
    ...item,
    rank: idx + 1,
    isCurrentUser: item.member === currentMember
  }));
}

/**
 * Equip a cosmetic reward for a member
 */
export function setEquippedReward(member: MemberName, rewardId: string | undefined): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EQUIPPED_REWARDS);
    const map = raw ? JSON.parse(raw) : {};
    if (rewardId) {
      map[member] = rewardId;
    } else {
      delete map[member];
    }
    localStorage.setItem(STORAGE_KEY_EQUIPPED_REWARDS, JSON.stringify(map));
  } catch (e) {
    console.warn('Error saving equipped reward:', e);
  }
}
