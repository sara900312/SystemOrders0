import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ServiceWorkerNotifications, 
  showOrderNotification, 
  testNotificationSystem,
  requestNotificationPermission 
} from '@/services/serviceWorkerNotifications';
import { CheckCircle, XCircle, AlertCircle, Bell, Play, RefreshCw } from 'lucide-react';

const EnhancedNotificationsDemo = () => {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [systemInfo, setSystemInfo] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [orderCounter, setOrderCounter] = useState(1234);

  useEffect(() => {
    checkSystemStatus();
    
    // الاستماع لأحداث قبول/رفض الطلبات
    const handleOrderAccepted = (event: CustomEvent) => {
      addTestResult(`✅ تم قبول الطلب ${event.detail.orderId} من خلال الإشعار`);
    };

    const handleOrderRejected = (event: CustomEvent) => {
      addTestResult(`❌ تم رفض الطلب ${event.detail.orderId} من خلال الإشعار`);
    };

    window.addEventListener('orderAccepted', handleOrderAccepted as EventListener);
    window.addEventListener('orderRejected', handleOrderRejected as EventListener);

    return () => {
      window.removeEventListener('orderAccepted', handleOrderAccepted as EventListener);
      window.removeEventListener('orderRejected', handleOrderRejected as EventListener);
    };
  }, []);

  const checkSystemStatus = () => {
    if (typeof window !== 'undefined') {
      const service = ServiceWorkerNotifications.getInstance();
      setSystemInfo(service.getSystemInfo());
      setPermissionStatus(service.getPermissionStatus());
    }
  };

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleRequestPermission = async () => {
    setIsLoading(true);
    try {
      const permission = await requestNotificationPermission();
      setPermissionStatus(permission);
      addTestResult(`تم طلب الصلاحية: ${permission}`);
    } catch (error) {
      addTestResult(`خطأ في طلب الصلاحية: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestBasicNotification = async () => {
    setIsLoading(true);
    try {
      const success = await testNotificationSystem();
      addTestResult(success ? '✅ تم إرسال الإشعار التجريبي بنجاح' : '❌ فشل في إرسال الإشعار التجريبي');
    } catch (error) {
      addTestResult(`❌ خطأ في الإشعار التجريبي: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestOrderNotification = async () => {
    setIsLoading(true);
    const currentOrderId = orderCounter.toString();
    setOrderCounter(prev => prev + 1);
    
    try {
      const success = await showOrderNotification(`طلب جديد #${currentOrderId}`, {
        body: `تم استلام طلب جديد من العميل. المبلغ: 250 ريال`,
        actions: [
          { action: 'accept', title: 'قبول الطلب' },
          { action: 'reject', title: 'رفض الطلب' }
        ],
        order_id: currentOrderId,
        type: 'order',
        tag: `order-${currentOrderId}`,
        icon: '/icons/icon-192x192.svg'
      });
      
      addTestResult(success ? `✅ تم إرسال إشعار الطلب #${currentOrderId}` : `❌ فشل في إرسال إشعار الطلب #${currentOrderId}`);
    } catch (error) {
      addTestResult(`❌ خطأ في إشعار الطلب: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestUrgentNotification = async () => {
    setIsLoading(true);
    const urgentOrderId = `URGENT-${Date.now()}`;
    
    try {
      const success = await showOrderNotification('🚨 طلب عاجل!', {
        body: 'طلب عاجل يتطلب استجابة فورية - طلب VIP',
        actions: [
          { action: 'accept', title: '⚡ قبول فوري' },
          { action: 'reject', title: '❌ رفض' },
          { action: 'later', title: '⏰ لاحقاً' }
        ],
        order_id: urgentOrderId,
        type: 'urgent',
        tag: `urgent-${urgentOrderId}`,
        icon: '/icons/icon-192x192.svg'
      });
      
      addTestResult(success ? `✅ تم إرسال الإشعار العاجل` : `❌ فشل في إرسال الإشعار العاجل`);
    } catch (error) {
      addTestResult(`❌ خطأ في الإشعار العاجل: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getPermissionBadge = () => {
    switch (permissionStatus) {
      case 'granted':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />مُمنوحة</Badge>;
      case 'denied':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />مرفوضة</Badge>;
      default:
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />لم يتم تحديدها</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-primary">🔔 نظام الإشعارات المحسّن</h1>
        <p className="text-muted-foreground">اختبار الإشعارات مع أزرار الإجراءات ودعم اللغة العربية</p>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            حالة النظام
          </CardTitle>
          <CardDescription>معلومات عن دعم المتصفح وحالة الصلاحيات</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Service Worker</p>
              {systemInfo.serviceWorkerSupported ? (
                <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />مدعوم</Badge>
              ) : (
                <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />غير مدعوم</Badge>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">الإشعارات</p>
              {systemInfo.notificationSupported ? (
                <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />مدعومة</Badge>
              ) : (
                <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />غير مدعومة</Badge>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">الصلاحيات</p>
              {getPermissionBadge()}
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">التسجيل</p>
              {systemInfo.registered ? (
                <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />مُسجل</Badge>
              ) : (
                <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />غير مُسجل</Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleRequestPermission} disabled={isLoading || permissionStatus === 'granted'}>
              <Bell className="w-4 h-4 mr-2" />
              طلب صلاحية الإشعارات
            </Button>
            <Button variant="outline" onClick={checkSystemStatus}>
              <RefreshCw className="w-4 h-4 mr-2" />
              تحديث الحالة
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            اختبار الإشعارات
          </CardTitle>
          <CardDescription>اختبر أنواع مختلفة من الإشعارات مع أزرار الإجراءات</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={handleTestBasicNotification} 
              disabled={isLoading || permissionStatus !== 'granted'}
              className="h-20 flex-col gap-2"
            >
              <Bell className="w-6 h-6" />
              إشعار تجريبي أساسي
            </Button>
            
            <Button 
              onClick={handleTestOrderNotification} 
              disabled={isLoading || permissionStatus !== 'granted'}
              className="h-20 flex-col gap-2"
              variant="default"
            >
              <CheckCircle className="w-6 h-6" />
              إشعار طلب عادي
            </Button>
            
            <Button 
              onClick={handleTestUrgentNotification} 
              disabled={isLoading || permissionStatus !== 'granted'}
              className="h-20 flex-col gap-2"
              variant="destructive"
            >
              <AlertCircle className="w-6 h-6" />
              إشعار طلب عاجل
            </Button>
          </div>

          {permissionStatus !== 'granted' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                يجب منح صلاحية الإشعارات أولاً لاختبار النظام
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>نتائج الاختبار</CardTitle>
            <CardDescription>آخر النشاطات والاختبارات</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm p-2 bg-muted rounded-md font-mono">
                  {result}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>كيفية الاستخدام</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <p><strong>1.</strong> اضغط على "طلب صلاحية الإشعارات" للحصول على إذن المتصفح</p>
            <p><strong>2.</strong> جرب الإشعارات المختلفة باستخدام الأزرار أعلاه</p>
            <p><strong>3.</strong> عند ظهور الإشعار، جرب الضغط على أزرار "قبول" أو "رفض"</p>
            <p><strong>4.</strong> راقب نتائج الاختبار في القسم أدناه</p>
            <p><strong>5.</strong> يمكن أيضاً الضغط على الإشعار نفسه للانتقال لصفحة الطلب</p>
          </div>
          
          <Alert>
            <Bell className="h-4 w-4" />
            <AlertDescription>
              <strong>ملاحظة:</strong> تأكد من أن المتصفح يدعم الإشعارات وأن النافذة ليست في وضع "عدم الإزعاج"
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedNotificationsDemo;
