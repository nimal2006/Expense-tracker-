import { Expense, MemberName, CategoryName, PaymentMode } from '../types';
import { INITIAL_EXPENSES } from '../data/initialExpenses';
import { 
  seedInitialDataIfEmpty, 
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
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.expenses = parsed;
        } else {
          this.expenses = [...INITIAL_EXPENSES];
          this.saveLocalExpenses();
        }
      } else {
        // Check older storage keys if upgrading
        const older = localStorage.getItem('friends_expense_tracker_db_v2');
        if (older) {
          const parsedOlder = JSON.parse(older);
          if (Array.isArray(parsedOlder) && parsedOlder.length > 0) {
            this.expenses = parsedOlder;
            this.saveLocalExpenses();
          } else {
            this.expenses = [...INITIAL_EXPENSES];
            this.saveLocalExpenses();
          }
        } else {
          this.expenses = [...INITIAL_EXPENSES];
          this.saveLocalExpenses();
        }
      }

      const storedBudgets = localStorage.getItem(STORAGE_KEY_BUDGETS);
      if (storedBudgets) {
        this.budgets = { ...this.budgets, ...JSON.parse(storedBudgets) };
      }
    } catch (e) {
      console.error('Error initializing local database storage:', e);
      this.expenses = [...INITIAL_EXPENSES];
    }
  }

  private initFirebaseSync(): void {
    if (this.hasInitializedCloudSync) return;
    this.hasInitializedCloudSync = true;

    // 1. Seed cloud data if cloud is empty on fresh database
    seedInitialDataIfEmpty().catch(console.warn);

    // 2. Real-time listener for cloud expenses
    subscribeToExpenses((cloudExpenses) => {
      this.isCloudConnected = true;
      if (cloudExpenses && cloudExpenses.length > 0) {
        // Merge cloud expenses with any local-only entries so nothing gets lost
        const cloudIds = new Set(cloudExpenses.map(e => e.id));
        const localOnly = this.expenses.filter(e => !cloudIds.has(e.id));

        // Upload any local-only expenses to cloud
        if (localOnly.length > 0) {
          console.log(`Syncing ${localOnly.length} local offline expenses to Cloud Firestore...`);
          localOnly.forEach(exp => {
            saveExpenseToCloud(exp).catch(console.warn);
          });
        }

        // Combine and sort
        const combined = [...cloudExpenses, ...localOnly];
        combined.sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time || '00:00'}:00`).getTime();
          const dateB = new Date(`${b.date}T${b.time || '00:00'}:00`).getTime();
          return dateB - dateA;
        });

        this.expenses = combined;
        this.saveLocalExpenses();
        this.notifyListeners();
      }
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
    return !!user && ['Nimal', 'Etti', 'Dharan', 'Sanjai', 'Santhosh'].includes(user);
  }

  public getCurrentUser(): MemberName {
    const user = localStorage.getItem(STORAGE_KEY_CURRENT_USER) as MemberName;
    if (user && ['Nimal', 'Etti', 'Dharan', 'Sanjai', 'Santhosh'].includes(user)) {
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
    
    // Clean fields so there are no undefined values
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

    // Immediately update in-memory array & local storage
    this.expenses.unshift(newExpense);
    this.saveLocalExpenses();
    this.notifyListeners();

    // Sync to Cloud Firestore instantly
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
    // Row-level ownership validation: only author can edit
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

    // Clean up empty/whitespace fields
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

    // Sync update to Cloud Firestore
    saveExpenseToCloud(updated).catch((err) => {
      console.warn('Firestore cloud update note:', err);
    });

    return { success: true, expense: updated };
  }

  public deleteExpense(id: string, currentMember: MemberName): { success: boolean; error?: string } {
    const index = this.expenses.findIndex(e => e.id === id);
    if (index === -1) {
      return { success: false, error: 'Expense record not found.' };
    }

    const existing = this.expenses[index];
    // Row-level ownership validation: only author can delete
    if (existing.member !== currentMember) {
      return {
        success: false,
        error: `Security Rule Violation: You can only delete your own expenses. This entry belongs to ${existing.member}.`
      };
    }

    this.expenses.splice(index, 1);
    this.saveLocalExpenses();
    this.notifyListeners();

    // Delete from Cloud Firestore
    deleteExpenseFromCloud(id).catch((err) => {
      console.warn('Firestore cloud delete note:', err);
    });

    return { success: true };
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
    // Fallback: if month general budget exists, divide by 5, else 5000 default personal budget
    const groupBudget = this.budgets[monthStr];
    if (groupBudget && groupBudget > 0) {
      return Math.round(groupBudget / 5);
    }
    return 5000;
  }

  public getGroupBudget(monthStr: string): number {
    if (this.budgets[monthStr] !== undefined && this.budgets[monthStr] > 0) {
      return this.budgets[monthStr];
    }
    // Sum of members' individual budgets if available
    const members: MemberName[] = ['Nimal', 'Etti', 'Dharan', 'Sanjai', 'Santhosh'];
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

  // --- Reset/Restore ---
  public resetToAugustData(): void {
    this.expenses = [...INITIAL_EXPENSES];
    this.saveLocalExpenses();
    this.notifyListeners();
    INITIAL_EXPENSES.forEach(exp => {
      saveExpenseToCloud(exp).catch(console.warn);
    });
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
