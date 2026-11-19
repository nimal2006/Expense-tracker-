# Friends Tracker — Firebase Cloud Functions v2 Deployment Guide

These Cloud Functions deliver background push notifications via Firebase Cloud Messaging (FCM) even when the Friends Tracker PWA is closed on Android or desktop.

## Included Functions

1. **`onExpenseCreated`** (`onDocumentCreated` on `expenses/{expenseId}`)
   - Notifies the other 5 roommates whenever a member adds a new expense.
   - Never notifies the expense creator; uses deterministic `notificationLogs` IDs to guarantee zero duplicates.
   - Respects each member's `friendActivityEnabled` and `soundEnabled` preferences.
   - Automatically deletes expired/invalid FCM tokens from `deviceTokens`.

2. **`onExpenseUpdated`** (`onDocumentUpdated` on `expenses/{expenseId}`)
   - Only notifies members who explicitly turned **Notify on Expense Edits** ON (OFF by default).
   - Deleted expenses never send notifications.

3. **`scheduledDailyExpenseReminder`** (`onSchedule` every 15 minutes in `Asia/Kolkata`)
   - Checks only each member's transactions for today's IST calendar date.
   - Immediately stops if an expense exists for today.
   - Fires Attempt #1 at the member's custom reminder time (default `20:00` IST) and Attempt #2 only after a 60-minute "Remind Me Later" snooze (hard max 2/day).

## Deployment Steps

1. Ensure your Firebase project (`tough-amulet-c0w9t`) is on the Blaze plan and Cloud Scheduler API is enabled.
2. In Firebase Console → **Project Settings → Cloud Messaging → Web Push certificates**, generate a Web Push VAPID key and set `VITE_FIREBASE_VAPID_KEY=<your-key>` in your frontend environment so devices register tokens into `deviceTokens`.
3. Install and deploy:
   ```bash
   cd functions
   npm install
   npm run build
   firebase deploy --only functions
   ```
