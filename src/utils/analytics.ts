import { Expense, MemberName, CategoryName, PaymentMode, SmartInsight } from '../types';

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
  endDate?: string
): Expense[] {
  return expenses.filter(e => {
    if (monthStr && monthStr !== 'all') {
      const expMonth = e.date.substring(0, 7);
      if (expMonth !== monthStr) return false;
    }
    if (yearStr && yearStr !== 'all') {
      const expYear = e.date.substring(0, 4);
      if (expYear !== yearStr) return false;
    }
    if (member && member !== 'All' && e.member !== member) {
      return false;
    }
    if (category && category !== 'All' && e.category !== category) {
      return false;
    }
    if (paymentMode && paymentMode !== 'All' && e.paymentMode !== paymentMode) {
      return false;
    }
    if (place && place.trim() && !e.place?.toLowerCase().includes(place.toLowerCase())) {
      return false;
    }
    if (startDate && e.date < startDate) {
      return false;
    }
    if (endDate && e.date > endDate) {
      return false;
    }
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchItem = e.itemName?.toLowerCase().includes(query);
      const matchPlace = e.place?.toLowerCase().includes(query);
      const matchCategory = e.category.toLowerCase().includes(query);
      const matchMember = e.member.toLowerCase().includes(query);
      const matchAmount = e.amount.toString().includes(query);
      const matchPayment = e.paymentMode.toLowerCase().includes(query);
      if (!matchItem && !matchPlace && !matchCategory && !matchMember && !matchAmount && !matchPayment) {
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
    Santhosh: { amount: 0, count: 0, percentage: 0, prevAmount: 0 }
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

  // Category totals
  const categoryMap = new Map<string, { amount: number; count: number }>();
  currentExpenses.forEach(e => {
    const curr = categoryMap.get(e.category) || { amount: 0, count: 0 };
    categoryMap.set(e.category, {
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
