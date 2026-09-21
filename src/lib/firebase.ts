import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  getFirestore,
  Firestore 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Configure Firestore cache settings using modular SDK persistence with multi-tab support
// and experimentalForceLongPolling to ensure 100% reliable connections inside sandboxed iframes & web containers
let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    }),
    experimentalForceLongPolling: true
  }, firebaseConfig.firestoreDatabaseId);
  console.log("Firestore initialized successfully");
} catch (e: any) {
  console.error("Firestore initialization error:", e);
  // If already initialized, safely reuse existing instance
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = firestoreDb;
export const auth = getAuth(app);

/**
 * Firestore Operation Types
 */
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

/**
 * Firestore Error Information Interface
 */
export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

/**
 * Standardized Firestore Error Handler
 * Mandated by firebase-integration skill for diagnostics and security rule debugging.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  console.error('[Firestore Error]', JSON.stringify(errInfo, null, 2));
}

/**
 * Checks if a Firestore error is related to quota exhaustion.
 */
export function isQuotaError(error: any): boolean {
  if (!error) return false;
  const msg = error.message || String(error);
  return (
    error.code === 'resource-exhausted' || 
    msg.includes('Quota limit exceeded') || 
    msg.includes('resource-exhausted') ||
    msg.includes('quota units per project')
  );
}

/**
 * Checks if a Firestore error is related to connectivity issues.
 */
export function isUnavailableError(error: any): boolean {
  if (!error) return false;
  const msg = error.message || String(error);
  return (
    error.code === 'unavailable' || 
    msg.includes('Could not reach Cloud Firestore backend') || 
    msg.includes('connection failed') ||
    msg.includes('client is offline')
  );
}

/**
 * Checks if a Firestore error is related to permissions.
 */
export function isPermissionDeniedError(error: any): boolean {
  if (!error) return false;
  const msg = error.message || String(error);
  return (
    error.code === 'permission-denied' ||
    msg.includes('Missing or insufficient permissions') ||
    msg.includes('permission-denied')
  );
}
