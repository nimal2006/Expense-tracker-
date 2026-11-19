import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDoc,
  getDocs,
} from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  Expense,
  MemberName,
  NotificationLog,
  NotificationPreferences,
} from '../types';
import { MEMBERS } from '../data/categories';
import {
  getISTDateString,
  getISTMinutesOfDay,
  IST_TIMEZONE,
  parseHHMMToMinutes,
} from '../utils/istTime';

const PREFS_COLLECTION = 'notificationPreferences';
const LOGS_COLLECTION = 'notificationLogs';
const TOKENS_COLLECTION = 'deviceTokens';

const PREFS_CACHE_PREFIX = 'friends_notif_prefs_v1_';
const LOGS_CACHE_PREFIX = 'friends_notif_logs_v1_';
const DELIVERED_KEYS_STORAGE = 'friends_notif_delivered_keys_v1';
const DEVICE_TOKEN_ID_STORAGE = 'friends_fcm_device_record_id_v1';

export type BrowserNotificationPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export function getMemberSlug(member: MemberName): string {
  return member.toLowerCase();
}

export function getDefaultPreferences(member: MemberName): NotificationPreferences {
  return {
    member,
    dailyReminderEnabled: true,
    friendActivityEnabled: true,
    notifyOnEdits: false,
    reminderTime: '20:00',
    timezone: IST_TIMEZONE,
    soundEnabled: true,
    favouriteBusIds: [],
    updatedAt: new Date().toISOString(),
  };
}

function readCachedPrefs(member: MemberName): NotificationPreferences {
  try {
    const raw = localStorage.getItem(`${PREFS_CACHE_PREFIX}${getMemberSlug(member)}`);
    if (!raw) return getDefaultPreferences(member);
    return { ...getDefaultPreferences(member), ...JSON.parse(raw), member };
  } catch {
    return getDefaultPreferences(member);
  }
}

