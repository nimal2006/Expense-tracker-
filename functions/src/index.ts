import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';

initializeApp();

// Matches firebase-applet-config.json firestoreDatabaseId
const DATABASE_ID = 'ai-studio-expensetracker-4de9037b-5114-4c3d-b2de-9fb0b57373b5';
const REGION = 'asia-south1';
const IST_TIMEZONE = 'Asia/Kolkata';

const ALL_MEMBERS = ['Nimal', 'Etti', 'Dharan', 'Sanjai', 'Santhosh', 'Sujhay'] as const;
type MemberName = (typeof ALL_MEMBERS)[number];

const db = getFirestore(DATABASE_ID);
const messaging = getMessaging();

interface ExpenseDoc {
  id: string;
  member: MemberName;
  amount: number;
  category: string;
  paymentMode: string;
  date: string;
  time?: string;
  itemName?: string;
}

interface NotificationPreferenceDoc {
  member: MemberName;
  dailyReminderEnabled: boolean;
  friendActivityEnabled: boolean;
  notifyOnEdits: boolean;
  reminderTime: string;
  timezone: string;
  soundEnabled: boolean;
}

interface DeviceTokenDoc {
  id: string;
  member: MemberName;
  token: string;
  platform: string;
}

function getISTDateString(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const y = parts.find((p) => p.type === 'year')?.value || '2026';
  const m = parts.find((p) => p.type === 'month')?.value || '01';
  const d = parts.find((p) => p.type === 'day')?.value || '01';
  return `${y}-${m}-${d}`;
}

function getISTMinutesOfDay(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const h = Number(parts.find((p) => p.type === 'hour')?.value || '0');
  const m = Number(parts.find((p) => p.type === 'minute')?.value || '0');
  return (h === 24 ? 0 : h) * 60 + m;
}

function parseHHMMToMinutes(hhmm: string): number {
  const [hStr, mStr] = (hhmm || '20:00').split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  return (Number.isNaN(h) ? 20 : h) * 60 + (Number.isNaN(m) ? 0 : m);
}

/**
 * Fetches all registered FCM tokens for a member, sends a multicast notification,
 * and automatically deletes invalid/expired tokens from Firestore.
 */
async function sendFcmToMember(params: {
  member: MemberName;
  title: string;
  body: string;
  data: Record<string, string>;
  soundEnabled: boolean;
}): Promise<void> {
  const tokensSnap = await db
    .collection('deviceTokens')
    .where('member', '==', params.member)
    .get();

  if (tokensSnap.empty) return;

  const docs = tokensSnap.docs.map((d) => ({ ref: d.ref, ...(d.data() as DeviceTokenDoc) }));
  const tokens = docs.map((d) => d.token).filter(Boolean);
  if (!tokens.length) return;

  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: params.title,
      body: params.body,
    },
    data: {
      ...params.data,
      title: params.title,
      body: params.body,
    },
    android: {
      priority: 'high',
      notification: {
        sound: params.soundEnabled ? 'default' : undefined,
        channelId: 'friends_tracker_alerts',
      },
    },
    webpush: {
      headers: { Urgency: 'high' },
      fcmOptions: {
        link:
          params.data.type === 'daily_reminder'
            ? '/?action=add-expense'
            : params.data.expenseId
            ? `/?expenseId=${encodeURIComponent(params.data.expenseId)}`
            : '/',
      },
    },
  });

  // Automatically clean up invalid or unregistered device tokens
  const cleanupPromises: Promise<unknown>[] = [];
  response.responses.forEach((res, idx) => {
    if (!res.success && res.error) {
      const code = res.error.code;
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token'
      ) {
        logger.info(`Cleaning up invalid FCM token for ${params.member}`, { docId: docs[idx].id });
        cleanupPromises.push(docs[idx].ref.delete());
      }
    }
  });

  if (cleanupPromises.length > 0) {
    await Promise.allSettled(cleanupPromises);
  }
}

