import { Expense, MemberName, CategoryName, PaymentMode } from '../types';
import { AUGUST_2026_EXPENSES } from '../data/august2026Data';
import { 
  purgeSampleDataFromCloud,
  clearAllExpensesFromCloud,
  subscribeToExpenses, 
  subscribeToBudgets, 
  saveExpenseToCloud, 
  deleteExpenseFromCloud, 
  saveBudgetToCloud 
} from './firebase';

const STORAGE_KEY_EXPENSES = 'friends_expense_tracker_db_v3';
const STORAGE_KEY_CURRENT_USER = 'friends_expense_current_user_v2';
const STORAGE_KEY_BUDGETS = 'friends_expense_budgets_v2';
const STORAGE_KEY_USER_PINS = 'friends_expense_pins_v2';
const STORAGE_KEY_AUG26_SEEDED = 'friends_expense_aug26_seeded_v1';

const SAMPLE_PREFIXES = ['nim-', 'ett-', 'dha-', 'san-', 'st-', 'suj-'];

export function generateExpenseSignature(e: { member: string; date: string; amount: number; category: string; itemName?: string; paymentMode: string; place?: string }): string {
  const norm = (s?: string) => (s || '').trim().toLowerCase();
  return `${norm(e.member)}|${e.date}|${Number(e.amount).toFixed(2)}|${norm(e.category)}|${norm(e.itemName)}|${norm(e.paymentMode)}|${norm(e.place)}`;
}

type ListenerCallback = (expenses: Expense[]) => void;

export class DatabaseService {
  private static instance: DatabaseService;
  private expenses: Expense[] = [];
  private budgets: Record<string, number> = {
    '2026-08': 25000,
    '2026-09': 20000
  };
  private listeners: Set<ListenerCallback> = new Set();
  private isCloudConnected: boolean = false;
  private hasInitializedCloudSync: boolean = false;

  private constructor() {
    this.initDatabase();
    this.initFirebaseSync();
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
        if (Array.isArray(parsed)) {
          // Filter out any legacy sample expenses from local storage
          this.expenses = parsed.filter(e => !e.id || !SAMPLE_PREFIXES.some(p => e.id.startsWith(p)));
          this.saveLocalExpenses();
        } else {
          this.expenses = [];
          this.saveLocalExpenses();
        }
      } else {
        this.expenses = [];
        this.saveLocalExpenses();
      }

      // Ensure historical August 2026 data is seeded idempotently
      this.seedAugust2026DataIfMissing();

