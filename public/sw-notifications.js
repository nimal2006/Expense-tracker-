// Custom Service Worker extension for Friends Tracker notification actions
// Imported into the Vite PWA Workbox service worker via workbox.importScripts

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};

  let targetUrl = '/';
  let clientMessage = null;

  if (action === 'add-expense') {
    targetUrl = '/?action=add-expense';
    clientMessage = { type: 'FRIENDS_TRACKER_OPEN_ADD_EXPENSE' };
  } else if (action === 'remind-later') {
    targetUrl = '/?action=remind-later&logId=' + encodeURIComponent(data.logId || '');
    clientMessage = {
      type: 'FRIENDS_TRACKER_REMIND_LATER',
      logId: data.logId || '',
    };
  } else if (data.type === 'daily_reminder') {
    targetUrl = '/?action=add-expense';
    clientMessage = { type: 'FRIENDS_TRACKER_OPEN_ADD_EXPENSE' };
  } else if (data.expenseId) {
    targetUrl = '/?expenseId=' + encodeURIComponent(data.expenseId);
    clientMessage = {
      type: 'FRIENDS_TRACKER_OPEN_EXPENSE',
      expenseId: data.expenseId,
    };
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            if (clientMessage) {
              client.postMessage(clientMessage);
            }
            return;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