function writeCachedPrefs(prefs: NotificationPreferences): void {
  try {
    localStorage.setItem(`${PREFS_CACHE_PREFIX}${getMemberSlug(prefs.member)}`, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

function readCachedLogs(member: MemberName): NotificationLog[] {
  try {
    const raw = localStorage.getItem(`${LOGS_CACHE_PREFIX}${getMemberSlug(member)}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCachedLogs(member: MemberName, logs: NotificationLog[]): void {
  try {
    localStorage.setItem(`${LOGS_CACHE_PREFIX}${getMemberSlug(member)}`, JSON.stringify(logs.slice(0, 60)));
  } catch {
    // ignore
  }
}

function getDeliveredKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(DELIVERED_KEYS_STORAGE);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function markNotificationDeliveredLocally(idempotencyKey: string): boolean {
  const keys = getDeliveredKeys();
  if (keys.has(idempotencyKey)) return false;
  keys.add(idempotencyKey);
  try {
    const trimmed = Array.from(keys).slice(-250);
    localStorage.setItem(DELIVERED_KEYS_STORAGE, JSON.stringify(trimmed));
  } catch {
    // ignore
  }
  return true;
}

export function hasDeliveredLocally(idempotencyKey: string): boolean {
  return getDeliveredKeys().has(idempotencyKey);
}

/**
 * Plays a gentle fintech notification chime using Web Audio API (no external audio assets).
 */
export function playNotificationSound(enabled: boolean): void {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.14); // A5
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 450);
  } catch {
    // Audio playback may be blocked until first user gesture
  }
}

/**
 * Checks current browser/Android PWA notification permission safely.
 */
export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as BrowserNotificationPermission;
}

/**
 * Requests notification permission gracefully and registers FCM token if VAPID key is configured.
 */
export async function requestNotificationPermission(
  member: MemberName
): Promise<{ permission: BrowserNotificationPermission; fcmRegistered: boolean }> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { permission: 'unsupported', fcmRegistered: false };
  }

  try {
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      const fcmRegistered = await registerMemberDeviceToken(member);
      return { permission: 'granted', fcmRegistered };
    }
    return { permission: result as BrowserNotificationPermission, fcmRegistered: false };
  } catch (err) {
    console.warn('[Notifications] Permission request failed:', err);
    return { permission: getBrowserNotificationPermission(), fcmRegistered: false };
  }
}

/**
 * Registers the current browser/Android PWA FCM token into write-only `deviceTokens/{tokenId}`.
 * Fails gracefully when VAPID key is not yet configured so live PWA notifications continue working.
 */
export async function registerMemberDeviceToken(member: MemberName): Promise<boolean> {
  try {
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
    if (!vapidKey || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return false;
    }

    const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
    const supported = await isSupported();
    if (!supported) return false;

    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessaging(getApp());
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swReg,
    });

    if (!token) return false;

    let recordId = localStorage.getItem(DEVICE_TOKEN_ID_STORAGE);
    if (!recordId) {
      recordId = `tok-${getMemberSlug(member)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(DEVICE_TOKEN_ID_STORAGE, recordId);
    }

    const ua = navigator.userAgent.toLowerCase();
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const platform: 'web' | 'android-pwa' | 'ios-pwa' =
      isStandalone && /android/.test(ua)
        ? 'android-pwa'
        : isStandalone && /iphone|ipad|ipod/.test(ua)
        ? 'ios-pwa'
        : 'web';

    const payload = {
      id: recordId,
      member,
      token,
      platform,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, TOKENS_COLLECTION, recordId), payload);
    return true;
  } catch (err) {
    console.info('[Notifications] FCM token registration skipped or unavailable:', err);
    return false;
  }
}

/**
 * Removes the current device's FCM token when the user turns off all notifications.
 */
export async function unregisterCurrentDeviceToken(): Promise<void> {
  try {
    const recordId = localStorage.getItem(DEVICE_TOKEN_ID_STORAGE);
    if (!recordId) return;
    await deleteDoc(doc(db, TOKENS_COLLECTION, recordId));
  } catch {
    // ignore cleanup errors
  }
}

/**
 * Displays a native OS / Android PWA Notification using the Service Worker (supports action buttons)
 * with graceful fallback to window.Notification.
 */
export async function showSystemNotification(options: {
  title: string;
  body: string;
  tag: string;
  data?: Record<string, any>;
  actions?: { action: string; title: string }[];
  silent?: boolean;
}): Promise<boolean> {
  if (getBrowserNotificationPermission() !== 'granted') {
    return false;
  }

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(options.title, {
          body: options.body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: options.tag,
          renotify: false,
          silent: Boolean(options.silent),
          data: options.data || {},
          actions: options.actions || [],
        } as NotificationOptions);
        return true;
      }
    }
  } catch (err) {
    console.warn('[Notifications] SW showNotification failed, falling back to Notification API:', err);
  }

  try {
    const n = new Notification(options.title, {
      body: options.body,
      icon: '/pwa-192x192.png',
      tag: options.tag,
      silent: Boolean(options.silent),
    });
    n.onclick = () => {
      window.focus();
      if (options.data?.type === 'daily_reminder') {
        window.dispatchEvent(new CustomEvent('friends-tracker:open-add-expense'));
      } else if (options.data?.expenseId) {
        window.dispatchEvent(
          new CustomEvent('friends-tracker:open-expense', {
            detail: { expenseId: options.data.expenseId },
          })
        );
      }
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}

/**
 * Subscribes to per-member notification preferences & favourite bus IDs in Firestore.
 */
export function subscribeToNotificationPreferences(
  member: MemberName,
  callback: (prefs: NotificationPreferences) => void
): () => void {
  const cached = readCachedPrefs(member);
  callback(cached);

  const slug = getMemberSlug(member);
  const docRef = doc(db, PREFS_COLLECTION, slug);

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const merged: NotificationPreferences = {
          ...getDefaultPreferences(member),
          ...(snap.data() as Partial<NotificationPreferences>),
          member,
        };
        writeCachedPrefs(merged);
        callback(merged);
      } else {
        const defaults = getDefaultPreferences(member);
        writeCachedPrefs(defaults);
        callback(defaults);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${PREFS_COLLECTION}/${slug}`);
      callback(readCachedPrefs(member));
    }
  );
}

/**
 * Saves updated notification preferences (or favourite bus IDs) for a member to Firestore.
 */
export async function saveNotificationPreferences(
  member: MemberName,
  updates: Partial<Omit<NotificationPreferences, 'member' | 'updatedAt'>>
): Promise<NotificationPreferences> {
  const current = readCachedPrefs(member);
  const next: NotificationPreferences = {
    ...current,
    ...updates,
    member,
    timezone: IST_TIMEZONE,
    favouriteBusIds: Array.from(new Set((updates.favouriteBusIds ?? current.favouriteBusIds).slice(0, 100))),
    updatedAt: new Date().toISOString(),
  };

  writeCachedPrefs(next);

  const slug = getMemberSlug(member);
  try {
    await setDoc(doc(db, PREFS_COLLECTION, slug), next);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${PREFS_COLLECTION}/${slug}`);
  }

  return next;
}

/**
 * Subscribes to notification logs addressed to a specific member.
 */
export function subscribeToMemberNotificationLogs(
  member: MemberName,
  callback: (logs: NotificationLog[]) => void
): () => void {
  callback(readCachedLogs(member));

  const q = query(
    collection(db, LOGS_COLLECTION),
    where('recipientMember', '==', member)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: NotificationLog[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as NotificationLog);
      });
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const trimmed = items.slice(0, 60);
      writeCachedLogs(member, trimmed);
      callback(trimmed);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, LOGS_COLLECTION);
      callback(readCachedLogs(member));
    }
  );
}

