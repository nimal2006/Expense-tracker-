// Firebase Cloud Messaging Background Service Worker for Friends Tracker
// Handles push notifications delivered via FCM when the app is closed on Android/Desktop.

importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyA1ec650M3kGWV0wbbdafGlxmD13vhWOxI',
  authDomain: 'tough-amulet-c0w9t.firebaseapp.com',
  projectId: 'tough-amulet-c0w9t',
  storageBucket: 'tough-amulet-c0w9t.firebasestorage.app',
  messagingSenderId: '942868280515',
  appId: '1:942868280515:web:2944e99083606dfb041e76',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = payload.notification?.title || data.title || 'Friends Tracker';
  const body = payload.notification?.body || data.body || '';
  const isDailyReminder = data.type === 'daily_reminder';
  const attemptNum = Number(data.attemptNumber || '1');

  const actions = isDailyReminder
    ? attemptNum < 2
      ? [
          { action: 'add-expense', title: 'Add Expense' },
          { action: 'remind-later', title: 'Remind Me Later' },
        ]
      : [{ action: 'add-expense', title: 'Add Expense' }]
    : [{ action: 'open-expense', title: 'View Details' }];

  self.registration.showNotification(title, {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.idempotencyKey || data.expenseId || 'friends-tracker-notif',
    renotify: false,
    data,
    actions,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action;
  const data = event.notification.data || {};

  let targetUrl = '/';
  let clientMessage = null;

  if (action === 'add-expense' || (data.type === 'daily_reminder' && action !== 'remind-later')) {
    targetUrl = '/?action=add-expense';
    clientMessage = { type: 'FRIENDS_TRACKER_OPEN_ADD_EXPENSE' };
  } else if (action === 'remind-later') {
    targetUrl = '/?action=remind-later&logId=' + encodeURIComponent(data.logId || '');
    clientMessage = { type: 'FRIENDS_TRACKER_REMIND_LATER', logId: data.logId || '' };
  } else if (data.expenseId) {
    targetUrl = '/?expenseId=' + encodeURIComponent(data.expenseId);
    clientMessage = { type: 'FRIENDS_TRACKER_OPEN_EXPENSE', expenseId: data.expenseId };
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          if (clientMessage) client.postMessage(clientMessage);
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
