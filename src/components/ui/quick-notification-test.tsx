import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Bell, TestTube, CheckCircle, XCircle, Smartphone } from 'lucide-react';

const QuickNotificationTest: React.FC = () => {
  const [swStatus, setSwStatus] = useState<{
    supported: boolean;
    registered: boolean;
    permission: NotificationPermission;
  }>({
    supported: false,
    registered: false,
    permission: 'default'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    let registered = false;
    let permission: NotificationPermission = 'default';

    if (supported) {
      permission = Notification.permission;
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        registered = !!registration;
      } catch (error) {
        console.error('Error checking SW status:', error);
      }
    }

    setSwStatus({ supported, registered, permission });
  };

  const testServiceWorker = async () => {
    setIsLoading(true);
    try {
      if (!swStatus.supported) {
        throw new Error('Service Workers not supported');
      }

      // Register if not registered
      if (!swStatus.registered) {
        await navigator.serviceWorker.register('/service-worker.js');
        toast({
          title: "تم التسجيل",
          description: "تم تسجيل Service Worker",
        });
      }

      // Request permission if needed
      if (swStatus.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Notification permission denied');
        }
      }

      // Show test notification
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('اختبار سريع ⚡', {
        body: 'هذا اختبار سريع لنظام الإشعارات المتقدم',
        icon: '/icons/icon-192x192.svg',
        badge: '/icons/badge-72x72.svg',
        lang: 'ar',
        dir: 'rtl',
        tag: 'quick-test',
        data: { url: '/advanced-notifications' },
        actions: [
          {
            action: 'open',
            title: '🚀 فتح النظام المتقدم',
            icon: '/icons/view.svg'
          },
          {
            action: 'dismiss',
            title: '✖️ إغلاق',
            icon: '/icons/close.svg'
          }
        ]
      });

      toast({
        title: "تم الاختبار بنجاح",
        description: "تحقق من الإشعار الذي ظهر",
      });

      await checkStatus();
    } catch (error) {
      toast({
        title: "فشل الاختبار",
        description: error instanceof Error ? error.message : "خطأ غير معروف",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    );
  };

  const getPermissionColor = (permission: NotificationPermission) => {
    switch (permission) {
      case 'granted': return 'text-green-600';
      case 'denied': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TestTube className="w-5 h-5" />
          اختبار سريع للإشعارات
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Service Worker</span>
              <div className="flex items-center gap-1">
                {getStatusIcon(swStatus.registered)}
                <Badge variant={swStatus.registered ? "default" : "secondary"}>
                  {swStatus.registered ? "مُسجل" : "غير مُسجل"}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span>الدعم</span>
              <div className="flex items-center gap-1">
                {getStatusIcon(swStatus.supported)}
                <Badge variant={swStatus.supported ? "default" : "destructive"}>
                  {swStatus.supported ? "مدعوم" : "غير مدعوم"}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span>الأذونات</span>
              <Badge 
                variant={swStatus.permission === 'granted' ? "default" : "secondary"}
                className={getPermissionColor(swStatus.permission)}
              >
                {swStatus.permission === 'granted' ? 'مُمنوح' : 
                 swStatus.permission === 'denied' ? 'مرفوض' : 'غير محدد'}
              </Badge>
            </div>
          </div>

          {/* Test button */}
          <Button 
            onClick={testServiceWorker}
            disabled={isLoading || !swStatus.supported}
            className="w-full"
            size="lg"
          >
            <Bell className="w-4 h-4 mr-2" />
            {isLoading ? 'جاري الاختبار...' : 'اختبار الإشعارات'}
          </Button>

          {/* Instructions */}
          <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
            <p className="font-medium mb-1">💡 التعليمات:</p>
            <p>• سيطلب الإذن للإشعارات إذا لم يكن ممنوحاً</p>
            <p>• سيسجل Service Worker إذا لم يكن مُسجلاً</p>
            <p>• سيظهر إشعار تجريبي مع أزرار تفاعلية</p>
            <p>• اضغط على الإشعار للانتقال للنظام المتقدم</p>
          </div>

          {!swStatus.supported && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                <strong>متصفح غير مدعوم</strong>
              </div>
              <p className="mt-1">هذا المتصفح لا يدعم Service Workers أو Push Notifications</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickNotificationTest;
