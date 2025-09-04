import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  Smartphone, 
  CheckCircle, 
  XCircle, 
  Zap, 
  Settings, 
  TestTube,
  Play,
  ArrowRight,
  Package,
  Users,
  AlertTriangle
} from 'lucide-react';
import QuickNotificationTest from '@/components/ui/quick-notification-test';
import NotificationNav from '@/components/ui/notification-nav';

interface DemoNotification {
  id: string;
  type: 'order_received' | 'order_status' | 'system_alert';
  title: string;
  message: string;
  actions: string[];
}

const DEMO_NOTIFICATIONS: DemoNotification[] = [
  {
    id: 'order-001',
    type: 'order_received',
    title: 'طلب جديد من أحمد محمد 🛍️',
    message: 'طلب #ORD-2024-001 بقيمة 150 ريال - 3 منتجات',
    actions: ['قبول الطلب', 'رفض الطلب', 'عرض التفاصيل']
  },
  {
    id: 'order-002', 
    type: 'order_status',
    title: 'تحديث حالة الطلب 📋',
    message: 'تم تأكيد الطلب #ORD-2024-001 من قبل المتجر',
    actions: ['عرض الطلب', 'إغلاق']
  },
  {
    id: 'system-001',
    type: 'system_alert',
    title: 'تنبيه هام من النظام ⚠️',
    message: 'يوجد 5 طلبات في انتظار الموافقة منذ أكثر من ساعة',
    actions: ['عرض الطلبات', 'إغلاق']
  }
];

