import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  getDocFromServer
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Expense } from '../types';

const EXPENSES_COLLECTION = 'expenses';
const BUDGETS_COLLECTION = 'budgets';
const AVATARS_COLLECTION = 'avatars';

export interface SnapshotMeta {
  hasPendingWrites: boolean;
  isFromCache: boolean;
}

/**
 * Validates the connection to Firestore as mandated by the skill.
 */
export async function validateFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firestore] Connection validated.');
  } catch (error: any) {
    if (
      error?.code === 'unavailable' || 
      (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('unavailable')))
    ) {
      console.info('[Firestore] Operating with offline persistent cache.');
    } else {
      console.warn('[Firestore] Connection test result:', error?.message || error);
    }
  }
}

/**
 * Subscribes to real-time expense updates with metadata changes for optimistic UI sync.
 */
export function subscribeToExpenses(
  callback: (expenses: Expense[], meta: SnapshotMeta) => void,
  onError?: (error: any) => void
) {
  const q = query(collection(db, EXPENSES_COLLECTION), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
    const expenses: Expense[] = [];
    snapshot.forEach((doc) => {
      expenses.push(doc.data() as Expense);
    });
    callback(expenses, {
      hasPendingWrites: snapshot.metadata.hasPendingWrites,
      isFromCache: snapshot.metadata.fromCache
    });
  }, (error) => {
    if (onError) {
      onError(error);
    } else {
      try {
        handleFirestoreError(error, OperationType.GET, EXPENSES_COLLECTION);
      } catch (e) {
        console.warn('[Firestore] Expenses listener error:', e);
      }
    }
  });
}

/**
 * Subscribes to real-time budget updates with metadata changes.
 */
export function subscribeToBudgets(
  callback: (budgets: Record<string, number>, meta: SnapshotMeta) => void,
  onError?: (error: any) => void
) {
  return onSnapshot(collection(db, BUDGETS_COLLECTION), { includeMetadataChanges: true }, (snapshot) => {
    const budgets: Record<string, number> = {};
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.key && typeof data.amount === 'number') {
        budgets[data.key] = data.amount;
      }
    });
    callback(budgets, {
      hasPendingWrites: snapshot.metadata.hasPendingWrites,
      isFromCache: snapshot.metadata.fromCache
    });
  }, (error) => {
    if (onError) {
      onError(error);
    } else {
      try {
        handleFirestoreError(error, OperationType.GET, BUDGETS_COLLECTION);
      } catch (e) {
        console.warn('[Firestore] Budgets listener error:', e);
      }
    }
  });
}

/**
 * Subscribes to real-time member avatar updates across all roommates.
 */
export function subscribeToAvatars(
  callback: (avatars: Record<string, string>, meta: SnapshotMeta) => void,
  onError?: (error: any) => void
) {
  return onSnapshot(collection(db, AVATARS_COLLECTION), { includeMetadataChanges: true }, (snapshot) => {
    const avatars: Record<string, string> = {};
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.member && data.avatarUrl) {
        avatars[data.member] = data.avatarUrl;
      }
    });
    callback(avatars, {
      hasPendingWrites: snapshot.metadata.hasPendingWrites,
      isFromCache: snapshot.metadata.fromCache
    });
  }, (error) => {
    if (onError) {
      onError(error);
    } else {
      try {
        handleFirestoreError(error, OperationType.GET, AVATARS_COLLECTION);
      } catch (e) {
        console.warn('[Firestore] Avatars listener error:', e);
      }
    }
  });
}

/**
 * Saves or updates a member's avatar in Firestore.
 */
export async function saveMemberAvatar(member: string, avatarUrl: string) {
  const path = `${AVATARS_COLLECTION}/${member}`;
  try {
    const docRef = doc(db, AVATARS_COLLECTION, member);
    await setDoc(docRef, {
      member,
      avatarUrl,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Deletes a member's avatar from Firestore.
 */
export async function deleteMemberAvatar(member: string) {
  const path = `${AVATARS_COLLECTION}/${member}`;
  try {
    await deleteDoc(doc(db, AVATARS_COLLECTION, member));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

/**
 * Saves or updates an expense in Firestore.
 */
export async function saveExpense(expense: Expense) {
  const path = `${EXPENSES_COLLECTION}/${expense.id}`;
  try {
    const docRef = doc(db, EXPENSES_COLLECTION, expense.id);
    await setDoc(docRef, expense, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Deletes an expense from Firestore.
 */
export async function deleteExpense(id: string) {
  const path = `${EXPENSES_COLLECTION}/${id}`;
  try {
    await deleteDoc(doc(db, EXPENSES_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

/**
 * Saves or updates a budget in Firestore.
 */
export async function saveBudget(budget: { key: string; month: string; amount: number; member?: string; updatedAt: string }) {
  const path = `${BUDGETS_COLLECTION}/${budget.key}`;
  try {
    const docRef = doc(db, BUDGETS_COLLECTION, budget.key);
    await setDoc(docRef, budget, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Saves multiple expenses in a single batch (max 500).
 */
export async function saveExpensesBatch(expenses: Expense[]) {
  const { writeBatch } = await import('firebase/firestore');
  const batch = writeBatch(db);
  
  expenses.forEach((exp) => {
    const docRef = doc(db, EXPENSES_COLLECTION, exp.id);
    batch.set(docRef, exp, { merge: true });
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, EXPENSES_COLLECTION);
    throw error; // Re-throw to handle in the caller
  }
}

/**
 * Clears all expenses from Firestore (Note: Only handles up to 500 docs in one batch).
 */
export async function clearAllExpenses(expenses: Expense[]) {
  const { writeBatch } = await import('firebase/firestore');
  const batch = writeBatch(db);
  expenses.forEach((exp) => {
    const docRef = doc(db, EXPENSES_COLLECTION, exp.id);
    batch.delete(docRef);
  });
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, EXPENSES_COLLECTION);
    throw error;
  }
}
