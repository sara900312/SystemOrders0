import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Wifi, 
  WifiOff,
  Eye,
  Play,
  Square
} from 'lucide-react';
import { 
  EnhancedSupabaseNotificationService,
  initializeEnhancedNotifications,
  sendTestOrderNotification,
  OrderNotification
} from '@/services/enhancedSupabaseNotifications';
import { useNavigate } from 'react-router-dom';

interface NotificationEvent {
  type: string;
  order?: OrderNotification;
  orderId?: string;
  action?: string;
  timestamp: string;
  source?: string;
}

const EnhancedOrderNotificationHandler = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [recentEvents, setRecentEvents] = useState<NotificationEvent[]>([]);
  const [systemStatus, setSystemStatus] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Initialize the notification service
  useEffect(() => {
    const initializeService = async () => {
      try {
        setIsLoading(true);
        console.log('🔧 Initializing Enhanced Order Notification Handler...');
        
        const success = await initializeEnhancedNotifications();
        setIsInitialized(success);
        
        if (success) {
          const service = EnhancedSupabaseNotificationService.getInstance();
          updateSystemStatus();
          
          console.log('✅ Enhanced Order Notification Handler initialized');
        }
      } catch (error) {
        console.error('❌ Failed to initialize notification handler:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeService();
  }, []);

  // Set up event listeners for notification actions
  useEffect(() => {
    const handleNewOrderNotification = (event: CustomEvent) => {
      console.log('📦 New order notification event:', event.detail);
      addRecentEvent({
        type: 'new_order',
        order: event.detail.order,
        timestamp: event.detail.timestamp || new Date().toISOString(),
        source: 'supabase_realtime'
      });
    };

    const handleOrderStatusUpdate = (event: CustomEvent) => {
      console.log('📝 Order status update event:', event.detail);
      addRecentEvent({
        type: 'status_update',
        orderId: event.detail.orderId,
        action: `${event.detail.oldStatus} → ${event.detail.newStatus}`,
        timestamp: event.detail.timestamp || new Date().toISOString(),
        source: 'supabase_realtime'
      });
    };

    const handleOrderAccepted = (event: CustomEvent) => {
      console.log('✅ Order accepted event:', event.detail);
      addRecentEvent({
        type: 'order_accepted',
        orderId: event.detail.orderId,
        action: 'accepted',
        timestamp: new Date().toISOString(),
        source: event.detail.source || 'notification'
      });
    };

    const handleOrderRejected = (event: CustomEvent) => {
      console.log('❌ Order rejected event:', event.detail);
      addRecentEvent({
        type: 'order_rejected',
        orderId: event.detail.orderId,
        action: 'rejected',
        timestamp: new Date().toISOString(),
        source: event.detail.source || 'notification'
      });
    };

    // Service Worker message handler
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_ACTION') {
        console.log('🔔 Service Worker notification action:', event.data);
        
        addRecentEvent({
          type: 'sw_action',
          orderId: event.data.order_id,
          action: event.data.action,
          timestamp: new Date().toISOString(),
          source: 'service_worker'
        });

        // Handle navigation
        if (event.data.action === 'view-order' && event.data.order_id) {
          navigate(`/orders/${event.data.order_id}`);
        } else if (event.data.action === 'accept-order') {
          // Handle order acceptance logic here
          handleOrderAcceptanceAction(event.data.order_id);
        } else if (event.data.action === 'reject-order') {
          // Handle order rejection logic here
          handleOrderRejectionAction(event.data.order_id);
        }
      }
    };

    // Add event listeners
    window.addEventListener('newOrderNotification', handleNewOrderNotification as EventListener);
    window.addEventListener('orderStatusUpdate', handleOrderStatusUpdate as EventListener);
    window.addEventListener('orderAccepted', handleOrderAccepted as EventListener);
    window.addEventListener('orderRejected', handleOrderRejected as EventListener);
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    // Cleanup
    return () => {
      window.removeEventListener('newOrderNotification', handleNewOrderNotification as EventListener);
      window.removeEventListener('orderStatusUpdate', handleOrderStatusUpdate as EventListener);
      window.removeEventListener('orderAccepted', handleOrderAccepted as EventListener);
      window.removeEventListener('orderRejected', handleOrderRejected as EventListener);
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [navigate]);

  // Update system status periodically
  useEffect(() => {
    const updateStatus = () => {
      updateSystemStatus();
    };

    const interval = setInterval(updateStatus, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const updateSystemStatus = useCallback(() => {
    try {
      const service = EnhancedSupabaseNotificationService.getInstance();
      const status = service.getStatus();
      setSystemStatus(status);
      setIsConnected(status.connected);
    } catch (error) {
      console.error('Failed to update system status:', error);
    }
  }, []);

  const addRecentEvent = useCallback((event: NotificationEvent) => {
    setRecentEvents(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 events
  }, []);

  const handleOrderAcceptanceAction = async (orderId: string) => {
    try {
      console.log(`🚀 Processing order acceptance for order ${orderId}`);
      
      // Here you would typically make an API call to update the order status
      // For now, we'll just log and trigger a custom event
      
      addRecentEvent({
        type: 'order_processing',
        orderId,
        action: 'accepting',
        timestamp: new Date().toISOString(),
        source: 'app_action'
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Trigger success event
      window.dispatchEvent(new CustomEvent('orderAccepted', {
        detail: { orderId, source: 'app_action' }
      }));

    } catch (error) {
      console.error('Failed to accept order:', error);
    }
  };

  const handleOrderRejectionAction = async (orderId: string) => {
    try {
      console.log(`🚀 Processing order rejection for order ${orderId}`);
      
      addRecentEvent({
        type: 'order_processing',
        orderId,
        action: 'rejecting',
        timestamp: new Date().toISOString(),
        source: 'app_action'
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Trigger success event
      window.dispatchEvent(new CustomEvent('orderRejected', {
        detail: { orderId, source: 'app_action' }
      }));

    } catch (error) {
      console.error('Failed to reject order:', error);
    }
  };

  const handleTestNotification = async () => {
    try {
      setIsLoading(true);
      const orderId = `TEST-${Date.now()}`;
      await sendTestOrderNotification(orderId);
      
      addRecentEvent({
        type: 'test_notification',
        orderId,
        action: 'sent',
        timestamp: new Date().toISOString(),
        source: 'manual_test'
      });
    } catch (error) {
      console.error('Failed to send test notification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualOrder = async () => {
    try {
      const service = EnhancedSupabaseNotificationService.getInstance();
      const orderId = `MANUAL-${Date.now()}`;
      
      await service.sendManualOrderNotification({
        id: orderId,
        customer_name: 'عميل تجريبي',
        total: 125.75,
        customer_location: 'الرياض - حي النموذجي',
        items: [
          { name: 'وجبة برجر', quantity: 1, price: 45.00 },
          { name: 'بطاطس', quantity: 1, price: 20.75 },
          { name: 'مشروب', quantity: 2, price: 30.00 }
        ]
      });

      addRecentEvent({
        type: 'manual_order',
        orderId,
        action: 'created',
        timestamp: new Date().toISOString(),
        source: 'manual_trigger'
      });
    } catch (error) {
      console.error('Failed to send manual order:', error);
    }
  };

  const getEventIcon = (event: NotificationEvent) => {
    switch (event.type) {
      case 'new_order':
        return <Bell className="w-4 h-4 text-blue-500" />;
      case 'order_accepted':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'order_rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'status_update':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'sw_action':
        return <Eye className="w-4 h-4 text-purple-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getEventDescription = (event: NotificationEvent) => {
    const time = new Date(event.timestamp).toLocaleTimeString('ar-SA');
    
    switch (event.type) {
      case 'new_order':
        return `طلب جديد #${event.order?.id} - ${event.order?.customer_name} (${time})`;
      case 'order_accepted':
        return `تم قبول الطلب #${event.orderId} (${time})`;
      case 'order_rejected':
        return `تم رفض الطلب #${event.orderId} (${time})`;
      case 'status_update':
        return `تحديث حالة الطلب #${event.orderId}: ${event.action} (${time})`;
      case 'sw_action':
        return `إجراء من Service Worker: ${event.action} للطلب #${event.orderId} (${time})`;
      case 'test_notification':
        return `إشعار تجريبي: #${event.orderId} (${time})`;
      case 'manual_order':
        return `طلب يدوي: #${event.orderId} (${time})`;
      default:
        return `حدث: ${event.type} - ${event.action} (${time})`;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            حالة نظام الإشعارات المحسن
          </CardTitle>
          <CardDescription>
            نظام الإشعارات مع Supabase Realtime ودعم أزرار الإجراءات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Realtime</p>
              {isConnected ? (
                <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />متصل</Badge>
              ) : (
                <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />منقطع</Badge>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Service Worker</p>
              {systemStatus.serviceWorkerReady ? (
                <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />جاهز</Badge>
              ) : (
                <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />غير جاهز</Badge>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">القناة</p>
              {systemStatus.hasChannel ? (
                <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />نشطة</Badge>
              ) : (
                <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />غير نشطة</Badge>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">المُهيئ</p>
              {isInitialized ? (
                <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />مكتمل</Badge>
              ) : (
                <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />في التحميل</Badge>
              )}
            </div>
          </div>

          {!isInitialized && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                جاري تهيئة نظام الإشعارات المحسن...
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Control Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>اختبار النظام</CardTitle>
          <CardDescription>اختبر الإشعارات والتكامل مع Supabase</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={handleTestNotification}
              disabled={isLoading || !isInitialized}
              className="h-12"
            >
              <Play className="w-4 h-4 mr-2" />
              إشعار تجريبي
            </Button>
            
            <Button 
              onClick={handleManualOrder}
              disabled={isLoading || !isInitialized}
              variant="outline"
              className="h-12"
            >
              <Square className="w-4 h-4 mr-2" />
              طلب يدوي
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Events */}
      {recentEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>الأحداث الأخيرة</CardTitle>
            <CardDescription>آخر {recentEvents.length} أحداث في النظام</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {recentEvents.map((event, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-md">
                  {getEventIcon(event)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{getEventDescription(event)}</p>
                    <p className="text-xs text-muted-foreground">المصدر: {event.source}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedOrderNotificationHandler;
