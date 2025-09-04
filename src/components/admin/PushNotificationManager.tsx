import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Bell, Send, Settings, TestTube, Users, Smartphone, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { notificationService } from '@/services/notificationService';

interface ServiceWorkerStatus {
  supported: boolean;
  registered: boolean;
  subscribed: boolean;
  permission: NotificationPermission;
  subscription?: PushSubscription | null;
}

interface NotificationTemplate {
  type: string;
  title: string;
  message: string;
  actions: string[];
}

const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    type: 'order_received',
    title: 'طلب جديد 🛍️',
    message: 'تم استلام طلب جديد من {{customer_name}} - الكود: {{order_code}}',
    actions: ['قبول', 'رفض', 'عرض']
  },
  {
    type: 'order_status',
    title: 'تحديث حالة الطلب 📋',
    message: 'تم تحديث حالة الطلب {{order_code}}',
    actions: ['عرض', 'إغلاق']
  },
  {
    type: 'system_alert',
    title: 'تنبيه النظام ⚠️',
    message: 'تنبيه مهم من النظام',
    actions: ['عرض', 'إغلاق']
  }
];

const PushNotificationManager: React.FC = () => {
  const [status, setStatus] = useState<ServiceWorkerStatus>({
    supported: false,
    registered: false,
    subscribed: false,
    permission: 'default'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [testNotification, setTestNotification] = useState({
    type: 'order_received',
    title: 'إشعار تجريبي',
    message: 'هذا إشعار تجريبي لاختبار النظام',
    orderId: 'test-' + Date.now(),
    customerId: 'test-customer'
  });

  const { toast } = useToast();

  useEffect(() => {
    checkServiceWorkerStatus();
  }, []);

  const checkServiceWorkerStatus = async () => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    let registered = false;
    let subscribed = false;
    let subscription: PushSubscription | null = null;
    let permission: NotificationPermission = 'default';

    if (supported) {
      permission = Notification.permission;
      
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        registered = !!registration;
        
        if (registration?.pushManager) {
          subscription = await registration.pushManager.getSubscription();
          subscribed = !!subscription;
        }
      } catch (error) {
        console.error('Error checking service worker status:', error);
      }
    }

    setStatus({
      supported,
      registered,
      subscribed,
      permission,
      subscription
    });
  };

  const registerServiceWorker = async () => {
    setIsLoading(true);
    try {
      const registration = await notificationService.registerServiceWorker();
      if (registration) {
        toast({
          title: "تم التسجيل بنجاح",
          description: "تم تسجيل Service Worker بنجاح",
        });
        await checkServiceWorkerStatus();
      } else {
        throw new Error('Failed to register service worker');
      }
    } catch (error) {
      toast({
        title: "خطأ في التسجيل",
        description: "فشل في تسجيل Service Worker",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const requestNotificationPermission = async () => {
    setIsLoading(true);
    try {
      const permission = await notificationService.requestNotificationPermission();
      if (permission === 'granted') {
        toast({
          title: "تم منح الإذن",
          description: "تم منح إذن الإشعارات بنجاح",
        });
      } else {
        toast({
          title: "تم رفض الإذن",
          description: "تم رفض إذن الإشعارات",
          variant: "destructive",
        });
      }
      await checkServiceWorkerStatus();
    } catch (error) {
      toast({
        title: "خطأ في طلب الإذن",
        description: "فشل في طلب إذن الإشعارات",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToPushNotifications = async () => {
    setIsLoading(true);
    try {
      const success = await notificationService.subscribeToPushNotifications('admin-test', 'admin');
      if (success) {
        toast({
          title: "تم الاشتراك بنجاح",
          description: "تم الاشتراك في الإشعارات بنجاح",
        });
        await checkServiceWorkerStatus();
      } else {
        throw new Error('Failed to subscribe');
      }
    } catch (error) {
      toast({
        title: "خطأ في الاشتراك",
        description: "فشل في الاشتراك في الإشعارات",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    setIsLoading(true);
    try {
      // إرسال الإشعار مباشرة إلى Service Worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        // محاكاة push event
        const notificationData = {
          title: testNotification.title,
          message: testNotification.message,
          type: testNotification.type,
          order_id: testNotification.orderId,
          url: `/orders/${testNotification.orderId}`,
        };

        await registration.showNotification(testNotification.title, {
          body: testNotification.message,
          icon: '/icons/icon-192x192.svg',
          badge: '/icons/badge-72x72.svg',
          vibrate: [200, 100, 200],
          lang: 'ar',
          dir: 'rtl',
          data: notificationData,
          tag: testNotification.orderId,
          renotify: true,
          requireInteraction: true,
          actions: [
            {
              action: 'accept',
              title: '✅ قبول الطلب',
              icon: '/icons/view.svg'
            },
            {
              action: 'reject',
              title: '❌ رفض الطلب',
              icon: '/icons/close.svg'
            },
            {
              action: 'view',
              title: '👁️ عرض التفاصيل',
              icon: '/icons/view.svg'
            }
          ]
        });

        toast({
          title: "تم إرسال الإشعار التجريبي",
          description: "تحقق من الإشعارات في المتصفح",
        });
      }
    } catch (error) {
      console.error('Test notification error:', error);
      toast({
        title: "خطأ في الإشعار التجريبي",
        description: "فشل في إرسال الإشعار التجريبي",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testDatabaseNotification = async () => {
    setIsLoading(true);
    try {
      const success = await notificationService.createTestNotification('admin-test');
      if (success) {
        toast({
          title: "تم إنشاء إشعار قاعدة البيانات",
          description: "تم إنشاء إشعار تجريبي في قاعدة البيانات",
        });
      } else {
        throw new Error('Failed to create database notification');
      }
    } catch (error) {
      toast({
        title: "خطأ في قاعدة البيانات",
        description: "فشل في إنشاء إشعار في قاعدة البيانات",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (condition: boolean) => {
    return condition ? (
      <CheckCircle className="w-5 h-5 text-green-600" />
    ) : (
      <XCircle className="w-5 h-5 text-red-600" />
    );
  };

  const getPermissionBadge = (permission: NotificationPermission) => {
    const variants = {
      granted: 'default',
      denied: 'destructive',
      default: 'secondary'
    } as const;

    const labels = {
      granted: 'مُمنوح',
      denied: 'مرفوض',
      default: 'غير محدد'
    };

    return (
      <Badge variant={variants[permission]}>
        {labels[permission]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-3">
          <Bell className="w-8 h-8" />
          إدارة الإشعارات المتقدمة
        </h1>
        <p className="text-muted-foreground">
          إدارة واختبار نظام Service Worker والإشعارات مع أزرار التفاعل
        </p>
      </div>

      {/* حالة النظام */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            حالة النظام
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>دعم Service Workers</span>
                {getStatusIcon(status.supported)}
              </div>
              <div className="flex items-center justify-between">
                <span>Service Worker مُسجل</span>
                {getStatusIcon(status.registered)}
              </div>
              <div className="flex items-center justify-between">
                <span>اشتراك Push Notifications</span>
                {getStatusIcon(status.subscribed)}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>إذن الإشعارات</span>
                {getPermissionBadge(status.permission)}
              </div>
              {status.subscription && (
                <div className="text-sm">
                  <p className="font-medium">معلومات الاشتراك:</p>
                  <p className="text-muted-foreground truncate">
                    {status.subscription.endpoint.slice(0, 50)}...
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            {!status.registered && (
              <Button onClick={registerServiceWorker} disabled={isLoading || !status.supported}>
                <Smartphone className="w-4 h-4 mr-2" />
                تسجيل Service Worker
              </Button>
            )}
            {status.permission !== 'granted' && (
              <Button onClick={requestNotificationPermission} disabled={isLoading}>
                <Bell className="w-4 h-4 mr-2" />
                طلب إذن الإشعارات
              </Button>
            )}
            {!status.subscribed && status.permission === 'granted' && (
              <Button onClick={subscribeToPushNotifications} disabled={isLoading}>
                <Users className="w-4 h-4 mr-2" />
                الاشتراك في الإشعارات
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* اختبار الإشعارات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            اختبار الإشعارات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">نوع الإشعار</label>
                <Select
                  value={testNotification.type}
                  onValueChange={(value) => setTestNotification(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTIFICATION_TEMPLATES.map(template => (
                      <SelectItem key={template.type} value={template.type}>
                        {template.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">العنوان</label>
                <Input
                  value={testNotification.title}
                  onChange={(e) => setTestNotification(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="عنوان الإشعار"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">الرسالة</label>
                <Textarea
                  value={testNotification.message}
                  onChange={(e) => setTestNotification(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="نص الإشعار"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-2">رقم الطلب</label>
                  <Input
                    value={testNotification.orderId}
                    onChange={(e) => setTestNotification(prev => ({ ...prev, orderId: e.target.value }))}
                    placeholder="رقم الطلب"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">رقم العميل</label>
                  <Input
                    value={testNotification.customerId}
                    onChange={(e) => setTestNotification(prev => ({ ...prev, customerId: e.target.value }))}
                    placeholder="رقم العميل"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">معاينة الإشعار</h4>
                <div className="bg-white p-3 rounded border shadow-sm">
                  <div className="font-medium text-sm">{testNotification.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">{testNotification.message}</div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">قبول</Badge>
                    <Badge variant="outline" className="text-xs">رفض</Badge>
                    <Badge variant="outline" className="text-xs">عرض</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Button 
                  onClick={sendTestNotification} 
                  disabled={isLoading || !status.registered}
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  إرسال إشعار تجريبي
                </Button>
                
                <Button 
                  onClick={testDatabaseNotification} 
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  اختبار قاعدة البيانات
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* قوالب الإشعارات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            قوالب الإشعارات المتاحة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {NOTIFICATION_TEMPLATES.map(template => (
              <div key={template.type} className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">{template.title}</h4>
                <p className="text-sm text-muted-foreground mb-3">{template.message}</p>
                <div className="flex flex-wrap gap-1">
                  {template.actions.map(action => (
                    <Badge key={action} variant="secondary" className="text-xs">
                      {action}
                    </Badge>
                  ))}
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full mt-2"
                  onClick={() => setTestNotification(prev => ({
                    ...prev,
                    type: template.type,
                    title: template.title,
                    message: template.message
                  }))}
                >
                  استخدام هذا القالب
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PushNotificationManager;
