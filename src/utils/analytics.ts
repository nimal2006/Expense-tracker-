import { Expense, MemberName, CategoryName, PaymentMode, SmartInsight } from '../types';
import { normalizeCategoryName } from '../data/categories';

/**
 * Returns YYYY-MM-DD string in the user's local timezone (e.g. 2026-09-02 for Sep 2 in IST).
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns YYYY-MM-DD string for yesterday in user's local timezone.
 */
export function getYesterdayLocalDateString(d: Date = new Date()): string {
  const yesterday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  return getLocalDateString(yesterday);
}

/**
 * Returns HH:mm string in user's local timezone (e.g. "15:26").
 */
export function getCurrentLocalTimeString(d: Date = new Date()): string {
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Accurately formats a date string into "Today", "Yesterday", or formatted "D MMM YYYY".
 * Compares strictly against user's current local date in their active timezone.
 */
export function formatRelativeDate(rawDate?: string): string {
  if (!rawDate) return '';
  const now = new Date();
  const todayStr = getLocalDateString(now);
  const yesterdayStr = getYesterdayLocalDateString(now);

  if (rawDate === todayStr) {
    return 'Today';
  }
  if (rawDate === yesterdayStr) {
    return 'Yesterday';
  }
  return formatDateDisplay(rawDate);
}

/**
 * Safely parses an expense date and time into an epoch timestamp (milliseconds).
 * Ensures valid numerical timestamps without producing NaN on legacy time formats ('0', '1', '2') or missing times.
 */
export function getExpenseTimestamp(expense: { date?: string; time?: string; createdAt?: string }): number {
  if (!expense) return 0;
  const dateStr = expense.date || (expense.createdAt ? expense.createdAt.substring(0, 10) : '');
  if (!dateStr) return 0;

  const dateParts = dateStr.split('-');
  if (dateParts.length !== 3) {
    const parsed = new Date(dateStr).getTime();
    return isNaN(parsed) ? 0 : parsed;
  }

  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1;
  const day = parseInt(dateParts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return 0;

  let hours = 12;
  let minutes = 0;
  let seconds = 0;

  const timeStr = expense.time;
  if (timeStr && timeStr.includes(':')) {
    const tParts = timeStr.split(':');
    const h = parseInt(tParts[0], 10);
    const m = parseInt(tParts[1], 10);
    const s = tParts[2] ? parseInt(tParts[2], 10) : 0;
    if (!isNaN(h)) hours = h;
    if (!isNaN(m)) minutes = m;
    if (!isNaN(s)) seconds = s;
  } else if (timeStr === '0') {
    hours = 10;
    minutes = 0;
  } else if (timeStr === '1') {
    hours = 18;
    minutes = 30;
  } else if (timeStr === '2') {
    hours = 21;
    minutes = 0;
  } else if (expense.createdAt && expense.createdAt.includes('T')) {
    const timeSub = expense.createdAt.split('T')[1];
    if (timeSub && timeSub.length >= 5) {
      const [hStr, mStr] = timeSub.substring(0, 5).split(':');
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      if (!isNaN(h)) hours = h;
      if (!isNaN(m)) minutes = m;
    }
  }

  return new Date(year, month, day, hours, minutes, seconds).getTime();
}

/**
 * Sorts an array of expenses in strict descending chronological order (newest first).
 * Primary sort: Date (e.g., 31 Aug -> 30 Aug -> ... -> 1 Aug)
 * Secondary sort: Time / Session timestamp
 * Tertiary sort: createdAt / ID
 */
export function sortExpensesDescending<T extends Expense>(expenses: T[]): T[] {
  return [...expenses].sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    if (dateA !== dateB) {
      return dateB.localeCompare(dateA);
    }
    const tsA = getExpenseTimestamp(a);
    const tsB = getExpenseTimestamp(b);
    if (tsA !== tsB) {
      return tsB - tsA;
    }
    const cA = a.createdAt || '';
    const cB = b.createdAt || '';
    if (cA && cB && cA !== cB) {
      return cB.localeCompare(cA);
    }
    return String(b.id || '').localeCompare(String(a.id || ''));
  });
}

/**
 * Ensures no expense timestamp exceeds current real-time clock (new Date()).
 * If date is in the future, clamps to today.
 * If date is today and time is ahead of local time, clamps to current local time.
 */
