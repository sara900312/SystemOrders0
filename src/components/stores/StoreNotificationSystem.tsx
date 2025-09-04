import React, { useEffect, useState } from 'react';
import StoreNotificationCenter from './StoreNotificationCenter';
import StoreNotificationToast from './StoreNotificationToast';
import { ensureNotificationsTableExists, addSampleNotifications } from '@/utils/setupNotificationsTable';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Settings, TestTube, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface StoreNotificationSystemProps {
  current_store: {
    id: string;
  };
  className?: string;
  showTestPanel?: boolean;
  notificationCenterProps?: {
    maxHeight?: string;
    showHeader?: boolean;
    className?: string;
  };
  toastProps?: {
    autoHideDuration?: number;
  };
}

export const StoreNotificationSystem: React.FC<StoreNotificationSystemProps> = ({
  current_store,
  className = "",
  showTestPanel = false,
  notificationCenterProps = {},
  toastProps = {}
}) => {
  const [systemStatus, setSystemStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<string[]>([]);
  const { toast } = useToast();

  // Initialize notification system
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        setSystemStatus('loading');
        setSetupError(null);

        console.log('🚀 Initializing notification system for store:', current_store.id);

        // Ensure notifications table exists
        const tableExists = await ensureNotificationsTableExists();
        if (!tableExists) {
          throw new Error('Failed to setup notifications table');
        }

        // Check if store has any notifications, if not add samples
        const { data: existingNotifications } = await supabase
          .from('notifications')
          .select('id')
          .eq('recipient_type', 'store')
          .eq('recipient_id', current_store.id)
          .limit(1);

        if (!existingNotifications || existingNotifications.length === 0) {
          console.log('📝 Adding sample notifications for store:', current_store.id);
          await addSampleNotifications(current_store.id);
        }

        setSystemStatus('ready');
        console.log('✅ Notification system initialized successfully');
        
        toast({
          title: 'نظام الإشعارات جاهز',
          description: 'تم تفعيل نظام الإشعارات بنجاح',
          duration: 3000,
        });

      } catch (error) {
        console.error('❌ Failed to initialize notification system:', error);
        setSetupError(error instanceof Error ? error.message : 'Unknown error');
        setSystemStatus('error');
      }
    };

    if (current_store?.id) {
      initializeSystem();
    }
  }, [current_store.id, toast]);

  // Test functions for sending notifications via the exact channel and event names
  const sendTestNotification = async (priority: 'low' | 'medium' | 'high' | 'urgent', type: string = 'test') => {
    try {
      addTestResult(`🧪 Sending ${priority} priority test notification...`);

      const testNotification = {
        id: `test-${Date.now()}`,
        recipient_type: 'store',
        recipient_id: current_store.id,
        title: `إشعار اختبار ${priority === 'urgent' ? 'عاجل' : priority === 'high' ? 'مهم' : 'عادي'}`,
        message: `هذا إشعار اختبار بأولوية ${priority} تم إرساله في ${new Date().toLocaleTimeString('ar')}`,
        priority,
        type,
        url: '/store-dashboard',
        created_at: new Date().toISOString(),
        read: false,
        sent: true
      };

      // First insert into database
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(testNotification);

      if (insertError) {
        throw insertError;
      }

      // Then broadcast using exact channel and event names
      const { error: broadcastError } = await supabase
        .channel('notifications_channel')
        .send({
          type: 'broadcast',
          event: 'new_notification',
          payload: testNotification
        });

      if (broadcastError) {
        throw broadcastError;
      }

      addTestResult(`✅ ${priority} priority test notification sent successfully`);
    } catch (error) {
      addTestResult(`❌ Test error: ${error}`);
    }
  };

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev.slice(-9), result]); // Keep last 10 results
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  const retrySetup = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
    window.location.reload(); // Simple retry by reloading
  };

  if (systemStatus === 'loading') {
    return (
      <div className={`space-y-4 ${className}`}>
        <Alert>
          <Settings className="h-4 w-4" />
          <AlertDescription>
            جاري إعداد نظام الإشعارات...
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (systemStatus === 'error') {
    return (
      <div className={`space-y-4 ${className}`}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            خطأ في إعداد نظام الإشعارات: {setupError}
          </AlertDescription>
        </Alert>
        <Button onClick={retrySetup} variant="outline">
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* System Status */}
      <Alert>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="flex items-center justify-between">
          <span>نظام الإشعارات يعمل بشكل طبيعي</span>
          <Badge variant="outline" className="bg-green-50 text-green-600">
            <Bell className="w-3 h-3 mr-1" />
            نشط - notifications_channel
          </Badge>
        </AlertDescription>
      </Alert>

      {/* Main Notification Center */}
      <StoreNotificationCenter 
        current_store={current_store}
        {...notificationCenterProps}
      />

      {/* Real-time Toast Notifications */}
      <StoreNotificationToast 
        current_store={current_store}
        autoHideDuration={toastProps.autoHideDuration || 10000}
      />

      {/* Test Panel (optional) */}
      {showTestPanel && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              لوحة اختبار الإشعارات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button 
                onClick={() => sendTestNotification('low')}
                variant="outline"
                size="sm"
              >
                اختبار عادي
              </Button>
              <Button 
                onClick={() => sendTestNotification('medium')}
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-200"
              >
                اختبار متوسط
              </Button>
              <Button 
                onClick={() => sendTestNotification('high')}
                variant="outline"
                size="sm"
                className="text-orange-600 border-orange-200"
              >
                اختبار مهم
              </Button>
              <Button 
                onClick={() => sendTestNotification('urgent')}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200"
              >
                اختبار عاجل
              </Button>
            </div>

            {testResults.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">نتائج الاختبار:</h4>
                  <Button 
                    onClick={clearTestResults}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                  >
                    مسح
                  </Button>
                </div>
                <div className="bg-gray-50 p-3 rounded-md text-xs space-y-1 max-h-32 overflow-y-auto">
                  {testResults.map((result, index) => (
                    <div key={index} className="font-mono">
                      {result}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Alert>
              <Bell className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>ملاحظة:</strong> الإشعارات العاجلة والمهمة ستظهر كتنبيهات منبثقة، 
                بينما جميع الإشعارات ستظهر في قائمة الإشعارات أعلاه.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StoreNotificationSystem;
