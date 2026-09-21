import { CategoryName, ActiveCategoryName, PaymentMode, Member, MemberName } from '../types';
import { getMemberAvatar } from '../utils/memberAvatars';

export interface CategoryMeta {
  name: ActiveCategoryName;
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
    commonItems: ['Samosa', 'Egg puffs', 'Sweet puffs', 'Jam bun', 'Ice cream', 'Smoodh', 'Kitkat', 'Bonda', 'Roll', 'Chips', 'Biscuits']
  },
  {
    name: 'Beverages',
    color: '#06B6D4', // Cyan
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/40',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    iconName: 'Coffee',
    commonItems: ['Tea', 'Coffee', 'Cool Drinks', 'Fresh Juice', 'Water Bottle', 'Milkshake', 'Soda']
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
    color: '#8B5CF6', // Purple
    bgColor: 'bg-purple-50 dark:bg-purple-950/40',
    textColor: 'text-purple-600 dark:text-purple-400',
    iconName: 'GraduationCap',
    commonItems: ['Sem fees', 'NPTEL', 'JLPT', 'Japanese Class', 'Association fees', 'Exam fees', 'Books', 'Xerox']
  },
  {
    name: 'Personal & Lifestyle',
    color: '#F43F5E', // Rose
    bgColor: 'bg-rose-50 dark:bg-rose-950/40',
    textColor: 'text-rose-600 dark:text-rose-400',
    iconName: 'ShoppingBag',
    commonItems: ['Haircut', 'Clothes', 'Medicine', 'Guru Saloon', 'Doctor', 'Pharmacy', 'Shoes', 'Shaving', 'Spa', 'Grooming', 'Electronics']
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

/**
 * Maps legacy/removed category names to their active consolidated category:
 * - 'Personal Care' | 'Shopping' | 'Medical' | 'Lifestyle & Care' -> 'Personal & Lifestyle'
 * - 'Tea/Coffee' | 'Cool Drinks' | 'Beverages' -> 'Snacks'
 * - 'Cigarette' | 'Hans' | 'Tobacco Products' | 'Liquor' | 'Alcohol' -> 'Others'
 */
export function normalizeCategoryName(rawCategory?: string): ActiveCategoryName {
  if (!rawCategory) return 'Others';
  const trimmed = rawCategory.trim();

  // Consolidated into Personal & Lifestyle
  if (
    trimmed === 'Personal Care' ||
    trimmed === 'Shopping' ||
    trimmed === 'Medical' ||
    trimmed === 'Personal & Lifestyle' ||
    trimmed === 'Lifestyle & Care'
  ) {
    return 'Personal & Lifestyle';
  }

  // Mapped to Beverages
  if (
    trimmed === 'Tea/Coffee' ||
    trimmed === 'Cool Drinks' ||
    trimmed === 'Beverages'
  ) {
    return 'Beverages';
  }

  // Mapped to Others
  if (
    trimmed === 'Cigarette' ||
    trimmed === 'Hans' ||
    trimmed === 'Tobacco Products' ||
    trimmed === 'Liquor' ||
    trimmed === 'Alcohol'
  ) {
    return 'Others';
  }

  // Check if it already matches an active category
  const match = CATEGORIES.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
  if (match) {
    return match.name;
  }

  return 'Others';
}

/**
 * Returns CategoryMeta for any category name (including legacy or historical names).
 * Always returns a valid CategoryMeta object, falling back to 'Others'.
 */
export function getCategoryMeta(rawCategory?: string): CategoryMeta {
  const normalized = normalizeCategoryName(rawCategory);
  return CATEGORIES.find(c => c.name === normalized) || CATEGORIES[CATEGORIES.length - 1];
}

export const MEMBERS = [
  {
    id: 'nimal',
    name: 'Nimal' as const,
    avatarColor: 'bg-[#7C5CFC] text-white',
    badgeBg: 'bg-[#7C5CFC]/15 text-[#a78bfa] border-[#7C5CFC]/30',
    avatarLetter: 'N',
    colorHex: '#7C5CFC'
  },
  {
    id: 'etti',
    name: 'Etti' as const,
    avatarColor: 'bg-[#10B981] text-white',
    badgeBg: 'bg-[#10B981]/15 text-[#34d399] border-[#10B981]/30',
    avatarLetter: 'E',
    colorHex: '#10B981'
  },
  {
    id: 'dharan',
    name: 'Dharan' as const,
    avatarColor: 'bg-[#F97316] text-white',
    badgeBg: 'bg-[#F97316]/15 text-[#fb923c] border-[#F97316]/30',
    avatarLetter: 'D',
    colorHex: '#F97316'
  },
  {
    id: 'sanjai',
    name: 'Sanjai' as const,
    avatarColor: 'bg-[#3B82F6] text-white',
    badgeBg: 'bg-[#3B82F6]/15 text-[#60a5fa] border-[#3B82F6]/30',
    avatarLetter: 'S',
    colorHex: '#3B82F6'
  },
  {
    id: 'santhosh',
    name: 'Santhosh' as const,
    avatarColor: 'bg-[#EC4899] text-white',
    badgeBg: 'bg-[#EC4899]/15 text-[#f472b6] border-[#EC4899]/30',
    avatarLetter: 'St',
    colorHex: '#EC4899'
  },
  {
    id: 'sujhay',
    name: 'Sujhay' as const,
    avatarColor: 'bg-[#22D3EE] text-slate-950 font-black',
    badgeBg: 'bg-[#22D3EE]/15 text-[#22d3ee] border-[#22D3EE]/30',
    avatarLetter: 'Sj',
    colorHex: '#22D3EE'
  }
];

export function getMemberWithAvatar(name: MemberName): Member {
  const base = MEMBERS.find(m => m.name === name) || MEMBERS[0];
  const avatarUrl = getMemberAvatar(name);
  return {
    ...base,
    avatarUrl
  };
}

export function getAllMembersWithAvatars(): Member[] {
  return MEMBERS.map(m => ({
    ...m,
    avatarUrl: getMemberAvatar(m.name)
  }));
}

export const PAYMENT_MODES: { name: PaymentMode; iconName: string; color: string; badge: string }[] = [
  { name: 'UPI', iconName: 'QrCode', color: '#6366F1', badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
  { name: 'Cash', iconName: 'Banknote', color: '#10B981', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  { name: 'Card', iconName: 'CreditCard', color: '#3B82F6', badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  { name: 'Friend Paid', iconName: 'Users', color: '#8B5CF6', badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800' }
];
