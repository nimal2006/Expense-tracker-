export type MemberName = 'Nimal' | 'Etti' | 'Dharan' | 'Sanjai' | 'Santhosh' | 'Sujhay';

export interface Member {
  id: string;
  name: MemberName;
  avatarColor: string;
  badgeBg: string;
  avatarLetter: string;
  pin?: string;
  avatarUrl?: string;
  colorHex?: string;
}

export type ActiveCategoryName =
  | 'Food'
  | 'Snacks'
  | 'Beverages'
  | 'Transportation'
  | 'Fuel'
  | 'Recharge'
  | 'Education/Fees'
  | 'Personal & Lifestyle'
  | 'Entertainment'
  | 'Tobacco Products'
  | 'Others';

export type LegacyCategoryName =
  | 'Tea/Coffee'
  | 'Cool Drinks'
  | 'Beverages'
  | 'Cigarette'
  | 'Hans'
  | 'Tobacco Products'
  | 'Liquor'
  | 'Alcohol'
  | 'Personal Care'
  | 'Shopping'
  | 'Medical'
  | 'Lifestyle & Care';

export type CategoryName = ActiveCategoryName | LegacyCategoryName;

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
  receiptUrl?: string;
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

export type ActiveTab = 'dashboard' | 'add' | 'history' | 'reports' | 'budgets' | 'categories' | 'members' | 'buses';

export type BusOperator = 'Government' | 'Private';
export type BusType = 'Ordinary' | 'Express' | 'AC' | 'Deluxe';
export type WeekdayShort = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface BusSchedule {
  id: string;
  busName: string;
  busNumber: string;
  operator: BusOperator;
  fromLocation: string;
  toLocation: string;
  departureTime: string; // HH:mm 24h format
  arrivalTime: string;   // HH:mm 24h format
  ticketPrice: number;
  busType: BusType;
  operatingDays: WeekdayShort[];
  notes?: string;
  createdBy: MemberName;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface ExpensePrefill {
  category: CategoryName;
  itemName: string;
  amount: number;
  date: string; // YYYY-MM-DD
  place?: string;
  notes?: string;
  sourceLabel?: string;
}

export interface NotificationPreferences {
  member: MemberName;
  dailyReminderEnabled: boolean;
  friendActivityEnabled: boolean;
  notifyOnEdits: boolean;
  reminderTime: string; // HH:mm in Asia/Kolkata, default "20:00"
  timezone: string;     // "Asia/Kolkata"
  soundEnabled: boolean;
  favouriteBusIds: string[];
  updatedAt: string;    // ISO string
}

export type NotificationLogType = 'daily_reminder' | 'friend_activity';

export interface NotificationLogMetadata {
  amount?: number;
  category?: string;
  paymentMode?: PaymentMode;
  transactionTime?: string;
  transactionDate?: string;
  itemName?: string;
  isEdit?: boolean;
}

export interface NotificationLog {
  id: string;
  type: NotificationLogType;
  recipientMember: MemberName;
  actorMember?: MemberName;
  expenseId?: string;
  title: string;
  message: string;
  dateKey: string;       // YYYY-MM-DD in Asia/Kolkata
  attemptNumber?: number; // 1 or 2 for daily reminders
  snoozeUntil?: string;  // ISO timestamp if Remind Me Later was tapped
  read: boolean;
  metadata?: NotificationLogMetadata;
  createdAt: string;     // ISO string
  updatedAt?: string;    // ISO string
}

export interface DeviceTokenRecord {
  id: string;
  member: MemberName;
  token: string;
  platform: 'web' | 'android-pwa' | 'ios-pwa';
  updatedAt: string;
}

