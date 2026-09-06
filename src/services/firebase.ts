import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs, 
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Expense } from '../types';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with custom database ID from config
export const firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

// Validate connection
async function testConnection() {
  try {
    await getDocFromServer(doc(firestore, 'test', 'connection'));
    console.log('Firebase Firestore successfully connected!');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase Firestore client in offline cache mode.');
    }
  }
}
testConnection();

// Collection references
const EXPENSES_COLLECTION = 'expenses';
const BUDGETS_COLLECTION = 'budgets';

/**
 * Remove any undefined properties because Firestore SDK throws error on `undefined`
 */
export function cleanForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        result[key] = cleanForFirestore(val);
      } else {
        result[key] = val;
      }
    }
  });
  return result;
}

/**
 * Purge sample data from Cloud Firestore if present (e.g. docs with legacy initial IDs)
 */
export async function purgeSampleDataFromCloud(): Promise<void> {
  try {
    const expensesRef = collection(firestore, EXPENSES_COLLECTION);
    const snapshot = await getDocs(expensesRef);
    if (!snapshot.empty) {
      const samplePrefixes = ['nim-', 'ett-', 'dha-', 'san-', 'st-', 'suj-'];
      const batch = writeBatch(firestore);
      let count = 0;
      
      snapshot.forEach((docSnap) => {
        const id = docSnap.id;
        if (samplePrefixes.some(prefix => id.startsWith(prefix))) {
          batch.delete(docSnap.ref);
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
        console.log(`Purged ${count} sample expenses from Cloud Firestore.`);
      }
    }
  } catch (e) {
    console.warn('Error purging sample expenses from Firestore:', e);
  }
}

/**
 * Clear all expenses from Cloud Firestore completely
 */
export async function clearAllExpensesFromCloud(): Promise<void> {
  try {
    const expensesRef = collection(firestore, EXPENSES_COLLECTION);
    const snapshot = await getDocs(expensesRef);
    if (!snapshot.empty) {
      const batch = writeBatch(firestore);
      snapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      console.log('All expenses cleared from Cloud Firestore.');
    }
  } catch (e) {
    console.error('Error clearing expenses from Firestore:', e);
  }
}

/**
 * Real-time listener for all expenses across all friends
 */
export function subscribeToExpenses(callback: (expenses: Expense[]) => void): () => void {
  const expensesRef = collection(firestore, EXPENSES_COLLECTION);
  return onSnapshot(
    expensesRef,
    (snapshot) => {
      const items: Expense[] = [];
      const samplePrefixes = ['nim-', 'ett-', 'dha-', 'san-', 'st-', 'suj-'];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Expense;
        // Filter out sample expense IDs if any remain
        if (data && data.id && data.amount && data.member) {
          if (!samplePrefixes.some(prefix => data.id.startsWith(prefix))) {
            items.push(data);
          }
        }
      });

      // Sort newest first
      items.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time || '00:00'}:00`).getTime();
        const dateB = new Date(`${b.date}T${b.time || '00:00'}:00`).getTime();
        return dateB - dateA;
      });

      callback(items);
    },
    (err) => {
      console.error('Real-time Firestore listener error:', err);
    }
  );
}

/**
 * Real-time listener for budgets (supports group and individual member budget keys)
 */
export function subscribeToBudgets(callback: (budgets: Record<string, number>) => void): () => void {
  const budgetsRef = collection(firestore, BUDGETS_COLLECTION);
  return onSnapshot(
    budgetsRef,
    (snapshot) => {
      const budgetMap: Record<string, number> = {
        '2026-08': 25000,
        '2026-09': 20000
      };
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && typeof data.amount === 'number') {
          const docKey = data.key || docSnap.id;
          budgetMap[docKey] = data.amount;
        }
      });
      callback(budgetMap);
    },
    (err) => {
      console.warn('Budgets Firestore listener error:', err);
    }
  );
}

/**
 * Cloud Firestore writes for Expenses
 */
export async function saveExpenseToCloud(expense: Expense): Promise<void> {
  try {
    const docRef = doc(firestore, EXPENSES_COLLECTION, expense.id);
    const cleaned = cleanForFirestore(expense);
    await setDoc(docRef, cleaned, { merge: true });
    console.log(`[Firestore] Successfully saved expense ${expense.id} (₹${expense.amount}) to cloud.`);
  } catch (e) {
    console.error('Failed to sync expense to Cloud Firestore:', e);
    throw e;
  }
}

export async function deleteExpenseFromCloud(id: string): Promise<void> {
  try {
    const docRef = doc(firestore, EXPENSES_COLLECTION, id);
    await deleteDoc(docRef);
    console.log(`[Firestore] Successfully deleted expense ${id} from cloud.`);
  } catch (e) {
    console.error('Failed to delete expense from Cloud Firestore:', e);
    throw e;
  }
}

export async function saveBudgetToCloud(
  budgetKey: string, 
  amount: number, 
  member?: string, 
  month?: string
): Promise<void> {
  try {
    const docRef = doc(firestore, BUDGETS_COLLECTION, budgetKey);
    const data: Record<string, any> = {
      key: budgetKey,
      month: month || budgetKey,
      amount,
      updatedAt: new Date().toISOString()
    };
    if (member) {
      data.member = member;
    }
    await setDoc(docRef, data, { merge: true });
    console.log(`[Firestore] Saved budget ${budgetKey} (₹${amount}) to cloud.`);
  } catch (e) {
    console.error('Failed to sync budget to Cloud Firestore:', e);
  }
}
