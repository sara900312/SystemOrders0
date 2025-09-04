import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Wifi, 
  WifiOff,
  Settings,
  Database,
  Smartphone,
  RefreshCw
} from 'lucide-react';
import EnhancedOrderNotificationHandler from '@/components/orders/EnhancedOrderNotificationHandler';
import EnhancedNotificationsDemo from './EnhancedNotificationsDemo';

const CompleteNotificationSystemDemo = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const restartDevServer = () => {
    window.location.reload();
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-primary">🚀 نظام الإشعارات المتكامل</h1>
        <p className="text-xl text-muted-foreground">
          Supabase Realtime + Service Worker + أزرار الإجراءات + دعم العربية
        </p>
        <p className="text-sm text-muted-foreground">
          الوقت الحالي: {currentTime.toLocaleString('ar-SA')}
        </p>
      </div>

      {/* System Overview */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-6 h-6" />
            نظرة عامة على النظام
          </CardTitle>
          <CardDescription>
            نظام إشعارات شامل يدمج Supabase Realtime مع Service Workers ودعم كامل للغة العربية
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <Database className="w-8 h-8 text-blue-500" />
              <div>
                <h3 className="font-semibold">Supabase Realtime</h3>
                <p className="text-sm text-muted-foreground">استقبال الطلبات فوري</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <Smartphone className="w-8 h-8 text-green-500" />
              <div>
                <h3 className="font-semibold">Service Worker</h3>
                <p className="text-sm text-muted-foreground">إشعارات خلفية</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
              <Bell className="w-8 h-8 text-purple-500" />
              <div>
                <h3 className="font-semibold">أزرار الإجراءات</h3>
                <p className="text-sm text-muted-foreground">قبول/رفض مباشر</p>
              </div>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>ميزات النظام:</strong> 
              إشعارات realtime للطلبات الجديدة، أزرار قبول/رفض فورية، تنقل ذكي للصفحات، 
              دعم كامل للعربية، service worker للعمل في الخلفية، تكامل مع Supabase
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button onClick={restartDevServer} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              إعادة تشغيل النظام
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Interface */}
      <Tabs defaultValue="handler" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="handler">معالج الطلبات</TabsTrigger>
          <TabsTrigger value="notifications">اختبار الإشعارات</TabsTrigger>
          <TabsTrigger value="instructions">التعليمات</TabsTrigger>
        </TabsList>

        <TabsContent value="handler" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>معالج الطلبات مع Supabase Realtime</CardTitle>
              <CardDescription>
                يستقبل الطلبات الجديدة من Supabase ويعرض إشعارات فورية مع أزرار الإجراءات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnhancedOrderNotificationHandler />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>اختبار نظام الإشعارات</CardTitle>
              <CardDescription>
                اختبر جميع أنواع الإشعارات والتأكد من عمل أزرار الإجراءات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnhancedNotificationsDemo />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instructions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>دليل الاستخدام</CardTitle>
              <CardDescription>كيفية استخدام النظام المتكامل</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">📋 خطوات الاختبار:</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>تأكد من منح صلاحية الإشعارات للمتصفح</li>
                    <li>تحقق من حالة الاتصال مع Supabase في تبويب "معالج الطلبات"</li>
                    <li>اضغط على "إشعار تجريبي" لاختبار الإشعارات الأساسية</li>
                    <li>اضغط على "طلب يدوي" لمحاكاة طلب جديد من Supabase</li>
                    <li>عندما يظهر الإشعار، جرب الضغط على أزرار "قبول" أو "رفض"</li>
                    <li>راقب الأحداث الأخيرة لتتبع جميع العمليات</li>
                  </ol>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">🔧 المكونات المطلوبة:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Frontend:</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• React + TypeScript</li>
                        <li>• Supabase Client</li>
                        <li>• Service Worker API</li>
                        <li>• Notification API</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">Backend:</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Supabase Database</li>
                        <li>• Realtime Subscriptions</li>
                        <li>• PostgreSQL Triggers</li>
                        <li>• Row Level Security</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">📱 أزرار الإجراءات:</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span><strong>قبول:</strong> يفتح صفحة الطلب مع معامل action=accept</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span><strong>رفض:</strong> يفتح صفحة الطلب مع معامل action=reject</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-500" />
                      <span><strong>عرض:</strong> يفتح صفحة تفاصيل الطلب</span>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Bell className="h-4 w-4" />
                  <AlertDescription>
                    <strong>نصيحة:</strong> إذا لم تظهر الإشعارات، تأكد من أن المتصفح يدعم Service Workers 
                    وأن الصلاحيات ممنوحة. يمكنك أيضاً فتح Developer Tools لمراقبة console logs.
                  </AlertDescription>
                </Alert>

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">🔗 روابط مفيدة:</h4>
                  <div className="text-sm space-y-1">
                    <p>• كود المشروع: /src/services/enhancedSupabaseNotifications.ts</p>
                    <p>• Service Worker: /public/service-worker.js</p>
                    <p>• معالج الطلبات: /src/components/orders/EnhancedOrderNotificationHandler.tsx</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompleteNotificationSystemDemo;
