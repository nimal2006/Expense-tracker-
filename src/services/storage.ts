import { Expense, MemberName, CategoryName, PaymentMode, SmartInsight } from '../types';
import { INITIAL_EXPENSES } from '../data/initialExpenses';

const STORAGE_KEY_EXPENSES = 'friends_expense_tracker_db_v2';
const STORAGE_KEY_CURRENT_USER = 'friends_expense_current_user_v2';
const STORAGE_KEY_BUDGETS = 'friends_expense_budgets_v2';
const STORAGE_KEY_USER_PINS = 'friends_expense_pins_v2';

export class DatabaseService {
  private static instance: DatabaseService;
  private expenses: Expense[] = [];
  private budgets: Record<string, number> = {
    '2026-08': 25000,
    '2026-09': 20000
  };

  private constructor() {
    this.initDatabase();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private initDatabase(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_EXPENSES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.expenses = parsed;
        } else {
          this.expenses = [...INITIAL_EXPENSES];
          this.saveExpenses();
        }
      } else {
        this.expenses = [...INITIAL_EXPENSES];
        this.saveExpenses();
      }

      const storedBudgets = localStorage.getItem(STORAGE_KEY_BUDGETS);
      if (storedBudgets) {
        this.budgets = { ...this.budgets, ...JSON.parse(storedBudgets) };
      }
    } catch (e) {
      console.error('Error initializing database storage:', e);
      this.expenses = [...INITIAL_EXPENSES];
    }
  }

  private saveExpenses(): void {
    try {
      localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(this.expenses));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  // --- Auth & Member Session ---
  public getCurrentUser(): MemberName {
    const user = localStorage.getItem(STORAGE_KEY_CURRENT_USER) as MemberName;
    if (user && ['Nimal', 'Etti', 'Dharan', 'Sanjai', 'Santhosh'].includes(user)) {
      return user;
    }
    return 'Nimal'; // Default one-tap user
  }

  public setCurrentUser(member: MemberName): void {
    localStorage.setItem(STORAGE_KEY_CURRENT_USER, member);
  }

  public getUserPin(member: MemberName): string | null {
    try {
      const pins = JSON.parse(localStorage.getItem(STORAGE_KEY_USER_PINS) || '{}');
      return pins[member] || null;
    } catch {
      return null;
    }
  }

  public setUserPin(member: MemberName, pin: string): void {
    try {
      const pins = JSON.parse(localStorage.getItem(STORAGE_KEY_USER_PINS) || '{}');
      pins[member] = pin;
      localStorage.setItem(STORAGE_KEY_USER_PINS, JSON.stringify(pins));
    } catch (e) {
      console.error('Failed to save PIN:', e);
    }
  }

  // --- Expense CRUD & Row-Level Ownership ---
  public getAllExpenses(): Expense[] {
    return [...this.expenses].sort((a, b) => {
      // Sort newest first
      const dateA = new Date(`${a.date}T${a.time || '00:00'}:00`).getTime();
      const dateB = new Date(`${b.date}T${b.time || '00:00'}:00`).getTime();
      return dateB - dateA;
    });
  }

  public addExpense(data: Omit<Expense, 'id' | 'createdAt'>): { success: boolean; expense?: Expense; error?: string } {
    if (!data.amount || isNaN(Number(data.amount)) || Number(data.amount) <= 0) {
      return { success: false, error: 'Please enter a valid amount greater than 0.' };
    }
    if (!data.category) {
      return { success: false, error: 'Please select an expense category.' };
    }
    if (!data.paymentMode) {
      return { success: false, error: 'Please select a payment mode (UPI, Cash, Card, Friend Paid).' };
    }

    const now = new Date();
    const id = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newExpense: Expense = {
      ...data,
      id,
      amount: Math.round(Number(data.amount) * 100) / 100, // Proper decimal precision
      quantity: Number(data.quantity) || 1,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    this.expenses.unshift(newExpense);
    this.saveExpenses();
    return { success: true, expense: newExpense };
  }

  public updateExpense(
    id: string,
    updates: Partial<Omit<Expense, 'id' | 'createdAt'>>,
    currentMember: MemberName
  ): { success: boolean; error?: string; expense?: Expense } {
    const index = this.expenses.findIndex(e => e.id === id);
    if (index === -1) {
      return { success: false, error: 'Expense record not found.' };
    }

    const existing = this.expenses[index];
    // Supabase RLS simulation: enforce that only the author can edit
    if (existing.member !== currentMember) {
      return {
        success: false,
        error: `Security Rule Violation: You can only edit your own expenses. This entry was created by ${existing.member}.`
      };
    }

    if (updates.amount !== undefined && (isNaN(Number(updates.amount)) || Number(updates.amount) <= 0)) {
      return { success: false, error: 'Please enter a valid amount greater than 0.' };
    }

    const updated: Expense = {
      ...existing,
      ...updates,
      amount: updates.amount !== undefined ? Math.round(Number(updates.amount) * 100) / 100 : existing.amount,
      updatedAt: new Date().toISOString()
    };

    this.expenses[index] = updated;
    this.saveExpenses();
    return { success: true, expense: updated };
  }

  public deleteExpense(id: string, currentMember: MemberName): { success: boolean; error?: string } {
    const index = this.expenses.findIndex(e => e.id === id);
    if (index === -1) {
      return { success: false, error: 'Expense record not found.' };
    }

    const existing = this.expenses[index];
    // Supabase RLS simulation: enforce that only the author can delete
    if (existing.member !== currentMember) {
      return {
        success: false,
        error: `Security Rule Violation: You can only delete your own expenses. This entry belongs to ${existing.member}.`
      };
    }

    this.expenses.splice(index, 1);
    this.saveExpenses();
    return { success: true };
  }

  // Duplicate entry lightweight detector (non-blocking warning)
  public checkDuplicateWarning(
    amount: number,
    category: CategoryName,
    member: MemberName,
    date: string
  ): Expense | null {
    if (!amount || isNaN(amount)) return null;
    const cleanAmount = Number(amount);
    
    // Find if same member had an identical or close transaction on the same date with same category
    const match = this.expenses.find(
      e => e.member === member && e.date === date && e.category === category && Math.abs(e.amount - cleanAmount) < 0.01
    );
    return match || null;
  }

  // --- Budgets ---
  public getBudget(monthStr: string): number {
    return this.budgets[monthStr] || 20000;
  }

  public setBudget(monthStr: string, amount: number): void {
    this.budgets[monthStr] = amount;
    localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(this.budgets));
  }

  // --- Reset/Restore ---
  public resetToAugustData(): void {
    this.expenses = [...INITIAL_EXPENSES];
    this.saveExpenses();
  }

  public importJsonExpenses(jsonData: Expense[]): { success: boolean; count: number; error?: string } {
    try {
      if (!Array.isArray(jsonData)) return { success: false, count: 0, error: 'Invalid JSON format' };
      const valid = jsonData.filter(e => e.member && e.amount > 0 && e.date);
      this.expenses = valid;
      this.saveExpenses();
      return { success: true, count: valid.length };
    } catch (e: any) {
      return { success: false, count: 0, error: e.message };
    }
  }
}

export const db = DatabaseService.getInstance();