/**
 * Marks a single notification log as read.
 */
export async function markNotificationLogRead(logId: string, member: MemberName): Promise<void> {
  const cached = readCachedLogs(member).map((l) => (l.id === logId ? { ...l, read: true } : l));
  writeCachedLogs(member, cached);
  try {
    await updateDoc(doc(db, LOGS_COLLECTION, logId), {
      read: true,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${LOGS_COLLECTION}/${logId}`);
  }
}

/**
 * Marks all unread notifications for a member as read.
 */
export async function markAllNotificationsRead(logs: NotificationLog[], member: MemberName): Promise<void> {
  const unread = logs.filter((l) => !l.read);
  if (!unread.length) return;
  const cached = readCachedLogs(member).map((l) => ({ ...l, read: true }));
  writeCachedLogs(member, cached);

  await Promise.allSettled(
    unread.map((l) =>
      updateDoc(doc(db, LOGS_COLLECTION, l.id), {
        read: true,
        updatedAt: new Date().toISOString(),
      })
    )
  );
}

/**
 * Creates idempotent friend activity notification logs for the OTHER 5 members
 * whenever a member creates a new expense (or edits one if recipient enabled notifyOnEdits).
 * Never notifies the creator. Never runs for deletes.
 */
export async function dispatchFriendExpenseNotifications(
  expense: Expense,
  mode: 'create' | 'edit' = 'create'
): Promise<void> {
  const otherMembers = MEMBERS.map((m) => m.name).filter((name) => name !== expense.member);
  const nowIso = new Date().toISOString();
  const dateKey = getISTDateString();

  // Fetch current preferences across members to respect each member's settings
  const prefsByMember = new Map<MemberName, NotificationPreferences>();
  try {
    const snap = await getDocs(collection(db, PREFS_COLLECTION));
    snap.forEach((docSnap) => {
      const data = docSnap.data() as NotificationPreferences;
      if (data?.member) {
        prefsByMember.set(data.member, data);
      }
    });
  } catch {
    // Fallback to defaults if offline
  }

  const amountDisplay = Number(expense.amount).toLocaleString('en-IN');
  const actionVerb = mode === 'edit' ? 'updated an expense' : 'added a new expense';
  const message = `${expense.member} ${actionVerb} — ₹${amountDisplay} · ${expense.category} · ${expense.paymentMode}`;

  await Promise.allSettled(
    otherMembers.map(async (recipient) => {
      const pref = prefsByMember.get(recipient) || getDefaultPreferences(recipient);

      // Respect recipient's notification preferences strictly
      if (!pref.friendActivityEnabled) return;
      if (mode === 'edit' && !pref.notifyOnEdits) return;

      // Deterministic idempotency key prevents duplicate notifications
      const cleanExpId = expense.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
      const id =
        mode === 'create'
          ? `act_${cleanExpId}_${getMemberSlug(recipient)}`
          : `act_edit_${cleanExpId}_${Date.now()}_${getMemberSlug(recipient)}`;

      const docRef = doc(db, LOGS_COLLECTION, id);

      try {
        // Idempotency check before creating
        const existingSnap = await getDoc(docRef);
        if (existingSnap.exists()) return;

        const logPayload: NotificationLog = {
          id,
          type: 'friend_activity',
          recipientMember: recipient,
          actorMember: expense.member,
          expenseId: expense.id,
          title: 'Friends Tracker',
          message,
          dateKey,
          read: false,
          metadata: {
            amount: expense.amount,
            category: expense.category,
            paymentMode: expense.paymentMode,
            transactionTime: expense.time || '',
            transactionDate: expense.date,
            itemName: expense.itemName || '',
            isEdit: mode === 'edit',
          },
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        await setDoc(docRef, logPayload);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `${LOGS_COLLECTION}/${id}`);
      }
    })
  );
}

/**
 * Evaluates whether the active member should receive a Smart Daily Expense Reminder right now (Asia/Kolkata).
 * Rules enforced:
 * - Check authenticated/active member's transactions ONLY for today's IST calendar day.
 * - If >= 1 expense exists for today -> DO NOT send reminder (stop immediately).
 * - If dailyReminderEnabled is false -> DO NOT send.
 * - Max 2 reminders per member per IST calendar day (Attempt 1 at reminderTime, Attempt 2 after 60m Remind Me Later).
 * - Deterministic idempotency keys prevent duplicates across tabs/reloads.
 */
export async function evaluateDailyExpenseReminder(params: {
  member: MemberName;
  expenses: Expense[];
  preferences: NotificationPreferences;
  existingLogs: NotificationLog[];
  now?: Date;
}): Promise<NotificationLog | null> {
  const { member, expenses, preferences, existingLogs, now = new Date() } = params;

  if (!preferences.dailyReminderEnabled) return null;

  const todayIST = getISTDateString(now);

  // Check ONLY this member's expenses for today's IST calendar day
  const hasLoggedToday = expenses.some(
    (exp) => exp.member === member && exp.date === todayIST
  );

  // Immediately stop reminders once an expense exists today
  if (hasLoggedToday) {
    return null;
  }

  const nowMinutesIST = getISTMinutesOfDay(now);
  const reminderMinutes = parseHHMMToMinutes(preferences.reminderTime || '20:00');
  const slug = getMemberSlug(member);

  const attempt1Id = `daily_${slug}_${todayIST}_1`;
  const attempt2Id = `daily_${slug}_${todayIST}_2`;

  const todayLogs = existingLogs.filter(
    (l) => l.type === 'daily_reminder' && l.recipientMember === member && l.dateKey === todayIST
  );

  const attempt1Log = todayLogs.find((l) => l.id === attempt1Id || l.attemptNumber === 1);
  const attempt2Log = todayLogs.find((l) => l.id === attempt2Id || l.attemptNumber === 2);

  // Hard cap: max 2 reminders per member per day
  if (attempt2Log) {
    return null;
  }

  let targetAttempt: 1 | 2 | null = null;
  if (!attempt1Log) {
    // Attempt 1 fires once current IST time reaches or passes user's chosen reminderTime
    if (nowMinutesIST >= reminderMinutes) {
      targetAttempt = 1;
    }
  } else if (attempt1Log.snoozeUntil) {
    // Attempt 2 fires ONLY if Remind Me Later (60m snooze) was requested and elapsed
    const snoozeTargetMs = new Date(attempt1Log.snoozeUntil).getTime();
    if (!Number.isNaN(snoozeTargetMs) && now.getTime() >= snoozeTargetMs) {
      targetAttempt = 2;
    }
  }

  if (!targetAttempt) {
    return null;
  }

  const logId = targetAttempt === 1 ? attempt1Id : attempt2Id;
  if (hasDeliveredLocally(logId)) {
    return null;
  }

  const nowIso = now.toISOString();
  const logPayload: NotificationLog = {
    id: logId,
    type: 'daily_reminder',
    recipientMember: member,
    title: 'Daily Expense Reminder 📋',
    message: `Hey ${member}! Today's expenses இன்னும் update பண்ணலையே. மறந்துடாதீங்க!`,
    dateKey: todayIST,
    attemptNumber: targetAttempt,
    read: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  try {
    const docRef = doc(db, LOGS_COLLECTION, logId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      // Already created by Cloud Function or another tab — mark locally to prevent duplicate toast
      markNotificationDeliveredLocally(logId);
      return null;
    }
    await setDoc(docRef, logPayload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${LOGS_COLLECTION}/${logId}`);
  }

  // Persist locally & trigger OS + sound alert
  markNotificationDeliveredLocally(logId);
  const updatedCache = [logPayload, ...readCachedLogs(member).filter((l) => l.id !== logId)];
  writeCachedLogs(member, updatedCache);

  playNotificationSound(preferences.soundEnabled);
  await showSystemNotification({
    title: logPayload.title,
    body: logPayload.message,
    tag: logId,
    silent: !preferences.soundEnabled,
    data: {
      type: 'daily_reminder',
      logId,
      member,
      attemptNumber: targetAttempt,
    },
    actions:
      targetAttempt === 1
        ? [
            { action: 'add-expense', title: 'Add Expense' },
            { action: 'remind-later', title: 'Remind Me Later' },
          ]
        : [{ action: 'add-expense', title: 'Add Expense' }],
  });

  return logPayload;
}

/**
 * Schedules one follow-up reminder 60 minutes from now (only allowed on Attempt 1, max 2/day).
 */
export async function snoozeDailyReminderBy60Minutes(
  log: NotificationLog,
  member: MemberName
): Promise<{ success: boolean; snoozeUntil?: string; reason?: string }> {
  if (log.type !== 'daily_reminder') {
    return { success: false, reason: 'Not a daily reminder.' };
  }
  if ((log.attemptNumber || 1) >= 2) {
    return { success: false, reason: 'Maximum of 2 reminders per day reached.' };
  }

  const snoozeDate = new Date(Date.now() + 60 * 60 * 1000);
  const snoozeUntil = snoozeDate.toISOString();

  const updatedCache = readCachedLogs(member).map((item) =>
    item.id === log.id ? { ...item, snoozeUntil, read: true } : item
  );
  writeCachedLogs(member, updatedCache);

  try {
    await updateDoc(doc(db, LOGS_COLLECTION, log.id), {
      snoozeUntil,
      read: true,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${LOGS_COLLECTION}/${log.id}`);
  }

  return { success: true, snoozeUntil };
}
