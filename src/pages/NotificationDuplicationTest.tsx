import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Send, Bell, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { centralNotificationManager } from '@/services/centralNotificationManager';
import { storeNotificationService } from '@/services/storeNotificationService';
import { supabase } from '@/integrations/supabase/client';
import { ArabicText } from '@/components/ui/arabic-text';

interface TestResult {
  id: string;
  type: 'success' | 'duplicate' | 'error';
  message: string;
  timestamp: Date;
  details?: any;
}

export default function NotificationDuplicationTest() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [cacheStatus, setCacheStatus] = useState<any>({});
  const [resultCounter, setResultCounter] = useState(0);
  
  const [testParams, setTestParams] = useState({
    storeId: 'store_1',
    title: 'اختبار ��كرار الإشعارات',
    message: 'هذا إشعار اختبار لفحص التكرار',
    orderId: 'test-order-123',
    type: 'order_assigned',
    iterations: 3,
    intervalMs: 1000
  });

  const addResult = (type: TestResult['type'], message: string, details?: any) => {
    setResultCounter(prev => prev + 1);
    const currentCounter = resultCounter + 1;

    const result: TestResult = {
      id: `${Date.now()}-${currentCounter}`,
      type,
      message,
      timestamp: new Date(),
      details
    };

    setTestResults(prev => [result, ...prev.slice(0, 49)]); // آخر 50 نتيجة

    if (type === 'success') {
      setNotificationCount(prev => prev + 1);
    } else if (type === 'duplicate') {
      setDuplicateCount(prev => prev + 1);
    }
  };

  const runDuplicationTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    setNotificationCount(0);
    setDuplicateCount(0);
    setResultCounter(0);
    
    addResult('success', 'بدء اختبار تكرار الإشعارات...');
    
    try {
      // اختبار إرسال نفس الإشعار عدة مرات
      for (let i = 0; i < testParams.iterations; i++) {
        addResult('success', `محاولة إرسال ${i + 1}/${testParams.iterations}`);
        
        const success = await centralNotificationManager.notifyStore(
          testParams.storeId,
          testParams.title,
          `${testParams.message} - محاولة ${i + 1}`,
          testParams.orderId,
          testParams.type
        );
        
        if (success) {
          addResult('success', `تم إرسال الإشعار ${i + 1} بنج��ح`);
        } else {
          addResult('duplicate', `تم منع تكرار الإشعار ${i + 1} ✅`);
        }
        
        // انتظار بين المحاولات
        if (i < testParams.iterations - 1) {
          await new Promise(resolve => setTimeout(resolve, testParams.intervalMs));
        }
      }
      
      // اختبار حالة الـ cache
      const cache = centralNotificationManager.getCacheStatus();
      setCacheStatus(cache);
      addResult('success', `تم العثور على ${cache.size} عنصر في cache الحماية من التكرار`);
      
      addResult('success', 'انتهى اختبار التكرار');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addResult('error', `خطأ في الاختبار: ${errorMessage}`, error);
    } finally {
      setIsRunning(false);
    }
  };

  const testStoreNotificationService = async () => {
    setIsRunning(true);
    setResultCounter(0);
    
    try {
      addResult('success', 'اختبار storeNotificationService...');
      
      const result = await storeNotificationService.sendNotification({
        storeId: testParams.storeId,
        title: testParams.title,
        message: testParams.message + ' - عبر StoreNotificationService',
        type: testParams.type as any,
        orderId: testParams.orderId
      });
      
      if (result) {
        addResult('success', 'تم إرسال الإشعار عبر StoreNotificationService بنجاح');
      } else {
        addResult('duplicate', 'تم منع تكرار الإشعار في StoreNotificationService ✅');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addResult('error', `خطأ في StoreNotificationService: ${errorMessage}`, error);
    } finally {
      setIsRunning(false);
    }
  };

  const clearCache = () => {
    centralNotificationManager.clearCache();
    setCacheStatus({ size: 0, keys: [] });
    addResult('success', 'تم مسح cache الحماية من التكرار');
  };

  const checkDatabaseDuplicates = async () => {
    setIsRunning(true);
    setResultCounter(0);
    
    try {
      addResult('success', 'فحص التكرارات في قاعدة البيانات...');
      
      const { data, error } = await supabase
        .from('notifications')
        .select('title, message, recipient_id, created_at')
        .eq('recipient_id', testParams.storeId)
        .eq('title', testParams.title)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) {
        addResult('error', `خطأ في فحص قاعدة البيانات: ${error.message}`, error);
        return;
      }
      
      if (data && data.length > 0) {
        addResult('success', `تم العثور على ${data.length} إشعار بنفس العنوان في قاعدة البيانات`);
        
        // فحص التكرارات الفعلية (نفس الرسالة تماماً)
        const duplicates = data.filter((notification, index, arr) => 
          arr.findIndex(n => 
            n.title === notification.title && 
            n.message === notification.message
          ) !== index
        );
        
        if (duplicates.length > 0) {
          addResult('error', `تم العثور على ${duplicates.length} إشعار مكرر في قاعدة البيانات!`, duplicates);
        } else {
          addResult('success', 'لا توجد إشعارات مكررة في قاعدة البيانات ✅');
        }
      } else {
        addResult('success', 'لا توجد إشعارات لهذا المتجر بهذا العنوان');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addResult('error', `خطأ في فحص قاعدة البيانات: ${errorMessage}`, error);
    } finally {
      setIsRunning(false);
    }
  };

  const getResultIcon = (type: TestResult['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'duplicate':
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getResultColor = (type: TestResult['type']) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'duplicate':
        return 'border-blue-200 bg-blue-50';
      case 'error':
        return 'border-red-200 bg-red-50';
    }
  };

  useEffect(() => {
    // تحديث حالة cache كل 5 ثوان
    const interval = setInterval(() => {
      const cache = centralNotificationManager.getCacheStatus();
      setCacheStatus(cache);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">اختبار تكرار الإشعارات</h1>
          <p className="text-muted-foreground">فحص نظام منع تكرار الإشعارات</p>
        </div>
        <Button
          onClick={clearCache}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          مسح Cache
        </Button>
      </div>

      {/* الإحصائيات */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{notificationCount}</div>
                <div className="text-sm text-muted-foreground">إشعارات نجحت</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{duplicateCount}</div>
                <div className="text-sm text-muted-foreground">تكرارات منعت</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{cacheStatus.size || 0}</div>
                <div className="text-sm text-muted-foreground">عناصر في Cache</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">
                  {duplicateCount > 0 ? Math.round((duplicateCount / (notificationCount + duplicateCount)) * 100) : 0}%
                </div>
                <div className="text-sm text-muted-foreground">نسبة المنع</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* إعدادات الاختبار */}
      <Card>
        <CardHeader>
          <CardTitle>إعدادات الاختبار</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>معرف المتجر</Label>
              <Input
                value={testParams.storeId}
                onChange={(e) => setTestParams(prev => ({ ...prev, storeId: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>عنوان الإشعار</Label>
              <Input
                value={testParams.title}
                onChange={(e) => setTestParams(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>نوع الإشعار</Label>
              <Select
                value={testParams.type}
                onValueChange={(value) => setTestParams(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order_assigned">طلب مُعيَّن</SelectItem>
                  <SelectItem value="order_reminder">تذكير طلب</SelectItem>
                  <SelectItem value="system">نظام</SelectItem>
                  <SelectItem value="general">عام</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>عدد المحاولات</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={testParams.iterations}
                onChange={(e) => setTestParams(prev => ({ ...prev, iterations: parseInt(e.target.value) }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>فترة الانتظار (ms)</Label>
              <Input
                type="number"
                min="100"
                max="5000"
                value={testParams.intervalMs}
                onChange={(e) => setTestParams(prev => ({ ...prev, intervalMs: parseInt(e.target.value) }))}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>نص الإشعار</Label>
            <Input
              value={testParams.message}
              onChange={(e) => setTestParams(prev => ({ ...prev, message: e.target.value }))}
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={runDuplicationTest}
              disabled={isRunning}
              className="gap-2"
            >
              {isRunning && <RefreshCw className="h-4 w-4 animate-spin" />}
              اختبار التكرار
            </Button>
            
            <Button
              onClick={testStoreNotificationService}
              disabled={isRunning}
              variant="outline"
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              اختبار StoreService
            </Button>
            
            <Button
              onClick={checkDatabaseDuplicates}
              disabled={isRunning}
              variant="outline"
              className="gap-2"
            >
              <Bell className="h-4 w-4" />
              فحص قاعدة البيانات
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* النتائج */}
      <Card>
        <CardHeader>
          <CardTitle>نتائج الاختبار</CardTitle>
          <CardDescription>آخر 50 نتيجة اختبار</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد نتائج بعد. اضغط "اختبار التكرار" لبدء الفحص
              </div>
            ) : (
              testResults.map((result) => (
                <div 
                  key={result.id} 
                  className={`p-3 rounded-lg border transition-all duration-200 ${getResultColor(result.type)}`}
                >
                  <div className="flex items-start gap-3">
                    {getResultIcon(result.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <ArabicText className="font-medium">{result.message}</ArabicText>
                        <Badge variant="outline" className="text-xs">
                          {result.timestamp.toLocaleTimeString('ar')}
                        </Badge>
                      </div>
                      {result.details && (
                        <details className="mt-2">
                          <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                            عرض التفاصيل
                          </summary>
                          <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
