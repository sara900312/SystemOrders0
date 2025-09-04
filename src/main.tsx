import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { notificationService } from './services/notificationService'
import { realtimeNotificationService } from './services/realtimeNotificationService'
import { initializeOrderNotificationTriggers, startPeriodicReminders, cleanupNotificationSystems } from './utils/orderNotificationTrigger'
import { ServiceWorkerNotifications, registerServiceWorker } from './services/serviceWorkerNotifications'
import { initializeEnhancedNotifications } from './services/enhancedSupabaseNotifications'

// Cleanup notification systems on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cleanupNotificationSystems();
  });

  // Also cleanup on visibility change (when tab is closed/hidden)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cleanupNotificationSystems();
    }
  });
}

// Enhanced Service Worker registration with VAPID support
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// Initialize notifications in the background after the app is rendered
function initializeNotifications() {
  // Use requestIdleCallback for better performance, fallback to setTimeout
  const init = async () => {
    try {
      // Only initialize if we're in a browser environment
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
        console.log('🔧 Initializing enhanced Service Worker with Action Buttons...');

        // Initialize the enhanced Service Worker notification system
        const swNotificationService = ServiceWorkerNotifications.getInstance();
        const registered = await swNotificationService.registerServiceWorker();

        if (registered) {
          console.log('✅ Enhanced Service Worker with Actions registered successfully');

          // Auto-request notification permission if not set
          if (Notification.permission === 'default') {
            console.log('🔔 Auto-requesting notification permission...');
            const permission = await swNotificationService.requestPermission();
            console.log('🔔 Notification permission:', permission);
          }

          // Test notification capabilities with action buttons
          if (Notification.permission === 'granted') {
            console.log('✅ Notifications with action buttons are enabled and ready');

            // Show enhanced welcome notification with actions
            setTimeout(() => {
              swNotificationService.showWelcomeNotification();
            }, 3000);

            // Log system information
            const systemInfo = swNotificationService.getSystemInfo();
            console.log('📊 Notification System Info:', systemInfo);
          }
        } else {
          console.warn('⚠️ Failed to register enhanced Service Worker, falling back to basic registration');

          // Fallback to basic registration
          const registration = await navigator.serviceWorker.register('/service-worker.js', {
            scope: '/'
          });
          console.log('✅ Basic Service Worker registered:', registration);
        }

        console.log('✅ Enhanced notification service initialized');
      }

      // Initialize Enhanced Supabase Realtime notification service
      console.log('🔧 Initializing Enhanced Supabase Realtime notification service...');
      const supabaseInitialized = await initializeEnhancedNotifications();
      if (supabaseInitialized) {
        console.log('✅ Enhanced Supabase Realtime notification service initialized');
      } else {
        console.warn('⚠️ Enhanced Supabase notifications failed to initialize, falling back to basic realtime');
        await realtimeNotificationService.initialize();
        console.log('✅ Basic Realtime notification service initialized');
      }

      // Initialize store notification triggers (with duplicate prevention)
      const cleanupTriggers = initializeOrderNotificationTriggers();

      // Start periodic reminder system (with duplicate prevention)
      const cleanupReminders = startPeriodicReminders();

      console.log('✅ Store notification systems initialized');

      // Store cleanup functions for later use
      if (typeof window !== 'undefined') {
        (window as any).__notificationCleanup = () => {
          cleanupTriggers();
          cleanupReminders();
          cleanupNotificationSystems();
          realtimeNotificationService.disconnect();
        };

        // Add enhanced Service Worker notification test to global scope for debugging
        (window as any).__testNotifications = () => {
          const swService = ServiceWorkerNotifications.getInstance();
          return swService.testNotification();
        };

        // Add order notification function to global scope
        (window as any).__showOrderNotification = (orderId: string, message: string) => {
          const swService = ServiceWorkerNotifications.getInstance();
          return swService.showOrderNotification(`طلب رقم ${orderId}`, {
            body: message,
            actions: [
              { action: 'accept', title: 'قبول' },
              { action: 'reject', title: 'رفض' }
            ],
            order_id: orderId,
            type: 'order',
            tag: `order-${orderId}`
          });
        };
      }
    } catch (error) {
      console.warn('⚠️ Failed to initialize notifications:', error);
    }
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(init, { timeout: 2000 });
  } else {
    setTimeout(init, 1000);
  }
}

// Render the app immediately
createRoot(document.getElementById("root")!).render(<App />);

// Initialize notifications after the initial render
initializeNotifications();
