export type MemberName = 'Nimal' | 'Etti' | 'Dharan' | 'Sanjai' | 'Santhosh';

export interface Member {
  id: string;
  name: MemberName;
  avatarColor: string;
  badgeBg: string;
  avatarLetter: string;
  pin?: string;
}

export type CategoryName =
  | 'Food'
  | 'Snacks'
  | 'Beverages'
  | 'Tobacco Products'
  | 'Alcohol'
  | 'Transportation'
  | 'Fuel'
  | 'Recharge'
  | 'Education/Fees'
  | 'Personal Care'
  | 'Entertainment'
  | 'Others';

export type PaymentMode = 'UPI' | 'Cash' | 'Card' | 'Friend Paid';

export interface Expense {
  id: string;
  member: MemberName;
  amount: number;
  category: CategoryName;
  paymentMode: PaymentMode;
  date: string; // YYYY-MM-DD format
  time: string; // HH:mm format or ISO time
  itemName?: string;
  quantity?: number;
  place?: string;
  notes?: string;
  createdAt: string; // ISO string
  updatedAt?: string;
}

export interface MonthlyBudget {
  month: string; // YYYY-MM
  amount: number;
}

export interface FilterOptions {
  month: string; // 'all' or 'YYYY-MM'
  year: string; // 'all' or 'YYYY'
  member: MemberName | 'All';
  category: CategoryName | 'All';
  paymentMode: PaymentMode | 'All';
  place: string;
  searchQuery: string;
  startDate?: string;
  endDate?: string;
}

export interface SmartInsight {
  type: 'highest_spender' | 'top_category' | 'payment_mode' | 'peak_day' | 'trend' | 'budget_alert';
  title: string;
  description: string;
  iconName: string;
  badgeText?: string;
  badgeType?: 'neutral' | 'success' | 'warning' | 'danger';
}

export type ActiveTab = 'dashboard' | 'add' | 'history' | 'reports' | 'budgets' | 'categories' | 'members';