export function clampTimestampToNow(dateStr: string, timeStr?: string): { date: string; time: string } {
  const now = new Date();
  const todayStr = getLocalDateString(now);
  const currentHHMM = getCurrentLocalTimeString(now);

  let date = dateStr || todayStr;
  let time = timeStr || currentHHMM;

  if (date > todayStr) {
    date = todayStr;
  }

  if (date === todayStr && time > currentHHMM) {
    time = currentHHMM;
  }

  return { date, time };
}

/**
 * Safely format YYYY-MM-DD string to user-friendly local display (e.g. "2 Sep 2026")
 * without UTC off-by-one shifting.
 */
export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day} ${monthNames[month - 1] || month} ${year}`;
    }
  }
  return dateStr;
}

export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
  return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function formatExactCurrency(amount: number): string {
  if (isNaN(amount)) return '₹0';
  return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/**
 * Robust, clean formatter for time strings.
 * Handles legacy '0', '1', ISO createdAt, and HH:mm format without trailing truncation.
 */
export function formatTimeDisplay(timeStr?: string, createdAt?: string): string {
  if (timeStr && timeStr.includes(':')) {
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10);
    const m = parts[1] ? parts[1].substring(0, 2).padStart(2, '0') : '00';
    if (!isNaN(h)) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${h12}:${m} ${ampm}`;
    }
    return timeStr;
  }
  
  if (createdAt && createdAt.includes('T')) {
    const timeSub = createdAt.split('T')[1];
    if (timeSub && timeSub.length >= 5) {
      const [hStr, mStr] = timeSub.substring(0, 5).split(':');
      const h = parseInt(hStr, 10);
      if (!isNaN(h)) {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 === 0 ? 12 : h % 12;
        return `${h12}:${mStr} ${ampm}`;
      }
    }
  }

  // Handle single digit session markers from dataset (0 = Morning, 1 = Evening, 2 = Night)
  if (timeStr === '0') return '10:00 AM';
  if (timeStr === '1') return '06:30 PM';
  if (timeStr === '2') return '09:00 PM';

  return '12:00 PM';
}

/**
 * Determines clean display title and whether a specific item description exists.
 * If itemName is empty, '-', or identical to category, promotes category as the main title
 * and suppresses redundant duplicate category badges.
 */
export function getTransactionDisplay(expense: Expense): { title: string; hasSpecificItem: boolean } {
  const rawItem = (expense.itemName || '').trim();
  const isInvalid = !rawItem || rawItem === '-' || rawItem === '—' || rawItem.toLowerCase() === expense.category.toLowerCase();
  return {
    title: isInvalid ? expense.category : rawItem,
    hasSpecificItem: !isInvalid
  };
}

/**
 * Formats transaction subtitle into exact format:
 * `[Payment Mode] • [Date]`
 * Examples:
 * - `UPI • 19 Sep 2026`
 * - `CASH • Yesterday`
 * - `UPI • Today`
 */
export function formatTransactionSubtitle(expense: Expense): string {
  const mode = (expense.paymentMode || 'Cash').toUpperCase();
  const rawDate = expense.date || (expense.createdAt ? expense.createdAt.substring(0, 10) : '');
  const datePart = formatRelativeDate(rawDate);

  return `${mode} • ${datePart}`;
}

export function getMonthDateRange(monthStr: string): { start: string; end: string } | null {
  if (!monthStr || monthStr === 'all') return null;
  const parts = monthStr.split('-');
  if (parts.length < 2) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(y) || isNaN(m)) return null;
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export function filterExpenses(
  expenses: Expense[],
  monthStr?: string, // '2026-08', '2026-09', or 'all'
  yearStr?: string, // '2026' or 'all'
  member?: MemberName | 'All',
  category?: CategoryName | 'All',
  paymentMode?: PaymentMode | 'All',
  searchQuery?: string,
  place?: string,
  startDate?: string,
  endDate?: string,
  minAmount?: number
): Expense[] {
  const monthRange = monthStr ? getMonthDateRange(monthStr) : null;

  return expenses.filter(e => {
    // 1. Strict month date range filter (date >= start AND date <= end)
    if (monthRange) {
      if (e.date < monthRange.start || e.date > monthRange.end) return false;
    }

    // 2. Strict year date range filter
    if (yearStr && yearStr !== 'all') {
      const startOfYear = `${yearStr}-01-01`;
      const endOfYear = `${yearStr}-12-31`;
      if (e.date < startOfYear || e.date > endOfYear) return false;
    }

    // 3. Member filter
    if (member && member !== 'All' && e.member !== member) {
      return false;
    }

    // 4. Category filter (supports mapping legacy names to consolidated categories)
    if (category && category !== 'All') {
      const expNorm = normalizeCategoryName(e.category);
      const targetNorm = normalizeCategoryName(category);
      if (expNorm !== targetNorm) {
        return false;
      }
    }

    // 5. Payment mode filter
    if (paymentMode && paymentMode !== 'All' && e.paymentMode !== paymentMode) {
      return false;
    }

    // 6. Minimum amount filter (e.g. > ₹500)
    if (minAmount !== undefined && e.amount <= minAmount) {
      return false;
    }

    // 6. Place / Location filter
    if (place && place.trim() && !e.place?.toLowerCase().includes(place.toLowerCase().trim())) {
      return false;
    }

    // 7. Custom start date filter
    if (startDate && e.date < startDate) {
      return false;
    }

    // 8. Custom end date filter
    if (endDate && e.date > endDate) {
      return false;
    }

    // 9. Full-text search across all relevant fields
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchItem = e.itemName?.toLowerCase().includes(query);
      const matchPlace = e.place?.toLowerCase().includes(query);
      const matchCategory = e.category.toLowerCase().includes(query) || normalizeCategoryName(e.category).toLowerCase().includes(query);
      const matchMember = e.member.toLowerCase().includes(query);
      const matchAmount = e.amount.toString().includes(query);
      const matchPayment = e.paymentMode.toLowerCase().includes(query);
      const matchNotes = e.notes?.toLowerCase().includes(query);
      if (!matchItem && !matchPlace && !matchCategory && !matchMember && !matchAmount && !matchPayment && !matchNotes) {
        return false;
      }
    }

    return true;
  });
}

export function calculateSummaryMetrics(currentExpenses: Expense[], previousMonthExpenses: Expense[] = []) {
  const totalExpense = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalTransactions = currentExpenses.length;

  const prevTotalExpense = previousMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const prevTotalTransactions = previousMonthExpenses.length;

  // Member totals
  const memberTotals: Record<MemberName, { amount: number; count: number; percentage: number; prevAmount: number }> = {
    Nimal: { amount: 0, count: 0, percentage: 0, prevAmount: 0 },
    Etti: { amount: 0, count: 0, percentage: 0, prevAmount: 0 },
    Dharan: { amount: 0, count: 0, percentage: 0, prevAmount: 0 },
    Sanjai: { amount: 0, count: 0, percentage: 0, prevAmount: 0 },
    Santhosh: { amount: 0, count: 0, percentage: 0, prevAmount: 0 },
    Sujhay: { amount: 0, count: 0, percentage: 0, prevAmount: 0 }
  };

  currentExpenses.forEach(e => {
    if (memberTotals[e.member]) {
      memberTotals[e.member].amount += e.amount;
      memberTotals[e.member].count += 1;
    }
  });

  previousMonthExpenses.forEach(e => {
    if (memberTotals[e.member]) {
      memberTotals[e.member].prevAmount += e.amount;
    }
  });

  (Object.keys(memberTotals) as MemberName[]).forEach(m => {
    memberTotals[m].percentage = totalExpense > 0 ? Math.round((memberTotals[m].amount / totalExpense) * 100) : 0;
  });

  // Calculate Today's Expense (using local calendar date)
  const todayStr = getLocalDateString(new Date());
  const todayExpenses = currentExpenses.filter(e => e.date === todayStr);
  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Calculate This Week's Expense (last 7 days or current week)
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Sunday start
  const weekStartStr = getLocalDateString(weekStart);
  const thisWeekExpenses = currentExpenses.filter(e => e.date >= weekStartStr);
  const thisWeekTotal = thisWeekExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Active days for average daily spend
  const uniqueDates = new Set(currentExpenses.map(e => e.date));
  const activeDaysCount = Math.max(uniqueDates.size, 1);
  const avgDailySpending = totalExpense > 0 ? totalExpense / activeDaysCount : 0;
  const avgPerTransaction = totalTransactions > 0 ? totalExpense / totalTransactions : 0;

  // Category totals (grouped by normalized active categories)
  const categoryMap = new Map<string, { amount: number; count: number }>();
  currentExpenses.forEach(e => {
    const normCategory = normalizeCategoryName(e.category);
    const curr = categoryMap.get(normCategory) || { amount: 0, count: 0 };
    categoryMap.set(normCategory, {
      amount: curr.amount + e.amount,
      count: curr.count + 1
    });
  });

  const categoryArray = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category: category as CategoryName,
      amount: data.amount,
      count: data.count,
      percentage: totalExpense > 0 ? Math.round((data.amount / totalExpense) * 100) : 0,
      avgPerTxn: data.count > 0 ? Math.round(data.amount / data.count) : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  const topCategory = categoryArray[0] || { category: 'None', amount: 0, percentage: 0 };

  // Payment mode analysis
  const paymentMap = new Map<PaymentMode, number>();
  currentExpenses.forEach(e => {
    paymentMap.set(e.paymentMode, (paymentMap.get(e.paymentMode) || 0) + e.amount);
  });

  const paymentBreakdown = Array.from(paymentMap.entries()).map(([mode, amount]) => ({
    mode,
    amount,
    percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0
  })).sort((a, b) => b.amount - a.amount);

  // Comparison %
  const expenseChangePct = prevTotalExpense > 0 ? Math.round(((totalExpense - prevTotalExpense) / prevTotalExpense) * 100 * 10) / 10 : 0;
  const txnCountChange = totalTransactions - prevTotalTransactions;

  return {
    totalExpense,
    totalTransactions,
    prevTotalExpense,
    prevTotalTransactions,
    expenseChangePct,
    txnCountChange,
    memberTotals,
    todayTotal,
    thisWeekTotal,
    avgDailySpending,
    avgPerTransaction,
    categoryArray,
    topCategory,
    paymentBreakdown,
    uniqueDatesCount: uniqueDates.size
  };
}

export function calculateDailySpending(expenses: Expense[], monthStr: string) {
  // Days 1 to 31 for selected month
  const [year, month] = monthStr.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyData: { day: number; date: string; amount: number; count: number }[] = [];

  const dayMap = new Map<number, { amount: number; count: number }>();
  expenses.forEach(e => {
    if (e.date.startsWith(monthStr)) {
      const day = parseInt(e.date.split('-')[2], 10);
      const curr = dayMap.get(day) || { amount: 0, count: 0 };
      dayMap.set(day, {
        amount: curr.amount + e.amount,
        count: curr.count + 1
      });
    }
  });

  for (let d = 1; d <= daysInMonth; d++) {
    const pad = d.toString().padStart(2, '0');
    const fullDate = `${monthStr}-${pad}`;
    const data = dayMap.get(d) || { amount: 0, count: 0 };
    dailyData.push({
      day: d,
      date: fullDate,
      amount: data.amount,
      count: data.count
    });
  }

  return dailyData;
}

export function calculateWeeklySpending(expenses: Expense[], monthStr: string) {
  // Weeks 1 (1-7), 2 (8-14), 3 (15-21), 4 (22-28), 5 (29-31)
  const weeks = [
    { label: 'Week 1 (Day 1-7)', shortLabel: 'W1', minDay: 1, maxDay: 7, amount: 0, count: 0 },
    { label: 'Week 2 (Day 8-14)', shortLabel: 'W2', minDay: 8, maxDay: 14, amount: 0, count: 0 },
    { label: 'Week 3 (Day 15-21)', shortLabel: 'W3', minDay: 15, maxDay: 21, amount: 0, count: 0 },
    { label: 'Week 4 (Day 22-28)', shortLabel: 'W4', minDay: 22, maxDay: 28, amount: 0, count: 0 },
    { label: 'Week 5 (Day 29-31)', shortLabel: 'W5', minDay: 29, maxDay: 31, amount: 0, count: 0 }
  ];

  expenses.forEach(e => {
    if (e.date.startsWith(monthStr)) {
      const day = parseInt(e.date.split('-')[2], 10);
      for (const w of weeks) {
        if (day >= w.minDay && day <= w.maxDay) {
          w.amount += e.amount;
          w.count += 1;
          break;
        }
      }
    }
  });

  return weeks;
}

export function calculateDayOfWeekSpending(expenses: Expense[]) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const map = days.map((name, i) => ({ day: name, shortDay: shortDays[i], amount: 0, count: 0 }));

  expenses.forEach(e => {
    const d = new Date(`${e.date}T00:00:00`);
    const dayIdx = d.getDay();
    if (!isNaN(dayIdx)) {
      map[dayIdx].amount += e.amount;
      map[dayIdx].count += 1;
    }
  });

  return map;
}