async function getMemberPrefs(member: MemberName): Promise<NotificationPreferenceDoc> {
  const snap = await db.collection('notificationPreferences').doc(member.toLowerCase()).get();
  const defaults: NotificationPreferenceDoc = {
    member,
    dailyReminderEnabled: true,
    friendActivityEnabled: true,
    notifyOnEdits: false,
    reminderTime: '20:00',
    timezone: IST_TIMEZONE,
    soundEnabled: true,
  };
  return snap.exists ? { ...defaults, ...(snap.data() as Partial<NotificationPreferenceDoc>) } : defaults;
}

/**
 * 1. Real-Time Friend Activity Push Notification (Triggered on Expense Creation)
 * - Notifies the other 5 members (NEVER the creator).
 * - Uses deterministic idempotency keys in `notificationLogs` to guarantee zero duplicate pushes.
 * - Respects each member's `friendActivityEnabled` and `soundEnabled` preferences.
 */
export const onExpenseCreated = onDocumentCreated(
  {
    document: 'expenses/{expenseId}',
    database: DATABASE_ID,
    region: REGION,
  },
  async (event) => {
    const expense = event.data?.data() as ExpenseDoc | undefined;
    if (!expense || !expense.member || typeof expense.amount !== 'number') return;

    const recipients = ALL_MEMBERS.filter((m) => m !== expense.member);
    const dateKey = getISTDateString();
    const nowIso = new Date().toISOString();
    const amountDisplay = Number(expense.amount).toLocaleString('en-IN');
    const cleanExpId = String(expense.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);

    const title = 'Friends Tracker';
    const message = `${expense.member} added a new expense — ₹${amountDisplay} · ${expense.category} · ${expense.paymentMode}`;

    await Promise.allSettled(
      recipients.map(async (recipient) => {
        const prefs = await getMemberPrefs(recipient);
        if (!prefs.friendActivityEnabled) return;

        const logId = `act_${cleanExpId}_${recipient.toLowerCase()}`;
        const logRef = db.collection('notificationLogs').doc(logId);

        // Atomic create for strict idempotency across retries
        try {
          await logRef.create({
            id: logId,
            type: 'friend_activity',
            recipientMember: recipient,
            actorMember: expense.member,
            expenseId: expense.id,
            title,
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
              isEdit: false,
            },
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        } catch {
          // Document already exists (already processed) — skip duplicate push
          return;
        }

        await sendFcmToMember({
          member: recipient,
          title,
          body: message,
          soundEnabled: prefs.soundEnabled,
          data: {
            type: 'friend_activity',
            idempotencyKey: logId,
            expenseId: expense.id,
            actorMember: expense.member,
            amount: String(expense.amount),
            category: expense.category,
            paymentMode: expense.paymentMode,
            transactionTime: expense.time || '',
          },
        });
      })
    );
  }
);

/**
 * 2. Opt-in Expense Edit Notification
 * - Only notifies members who explicitly enabled `notifyOnEdits: true`.
 * - Never notifies creator. Deletes never trigger notifications.
 */
export const onExpenseUpdated = onDocumentUpdated(
  {
    document: 'expenses/{expenseId}',
    database: DATABASE_ID,
    region: REGION,
  },
  async (event) => {
    const after = event.data?.after.data() as ExpenseDoc | undefined;
    if (!after || !after.member) return;

    const recipients = ALL_MEMBERS.filter((m) => m !== after.member);
    const amountDisplay = Number(after.amount).toLocaleString('en-IN');
    const title = 'Friends Tracker';
    const message = `${after.member} updated an expense — ₹${amountDisplay} · ${after.category} · ${after.paymentMode}`;

    await Promise.allSettled(
      recipients.map(async (recipient) => {
        const prefs = await getMemberPrefs(recipient);
        if (!prefs.friendActivityEnabled || !prefs.notifyOnEdits) return;

        await sendFcmToMember({
          member: recipient,
          title,
          body: message,
          soundEnabled: prefs.soundEnabled,
          data: {
            type: 'friend_activity',
            expenseId: after.id,
            actorMember: after.member,
            isEdit: 'true',
          },
        });
      })
    );
  }
);

/**
 * 3. Smart Daily Expense Reminder (Cloud Scheduler running every 15 minutes in Asia/Kolkata)
 * - Checks each member's transactions for today's IST date.
 * - Stops immediately if >= 1 expense exists today.
 * - Sends Attempt 1 at member's custom `reminderTime` (default 20:00 IST).
 * - Sends Attempt 2 ONLY if `snoozeUntil` (+60m from Remind Me Later) has elapsed and still 0 expenses today.
 * - Enforces strict max 2 reminders/member/day via deterministic document IDs.
 */
export const scheduledDailyExpenseReminder = onSchedule(
  {
    schedule: 'every 15 minutes',
    timeZone: IST_TIMEZONE,
    region: REGION,
  },
  async () => {
    const now = new Date();
    const todayIST = getISTDateString(now);
    const nowMinutesIST = getISTMinutesOfDay(now);

    // Single lightweight query for all expenses logged on today's IST calendar date
    const todayExpensesSnap = await db
      .collection('expenses')
      .where('date', '==', todayIST)
      .get();

    const membersWithExpenseToday = new Set<string>();
    todayExpensesSnap.forEach((docSnap) => {
      const data = docSnap.data() as Partial<ExpenseDoc>;
      if (data.member) membersWithExpenseToday.add(data.member);
    });

    await Promise.allSettled(
      ALL_MEMBERS.map(async (member) => {
        // Stop immediately if this member already logged at least one expense today
        if (membersWithExpenseToday.has(member)) return;

        const prefs = await getMemberPrefs(member);
        if (!prefs.dailyReminderEnabled) return;

        const slug = member.toLowerCase();
        const attempt1Id = `daily_${slug}_${todayIST}_1`;
        const attempt2Id = `daily_${slug}_${todayIST}_2`;

        const [attempt1Snap, attempt2Snap] = await Promise.all([
          db.collection('notificationLogs').doc(attempt1Id).get(),
          db.collection('notificationLogs').doc(attempt2Id).get(),
        ]);

        // Max 2 reminders per member per day
        if (attempt2Snap.exists) return;

        let attemptToSend: 1 | 2 | null = null;
        if (!attempt1Snap.exists) {
          const targetMinutes = parseHHMMToMinutes(prefs.reminderTime || '20:00');
          if (nowMinutesIST >= targetMinutes) {
            attemptToSend = 1;
          }
        } else {
          const snoozeUntil = attempt1Snap.data()?.snoozeUntil as string | undefined;
          if (snoozeUntil && now.getTime() >= new Date(snoozeUntil).getTime()) {
            attemptToSend = 2;
          }
        }

        if (!attemptToSend) return;

        const logId = attemptToSend === 1 ? attempt1Id : attempt2Id;
        const title = 'Daily Expense Reminder 📋';
        const message = `Hey ${member}! Today's expenses இன்னும் update பண்ணலையே. மறந்துடாதீங்க!`;
        const nowIso = now.toISOString();

        try {
          await db.collection('notificationLogs').doc(logId).create({
            id: logId,
            type: 'daily_reminder',
            recipientMember: member,
            title,
            message,
            dateKey: todayIST,
            attemptNumber: attemptToSend,
            read: false,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        } catch {
          // Already created (idempotency guard)
          return;
        }

        await sendFcmToMember({
          member,
          title,
          body: message,
          soundEnabled: prefs.soundEnabled,
          data: {
            type: 'daily_reminder',
            idempotencyKey: logId,
            logId,
            member,
            attemptNumber: String(attemptToSend),
          },
        });
      })
    );
  }
);
