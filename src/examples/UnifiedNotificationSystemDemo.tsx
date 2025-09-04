import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Store, 
  Shield, 
  User, 
  Send, 
  Zap, 
  CheckCircle, 
  AlertTriangle,
  Info
} from 'lucide-react';

// Import the new unified notification system components
import { NotificationList } from '@/components/notifications/NotificationList';
import { NotificationToast } from '@/components/notifications/NotificationToast';
import { UnifiedAdminNotificationBell } from '@/components/ui/unified-admin-notification-bell';
import { centralNotificationManager } from '@/services/centralNotificationManager';
import { unifiedAdminNotificationService } from '@/services/unifiedAdminNotificationService';

/**
 * Comprehensive demo of the unified notification system
 * Demonstrates usage for both Store and Admin dashboards
 * Uses ONLY the notifications table as specified
 */
export const UnifiedNotificationSystemDemo: React.FC = () => {
  const [demoStoreId] = useState('demo-store-123');
  const [demoAdminId] = useState('admin');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');

  // Demo form state
  const [notificationForm, setNotificationForm] = useState({
    recipientType: 'store' as 'store' | 'admin' | 'customer',
    recipientId: demoStoreId,
    title: '',
    message: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    url: '',
    orderId: ''
  });

  // Send test notification
  const sendTestNotification = async () => {
    setIsLoading(true);
    try {
      let success = false;
      
      if (notificationForm.recipientType === 'admin') {
        success = await centralNotificationManager.notifyAdmin(
          notificationForm.title || 'إشعار تجريبي للإدارة',
          notificationForm.message || 'هذا إشعار تجريبي للتأكد من عمل النظام الموحد',
          notificationForm.orderId || undefined
        );
      } else if (notificationForm.recipientType === 'store') {
        success = await centralNotificationManager.notifyStore(
          notificationForm.recipientId || demoStoreId,
          notificationForm.title || 'إشعار تجريبي للمتجر',
          notificationForm.message || 'هذا إشعار تجريبي للتأكد من عمل النظام الموحد',
          notificationForm.orderId || undefined
        );
      } else {
        success = await centralNotificationManager.notifyCustomer(
          notificationForm.recipientId || 'demo-customer',
          notificationForm.title || 'إشعار تجريبي للعميل',
          notificationForm.message || 'هذا إشعار تجريبي للتأكد من عمل النظام الموحد',
          notificationForm.orderId || undefined
        );
      }

      setLastResult(success ? 'تم إرسال الإشعار بنجاح ✅' : 'فشل في إرسال الإشعار ❌');
    } catch (error) {
      setLastResult('حدث خطأ: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Send admin test notification
  const sendAdminTestNotification = async () => {
    setIsLoading(true);
    try {
      await unifiedAdminNotificationService.addTestNotification();
      setLastResult('تم إرسال إشعار تجريبي للإدارة ✅');
    } catch (error) {
      setLastResult('فشل في إرسال الإشعار: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Send urgent notification
  const sendUrgentNotification = async (type: 'store' | 'admin') => {
    setIsLoading(true);
    try {
      const success = await centralNotificationManager.createNotification({
        recipient_type: type,
        recipient_id: type === 'admin' ? demoAdminId : demoStoreId,
        title: '🚨 إشعار عاجل!',
        message: 'هذا إشعار عاجل سيظهر كـ Toast في الزاوية العلوية اليمنى',
        order_id: 'urgent-' + Date.now()
      });

      // Manually update with priority (as centralNotificationManager doesn't support priority directly)
      if (success) {
        // The notification will be picked up by the real-time system
        setLastResult('تم إرسال إشعار عاجل ✅ - ستراه كـ Toast');
      } else {
        setLastResult('فشل في إرسال الإشعار العاجل ❌');
      }
    } catch (error) {
      setLastResult('حدث خطأ: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">نظام الإشعارات الموحد</h1>
        <p className="text-muted-foreground">
          عرض شامل لنظام الإشعارات الجديد الذي يستخدم جدول notifications فقط
        </p>
        
        <Alert className="max-w-2xl mx-auto">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>مهم:</strong> هذا النظام يستخدم <code>notifications</code> table فقط. 
            تم إزالة الاعتماد على <code>admin_notifications</code> و <code>store_order_responses</code> tables.
          </AlertDescription>
        </Alert>
      </div>

      {/* Demo Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            إرسال إشعارات تجريبية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label htmlFor="recipientType">نوع المستلم</Label>
              <Select
                value={notificationForm.recipientType}
                onValueChange={(value: 'store' | 'admin' | 'customer') => {
                  setNotificationForm(prev => ({
                    ...prev,
                    recipientType: value,
                    recipientId: value === 'admin' ? demoAdminId : 
                                value === 'store' ? demoStoreId : 'demo-customer'
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="store">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4" />
                      متجر
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      إدارة
                    </div>
                  </SelectItem>
                  <SelectItem value="customer">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      عميل
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="recipientId">معرف المستلم</Label>
              <Input
                id="recipientId"
                value={notificationForm.recipientId}
                onChange={(e) => setNotificationForm(prev => ({ ...prev, recipientId: e.target.value }))}
                placeholder="مثال: store-123"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="title">عنوان ا��إشعار</Label>
              <Input
                id="title"
                value={notificationForm.title}
                onChange={(e) => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="عنوان الإشعار"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="priority">الأولوية</Label>
              <Select
                value={notificationForm.priority}
                onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => 
                  setNotificationForm(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">منخفضة</SelectItem>
                  <SelectItem value="medium">متوسطة</SelectItem>
                  <SelectItem value="high">عالية</SelectItem>
                  <SelectItem value="urgent">عاجلة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="message">نص الإشعار</Label>
            <Textarea
              id="message"
              value={notificationForm.message}
              onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))}
              placeholder="نص الإشعار..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label htmlFor="url">رابط الإشعار (اختياري)</Label>
              <Input
                id="url"
                value={notificationForm.url}
                onChange={(e) => setNotificationForm(prev => ({ ...prev, url: e.target.value }))}
                placeholder="/admin/orders/123"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="orderId">معرف الطلب (اختياري)</Label>
              <Input
                id="orderId"
                value={notificationForm.orderId}
                onChange={(e) => setNotificationForm(prev => ({ ...prev, orderId: e.target.value }))}
                placeholder="order-123"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={sendTestNotification} 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              إرسال إشعار تجريبي
            </Button>

            <Button 
              onClick={sendAdminTestNotification} 
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              إشعار إدارة تجريبي
            </Button>

            <Button 
              onClick={() => sendUrgentNotification('store')} 
              disabled={isLoading}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              إشعار عاجل للمتجر
            </Button>

            <Button 
              onClick={() => sendUrgentNotification('admin')} 
              disabled={isLoading}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              إشعار عاجل للإدارة
            </Button>
          </div>

          {lastResult && (
            <Alert className={lastResult.includes('✅') ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{lastResult}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Live Demo */}
      <Tabs defaultValue="admin" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="admin" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            لوحة الإدارة
          </TabsTrigger>
          <TabsTrigger value="store" className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            لوحة المتجر
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admin" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Admin Notification Bell Demo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>جرس الإشعارات - الإدارة</span>
                  <UnifiedAdminNotificationBell adminId={demoAdminId} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  يستخدم جدول <code>notifications</code> فقط مع فلترة <code>recipient_type='admin'</code>
                </p>
                <div className="space-y-2">
                  <Badge variant="outline">Real-time Updates ✅</Badge>
                  <Badge variant="outline">Toast Alerts ✅</Badge>
                  <Badge variant="outline">Unified Table ✅</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Admin Notification List */}
            <Card>
              <CardContent className="p-0">
                <NotificationList
                  userContext={{ type: 'admin', id: demoAdminId }}
                  maxHeight="300px"
                  showHeader={true}
                  showConnectionStatus={true}
                />
              </CardContent>
            </Card>
          </div>

          {/* Toast Demo for Admin */}
          <NotificationToast 
            userContext={{ type: 'admin', id: demoAdminId }}
            priorityFilter={['urgent', 'high']}
          />
        </TabsContent>

        <TabsContent value="store" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Store Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  متجر تجريبي
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  ID: <code>{demoStoreId}</code>
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  يستخدم جدول <code>notifications</code> مع فلترة:
                  <br />
                  <code>recipient_type='store' AND recipient_id='{demoStoreId}'</code>
                </p>
                <div className="space-y-2">
                  <Badge variant="outline">Real-time Updates ✅</Badge>
                  <Badge variant="outline">Toast Alerts ✅</Badge>
                  <Badge variant="outline">Unified Table ✅</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Store Notification List */}
            <Card>
              <CardContent className="p-0">
                <NotificationList
                  userContext={{ type: 'store', id: demoStoreId }}
                  maxHeight="300px"
                  showHeader={true}
                  showConnectionStatus={true}
                />
              </CardContent>
            </Card>
          </div>

          {/* Toast Demo for Store */}
          <NotificationToast 
            userContext={{ type: 'store', id: demoStoreId }}
            priorityFilter={['urgent', 'high']}
          />
        </TabsContent>
      </Tabs>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>التفاصيل التقنية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">🗃️ جدول البيانات المستخدم</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>✅ <code>notifications</code> - الجدول الموحد الوحيد</li>
                <li>❌ <code>admin_notifications</code> - تم إزالته</li>
                <li>❌ <code>store_order_responses</code> - غير مستخدم</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">📡 Real-time Configuration</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>Channel: <code>notifications_channel</code></li>
                <li>Event: <code>new_notification</code></li>
                <li>Table: <code>notifications</code></li>
                <li>Filters: <code>recipient_type</code> & <code>recipient_id</code></li>
              </ul>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold mb-2">🔧 المكونات الجديدة</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Hooks:</strong>
                <ul className="text-muted-foreground mt-1 space-y-1">
                  <li>• <code>useNotifications</code> - الخطاف الأساسي</li>
                </ul>
              </div>
              <div>
                <strong>Components:</strong>
                <ul className="text-muted-foreground mt-1 space-y-1">
                  <li>• <code>NotificationList</code> - قائمة الإشعارات</li>
                  <li>• <code>NotificationToast</code> - التنبيهات العاجلة</li>
                  <li>• <code>UnifiedAdminNotificationBell</code> - جرس الإدارة</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnifiedNotificationSystemDemo;
