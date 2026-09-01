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
import { INITIAL_EXPENSES } from '../data/initialExpenses';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with custom database ID from config
export const firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

// Validate connection per Firebase integration guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(firestore, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase Firestore client running in offline mode.');
    }
  }
}
testConnection();

// Collection references
const EXPENSES_COLLECTION = 'expenses';
const BUDGETS_COLLECTION = 'budgets';

/**
 * Seed initial expenses if Firestore is completely empty on first launch
 */
export async function seedInitialDataIfEmpty(): Promise<void> {
  try {
    const expensesRef = collection(firestore, EXPENSES_COLLECTION);
    const snapshot = await getDocs(expensesRef);
    if (snapshot.empty) {
      console.log('Seeding initial room expenses to Cloud Firestore...');
      const batch = writeBatch(firestore);
      INITIAL_EXPENSES.forEach((exp) => {
        const docRef = doc(firestore, EXPENSES_COLLECTION, exp.id);
        batch.set(docRef, exp);
      });
      // Also seed default budgets
      const augBudgetRef = doc(firestore, BUDGETS_COLLECTION, '2026-08');
      batch.set(augBudgetRef, { month: '2026-08', amount: 25000, updatedAt: new Date().toISOString() });
      const sepBudgetRef = doc(firestore, BUDGETS_COLLECTION, '2026-09');
      batch.set(sepBudgetRef, { month: '2026-09', amount: 20000, updatedAt: new Date().toISOString() });
      
      await batch.commit();
      console.log('Initial room expenses successfully seeded to Cloud Firestore!');
    }
  } catch (e) {
    console.warn('Firestore initial seeding note:', e);
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
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as Expense);
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
 * Real-time listener for budgets
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
        if (data && data.month && typeof data.amount === 'number') {
          budgetMap[data.month] = data.amount;
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
    await setDoc(docRef, expense, { merge: true });
  } catch (e) {
    console.error('Failed to sync expense to Cloud Firestore:', e);
  }
}

export async function deleteExpenseFromCloud(id: string): Promise<void> {
  try {
    const docRef = doc(firestore, EXPENSES_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (e) {
    console.error('Failed to delete expense from Cloud Firestore:', e);
  }
}

export async function saveBudgetToCloud(month: string, amount: number): Promise<void> {
  try {
    const docRef = doc(firestore, BUDGETS_COLLECTION, month);
    await setDoc(docRef, { month, amount, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.error('Failed to sync budget to Cloud Firestore:', e);
  }
}