const ServiceWorkerDemo: React.FC = () => {
  const [demoStats, setDemoStats] = useState({
    notificationsSent: 0,
    actionsClicked: 0,
    testsRun: 0
  });
  
  const { toast } = useToast();

  const sendDemoNotification = async (demo: DemoNotification) => {
    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Workers not supported');
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Define actions based on notification type
      let actions: NotificationAction[] = [];
      
      if (demo.type === 'order_received') {
        actions = [
          { action: 'accept', title: '✅ قبول الطلب', icon: '/icons/view.svg' },
          { action: 'reject', title: '❌ رفض الطلب', icon: '/icons/close.svg' },
          { action: 'view', title: '👁️ عرض التفاصيل', icon: '/icons/view.svg' }
        ];
      } else if (demo.type === 'order_status') {
        actions = [
          { action: 'view', title: '📋 عرض الطلب', icon: '/icons/view.svg' },
          { action: 'dismiss', title: '✖️ إغلاق', icon: '/icons/close.svg' }
        ];
      } else {
        actions = [
          { action: 'view', title: '👁️ عرض', icon: '/icons/view.svg' },
          { action: 'dismiss', title: '✖️ إغلاق', icon: '/icons/close.svg' }
        ];
      }

      await registration.showNotification(demo.title, {
        body: demo.message,
        icon: '/icons/icon-192x192.svg',
        badge: '/icons/badge-72x72.svg',
        vibrate: [200, 100, 200, 100, 200],
        lang: 'ar',
        dir: 'rtl',
        data: {
          url: `/orders/${demo.id}`,
          orderId: demo.id,
          type: demo.type,
          timestamp: Date.now()
        },
        tag: demo.id,
        renotify: true,
        requireInteraction: true,
        actions: actions,
        silent: false,
        timestamp: Date.now()
      });

      setDemoStats(prev => ({ 
        ...prev, 
        notificationsSent: prev.notificationsSent + 1 
      }));

      toast({
        title: "تم إرسال الإشعار التوضيحي",
        description: `نوع: ${demo.type} - تحقق من الإشعارات`,
      });

    } catch (error) {
      toast({
        title: "خطأ في الإشعار",
        description: error instanceof Error ? error.message : "خطأ غير معروف",
        variant: "destructive",
      });
    }
  };

  const runFullDemo = async () => {
    try {
      // Request permission first
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          throw new Error('Notification permission required');
        }
      }

      toast({
        title: "بدء العرض التوضيحي الشامل",
        description: "سيتم إرسال 3 إشعارات متتالية",
      });

      // Send notifications with delays
      for (let i = 0; i < DEMO_NOTIFICATIONS.length; i++) {
        setTimeout(async () => {
          await sendDemoNotification(DEMO_NOTIFICATIONS[i]);
        }, i * 3000); // 3 seconds apart
      }

      setDemoStats(prev => ({ 
        ...prev, 
        testsRun: prev.testsRun + 1 
      }));

    } catch (error) {
      toast({
        title: "خطأ في العرض التوضيحي",
        description: error instanceof Error ? error.message : "خطأ غير معروف",
        variant: "destructive",
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'order_received': return <Package className="w-4 h-4" />;
      case 'order_status': return <CheckCircle className="w-4 h-4" />;
      case 'system_alert': return <AlertTriangle className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'order_received': return 'bg-blue-500';
      case 'order_status': return 'bg-green-500';
      case 'system_alert': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-primary mb-2 flex items-center gap-3">
          <Smartphone className="w-10 h-10" />
          عرض توضيحي للService Worker
        </h1>
        <p className="text-lg text-muted-foreground">
          اختبر نظام الإشعارات المتقدم مع أزرار التفاعل والميزات الحديثة
        </p>
      </div>

      {/* Navigation */}
      <NotificationNav />

      {/* Quick Test */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <QuickNotificationTest />
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              إحصائيات العرض
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">الإشعارات المُرسلة</span>
                <Badge variant="default">{demoStats.notificationsSent}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">الاختبارات المُجراة</span>
                <Badge variant="secondary">{demoStats.testsRun}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">النقرات المسجلة</span>
                <Badge variant="outline">{demoStats.actionsClicked}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Demo Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            أمثلة الإشعارات التفاعلية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {DEMO_NOTIFICATIONS.map((demo) => (
              <Card key={demo.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-full ${getTypeColor(demo.type)} text-white`}>
                      {getTypeIcon(demo.type)}
                    </div>
                    <Badge variant="outline">{demo.type}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <h4 className="font-semibold mb-2 text-sm">{demo.title}</h4>
                  <p className="text-xs text-muted-foreground mb-3">{demo.message}</p>
                  
                  <div className="space-y-2 mb-3">
                    <p className="text-xs font-medium">الإجراءات المتاحة:</p>
                    <div className="flex flex-wrap gap-1">
                      {demo.actions.map((action, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {action}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <Button 
                    size="sm" 
                    className="w-full" 
                    onClick={() => sendDemoNotification(demo)}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    إرسال
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="flex gap-3">
            <Button onClick={runFullDemo} size="lg" className="flex-1">
              <Zap className="w-4 h-4 mr-2" />
              عرض توضيحي شامل
            </Button>
            
            <Link to="/advanced-notifications">
              <Button variant="outline" size="lg">
                النظام المتقدم
                <ArrowRight className="w-4 h-4 mr-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            الميزات المتقدمة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <Smartphone className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <h4 className="font-semibold mb-1">Service Worker</h4>
              <p className="text-xs text-muted-foreground">يعمل في الخلفية حتى عند إغلاق التطبيق</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <Bell className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <h4 className="font-semibold mb-1">Push Notifications</h4>
              <p className="text-xs text-muted-foreground">إشعارات فورية من الخادم</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <Users className="w-8 h-8 mx-auto mb-2 text-purple-500" />
              <h4 className="font-semibold mb-1">أزرار تفاعلية</h4>
              <p className="text-xs text-muted-foreground">إجراءات مباشرة من الإشعار</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <Package className="w-8 h-8 mx-auto mb-2 text-orange-500" />
              <h4 className="font-semibold mb-1">تخزين مؤقت</h4>
              <p className="text-xs text-muted-foreground">أداء سريع وعمل أوفلاين</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>💡 تعليمات الاستخدام</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-semibold mb-2">🚀 البدء السريع:</h4>
              <ol className="space-y-1 mr-4">
                <li>1. اضغط على "اختبار الإشعارات" أعلاه</li>
                <li>2. امنح إذن الإشعارات عند الطلب</li>
                <li>3. انتظر ظهور الإشعار التجريبي</li>
                <li>4. جرب الضغط على أزرار الإجراءات</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🎮 الاختبار المتقدم:</h4>
              <ol className="space-y-1 mr-4">
                <li>1. اختر نوع إشعار من الأمثلة</li>
                <li>2. اضغط "إرسال" لإرسال إشعار واحد</li>
                <li>3. أو اضغط "عرض توضيحي شامل" للكل</li>
                <li>4. راقب الإحصائيات والسلوك</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceWorkerDemo;