export function calculateMonthlyTrend(allExpenses: Expense[], yearStr: string = '2026') {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsData = monthNames.map((name, i) => {
    const mStr = (i + 1).toString().padStart(2, '0');
    const prefix = `${yearStr}-${mStr}`;
    return {
      monthKey: prefix,
      month: name,
      name,
      amount: 0,
      count: 0
    };
  });

  allExpenses.forEach(e => {
    if (e.date.startsWith(yearStr)) {
      const mIdx = parseInt(e.date.substring(5, 7), 10) - 1;
      if (monthsData[mIdx]) {
        monthsData[mIdx].amount += e.amount;
        monthsData[mIdx].count += 1;
      }
    }
  });

  return monthsData;
}

export function getTopSpendingItems(expenses: Expense[], limit: number = 10) {
  return [...expenses]
    .filter(e => e.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

export function generateSmartInsights(
  currentExpenses: Expense[],
  monthStr: string,
  previousMonthExpenses: Expense[] = []
): SmartInsight[] {
  const insights: SmartInsight[] = [];
  if (currentExpenses.length === 0) {
    insights.push({
      type: 'trend',
      title: 'No Transactions',
      description: `No transactions recorded yet for ${monthStr}. Use the Add Expense button to log entries.`,
      iconName: 'Info',
      badgeType: 'neutral'
    });
    return insights;
  }

  const summary = calculateSummaryMetrics(currentExpenses, previousMonthExpenses);

  // 1. Highest Spender
  const members = (Object.keys(summary.memberTotals) as MemberName[]).map(m => ({
    name: m,
    amount: summary.memberTotals[m].amount,
    pct: summary.memberTotals[m].percentage
  })).sort((a, b) => b.amount - a.amount);

  if (members.length > 0 && members[0].amount > 0) {
    insights.push({
      type: 'highest_spender',
      title: 'Top Spender',
      description: `${members[0].name} has the highest individual spend of ${formatCurrency(members[0].amount)} (${members[0].pct}% of total).`,
      iconName: 'Crown',
      badgeText: members[0].name,
      badgeType: 'success'
    });
  }

  // 2. Top Category
  if (summary.categoryArray.length > 0) {
    const topCat = summary.categoryArray[0];
    insights.push({
      type: 'top_category',
      title: 'Dominant Category',
      description: `${topCat.category} leads spending at ${formatCurrency(topCat.amount)} across ${topCat.count} transactions (${topCat.percentage}%).`,
      iconName: 'PieChart',
      badgeText: `${topCat.percentage}%`,
      badgeType: 'warning'
    });
  }

  // 3. Payment Mode insight
  if (summary.paymentBreakdown.length > 0) {
    const topPay = summary.paymentBreakdown[0];
    insights.push({
      type: 'payment_mode',
      title: 'Preferred Payment',
      description: `${topPay.mode} is the most frequent payment channel with ${formatCurrency(topPay.amount)} (${topPay.percentage}%).`,
      iconName: 'CreditCard',
      badgeText: topPay.mode,
      badgeType: 'neutral'
    });
  }

  // 4. Highest Spending Day
  const daily = calculateDailySpending(currentExpenses, monthStr);
  const highestDay = [...daily].sort((a, b) => b.amount - a.amount)[0];
  if (highestDay && highestDay.amount > 0) {
    insights.push({
      type: 'peak_day',
      title: 'Peak Spending Day',
      description: `Day ${highestDay.day} had the highest daily outflow of ${formatCurrency(highestDay.amount)} with ${highestDay.count} transactions.`,
      iconName: 'Calendar',
      badgeText: `Day ${highestDay.day}`,
      badgeType: 'danger'
    });
  }

  // 5. Month-over-Month Comparison
  if (previousMonthExpenses.length > 0) {
    const prevTotal = previousMonthExpenses.reduce((s, e) => s + e.amount, 0);
    const currTotal = summary.totalExpense;
    const diff = currTotal - prevTotal;
    const pct = prevTotal > 0 ? Math.round((diff / prevTotal) * 100) : 0;

    if (diff > 0) {
      insights.push({
        type: 'trend',
        title: 'Spending Up vs Last Month',
        description: `Group spending increased by ${pct}% (+${formatCurrency(diff)}) compared to last month (${formatCurrency(prevTotal)}).`,
        iconName: 'TrendingUp',
        badgeText: `+${pct}%`,
        badgeType: 'danger'
      });
    } else if (diff < 0) {
      insights.push({
        type: 'trend',
        title: 'Spending Reduced',
        description: `Group spending decreased by ${Math.abs(pct)}% (-${formatCurrency(Math.abs(diff))}) compared to last month.`,
        iconName: 'TrendingDown',
        badgeText: `${pct}%`,
        badgeType: 'success'
      });
    }
  }

  return insights;
}
