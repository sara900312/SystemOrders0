import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Bell, 
  Zap, 
  Send, 
  TestTube, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Play,
  Users,
  Database,
  Settings
} from 'lucide-react';
import { realtimeNotificationService, NotificationPayload } from '@/services/realtimeNotificationService';

const RealtimeNotificationTestPage: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: false,
    subscribersCount: 0,
    channelState: null as string | null
  });
  
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [testNotification, setTestNotification] = useState({
    title: 'إشعار تجريبي من Realtime',
    message: 'هذا إشعار تجريبي تم إرساله عبر نظام Realtime المحدث',
    type: 'test',
    recipient_id: 'admin-test',
    recipient_type: 'admin',
    order_id: '',
    url: '/realtime-test'
  });

  const { toast } = useToast();

  useEffect(() => {
    // تحديث حالة الاتصال
    updateConnectionStatus();

    // الاشتراك في الإشعارات الجديدة
    const unsubscribe = realtimeNotificationService.subscribe((notification) => {
      console.log('📩 Received notification in UI:', notification);
      setNotifications(prev => [notification, ...prev].slice(0, 10)); // احتفظ بآخر 10 إشعارات
      
      toast({
        title: "إشعار جديد عبر Realtime",
        description: notification.message,
      });
    });

    // تحديث الحالة كل 5 ثوانٍ
    const statusInterval = setInterval(updateConnectionStatus, 5000);

    return () => {
      unsubscribe();
      clearInterval(statusInterval);
    };
  }, [toast]);

  const updateConnectionStatus = () => {
    const status = realtimeNotificationService.getStatus();
    setConnectionStatus(status);
  };

  const sendTestNotification = async () => {
    setIsLoading(true);
    try {
      const success = await realtimeNotificationService.sendNotification(testNotification);
      
      if (success) {
        toast({
          title: "تم إرسال الإشعار",
          description: "تم إرسال الإشعار التجريبي بنجاح عبر Edge Function",
        });
      } else {
        throw new Error('Failed to send notification');
      }
    } catch (error) {
      toast({
        title: "خطأ في الإرسال",
        description: "فشل في إرسال الإشعار التجريبي",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendOrderNotification = async () => {
    setIsLoading(true);
    try {
      const success = await realtimeNotificationService.sendOrderNotification({
        order_id: `order-${Date.now()}`,
        order_code: `ORD-${Date.now()}`,
        customer_name: 'أحمد محمد',
        store_id: 'store-test',
        total_amount: 150.75
      });
      
      if (success) {
        toast({
          title: "تم إرسال إشعار الطلب",
          description: "تم إرسال إشعار طلب جديد بنجاح",
        });
      } else {
        throw new Error('Failed to send order notification');
      }
    } catch (error) {
      toast({
        title: "خطأ في إرسال إشعار الطلب",
        description: "فشل في إرسال إشعار الطلب",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendStatusNotification = async () => {
    setIsLoading(true);
    try {
      const success = await realtimeNotificationService.sendOrderStatusNotification({
        order_id: `order-${Date.now()}`,
        order_code: `ORD-${Date.now()}`,
        status: 'تم التأكيد',
        customer_id: 'customer-test'
      });
      
      if (success) {
        toast({
          title: "تم إرسال إشعار الحالة",
          description: "تم إرسال إشعار تحديث الحالة بنجاح",
        });
      } else {
        throw new Error('Failed to send status notification');
      }
    } catch (error) {
      toast({
        title: "خطأ في إرسال إشعار الحالة",
        description: "فشل في إرسال إشعار تحديث الحالة",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const reconnectRealtime = async () => {
    setIsLoading(true);
    try {
      await realtimeNotificationService.reconnect();
      updateConnectionStatus();
      
      toast({
        title: "تم إعادة الاتصال",
        description: "تم إعادة الاتصال بنظام Realtime بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ في إعادة الاتصال",
        description: "فشل في إعادة الاتصال بنظام Realtime",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    toast({
      title: "تم تنظيف الإشعارات",
      description: "تم مسح جميع الإشعارات المعروضة",
    });
  };

  const getConnectionIcon = () => {
    return connectionStatus.isConnected ? (
      <Wifi className="w-5 h-5 text-green-600" />
    ) : (
      <WifiOff className="w-5 h-5 text-red-600" />
    );
  };

  const getConnectionBadge = () => {
    return (
      <Badge variant={connectionStatus.isConnected ? "default" : "destructive"}>
        {connectionStatus.isConnected ? "متصل" : "غير متصل"}
      </Badge>
    );
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ar', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getNotificationTypeIcon = (type: string) => {
    switch (type) {
      case 'order_received': return '🛍️';
      case 'order_status': return '📋';
      case 'test': return '🧪';
      default: return '📢';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-primary mb-2 flex items-center gap-3">
          <Zap className="w-10 h-10" />
          اختبار نظام Realtime المحدث
        </h1>
        <p className="text-lg text-muted-foreground">
          اختبار النظام المحدث مع Edge Function وService Worker
        </p>
      </div>

      {/* حالة الاتصال */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getConnectionIcon()}
            حالة اتصال Realtime
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center justify-between">
              <span>الاتصال</span>
              {getConnectionBadge()}
            </div>
            <div className="flex items-center justify-between">
              <span>المشتركون</span>
              <Badge variant="secondary">{connectionStatus.subscribersCount}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>حالة القناة</span>
              <Badge variant="outline">{connectionStatus.channelState || 'N/A'}</Badge>
            </div>
            <div className="flex justify-end">
              <Button onClick={reconnectRealtime} disabled={isLoading} size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                إعادة اتصال
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* اختبار الإرسال */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              إرسال إشعار مخصص
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">العنوان</label>
                  <Input
                    value={testNotification.title}
                    onChange={(e) => setTestNotification(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="عنوان الإشعار"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">النوع</label>
                  <Select
                    value={testNotification.type}
                    onValueChange={(value) => setTestNotification(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">اختبار</SelectItem>
                      <SelectItem value="order_received">طلب جديد</SelectItem>
                      <SelectItem value="order_status">تحديث حالة</SelectItem>
                      <SelectItem value="system_alert">تنبيه النظام</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">الرسالة</label>
                <Textarea
                  value={testNotification.message}
                  onChange={(e) => setTestNotification(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="نص الإشعار"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">معرف المستلم</label>
                  <Input
                    value={testNotification.recipient_id}
                    onChange={(e) => setTestNotification(prev => ({ ...prev, recipient_id: e.target.value }))}
                    placeholder="معرف المستلم"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">نوع المستلم</label>
                  <Select
                    value={testNotification.recipient_type}
                    onValueChange={(value) => setTestNotification(prev => ({ ...prev, recipient_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">إدارة</SelectItem>
                      <SelectItem value="store">متجر</SelectItem>
                      <SelectItem value="customer">عميل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={sendTestNotification} disabled={isLoading} className="w-full">
                <Send className="w-4 h-4 mr-2" />
                إرسال الإشعار
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              اختبارات سريعة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button onClick={sendOrderNotification} disabled={isLoading} className="w-full">
                <Users className="w-4 h-4 mr-2" />
                إرسال إشعار طلب جديد
              </Button>
              
              <Button onClick={sendStatusNotification} disabled={isLoading} variant="outline" className="w-full">
                <Database className="w-4 h-4 mr-2" />
                إرسال إشعار تحديث حالة
              </Button>
              
              <Button 
                onClick={() => realtimeNotificationService.sendTestNotification('admin-test')} 
                disabled={isLoading} 
                variant="secondary" 
                className="w-full"
              >
                <Bell className="w-4 h-4 mr-2" />
                إشعار تجريبي سريع
              </Button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">💡 نصائح الاختبار</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• تأكد من أن Service Worker مُسجل</li>
                <li>• تحقق من اتصال Realtime أعلاه</li>
                <li>• راقب console للسجلات التفصيلية</li>
                <li>• الإشعارات ستظهر كـ browser notifications</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* الإشعارات المستلمة */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            الإشعارات المستلمة ({notifications.length})
          </CardTitle>
          <Button onClick={clearNotifications} variant="outline" size="sm">
            تنظيف
          </Button>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد إشعارات بعد</p>
              <p className="text-sm">قم بإرسال إشعار تجريبي لرؤية النتائج هنا</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification, index) => (
                <div key={`${notification.id}-${index}`} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getNotificationTypeIcon(notification.type)}</span>
                      <h4 className="font-medium">{notification.title}</h4>
                      <Badge variant="outline">{notification.type}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatTime(notification.created_at)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>مستلم: {notification.recipient_type}</span>
                    <span>معرف: {notification.recipient_id}</span>
                    {notification.order_id && <span>طلب: {notification.order_id}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RealtimeNotificationTestPage;
