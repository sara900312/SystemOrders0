// Builder.io Console Script - Direct Integration
// يمكن تشغيل هذا السكربت مباشرة في console المتصفح أو في Builder.io Custom Code

(async () => {
  console.log('🚀 Starting Builder.io Service Worker Integration...');
  
  if (!('serviceWorker' in navigator)) {
    console.warn('❌ Service Worker not supported in this browser');
    return;
  }

  // تسجيل Service Worker
  try {
    console.log('📝 Registering Service Worker...');
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    console.log('✅ Service Worker registered:', registration);

    // التحقق من صلاحيات الإشعارات
    console.log('🔔 Requesting notification permission...');
    const permission = await Notification.requestPermission();
    console.log('📋 Notification permission:', permission);

    if (permission !== 'granted') {
      console.warn('⚠️ Notification permission not granted. Notifications will not work.');
      return;
    }

    // وظيفة لإرسال إشعار من الفرونت (اختياري للتجربة)
    async function sendTestNotification() {
      if (!navigator.serviceWorker.controller) {
        console.warn('⚠️ Service Worker controller not ready yet. Waiting...');
        
        // انتظار حتى يصبح Service Worker جاه��
        await new Promise((resolve) => {
          if (navigator.serviceWorker.controller) {
            resolve();
          } else {
            navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
          }
        });
      }

      console.log('📤 Sending test notification...');
      navigator.serviceWorker.controller.postMessage({
        type: 'TEST_NOTIFICATION',
        title: 'اختبار NeoMart',
        message: 'هذه رسالة تجريبية من Builder.io Frontend'
      });
      console.log('✅ Test notification sent');
    }

    // استقبال الرسائل من Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('💬 Message from Service Worker:', event.data);
      
      // معالجة الرسائل المختلفة
      if (event.data?.action === 'view-order') {
        console.log('👁️ Order view requested:', event.data.order_id);
        // يمكن إضافة منطق توجيه المستخدم هنا
      }
    });

    // تجربة تلقائية بعد التسجيل
    console.log('⏳ Waiting 2 seconds before sending test notification...');
    setTimeout(async () => {
      try {
        await sendTestNotification();
        console.log('🎉 Integration completed successfully!');
      } catch (err) {
        console.error('❌ Error sending test notification:', err);
      }
    }, 2000);

    // إضافة دوال global للاختبار اليدوي
    window.neoMartNotifications = {
      sendTest: sendTestNotification,
      
      sendCustom: (title, message) => {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'TEST_NOTIFICATION',
            title,
            message
          });
        }
      },
      
      simulateOrder: (orderId = 'ORDER_' + Date.now()) => {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'NEW_NOTIFICATION',
            payload: {
              title: 'طلب جديد',
              message: `لديك طلب جديد رقم ${orderId}`,
              order_id: orderId,
              type: 'order_received'
            }
          });
        }
      },
      
      checkStatus: () => {
        return {
          serviceWorkerSupported: 'serviceWorker' in navigator,
          notificationSupported: 'Notification' in window,
          notificationPermission: 'Notification' in window ? Notification.permission : 'not-supported',
          serviceWorkerRegistered: !!navigator.serviceWorker.controller,
          registrationScope: registration?.scope || 'unknown'
        };
      }
    };

    console.log('🛠️ Added global utility functions:');
    console.log('  - neoMartNotifications.sendTest()');
    console.log('  - neoMartNotifications.sendCustom(title, message)');
    console.log('  - neoMartNotifications.simulateOrder(orderId)');
    console.log('  - neoMartNotifications.checkStatus()');

  } catch (err) {
    console.error('❌ Service Worker registration failed:', err);
    console.log('💡 Troubleshooting tips:');
    console.log('  - Make sure you are on HTTPS');
    console.log('  - Check if /service-worker.js file exists');
    console.log('  - Try refreshing the page');
  }
})();

// للاستخدام المباشر في Builder.io:
// 1. انسخ هذا الكود بالكامل
// 2. الصقه في Custom Code section في Builder.io
// 3. أو شغله مباشرة في Browser Console
// 4. ستظهر رسائل console توضح حالة التكامل
