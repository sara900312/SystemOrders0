import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface IntegrationStatus {
  serviceWorkerRegistered: boolean;
  notificationPermission: NotificationPermission;
  isSupported: boolean;
  lastTestResult?: string;
}

export const BuilderIOIntegration: React.FC = () => {
  const [status, setStatus] = useState<IntegrationStatus>({
    serviceWorkerRegistered: false,
    notificationPermission: 'default',
    isSupported: false
  });

  const [isLoading, setIsLoading] = useState(false);

  // فحص الحالة الحالية
  const checkStatus = async () => {
    const isSupported = 'serviceWorker' in navigator && 'Notification' in window;
    const registration = await navigator.serviceWorker.getRegistration();
    const notificationPermission = 'Notification' in window ? Notification.permission : 'denied';

    setStatus({
      serviceWorkerRegistered: !!registration,
      notificationPermission,
      isSupported
    });
  };

  useEffect(() => {
    checkStatus();
  }, []);

  // تشغيل السكربت المقدم من المستخدم
  const runBuilderIOScript = async () => {
    setIsLoading(true);
    
    try {
      // السكربت المحدث من المستخدم
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker not supported');
      }

      // تسجيل Service Worker
      console.log('🔧 Registering Service Worker...');
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('✅ Service Worker registered:', registration);

      // التحقق من صلاحيات الإشعارات
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);

      if (permission !== 'granted') {
        setStatus(prev => ({ ...prev, lastTestResult: 'Permission denied' }));
        setIsLoading(false);
        return;
      }

      // وظيفة لإرسال إشعار من الفرونت (اختياري للتجربة)
      const sendTestNotification = async () => {
        if (!navigator.serviceWorker.controller) {
          console.warn('No service worker controller');
          return;
        }

        navigator.serviceWorker.controller.postMessage({
          type: 'TEST_NOTIFICATION',
          title: 'اختبار NeoMart',
          message: 'هذه رسالة تجريبية من Builder.io Frontend'
        });
      };

      // استقبال الرسائل من Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('Message from SW:', event.data);
        if (event.data?.action === 'view-order') {
          setStatus(prev => ({ 
            ...prev, 
            lastTestResult: `Order view requested: ${event.data.order_id}` 
          }));
        }
      });

      // تجربة تلقائية بعد التسجيل
      await new Promise(resolve => setTimeout(resolve, 1000)); // انتظار قصير
      await sendTestNotification();

      setStatus(prev => ({ 
        ...prev, 
        lastTestResult: 'Integration successful! Test notification sent.' 
      }));

      // فحص الحالة مرة أخرى
      await checkStatus();

    } catch (err) {
      console.error('❌ Service Worker registration failed:', err);
      setStatus(prev => ({ 
        ...prev, 
        lastTestResult: `Error: ${err.message}` 
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // إرسال إشعار تجريبي
  const sendTestNotification = async () => {
    if (!navigator.serviceWorker.controller) {
      alert('Service Worker not ready. Please run the integration first.');
      return;
    }

    navigator.serviceWorker.controller.postMessage({
      type: 'TEST_NOTIFICATION',
      title: 'اختبار يدوي',
      message: 'هذا إشعار تجري��ي يدوي'
    });

    setStatus(prev => ({ 
      ...prev, 
      lastTestResult: 'Manual test notification sent' 
    }));
  };

  // محاكاة إشعار Realtime
  const simulateRealtimeNotification = async () => {
    if (!navigator.serviceWorker.controller) {
      alert('Service Worker not ready. Please run the integration first.');
      return;
    }

    navigator.serviceWorker.controller.postMessage({
      type: 'NEW_NOTIFICATION',
      payload: {
        title: 'طلب جديد',
        message: 'لديك طلب جديد من العميل أحمد محمد',
        order_id: 'ORDER_123',
        type: 'order_received'
      }
    });

    setStatus(prev => ({ 
      ...prev, 
      lastTestResult: 'Realtime notification simulated' 
    }));
  };

  const getPermissionBadgeVariant = (permission: NotificationPermission) => {
    switch (permission) {
      case 'granted': return 'default';
      case 'denied': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Builder.io Frontend Integration</CardTitle>
        <CardDescription>
          تكامل نظام الإشعارات مع Builder.io باستخدام Service Worker
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* حالة النظام */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Service Worker</label>
            <Badge variant={status.serviceWorkerRegistered ? 'default' : 'secondary'}>
              {status.serviceWorkerRegistered ? 'مسجل' : 'غير مسجل'}
            </Badge>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notification Permission</label>
            <Badge variant={getPermissionBadgeVariant(status.notificationPermission)}>
              {status.notificationPermission}
            </Badge>
          </div>
        </div>

        {/* دعم المتصفح */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Browser Support</label>
          <Badge variant={status.isSupported ? 'default' : 'destructive'}>
            {status.isSupported ? 'مدعوم' : 'غير مدعوم'}
          </Badge>
        </div>

        {/* نتيجة آخر اختبار */}
        {status.lastTestResult && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Last Test Result</label>
            <div className="p-3 bg-muted rounded-md text-sm">
              {status.lastTestResult}
            </div>
          </div>
        )}

        {/* أزرار التحكم */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button 
            onClick={runBuilderIOScript} 
            disabled={isLoading || !status.isSupported}
            className="w-full"
          >
            {isLoading ? 'تشغيل...' : 'تشغيل التكامل'}
          </Button>
          
          <Button 
            onClick={sendTestNotification} 
            variant="outline"
            disabled={!status.serviceWorkerRegistered}
            className="w-full"
          >
            إشعار تجريبي
          </Button>
          
          <Button 
            onClick={simulateRealtimeNotification} 
            variant="outline"
            disabled={!status.serviceWorkerRegistered}
            className="w-full"
          >
            محاكاة Realtime
          </Button>
        </div>

        {/* تعليمات */}
        <div className="bg-blue-50 p-4 rounded-md">
          <h4 className="font-medium text-blue-900 mb-2">تعليمات التكامل:</h4>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. اضغط على "تشغيل التكامل" لتسجيل Service Worker وطلب الصلاحيات</li>
            <li>2. امنح الصلاحية للإشعارات عند الطلب</li>
            <li>3. استخدم "إشعار تجريبي" لاختبار النظام</li>
            <li>4. استخدم "محاكاة Realtime" لاختبار إشعارات الطلبات</li>
          </ol>
        </div>

        {/* كود للنسخ */}
        <div className="space-y-2">
          <label className="text-sm font-medium">للاستخدام في Builder.io Custom Code:</label>
          <div className="bg-gray-100 p-3 rounded-md text-xs font-mono overflow-auto">
            <pre>{`// إضافة هذا الكود في Custom Code في Builder.io
(async () => {
  if (!('serviceWorker' in navigator)) return;
  
  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted' && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'TEST_NOTIFICATION',
        title: 'اختبار NeoMart',
        message: 'تم تفعيل الإشعارات بنجاح'
      });
    }
  } catch (err) {
    console.error('Service Worker error:', err);
  }
})();`}</pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BuilderIOIntegration;
