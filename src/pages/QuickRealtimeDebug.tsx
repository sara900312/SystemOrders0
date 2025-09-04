import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export default function QuickRealtimeDebug() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [channelErrors, setChannelErrors] = useState<string[]>([]);

  const addResult = (result: DiagnosticResult) => {
    setResults(prev => [...prev, result]);
  };

  const runQuickDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    setChannelErrors([]);

    // Test 1: تحقق من الاتصال بقاعدة البيانات
    try {
      const { data, error } = await supabase.from('orders').select('count').limit(1);
      if (error) {
        addResult({
          test: 'Database Connection',
          status: 'error',
          message: 'فشل الاتصال بقاعدة البيانات',
          details: error
        });
      } else {
        addResult({
          test: 'Database Connection',
          status: 'success',
          message: 'الاتصال بقاعدة البيانات يعمل بشكل طبيعي'
        });
      }
    } catch (error) {
      addResult({
        test: 'Database Connection',
        status: 'error',
        message: 'خطأ في الاتصال بقاعدة البيانات',
        details: error
      });
    }

    // Test 2: فحص حالة المصادقة
    try {
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        addResult({
          test: 'Authentication Status',
          status: 'success',
          message: `مسجل دخول كـ: ${session.session.user?.email || 'مجهول'}`
        });
      } else {
        addResult({
          test: 'Authentication Status',
          status: 'warning',
          message: 'غير مسجل دخول - يستخدم anon key'
        });
      }
    } catch (error) {
      addResult({
        test: 'Authentication Status',
        status: 'error',
        message: 'خطأ في فحص حالة المصادقة',
        details: error
      });
    }

    // Test 3: اختبار Real-time Channel مع مراقبة CHANNEL_ERROR
    const testChannelName = `test-channel-${Date.now()}`;
    
    try {
      await new Promise((resolve, reject) => {
        const testChannel = supabase
          .channel(testChannelName)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'orders'
            },
            (payload) => {
              console.log('Test payload received:', payload);
            }
          );

        testChannel.subscribe((status) => {
          console.log(`Test channel ${testChannelName} status:`, status);
          
          if (status === 'SUBSCRIBED') {
            addResult({
              test: 'Realtime Channel Test',
              status: 'success',
              message: 'قناة Real-time تعمل بشكل طبيعي'
            });
            supabase.removeChannel(testChannel);
            resolve(true);
          } else if (status === 'CHANNEL_ERROR') {
            const errorMsg = `❌ خطأ في Real-time: CHANNEL_ERROR للقناة ${testChannelName}`;
            setChannelErrors(prev => [...prev, errorMsg]);
            addResult({
              test: 'Realtime Channel Test',
              status: 'error',
              message: 'CHANNEL_ERROR - فشل في الاشتراك بقناة Real-time'
            });
            supabase.removeChannel(testChannel);
            resolve(false);
          } else if (status === 'TIMED_OUT') {
            addResult({
              test: 'Realtime Channel Test',
              status: 'warning',
              message: 'انتهت مهلة الاتصال بقناة Real-time'
            });
            supabase.removeChannel(testChannel);
            resolve(false);
          }
        });

        // Timeout بعد 10 ثوان
        setTimeout(() => {
          addResult({
            test: 'Realtime Channel Test',
            status: 'error',
            message: 'انتهت مهلة اختبار قناة Real-time (10 ثوان)'
          });
          supabase.removeChannel(testChannel);
          reject(new Error('Test timeout'));
        }, 10000);
      });
    } catch (error) {
      addResult({
        test: 'Realtime Channel Test',
        status: 'error',
        message: 'فشل اختبار قناة Real-time',
        details: error
      });
    }

    // Test 4: فحص أذونات الجداول
    const tables = ['orders', 'notifications'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          addResult({
            test: `Table Access: ${table}`,
            status: 'error',
            message: `لا توجد أذونات لقراءة جدول ${table}`,
            details: error
          });
        } else {
          addResult({
            test: `Table Access: ${table}`,
            status: 'success',
            message: `أذونات قراءة جدول ${table} تعمل بشكل طبيعي`
          });
        }
      } catch (error) {
        addResult({
          test: `Table Access: ${table}`,
          status: 'error',
          message: `خطأ في فحص جدول ${table}`,
          details: error
        });
      }
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
    }
  };

  useEffect(() => {
    // تشغيل التشخيص تلقائياً عند تحميل الصفحة
    runQuickDiagnostics();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">تشخيص سريع لمشكلة Real-time</h1>
          <p className="text-muted-foreground">فحص شامل لحل مشكلة CHANNEL_ERROR</p>
        </div>
        <Button
          onClick={runQuickDiagnostics}
          disabled={isRunning}
          className="gap-2"
        >
          {isRunning && <RefreshCw className="h-4 w-4 animate-spin" />}
          {isRunning ? 'جاري الفحص...' : 'إعادة الفحص'}
        </Button>
      </div>

      {channelErrors.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">أخطاء Real-time مكتشفة:</div>
            {channelErrors.map((error, index) => (
              <div key={index} className="text-sm font-mono">{error}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {results.map((result, index) => (
          <Card key={index} className={`${getStatusColor(result.status)} transition-all duration-200`}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{result.test}</h3>
                    <Badge 
                      variant={result.status === 'success' ? 'default' : result.status === 'error' ? 'destructive' : 'secondary'}
                    >
                      {result.status === 'success' ? 'نجح' : result.status === 'error' ? 'فشل' : 'تحذير'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                        عرض التفاصيل
                      </summary>
                      <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {results.length === 0 && !isRunning && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">لا توجد نتائج بعد. اضغط "إعادة الفحص" لبدء التشخيص.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>الحلول المقترحة لمشكلة CHANNEL_ERROR</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">1. تحقق من إعدادات Supabase Dashboard:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 mr-4">
              <li>• تأكد من تفعيل Realtime للجداول: orders, notifications</li>
              <li>• تحقق من Row Level Security (RLS) policies</li>
              <li>• تأكد من أن anon key له صلاحيات قراءة الجداول</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">2. فحص الشبكة:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 mr-4">
              <li>• تحقق من اتصال الإنترنت</li>
              <li>• تأكد من عدم حجب WebSocket connections</li>
              <li>• جرب من شبكة مختلفة إذا كان متاحاً</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">3. إعدادات المتصفح:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 mr-4">
              <li>• امسح cache المتصفح</li>
              <li>• تحقق من عدم حجب WebSockets في المتصفح</li>
              <li>• جرب في وضع incognito/private</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
