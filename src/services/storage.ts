import { Expense, MemberName, CategoryName, PaymentMode } from '../types';
import { AUGUST_2026_EXPENSES } from '../data/august2026Data';
import { SEPTEMBER_2026_EXPENSES } from '../data/september2026Data';
import { normalizeCategoryName } from '../data/categories';
import { clampTimestampToNow, getLocalDateString, getCurrentLocalTimeString, sortExpensesDescending } from '../utils/analytics';
import { isQuotaError, isUnavailableError, isPermissionDeniedError } from '../lib/firebase';
import { 
  saveExpense, 
  saveExpensesBatch,
  deleteExpense as deleteFromFirestore, 
  saveBudget,
  clearAllExpenses as clearFirestoreExpenses,
  subscribeToExpenses,
  subscribeToBudgets,
  subscribeToAvatars,
  saveMemberAvatar as saveAvatarToFirestore,
  deleteMemberAvatar as deleteAvatarFromFirestore,
  validateFirestoreConnection,
  SnapshotMeta
} from './firebase-service';

export type CloudSyncState = 'synced' | 'saving' | 'offline' | 'error';

export interface DatabaseSyncInfo {
  state: CloudSyncState;
  hasPendingWrites: boolean;
  isFromCache: boolean;
  isOnline: boolean;
  isOffline: boolean;
  isQuotaExceeded: boolean;
  pendingCount: number;
  lastSyncedAt: Date | null;
}

interface PendingOperation {
  id: string;
  type: 'save_expense' | 'delete_expense' | 'save_budget' | 'save_avatar' | 'delete_avatar';
  payload: any;
  timestamp: number;
}

const STORAGE_KEY_EXPENSES = 'friends_expense_tracker_db_v3';
const STORAGE_KEY_CURRENT_USER = 'friends_expense_current_user_v2';
const STORAGE_KEY_BUDGETS = 'friends_expense_budgets_v2';
const STORAGE_KEY_USER_PINS = 'friends_expense_pins_v2';
const STORAGE_KEY_AUG26_SEEDED = 'friends_expense_aug26_seeded_v4';
const STORAGE_KEY_SEP26_SEEDED = 'friends_expense_sep26_seeded_v3';
const STORAGE_KEY_DELETED_IDS = 'friends_expense_deleted_ids_v1';
const STORAGE_KEY_SEED_COMPLETED = 'seed_v4_completed';
const STORAGE_KEY_PENDING_OPS = 'friends_expense_pending_ops_v1';
const STORAGE_KEY_MEMBER_AVATARS = 'friends_expense_member_avatars_v1';

const SAMPLE_PREFIXES = ['nim-', 'ett-', 'dha-', 'san-', 'st-', 'suj-'];

export function generateExpenseSignature(e: { member: string; date: string; amount: number; category: string; itemName?: string; notes?: string; paymentMode?: string; place?: string }): string {
  const norm = (s?: string) => (s || '').trim().toLowerCase();
  const normCat = normalizeCategoryName(e.category);
  const desc = norm(e.itemName) || norm(e.notes);
  return `${norm(e.member)}|${e.date}|${Number(e.amount).toFixed(2)}|${normCat}|${desc}`;
}

