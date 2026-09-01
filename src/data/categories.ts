import { CategoryName, PaymentMode } from '../types';

export interface CategoryMeta {
  name: CategoryName;
  color: string;
  bgColor: string;
  textColor: string;
  iconName: string;
  commonItems: string[];
}

export const CATEGORIES: CategoryMeta[] = [
  {
    name: 'Food',
    color: '#6366F1', // Indigo
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/40',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    iconName: 'Utensils',
    commonItems: ['Briyani', 'Chicken Rice', 'Mushroom', 'Meals', 'Tiffen centre', 'Hotel CBE', 'Kallan', 'Momo']
  },
  {
    name: 'Snacks',
    color: '#F59E0B', // Amber
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    textColor: 'text-amber-600 dark:text-amber-400',
    iconName: 'Cookie',
    commonItems: ['Samosa', 'Egg puffs', 'Sweet puffs', 'Jam bun', 'Ice cream', 'Smoodh', 'Kitkat', 'Chew bites', 'Peanut Candy', 'Bonda', 'Roll']
  },
  {
    name: 'Beverages',
    color: '#06B6D4', // Cyan
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/40',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    iconName: 'Coffee',
    commonItems: ['Tea', 'Coffee', 'Juice', 'Milkshake', 'Soft Drinks', 'Waterbottle', 'Rosemilk', 'Paneer soda', 'Goli soda', 'Buttermilk']
  },
  {
    name: 'Tobacco Products',
    color: '#8B5CF6', // Purple
    bgColor: 'bg-purple-50 dark:bg-purple-950/40',
    textColor: 'text-purple-600 dark:text-purple-400',
    iconName: 'Flame',
    commonItems: ['Coolip', 'Hans', 'Cigarette', 'Mint', 'Kings', 'Wave', 'Gold Filter', 'CL', 'Don']
  },
  {
    name: 'Alcohol',
    color: '#EC4899', // Pink
    bgColor: 'bg-pink-50 dark:bg-pink-950/40',
    textColor: 'text-pink-600 dark:text-pink-400',
    iconName: 'Wine',
    commonItems: ['Beer', 'British', 'Bacadi', 'Liquor']
  },
  {
    name: 'Transportation',
    color: '#10B981', // Emerald
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    iconName: 'Bus',
    commonItems: ['Govt Bus', 'Kannapiran Bus', 'PKS Bus', 'Ukkadam Bus', 'Tocken', 'Ticket', 'SRT Bus', 'Gandhipuram Bus', 'AC Bus']
  },
  {
    name: 'Fuel',
    color: '#3B82F6', // Blue
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    textColor: 'text-blue-600 dark:text-blue-400',
    iconName: 'Fuel',
    commonItems: ['Petrol', 'Splendor', 'NS200', 'Access', 'BP']
  },
  {
    name: 'Recharge',
    color: '#14B8A6', // Teal
    bgColor: 'bg-teal-50 dark:bg-teal-950/40',
    textColor: 'text-teal-600 dark:text-teal-400',
    iconName: 'Smartphone',
    commonItems: ['28days package', '2 GB UNLIMITED', 'Jio Recharge', 'Airtel Recharge', 'SIH', 'Santhosh']
  },
  {
    name: 'Education/Fees',
    color: '#6366F1', // Indigo
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/40',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    iconName: 'GraduationCap',
    commonItems: ['Sem fees', 'NPTEL', 'JLPT', 'Japanese Class', 'Association fees', 'Exam fees']
  },
  {
    name: 'Personal Care',
    color: '#F43F5E', // Rose
    bgColor: 'bg-rose-50 dark:bg-rose-950/40',
    textColor: 'text-rose-600 dark:text-rose-400',
    iconName: 'Scissors',
    commonItems: ['Haircut', 'Guru Saloon', 'Shaving', 'Spa', 'Grooming']
  },
  {
    name: 'Entertainment',
    color: '#F97316', // Orange
    bgColor: 'bg-orange-50 dark:bg-orange-950/40',
    textColor: 'text-orange-600 dark:text-orange-400',
    iconName: 'Film',
    commonItems: ['Spotify', 'DC movie', 'Cinema Ticket', 'Abirami theatre', 'Shiva Velur', 'Game Zone']
  },
  {
    name: 'Others',
    color: '#64748B', // Slate
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-600 dark:text-slate-400',
    iconName: 'MoreHorizontal',
    commonItems: ['Xerox', 'Printout', 'T-shirt', 'Bag zip', 'Loanforrollno81', 'IBM Trip']
  }
];

export const MEMBERS = [
  {
    id: 'nimal',
    name: 'Nimal' as const,
    avatarColor: 'bg-indigo-600 text-white',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    avatarLetter: 'N'
  },
  {
    id: 'etti',
    name: 'Etti' as const,
    avatarColor: 'bg-emerald-600 text-white',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    avatarLetter: 'E'
  },
  {
    id: 'dharan',
    name: 'Dharan' as const,
    avatarColor: 'bg-amber-600 text-white',
    badgeBg: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    avatarLetter: 'D'
  },
  {
    id: 'sanjai',
    name: 'Sanjai' as const,
    avatarColor: 'bg-blue-600 text-white',
    badgeBg: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    avatarLetter: 'S'
  },
  {
    id: 'santhosh',
    name: 'Santhosh' as const,
    avatarColor: 'bg-purple-600 text-white',
    badgeBg: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    avatarLetter: 'St'
  }
];

export const PAYMENT_MODES: { name: PaymentMode; iconName: string; color: string; badge: string }[] = [
  { name: 'UPI', iconName: 'QrCode', color: '#6366F1', badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
  { name: 'Cash', iconName: 'Banknote', color: '#10B981', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  { name: 'Card', iconName: 'CreditCard', color: '#3B82F6', badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  { name: 'Friend Paid', iconName: 'Users', color: '#8B5CF6', badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800' }
];
