import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Wifi } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { adminNotificationService } from '@/services/adminNotificationService';
import { channelManager } from '@/utils/realtimeChannelFix';

interface ConnectionStatus {
  name: string;
  status: 'connected' | 'error' | 'timeout' | 'closed' | 'unknown';
  lastUpdate: Date;
  errorCount: number;
  details?: any;
}

export function RealtimeMonitor() {
  const [connections, setConnections] = useState<ConnectionStatus[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [errorLog, setErrorLog] = useState<string[]>([]);

  const updateConnectionStatus = (name: string, status: ConnectionStatus['status'], details?: any) => {
    setConnections(prev => {
      const existing = prev.find(c => c.name === name);
      if (existing) {
        return prev.map(c => 
          c.name === name 
            ? { 
                ...c, 
                status, 
                lastUpdate: new Date(), 
                errorCount: status === 'error' ? c.errorCount + 1 : c.errorCount,
                details 
              }
            : c
        );
      } else {
        return [...prev, {
          name,
          status,
          lastUpdate: new Date(),
          errorCount: status === 'error' ? 1 : 0,
          details
        }];
      }
    });
  };

  const addToErrorLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('ar');
    setErrorLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]); // آخر 20 رسالة
  };

  const startMonitoring = async () => {
    setIsMonitoring(true);
    setConnections([]);
    setErrorLog([]);
    
    addToErrorLog('بدء مراقبة اتصالات Real-time...');

    // 1️⃣ اختبار اتصال قاعدة البيانات
    try {
      const { data, error } = await supabase.from('orders').select('count').limit(1);
      if (error) {
        updateConnectionStatus('Database', 'error', error);
        addToErrorLog(`خطأ في قاعدة البيانات: ${error.message}`);
      } else {
        updateConnectionStatus('Database', 'connected');
        addToErrorLog('✅ اتصال قاعدة البيانات يعمل');
      }
    } catch (error) {
      updateConnectionStatus('Database', 'error', error);
      addToErrorLog(`خطأ في قاعدة البيانات: ${error}`);
    }

    // 2️⃣ اختبار قناة admin-notifications
    try {
      const adminChannel = supabase
        .channel('monitor-admin-notifications')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'orders'
        }, (payload) => {
          addToErrorLog('📨 حدث في admin-notifications');
        })
        .subscribe((status) => {
          addToErrorLog(`📡 admin-notifications: ${status}`);
          
          if (status === 'SUBSCRIBED') {
            updateConnectionStatus('Admin Notifications', 'connected');
          } else if (status === 'CHANNEL_ERROR') {
            updateConnectionStatus('Admin Notifications', 'error');
            addToErrorLog('❌ خطأ في قناة Admin Notifications: CHANNEL_ERROR');
          } else if (status === 'TIMED_OUT') {
            updateConnectionStatus('Admin Notifications', 'timeout');
            addToErrorLog('⏰ انتهت مهلة قناة Admin Notifications');
          }
        });

      // إزالة القناة بعد 30 ثانية
      setTimeout(() => {
        supabase.removeChannel(adminChannel);
      }, 30000);

    } catch (error) {
      updateConnectionStatus('Admin Notifications', 'error', error);
      addToErrorLog(`خطأ في إنشاء قناة Admin Notifications: ${error}`);
    }

    // 3️⃣ اختبار قناة العامة للطلبات
    try {
      const ordersChannel = supabase
        .channel('monitor-orders')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'orders'
        }, (payload) => {
          addToErrorLog('📨 حدث في orders channel');
        })
        .subscribe((status) => {
          addToErrorLog(`📡 orders: ${status}`);
          
          if (status === 'SUBSCRIBED') {
            updateConnectionStatus('Orders Channel', 'connected');
          } else if (status === 'CHANNEL_ERROR') {
            updateConnectionStatus('Orders Channel', 'error');
            addToErrorLog('❌ خطأ في قناة Orders: CHANNEL_ERROR');
          } else if (status === 'TIMED_OUT') {
            updateConnectionStatus('Orders Channel', 'timeout');
            addToErrorLog('⏰ انتهت مهلة قناة Orders');
          }
        });

      // إزالة القناة بعد 30 ثانية
      setTimeout(() => {
        supabase.removeChannel(ordersChannel);
      }, 30000);

    } catch (error) {
      updateConnectionStatus('Orders Channel', 'error', error);
      addToErrorLog(`خطأ في إنشاء قناة Orders: ${error}`);
    }

    // 4️⃣ اختبار خدمة Admin Notification Service
    try {
      const adminStatus = adminNotificationService.getStatus();
      updateConnectionStatus('Admin Service', adminStatus.isListening ? 'connected' : 'error', adminStatus);
      addToErrorLog(`📊 حالة Admin Service: ${adminStatus.isListening ? 'متصل' : 'غير متصل'}`);
    } catch (error) {
      updateConnectionStatus('Admin Service', 'error', error);
      addToErrorLog(`خطأ في Admin Service: ${error}`);
    }

    // 5️⃣ فحص شامل باستخدام channelManager
    try {
      const testResult = await channelManager.testConnection();
      setTestResults(testResult);
      
      updateConnectionStatus('Connection Test', 
        testResult.database && testResult.realtime ? 'connected' : 'error', 
        testResult
      );
      
      addToErrorLog(`🔍 نتيجة الفحص الشامل: ${testResult.database && testResult.realtime ? 'نجح' : 'فشل'}`);
      
      if (testResult.errors.length > 0) {
        testResult.errors.forEach(error => addToErrorLog(`❌ ${error}`));
      }
    } catch (error) {
      updateConnectionStatus('Connection Test', 'error', error);
      addToErrorLog(`خطأ في الفحص الشامل: ${error}`);
    }

    addToErrorLog('انتهت عملية المراقبة');
    setIsMonitoring(false);
  };

  const getStatusIcon = (status: ConnectionStatus['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'timeout':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'closed':
        return <Wifi className="h-4 w-4 text-gray-500" />;
      default:
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: ConnectionStatus['status']) => {
    switch (status) {
      case 'connected':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'timeout':
        return 'border-yellow-200 bg-yellow-50';
      case 'closed':
        return 'border-gray-200 bg-gray-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  useEffect(() => {
    // تشغيل المراقبة تلقائياً عند تحميل الصفحة
    startMonitoring();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">مراقب اتصالات Real-time</h2>
          <p className="text-muted-foreground">مراقبة حالة جميع اتصالات Real-time وتشخيص الأخطاء</p>
        </div>
        <Button
          onClick={startMonitoring}
          disabled={isMonitoring}
          className="gap-2"
        >
          {isMonitoring && <RefreshCw className="h-4 w-4 animate-spin" />}
          {isMonitoring ? 'جاري ال��راقبة...' : 'إعادة المراقبة'}
        </Button>
      </div>

      {/* حالة الاتصالات */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {connections.map((connection) => (
          <Card key={connection.name} className={`${getStatusColor(connection.status)} transition-all duration-200`}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                {getStatusIcon(connection.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{connection.name}</h3>
                    <Badge 
                      variant={connection.status === 'connected' ? 'default' : connection.status === 'error' ? 'destructive' : 'secondary'}
                    >
                      {connection.status === 'connected' ? 'متصل' : 
                       connection.status === 'error' ? 'خطأ' : 
                       connection.status === 'timeout' ? 'انتهت المهلة' : 'مغلق'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    آخر تحديث: {connection.lastUpdate.toLocaleTimeString('ar')}
                  </p>
                  {connection.errorCount > 0 && (
                    <p className="text-xs text-red-600">
                      عدد الأخطاء: {connection.errorCount}
                    </p>
                  )}
                  {connection.details && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                        عرض التفاصيل
                      </summary>
                      <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto max-w-full">
                        {JSON.stringify(connection.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* نتائج الفحص الشامل */}
      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle>نتائج الفحص الشامل</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-3">
              <div className={`p-3 rounded-lg ${testResults.database ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-2">
                  {testResults.database ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                  <span className="font-medium">قاعدة البيانات</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${testResults.realtime ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-2">
                  {testResults.realtime ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                  <span className="font-medium">Real-time</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${testResults.auth ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <div className="flex items-center gap-2">
                  {testResults.auth ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-yellow-500" />}
                  <span className="font-medium">المصادقة</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* سجل الأخطاء */}
      <Card>
        <CardHeader>
          <CardTitle>سجل الأخطاء المباشر</CardTitle>
          <CardDescription>آخر 20 رسالة من نشاط Real-time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {errorLog.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">لا توجد رسائل بعد</p>
            ) : (
              errorLog.map((log, index) => (
                <div 
                  key={index} 
                  className={`text-sm p-2 rounded font-mono ${
                    log.includes('❌') ? 'bg-red-50 text-red-800' :
                    log.includes('✅') ? 'bg-green-50 text-green-800' :
                    log.includes('⏰') ? 'bg-yellow-50 text-yellow-800' :
                    'bg-muted text-muted-foreground'
                  }`}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RealtimeMonitor;
