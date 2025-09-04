// Enhanced Service Worker with Action Buttons Support
// اسم الملف: service-worker.js

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated');
  self.clients.claim();
});

// مساعدة للتحقق من الصلاحيات
async function checkNotificationPermission() {
  if (!('Notification' in self)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

// استقبال الإشعارات من Push - Enhanced for Supabase
self.addEventListener('push', async (event) => {
  try {
    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) {
      console.warn('[Service Worker] Notification permission denied');
      return;
    }

    const data = event.data ? event.data.json() : {};
    const {
      title = 'NeoMart',
      message = '',
      body = message, // Support both 'message' and 'body'
      order_id,
      type = 'general',
      source = 'unknown',
      actions = []
    } = data;

    console.log('[Service Worker] Push notification received:', {
      title, body, order_id, type, source
    });

    // تحديد الأزرار بناءً على نوع الإشعار ومصدره
    let notificationActions = actions;

    if (type === 'order' && order_id && !notificationActions.length) {
      notificationActions = [
        { action: 'accept', title: 'قبول الطلب', icon: '/icons/check.svg' },
        { action: 'reject', title: 'رفض الطلب', icon: '/icons/close.svg' },
        { action: 'view', title: 'عرض التفاصيل', icon: '/icons/view.svg' }
      ];
    } else if (type === 'order_update' && order_id) {
      notificationActions = [
        { action: 'view', title: 'عرض الطلب', icon: '/icons/view.svg' }
      ];
    }

    // عرض الإشعار persistent من خلال ServiceWorkerRegistration
    const options = {
      body: body || message,
      icon: data.icon || '/icons/icon-192x192.svg',
      badge: data.badge || '/icons/badge-72x72.svg',
      actions: notificationActions,
      data: {
        order_id,
        type,
        source,
        timestamp: Date.now(),
        ...data // Include any additional data
      },
      tag: data.tag || (order_id ? `order-${order_id}` : `${type}-${Date.now()}`),
      renotify: data.renotify !== false,
      requireInteraction: data.requireInteraction !== false,
      silent: data.silent === true,
      vibrate: data.vibrate || [200, 100, 200] // Default vibration pattern
    };

    // Log for debugging
    console.log('[Service Worker] Showing notification with options:', options);

    event.waitUntil(
      self.registration.showNotification(title, options)
    );

  } catch (err) {
    console.error('[Service Worker] Push event error:', err);
  }
});

// التعامل مع النقر على الإشعار وأزرار الإجراءات - Enhanced for Supabase
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { order_id, type, source, timestamp } = event.notification.data;

  console.log('[Service Worker] Notification clicked:', {
    action: event.action,
    order_id,
    type,
    source,
    timestamp
  });

  let targetUrl = '/';
  let messageAction = 'navigate';
  let additionalData = {};

  // التعامل مع أزرار الإجراءات المختلفة
  switch (event.action) {
    case 'accept':
      targetUrl = order_id ? `/orders/${order_id}?action=accept` : '/orders/accepted';
      messageAction = 'accept-order';
      additionalData = {
        action: 'accept-order',
        order_id,
        type,
        source,
        timestamp: Date.now(),
        originalTimestamp: timestamp
      };
      console.log('[Service Worker] Order accepted via notification:', order_id);
      break;

    case 'reject':
      targetUrl = order_id ? `/orders/${order_id}?action=reject` : '/orders/rejected';
      messageAction = 'reject-order';
      additionalData = {
        action: 'reject-order',
        order_id,
        type,
        source,
        timestamp: Date.now(),
        originalTimestamp: timestamp
      };
      console.log('[Service Worker] Order rejected via notification:', order_id);
      break;

    case 'view':
      targetUrl = order_id ? `/orders/${order_id}` : '/orders';
      messageAction = 'view-order';
      additionalData = {
        action: 'view-order',
        order_id,
        type,
        source,
        timestamp: Date.now()
      };
      console.log('[Service Worker] Order view requested via notification:', order_id);
      break;

    default:
      // النقر العادي على الإشعار
      if (type === 'order' && order_id) {
        targetUrl = `/orders/${order_id}`;
        messageAction = 'view-order';
      } else if (type === 'order_update' && order_id) {
        targetUrl = `/orders/${order_id}`;
        messageAction = 'view-order-update';
      } else {
        targetUrl = '/orders';
        messageAction = 'navigate';
      }

      additionalData = {
        action: messageAction,
        order_id,
        type,
        source,
        clickAction: 'default',
        timestamp: Date.now()
      };
      break;
  }

  // إرسال رسالة لجميع العملاء المفتوحين
  const sendMessageToClients = async (clientList) => {
    const message = {
      type: 'NOTIFICATION_ACTION',
      ...additionalData,
      url: targetUrl
    };

    clientList.forEach(client => {
      try {
        client.postMessage(message);
        console.log('[Service Worker] Message sent to client:', message);
      } catch (error) {
        console.error('[Service Worker] Failed to send message to client:', error);
      }
    });
  };

  // فتح الصفحة المناسبة أو التركيز على التطبيق
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      // إرسال رسالة لجميع العملاء
      await sendMessageToClients(clientList);

      // البحث عن نافذة مفتوحة بالفعل
      for (let client of clientList) {
        try {
          const clientUrl = new URL(client.url);
          const currentOrigin = self.location.origin;

          if (clientUrl.origin === currentOrigin && 'focus' in client) {
            console.log('[Service Worker] Focusing existing window and navigating to:', targetUrl);
            await client.focus();

            // إرسال رسالة تنقل إضافية للعميل المُركَز عليه
            client.postMessage({
              type: 'NAVIGATE_TO',
              url: targetUrl,
              replace: false,
              ...additionalData
            });

            return;
          }
        } catch (error) {
          console.error('[Service Worker] Error checking client URL:', error);
        }
      }

      // فتح نافذة جديدة إذا لم توجد نافذة مناسبة
      if (clients.openWindow) {
        console.log('[Service Worker] Opening new window:', targetUrl);
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// معالجة الرسائل من Frontend - Enhanced with Action Support
self.addEventListener('message', async (event) => {
  console.log('[Service Worker] Message received:', event.data);

  // التحقق من الصلاحيات عند الطلب
  if (event.data && event.data.type === 'CHECK_PERMISSION') {
    const hasPermission = await checkNotificationPermission();
    event.ports[0].postMessage({ permissionGranted: hasPermission });
  }

  // إظهار إشعار مع أزرار الإجراءات - NEW FUNCTIONALITY
  if (event.data && event.data.action === 'show-notification') {
    const hasPermission = await checkNotificationPermission();
    if (hasPermission) {
      const { title, options } = event.data;
      
      // تحسين الخيارات مع دعم الأزرار
      const enhancedOptions = {
        ...options,
        icon: options.icon || '/icons/icon-192x192.svg',
        badge: options.badge || '/icons/badge-72x72.svg',
        requireInteraction: options.requireInteraction !== false,
        renotify: options.renotify !== false
      };

      await self.registration.showNotification(title, enhancedOptions);
      console.log('[Service Worker] Notification shown with actions:', title);
    } else {
      console.warn('[Service Worker] Cannot show notification - permission denied');
    }
  }

  // إرسال إشعار تجريبي
  if (event.data && event.data.type === 'TEST_NOTIFICATION') {
    const hasPermission = await checkNotificationPermission();
    if (hasPermission) {
      const { title = 'اختبار NeoMart', message = 'هذه رسالة تجريبية من Builder.io Frontend' } = event.data;
      
      await self.registration.showNotification(title, {
        body: message,
        icon: '/icons/icon-192x192.svg',
        badge: '/icons/badge-72x72.svg',
        actions: [
          { action: 'test-accept', title: 'موافق', icon: '/icons/check.png' },
          { action: 'test-dismiss', title: 'إغلاق', icon: '/icons/close.png' }
        ],
        data: { type: 'test' },
        tag: 'test-notification',
        requireInteraction: true
      });
    } else {
      console.warn('[Service Worker] Cannot send test notification - permission denied');
    }
  }

  // معالجة الإشعارات من Realtime
  if (event.data && event.data.type === 'NEW_NOTIFICATION') {
    const hasPermission = await checkNotificationPermission();
    if (hasPermission) {
      const data = event.data.payload;
      
      // تحديد الأزرار بناءً على نوع الإشعار
      let actions = [];
      if (data.type === 'order' && data.order_id) {
        actions = [
          { action: 'accept', title: 'قبول', icon: '/icons/check.png' },
          { action: 'reject', title: 'رفض', icon: '/icons/close.png' }
        ];
      }
      
      await self.registration.showNotification(data.title || 'إشعار جديد', {
        body: data.message || '',
        icon: '/icons/icon-192x192.svg',
        badge: '/icons/badge-72x72.svg',
        actions: actions,
        data: {
          order_id: data.order_id,
          type: data.type,
          source: 'realtime'
        },
        tag: data.order_id ? `order-${data.order_id}` : 'realtime-notification',
        renotify: true,
        requireInteraction: true
      });
    }
  }
});