      const storedBudgets = localStorage.getItem(STORAGE_KEY_BUDGETS);
      if (storedBudgets) {
        this.budgets = { ...this.budgets, ...JSON.parse(storedBudgets) };
      }
    } catch (e) {
      console.error('Error initializing local database storage:', e);
      this.expenses = [];
    }
  }

  public seedAugust2026DataIfMissing(): { added: number } {
    try {
      const existingIds = new Set<string>();
      const existingSigs = new Set<string>();

      this.expenses.forEach(e => {
        if (e.id) existingIds.add(e.id);
        existingSigs.add(generateExpenseSignature(e));
      });

      const missing: Expense[] = [];
      for (const item of AUGUST_2026_EXPENSES) {
        const sig = generateExpenseSignature(item);
        if (!existingIds.has(item.id) && !existingSigs.has(sig)) {
          missing.push(item);
          existingIds.add(item.id);
          existingSigs.add(sig);
        }
      }

      if (missing.length > 0) {
        this.expenses = [...this.expenses, ...missing];
        this.saveLocalExpenses();
        this.notifyListeners();
        // Sync to Firestore in background without blocking
        missing.forEach(exp => {
          saveExpenseToCloud(exp).catch(err => console.warn('Cloud sync error for historical item:', err));
        });
      }

      localStorage.setItem(STORAGE_KEY_AUG26_SEEDED, 'true');
      return { added: missing.length };
    } catch (err) {
      console.error('Error seeding August 2026 data:', err);
      return { added: 0 };
    }
  }

  private initFirebaseSync(): void {
    if (this.hasInitializedCloudSync) return;
    this.hasInitializedCloudSync = true;

    // 1. Purge any legacy sample data from cloud database
    purgeSampleDataFromCloud().catch(console.warn);

    // 2. Real-time authoritative listener for cloud expenses
    subscribeToExpenses((cloudExpenses) => {
      this.isCloudConnected = true;

      // Filter out any sample expenses that might come from cloud
      const cleanCloudExpenses = (cloudExpenses || []).filter(
        e => !e.id || !SAMPLE_PREFIXES.some(p => e.id.startsWith(p))
      );

      // Sort newest first
      cleanCloudExpenses.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time || '00:00'}:00`).getTime();
        const dateB = new Date(`${b.date}T${b.time || '00:00'}:00`).getTime();
        return dateB - dateA;
      });

      this.expenses = cleanCloudExpenses;
      // Also ensure August 2026 historical data is merged if cloud was empty
      this.seedAugust2026DataIfMissing();
      this.saveLocalExpenses();
      this.notifyListeners();
    });

    // 3. Real-time listener for cloud budgets
    subscribeToBudgets((cloudBudgets) => {
      this.budgets = { ...this.budgets, ...cloudBudgets };
      localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(this.budgets));
    });
  }

  private saveLocalExpenses(): void {
    try {
      localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(this.expenses));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  public subscribe(callback: ListenerCallback): () => void {
    this.listeners.add(callback);
    // Immediately invoke with current data
    callback(this.getAllExpenses());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(): void {
    const all = this.getAllExpenses();
    this.listeners.forEach(cb => {
      try {
        cb(all);
      } catch (e) {
        console.error('Listener callback error:', e);
      }
    });
  }

  public isLiveConnected(): boolean {
    return this.isCloudConnected;
  }

  // --- Auth & Member Session ---
  public hasSavedUser(): boolean {
    const user = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    return !!user && ['Nimal', 'Etti', 'Dharan', 'Sanjai', 'Santhosh', 'Sujhay'].includes(user);
  }

  public getCurrentUser(): MemberName {
    const user = localStorage.getItem(STORAGE_KEY_CURRENT_USER) as MemberName;
    if (user && ['Nimal', 'Etti', 'Dharan', 'Sanjai', 'Santhosh', 'Sujhay'].includes(user)) {
      return user;
    }
    return 'Nimal'; // Fallback default
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

  // --- Expense CRUD & Real-Time Deletion ---
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
      id,
      member: data.member,
      amount: Math.round(Number(data.amount) * 100) / 100,
      category: data.category,
      paymentMode: data.paymentMode,
      date: data.date,
      time: data.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      quantity: Number(data.quantity) || 1,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    if (data.itemName && data.itemName.trim()) {
      newExpense.itemName = data.itemName.trim();
    }
    if (data.place && data.place.trim()) {
      newExpense.place = data.place.trim();
    }
    if (data.notes && data.notes.trim()) {
      newExpense.notes = data.notes.trim();
    }

    // Update in-memory array & local storage
    this.expenses.unshift(newExpense);
    this.saveLocalExpenses();
    this.notifyListeners();

    // Sync to Cloud Firestore in real time
    saveExpenseToCloud(newExpense).catch((err) => {
      console.warn('Firestore cloud sync pending or offline:', err);
    });

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

    if (updates.amount !== undefined && (isNaN(Number(updates.amount)) || Number(updates.amount) <= 0)) {
      return { success: false, error: 'Please enter a valid amount greater than 0.' };
    }

    const updated: Expense = {
      ...existing,
      ...updates,
      amount: updates.amount !== undefined ? Math.round(Number(updates.amount) * 100) / 100 : existing.amount,
      updatedAt: new Date().toISOString()
    };

    if (updates.itemName !== undefined) {
      if (updates.itemName && updates.itemName.trim()) {
        updated.itemName = updates.itemName.trim();
      } else {
        delete updated.itemName;
      }
    }
    if (updates.place !== undefined) {
      if (updates.place && updates.place.trim()) {
        updated.place = updates.place.trim();
      } else {
        delete updated.place;
      }
    }

    this.expenses[index] = updated;
    this.saveLocalExpenses();
    this.notifyListeners();

    // Sync update to Cloud Firestore in real time
    saveExpenseToCloud(updated).catch((err) => {
      console.warn('Firestore cloud update note:', err);
    });

    return { success: true, expense: updated };
  }

  public deleteExpense(id: string, currentMember?: MemberName): { success: boolean; error?: string } {
    const index = this.expenses.findIndex(e => e.id === id);
    if (index === -1) {
      return { success: false, error: 'Expense record not found.' };
    }

    // Delete locally immediately
    this.expenses.splice(index, 1);
    this.saveLocalExpenses();
    this.notifyListeners();

    // Delete permanently from Cloud Firestore
    deleteExpenseFromCloud(id).catch((err) => {
      console.warn('Firestore cloud delete note:', err);
    });

    return { success: true };
  }

  public clearAllExpenses(): void {
    this.expenses = [];
    this.saveLocalExpenses();
    this.notifyListeners();
    clearAllExpensesFromCloud().catch((err) => {
      console.warn('Error clearing expenses from Cloud Firestore:', err);
    });
  }

  // Duplicate entry detector
  public checkDuplicateWarning(
    amount: number,
    category: CategoryName,
    member: MemberName,
    date: string
  ): Expense | null {
    if (!amount || isNaN(amount)) return null;
    const cleanAmount = Number(amount);
    
    const match = this.expenses.find(
      e => e.member === member && e.date === date && e.category === category && Math.abs(e.amount - cleanAmount) < 0.01
    );
    return match || null;
  }

  // --- Budgets (Personal & Group) ---
  public getBudget(monthStr: string, member?: MemberName): number {
    const targetMember = member || this.getCurrentUser();
    const personalKey = `${targetMember}_${monthStr}`;
    if (this.budgets[personalKey] !== undefined && this.budgets[personalKey] > 0) {
      return this.budgets[personalKey];
    }
    const groupBudget = this.budgets[monthStr];
    if (groupBudget && groupBudget > 0) {
      return Math.round(groupBudget / 6);
    }
    return 5000;
  }

  public getGroupBudget(monthStr: string): number {
    if (this.budgets[monthStr] !== undefined && this.budgets[monthStr] > 0) {
      return this.budgets[monthStr];
    }
    const members: MemberName[] = ['Nimal', 'Etti', 'Dharan', 'Sanjai', 'Santhosh', 'Sujhay'];
    let sum = 0;
    let anySet = false;
    members.forEach(m => {
      const key = `${m}_${monthStr}`;
      if (this.budgets[key] !== undefined && this.budgets[key] > 0) {
        sum += this.budgets[key];
        anySet = true;
      }
    });
    if (anySet) return sum;
    return 25000;
  }

  public setBudget(monthStr: string, amount: number, member?: MemberName): void {
    const targetMember = member || this.getCurrentUser();
    const key = `${targetMember}_${monthStr}`;
    this.budgets[key] = amount;
    localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(this.budgets));
    saveBudgetToCloud(key, amount, targetMember, monthStr).catch(console.warn);
  }

  public setGroupBudget(monthStr: string, amount: number): void {
    this.budgets[monthStr] = amount;
    localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(this.budgets));
    saveBudgetToCloud(monthStr, amount, undefined, monthStr).catch(console.warn);
  }

  public importJsonExpenses(jsonData: Expense[]): { success: boolean; count: number; error?: string } {
    try {
      if (!Array.isArray(jsonData)) return { success: false, count: 0, error: 'Invalid JSON format' };
      const valid = jsonData.filter(e => e.member && e.amount > 0 && e.date);
      this.expenses = valid;
      this.saveLocalExpenses();
      this.notifyListeners();
      valid.forEach(exp => saveExpenseToCloud(exp).catch(console.warn));
      return { success: true, count: valid.length };
    } catch (e: any) {
      return { success: false, count: 0, error: e.message };
    }
  }
}

export const db = DatabaseService.getInstance();