export function deduplicateExpensesList(expenses: Expense[]): {
  uniqueExpenses: Expense[];
  removedDuplicates: Expense[];
} {
  const seenIds = new Set<string>();
  const seenSigs = new Set<string>();
  const uniqueExpenses: Expense[] = [];
  const removedDuplicates: Expense[] = [];

  for (const exp of expenses) {
    if (!exp || !exp.member || !exp.amount || !exp.date) continue;

    const id = exp.id ? String(exp.id).trim() : '';
    const sig = generateExpenseSignature(exp);

    const isDupId = Boolean(id && seenIds.has(id));
    const isDupSig = Boolean(sig && seenSigs.has(sig));

    if (isDupId || isDupSig) {
      removedDuplicates.push(exp);
    } else {
      if (id) seenIds.add(id);
      seenSigs.add(sig);
      uniqueExpenses.push(exp);
    }
  }

  return { uniqueExpenses, removedDuplicates };
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
  private cloudQuotaExceeded: boolean = false;
  private isOffline: boolean = false;
  private hasPendingWrites: boolean = false;
  private isFromCache: boolean = false;
  private lastSyncedAt: Date | null = null;
  private unsubExpenses: (() => void) | null = null;
  private unsubBudgets: (() => void) | null = null;
  private unsubAvatars: (() => void) | null = null;

  private constructor() {
    this.initDatabase();
    this.initCloudSync();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private getPendingOperations(): PendingOperation[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PENDING_OPS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private savePendingOperations(ops: PendingOperation[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_PENDING_OPS, JSON.stringify(ops));
    } catch (e) {
      console.warn('Failed to save pending operations:', e);
    }
  }

  private queuePendingOperation(type: PendingOperation['type'], payload: any): void {
    const ops = this.getPendingOperations();
    ops.push({
      id: `op-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      timestamp: Date.now()
    });
    this.savePendingOperations(ops);
    this.notifyListeners();
  }

  public async flushPendingOperations(): Promise<void> {
    const ops = this.getPendingOperations();
    if (ops.length === 0 || this.cloudQuotaExceeded || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return;
    }

    console.log(`[Database] Flushing ${ops.length} pending local operations to Cloud Firestore...`);
    const remaining: PendingOperation[] = [];

    for (const op of ops) {
      try {
        if (op.type === 'save_expense') {
          await saveExpense(op.payload);
        } else if (op.type === 'delete_expense') {
          await deleteFromFirestore(op.payload.id);
        } else if (op.type === 'save_budget') {
          await saveBudget(op.payload);
        } else if (op.type === 'save_avatar') {
          await saveAvatarToFirestore(op.payload.member, op.payload.avatarUrl);
        } else if (op.type === 'delete_avatar') {
          await deleteAvatarFromFirestore(op.payload.member);
        }
      } catch (e) {
        if (isQuotaError(e)) {
          this.handleCloudError(e);
          remaining.push(op);
          break;
        } else if (isUnavailableError(e)) {
          remaining.push(op);
          break;
        }
      }
    }

    this.savePendingOperations(remaining);
    if (remaining.length === 0) {
      this.lastSyncedAt = new Date();
    }
    this.notifyListeners();
  }

  public initCloudSync(): void {
    if (this.hasInitializedCloudSync) return;
    this.hasInitializedCloudSync = true;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[Database] Device online. Flushing pending writes to Cloud Firestore...');
        this.isOffline = false;
        validateFirestoreConnection().catch(() => {});
        this.flushPendingOperations();
        this.notifyListeners();
      });

      window.addEventListener('offline', () => {
        console.warn('[Database] Device offline. Changes queued in local cache.');
        this.isOffline = true;
        this.notifyListeners();
      });
    }

    // 1. Real-time Expenses Snapshot Listener with metadata changes
    this.unsubExpenses = subscribeToExpenses(
      (cloudExpenses, meta) => {
        this.hasPendingWrites = meta.hasPendingWrites;
        this.isFromCache = meta.isFromCache;
        this.isOffline = false;
        this.isCloudConnected = true;

        if (cloudExpenses && cloudExpenses.length > 0) {
          const deletedIds = this.getDeletedIds();
          const valid = cloudExpenses.filter(e => e && e.id && !deletedIds.has(String(e.id)) && !SAMPLE_PREFIXES.some(p => String(e.id).startsWith(p)));
          const { uniqueExpenses } = deduplicateExpensesList(valid);
          const { cleaned, modified } = this.sanitizeAndClampExpenses(uniqueExpenses);
          this.expenses = cleaned;
          this.saveLocalExpenses();
          if (modified && !this.cloudQuotaExceeded) {
            const todayStr = getLocalDateString();
            const modifiedToday = cleaned.filter(e => e.date === todayStr);
            if (modifiedToday.length > 0) {
              saveExpensesBatch(modifiedToday).catch(() => {});
            }
          }
          if (!meta.hasPendingWrites && !meta.isFromCache) {
            this.lastSyncedAt = new Date();
          }
          this.notifyListeners();
        } else if (!meta.isFromCache && this.expenses.length > 0) {
          // Cloud is confirmed empty by the server (not just an initial local cache read), push local records to initialize
          this.syncLocalToCloud();
        }
      },
      (error) => this.handleCloudError(error)
    );

    // 2. Real-time Budgets Snapshot Listener with metadata changes
    this.unsubBudgets = subscribeToBudgets(
      (cloudBudgets, meta) => {
        if (cloudBudgets && Object.keys(cloudBudgets).length > 0) {
          this.budgets = { ...this.budgets, ...cloudBudgets };
          try {
            localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(this.budgets));
          } catch (e) {}
          this.notifyListeners();
        }
      },
      (error) => this.handleCloudError(error)
    );

    // 3. Real-time Avatars Snapshot Listener with metadata changes
    this.unsubAvatars = subscribeToAvatars(
      (cloudAvatars, meta) => {
        if (cloudAvatars && Object.keys(cloudAvatars).length > 0) {
          try {
            const raw = localStorage.getItem(STORAGE_KEY_MEMBER_AVATARS);
            const currentLocal = raw ? JSON.parse(raw) : {};
            let changed = false;

            Object.entries(cloudAvatars).forEach(([member, url]) => {
              if (currentLocal[member] !== url) {
                currentLocal[member] = url;
                changed = true;
              }
            });

            if (changed) {
              localStorage.setItem(STORAGE_KEY_MEMBER_AVATARS, JSON.stringify(currentLocal));
              if (typeof window !== 'undefined') {
                window.dispatchEvent(
                  new CustomEvent('friends_expense_avatar_changed', {
                    detail: { cloudSync: true }
                  })
                );
              }
              this.notifyListeners();
            }
          } catch (e) {
            console.warn('Failed to sync cloud avatars:', e);
          }
        }
      },
      (error) => this.handleCloudError(error)
    );

    // Flush any pending operations stored from a previous offline session
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.flushPendingOperations();
    }
  }

  private getDeletedIds(): Set<string> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DELETED_IDS);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }

  private markIdAsDeleted(id: string): void {
    try {
      const set = this.getDeletedIds();
      set.add(String(id));
      localStorage.setItem(STORAGE_KEY_DELETED_IDS, JSON.stringify(Array.from(set)));
    } catch (e) {
      console.warn('Failed to record deleted ID:', e);
    }
  }

  private sanitizeAndClampExpenses(expenses: Expense[]): { cleaned: Expense[]; modified: boolean } {
    const now = new Date();
    const todayStr = getLocalDateString(now);
    const currentHHMM = getCurrentLocalTimeString(now);

    let modified = false;
    const cleaned = expenses.map(e => {
      const entryDate = e.date || (e.createdAt ? e.createdAt.substring(0, 10) : todayStr);
      let entryTime = e.time;

      let needsUpdate = false;
      let newDate = entryDate;
      let newTime = entryTime;

      // 1. Prevent future date
      if (entryDate > todayStr) {
        newDate = todayStr;
        needsUpdate = true;
      }

      // 2. Prevent future time on today's date
      if (newDate === todayStr) {
        if (!newTime) {
          newTime = currentHHMM;
          needsUpdate = true;
        } else if (newTime > currentHHMM || (newTime === '16:00' && currentHHMM < '16:00')) {
          // Clamp to realistic past time or current time
          newTime = currentHHMM;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        modified = true;
        return {
          ...e,
          date: newDate,
          time: newTime,
          updatedAt: now.toISOString()
        };
      }
      return e;
    });

    return { cleaned, modified };
  }

  private initDatabase(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_EXPENSES);
      const deletedIds = this.getDeletedIds();

      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Filter out any legacy sample expenses or deleted IDs from local storage
          const clean = parsed.filter(e => e && e.id && !deletedIds.has(String(e.id)) && !SAMPLE_PREFIXES.some(p => String(e.id).startsWith(p)));
          const { uniqueExpenses, removedDuplicates } = deduplicateExpensesList(clean);
          const { cleaned, modified } = this.sanitizeAndClampExpenses(uniqueExpenses);
          this.expenses = cleaned;
          
          if (removedDuplicates.length > 0) {
            removedDuplicates.forEach(dup => {
              if (dup.id && !this.cloudQuotaExceeded) {
                deleteFromFirestore(dup.id).catch(err => this.handleCloudError(err));
              }
            });
          }
          this.saveLocalExpenses();
          if (modified && !this.cloudQuotaExceeded) {
            const todayStr = getLocalDateString();
            const modifiedToday = cleaned.filter(e => e.date === todayStr);
            if (modifiedToday.length > 0) {
              saveExpensesBatch(modifiedToday).catch(() => {});
            }
          }
        } else {
          this.expenses = [];
          this.saveLocalExpenses();
        }
      } else {
        this.expenses = [];
        this.saveLocalExpenses();
      }

      // Ensure historical data is seeded ONLY ONCE on first startup
      this.seedAllMissingHistoricalData();

      const storedBudgets = localStorage.getItem(STORAGE_KEY_BUDGETS);
      if (storedBudgets) {
        this.budgets = { ...this.budgets, ...JSON.parse(storedBudgets) };
      }
    } catch (e) {
      console.error('Error initializing local database storage:', e);
      this.expenses = [];
    }
  }

  public seedAllMissingHistoricalData(): { added: number } {
    let totalAdded = 0;
    
    // Seed August 2026
    const augResult = this.seedAugust2026DataIfMissing();
    totalAdded += augResult.added;

    // Seed September 2026
    const sepResult = this.seedSeptember2026DataIfMissing();
    totalAdded += sepResult.added;

    return { added: totalAdded };
  }

  public seedSeptember2026DataIfMissing(): { added: number } {
    try {
      const existingInMonth = this.expenses.filter(e => e.date.startsWith('2026-09'));
      const targetCount = SEPTEMBER_2026_EXPENSES.length;
      
      // If we already have the target count or more for this month, skip
      if (existingInMonth.length >= targetCount && localStorage.getItem(STORAGE_KEY_SEP26_SEEDED) === 'true') {
        return { added: 0 };
      }

      const existingSigs = new Set<string>();
      this.expenses.forEach(e => existingSigs.add(generateExpenseSignature(e)));

      const missing: Expense[] = [];
      const now = new Date();
      
      for (const item of SEPTEMBER_2026_EXPENSES) {
        const clamped = clampTimestampToNow(item.date, item.time);
        const sig = generateExpenseSignature({ ...item, date: clamped.date, time: clamped.time } as any);
        if (!existingSigs.has(sig)) {
          const id = `seed-sep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const fullItem: Expense = {
            ...item,
            date: clamped.date,
            time: clamped.time,
            id,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
          } as Expense;
          
          missing.push(fullItem);
          existingSigs.add(sig);
        }
      }

      if (missing.length > 0) {
        this.expenses = [...this.expenses, ...missing];
        const { uniqueExpenses } = deduplicateExpensesList(this.expenses);
        this.expenses = uniqueExpenses;
        this.saveLocalExpenses();
        this.notifyListeners();
        
        if (!this.cloudQuotaExceeded) {
          saveExpensesBatch(missing).catch(err => this.handleCloudError(err));
        }
      }

      localStorage.setItem(STORAGE_KEY_SEP26_SEEDED, 'true');
      return { added: missing.length };
    } catch (err) {
      console.error('Error seeding September 2026 data:', err);
      return { added: 0 };
    }
  }

  public seedAugust2026DataIfMissing(): { added: number } {
    try {
      const existingInMonth = this.expenses.filter(e => e.date.startsWith('2026-08'));
      const targetCount = AUGUST_2026_EXPENSES.length;

      // Allow seeding if count is lower than target
      if (existingInMonth.length >= targetCount && localStorage.getItem(STORAGE_KEY_AUG26_SEEDED) === 'true') {
        return { added: 0 };
      }

      const existingIds = new Set<string>();
      const existingSigs = new Set<string>();

      this.expenses.forEach(e => {
        if (e.id) existingIds.add(String(e.id));
        existingSigs.add(generateExpenseSignature(e));
      });

      const missing: Expense[] = [];
      const now = new Date();
      
      for (let i = 0; i < AUGUST_2026_EXPENSES.length; i++) {
        const item = AUGUST_2026_EXPENSES[i];
        const sig = generateExpenseSignature(item as any);
        
        if (!existingSigs.has(sig)) {
          // Generate deterministic but unique IDs for seeded records to help deduplication across clients
          const id = `seed-aug-${i}-${item.member.toLowerCase().substring(0, 3)}-${item.date.replace(/-/g, '')}`;
          const fullItem: Expense = {
            ...item,
            id,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
          } as Expense;
          
          missing.push(fullItem);
          existingSigs.add(sig);
        }
      }

      if (missing.length > 0) {
        this.expenses = [...this.expenses, ...missing];
        const { uniqueExpenses } = deduplicateExpensesList(this.expenses);
        this.expenses = uniqueExpenses;
        this.saveLocalExpenses();
        this.notifyListeners();
        
        // Sync to Firestore in chunks
        if (!this.cloudQuotaExceeded) {
          const CHUNK_SIZE = 100; // Smaller chunks for reliability
          for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
            const chunk = missing.slice(i, i + CHUNK_SIZE);
            saveExpensesBatch(chunk).catch(err => this.handleCloudError(err));
          }
        }
      }

      localStorage.setItem(STORAGE_KEY_SEED_COMPLETED, 'true');
      localStorage.setItem(STORAGE_KEY_AUG26_SEEDED, 'true');
      return { added: missing.length };
    } catch (err) {
      console.error('Error seeding August 2026 data:', err);
      return { added: 0 };
    }
  }

  public cleanDuplicateExpenses(): { removedCount: number; remainingCount: number } {
    const { uniqueExpenses, removedDuplicates } = deduplicateExpensesList(this.expenses);
    this.expenses = uniqueExpenses;
    this.saveLocalExpenses();
    this.notifyListeners();

    // Clean up duplicates permanently from Firestore
    removedDuplicates.forEach((dup) => {
      if (dup.id && !this.cloudQuotaExceeded) {
        deleteFromFirestore(dup.id).catch(err => this.handleCloudError(err));
      }
    });

    return {
      removedCount: removedDuplicates.length,
      remainingCount: uniqueExpenses.length
    };
  }

  public updateExpensesFromCloud(cloudExpenses: Expense[]): void {
    if (!cloudExpenses || cloudExpenses.length === 0) return;
    
    // We trust the cloud data as the source of truth if it exists
    this.expenses = [...cloudExpenses];
    this.saveLocalExpenses();
    // We don't notify here because the caller (App.tsx) will update its own state
  }

  public async syncLocalToCloud(): Promise<void> {
    if (this.cloudQuotaExceeded || this.expenses.length === 0) return;
    
    try {
      const CHUNK_SIZE = 400;
      for (let i = 0; i < this.expenses.length; i += CHUNK_SIZE) {
        const chunk = this.expenses.slice(i, i + CHUNK_SIZE);
        await saveExpensesBatch(chunk);
      }
      console.log(`[Database] Synchronized ${this.expenses.length} local records to cloud.`);
    } catch (err) {
      this.handleCloudError(err);
    }
  }

  private initSupabaseSync(): void {
    // Supabase sync is disabled in favor of Firebase Firestore.
    // Real-time listeners are now managed in App.tsx.
    this.isCloudConnected = true; 
    this.hasInitializedCloudSync = true;
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
    return this.isCloudConnected && !this.cloudQuotaExceeded;
  }

  public isQuotaExceeded(): boolean {
    return this.cloudQuotaExceeded;
  }

  public isAppOffline(): boolean {
    return this.isOffline;
  }

  public getSyncState(): CloudSyncState {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline || this.isOffline || this.cloudQuotaExceeded) {
      return 'offline';
    }
    const pendingCount = this.getPendingOperations().length;
    if (this.hasPendingWrites || this.isFromCache || pendingCount > 0) {
      return 'saving';
    }
    return 'synced';
  }

  public getSyncInfo(): DatabaseSyncInfo {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const pendingOps = this.getPendingOperations();
    return {
      state: this.getSyncState(),
      hasPendingWrites: this.hasPendingWrites,
      isFromCache: this.isFromCache,
      isOnline,
      isOffline: this.isOffline,
      isQuotaExceeded: this.cloudQuotaExceeded,
      pendingCount: pendingOps.length + (this.hasPendingWrites ? 1 : 0),
      lastSyncedAt: this.lastSyncedAt
    };
  }

  public getHasPendingWrites(): boolean {
    return this.hasPendingWrites || this.getPendingOperations().length > 0;
  }

  public getIsFromCache(): boolean {
    return this.isFromCache;
  }

  public getPendingCount(): number {
    return this.getPendingOperations().length;
  }

  public getLastSyncedAt(): Date | null {
    return this.lastSyncedAt;
  }

  private handleCloudError(error: any) {
    if (isQuotaError(error)) {
      if (!this.cloudQuotaExceeded) {
        console.error('[Database] Cloud Firestore quota exceeded. Switching to local-only mode to prevent console errors.');
        this.cloudQuotaExceeded = true;
        this.notifyListeners();
      }
    } else if (isUnavailableError(error)) {
      if (!this.isOffline) {
        console.warn('[Database] Cloud Firestore is unavailable (offline). Operating in local mode.');
        this.isOffline = true;
        this.notifyListeners();
        
        // Try to reconnect periodically
        setTimeout(() => {
          this.isOffline = false;
          this.notifyListeners();
        }, 30000); // Check again in 30 seconds
      }
    } else if (isPermissionDeniedError(error)) {
      console.error('[Database] Permission denied on Firestore operation:', error);
    }
    return error;
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
    const normalized = this.expenses.map(e => ({
      ...e,
      category: normalizeCategoryName(e.category)
    }));
    return sortExpensesDescending(normalized);
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
    const clamped = clampTimestampToNow(data.date, data.time);
    
    const newExpense: Expense = {
      id,
      member: data.member,
      amount: Math.round(Number(data.amount) * 100) / 100,
      category: normalizeCategoryName(data.category),
      paymentMode: data.paymentMode,
      date: clamped.date,
      time: clamped.time,
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
    if (data.receiptUrl) {
      newExpense.receiptUrl = data.receiptUrl;
    }

    // Update in-memory array & local storage
    this.expenses.unshift(newExpense);
    this.saveLocalExpenses();
    this.notifyListeners();

    // Sync to Firestore in real time with optimistic offline queueing
    if (!this.cloudQuotaExceeded) {
      saveExpense(newExpense)
        .then(() => {
          this.lastSyncedAt = new Date();
        })
        .catch((err) => {
          this.handleCloudError(err);
          this.queuePendingOperation('save_expense', newExpense);
        });
    } else {
      this.queuePendingOperation('save_expense', newExpense);
    }

    return { success: true, expense: newExpense };
  }

  public forceSyncToCloud(): void {
    this.syncLocalToCloud();
  }

  public addExpensesBatch(newExpensesList: Expense[]): { addedCount: number; duplicateCount: number } {
    if (!newExpensesList || newExpensesList.length === 0) {
      return { addedCount: 0, duplicateCount: 0 };
    }

    const existingSigs = new Set<string>();
    const existingIds = new Set<string>();

    this.expenses.forEach(e => {
      existingSigs.add(generateExpenseSignature(e));
      if (e.id) existingIds.add(String(e.id));
    });

    const toAdd: Expense[] = [];
    let duplicates = 0;

    for (const item of newExpensesList) {
      const sig = generateExpenseSignature(item);
      const idStr = String(item.id);
      if (existingSigs.has(sig) || existingIds.has(idStr)) {
        duplicates++;
      } else {
        existingSigs.add(sig);
        existingIds.add(idStr);
        toAdd.push({
          ...item,
          category: normalizeCategoryName(item.category)
        });
      }
    }

    if (toAdd.length > 0) {
      this.expenses = [...toAdd, ...this.expenses];
      this.saveLocalExpenses();
      this.notifyListeners();

      // Sync batch to Firestore efficiently
      if (!this.cloudQuotaExceeded) {
        const CHUNK_SIZE = 400;
        for (let i = 0; i < toAdd.length; i += CHUNK_SIZE) {
          const chunk = toAdd.slice(i, i + CHUNK_SIZE);
          saveExpensesBatch(chunk).catch(err => this.handleCloudError(err));
        }
      }
    }

    return { addedCount: toAdd.length, duplicateCount: duplicates };
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

    const targetDate = updates.date !== undefined ? updates.date : existing.date;
    const targetTime = updates.time !== undefined ? updates.time : existing.time;
    const clamped = clampTimestampToNow(targetDate, targetTime);

    const updated: Expense = {
      ...existing,
      ...updates,
      date: clamped.date,
      time: clamped.time,
      category: updates.category !== undefined ? normalizeCategoryName(updates.category) : normalizeCategoryName(existing.category),
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

    // Sync update to Firestore in real time with optimistic offline queueing
    if (!this.cloudQuotaExceeded) {
      saveExpense(updated)
        .then(() => {
          this.lastSyncedAt = new Date();
        })
        .catch((err) => {
          this.handleCloudError(err);
          this.queuePendingOperation('save_expense', updated);
        });
    } else {
      this.queuePendingOperation('save_expense', updated);
    }

    return { success: true, expense: updated };
  }

  public deleteExpense(id: string, currentMember?: MemberName): { success: boolean; error?: string } {
    if (!id) {
      return { success: false, error: 'Invalid expense ID provided.' };
    }
    const targetId = String(id);

    // Record ID in persistent deleted IDs set
    this.markIdAsDeleted(targetId);

    // Delete locally immediately
    this.expenses = this.expenses.filter(e => String(e.id) !== targetId);
    this.saveLocalExpenses();
    this.notifyListeners();

    // Delete permanently from Firestore with optimistic offline queueing
    if (!this.cloudQuotaExceeded) {
      deleteFromFirestore(targetId)
        .then(() => {
          this.lastSyncedAt = new Date();
        })
        .catch((err) => {
          this.handleCloudError(err);
          this.queuePendingOperation('delete_expense', { id: targetId });
        });
    } else {
      this.queuePendingOperation('delete_expense', { id: targetId });
    }

    return { success: true };
  }

  public clearAllExpenses(): void {
    const expensesToClear = [...this.expenses];
    this.expenses = [];
    this.saveLocalExpenses();
    this.notifyListeners();
    if (!this.cloudQuotaExceeded) {
      clearFirestoreExpenses(expensesToClear).catch((err) => this.handleCloudError(err));
    }
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
    const targetNormCategory = normalizeCategoryName(category);
    
    const match = this.expenses.find(
      e => e.member === member && e.date === date && normalizeCategoryName(e.category) === targetNormCategory && Math.abs(e.amount - cleanAmount) < 0.01
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
    
    // Sync budget to Firestore with optimistic offline queueing
    const budgetPayload = {
      key,
      month: monthStr,
      amount,
      member: targetMember,
      updatedAt: new Date().toISOString()
    };

    if (!this.cloudQuotaExceeded) {
      saveBudget(budgetPayload)
        .then(() => {
          this.lastSyncedAt = new Date();
        })
        .catch(err => {
          this.handleCloudError(err);
          this.queuePendingOperation('save_budget', budgetPayload);
        });
    } else {
      this.queuePendingOperation('save_budget', budgetPayload);
    }
  }

  public setGroupBudget(monthStr: string, amount: number): void {
    this.budgets[monthStr] = amount;
    localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(this.budgets));
    
    // Sync group budget to Firestore with optimistic offline queueing
    const groupPayload = {
      key: monthStr,
      month: monthStr,
      amount,
      updatedAt: new Date().toISOString()
    };

    if (!this.cloudQuotaExceeded) {
      saveBudget(groupPayload)
        .then(() => {
          this.lastSyncedAt = new Date();
        })
        .catch(err => {
          this.handleCloudError(err);
          this.queuePendingOperation('save_budget', groupPayload);
        });
    } else {
      this.queuePendingOperation('save_budget', groupPayload);
    }
  }

  public importJsonExpenses(jsonData: Expense[]): { success: boolean; count: number; error?: string } {
    try {
      if (!Array.isArray(jsonData)) return { success: false, count: 0, error: 'Invalid JSON format' };
      const valid = jsonData.filter(e => e.member && e.amount > 0 && e.date);
      this.expenses = valid;
      this.saveLocalExpenses();
      this.notifyListeners();
      
      if (!this.cloudQuotaExceeded) {
        const CHUNK_SIZE = 400;
        for (let i = 0; i < valid.length; i += CHUNK_SIZE) {
          const chunk = valid.slice(i, i + CHUNK_SIZE);
          saveExpensesBatch(chunk).catch(err => this.handleCloudError(err));
        }
      }
      return { success: true, count: valid.length };
    } catch (e: any) {
      return { success: false, count: 0, error: e.message };
    }
  }

  // --- Member Avatars ---
  public getMemberAvatar(member: MemberName): string | undefined {
    try {
      const raw = localStorage.getItem('friends_expense_member_avatars_v1');
      if (!raw) return undefined;
      const parsed = JSON.parse(raw);
      return parsed[member] || undefined;
    } catch {
      return undefined;
    }
  }

  public setMemberAvatar(member: MemberName, avatarUrl?: string): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_MEMBER_AVATARS);
      const map = raw ? JSON.parse(raw) : {};
      if (avatarUrl && avatarUrl.trim()) {
        map[member] = avatarUrl.trim();
      } else {
        delete map[member];
      }
      localStorage.setItem(STORAGE_KEY_MEMBER_AVATARS, JSON.stringify(map));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('friends_expense_avatar_changed', {
            detail: { member, avatarUrl: map[member] || null }
          })
        );
      }
      this.notifyListeners();

      // Cloud real-time sync with optimistic offline queueing
      if (!this.cloudQuotaExceeded) {
        if (avatarUrl && avatarUrl.trim()) {
          saveAvatarToFirestore(member, avatarUrl.trim())
            .then(() => {
              this.lastSyncedAt = new Date();
            })
            .catch(err => {
              this.handleCloudError(err);
              this.queuePendingOperation('save_avatar', { member, avatarUrl: avatarUrl.trim() });
            });
        } else {
          deleteAvatarFromFirestore(member)
            .then(() => {
              this.lastSyncedAt = new Date();
            })
            .catch(err => {
              this.handleCloudError(err);
              this.queuePendingOperation('delete_avatar', { member });
            });
        }
      } else {
        this.queuePendingOperation(
          avatarUrl && avatarUrl.trim() ? 'save_avatar' : 'delete_avatar',
          { member, avatarUrl }
        );
      }
    } catch (e) {
      console.warn('Failed to save avatar:', e);
    }
  }
}

export const db = DatabaseService.getInstance();
