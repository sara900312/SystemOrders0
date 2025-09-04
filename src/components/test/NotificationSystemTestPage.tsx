/**
 * Notification System Test Page Component
 * Provides a user interface for testing all notification system components
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Play, RefreshCw, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

import { runNotificationTests, runQuickTest, type TestSuiteResult, type TestResult } from '@/utils/notificationSystemTest';
import { configDiagnostics } from '@/utils/configDiagnostics';
import { notificationManager } from '@/utils/notificationPermissions';

const NotificationSystemTestPage: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestSuiteResult | null>(null);
  const [quickTestResults, setQuickTestResults] = useState<any>(null);
  const [expandedTests, setExpandedTests] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // تشغيل اختبار سريع عند تحميل الصفحة
    runQuickTest().then(setQuickTestResults);
  }, []);

  const handleRunFullTests = async () => {
    setIsRunning(true);
    setProgress(0);
    setTestResults(null);

    try {
      // محاكاة التقدم
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const results = await runNotificationTests();
      
      clearInterval(progressInterval);
      setProgress(100);
      setTestResults(results);

      // تحديث نتائج الاختبار السريع أيضاً
      const quickResults = await runQuickTest();
      setQuickTestResults(quickResults);
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      setIsRunning(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  const handleRequestPermissions = async () => {
    await notificationManager.requestFullSetup();
    // إعادة تشغيل الاختبار السريع
    const results = await runQuickTest();
    setQuickTestResults(results);
  };

  const handleTestNotification = async () => {
    await notificationManager.sendTestNotification();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pass: 'default',
      fail: 'destructive',
      warning: 'secondary',
      skip: 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const toggleTestExpanded = (testName: string) => {
    setExpandedTests(prev => 
      prev.includes(testName) 
        ? prev.filter(name => name !== testName)
        : [...prev, testName]
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">اختبار نظام الإشعارات</h1>
        <p className="text-muted-foreground">
          أداة شاملة لاختبار وتشخيص جميع مكونات نظام الإشعارات
        </p>
      </div>

      {/* الاختبار السريع */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            الفحص السريع
          </CardTitle>
          <CardDescription>
            فحص سريع لحالة النظام العامة
          </CardDescription>
        </CardHeader>
        <CardContent>
          {quickTestResults ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {quickTestResults.healthy ? (
                  <Badge variant="default">صحي</Badge>
                ) : (
                  <Badge variant="destructive">يحتاج إصلاح</Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  {quickTestResults.healthy ? 'النظام يعمل بشكل طبيعي' : 'توجد مشاكل تحتاج حل'}
                </span>
              </div>

              {quickTestResults.issues?.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <strong>المشاكل المكتشفة:</strong>
                      <ul className="list-disc list-inside space-y-1">
                        {quickTestResults.issues.map((issue: string, index: number) => (
                          <li key={index} className="text-sm">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {quickTestResults.recommendations?.length > 0 && (
                <Alert>
                  <AlertDescription>
                    <div className="space-y-1">
                      <strong>التوصيات:</strong>
                      <ul className="list-disc list-inside space-y-1">
                        {quickTestResults.recommendations.map((rec: string, index: number) => (
                          <li key={index} className="text-sm">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div>جاري الفحص...</div>
          )}
        </CardContent>
      </Card>

      {/* أزرار التحكم */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>إجراءات الاختبار</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Button 
              onClick={handleRunFullTests} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              تشغيل الاختبار الشامل
            </Button>

            <Button 
              variant="outline" 
              onClick={handleRequestPermissions}
            >
              طلب صلاحيات الإشعارات
            </Button>

            <Button 
              variant="outline" 
              onClick={handleTestNotification}
            >
              إرسال إشعار تجريبي
            </Button>

            <Button 
              variant="outline" 
              onClick={() => runQuickTest().then(setQuickTestResults)}
            >
              إعادة الفحص السريع
            </Button>
          </div>

          {/* شريط التقدم */}
          {progress > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">تقدم الاختبار</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* نتائج الاختبار الشامل */}
      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(testResults.overall)}
              نتائج الاختبار الشامل
              {getStatusBadge(testResults.overall)}
            </CardTitle>
            <CardDescription>
              {testResults.summary} • استغرق {testResults.duration}ms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* ملخص النتائج */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {testResults.testsPassed}
                  </div>
                  <div className="text-sm text-muted-foreground">نجح</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {testResults.testsFailed}
                  </div>
                  <div className="text-sm text-muted-foreground">فشل</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {testResults.testsWarning}
                  </div>
                  <div className="text-sm text-muted-foreground">تحذير</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {testResults.testsSkipped}
                  </div>
                  <div className="text-sm text-muted-foreground">تم تخطيه</div>
                </div>
              </div>

              {/* تفاصيل الاختبارات */}
              <div className="space-y-2">
                <h4 className="font-medium">تفاصيل الاختبارات</h4>
                {testResults.results.map((test: TestResult, index: number) => (
                  <Collapsible key={index}>
                    <CollapsibleTrigger 
                      className="w-full"
                      onClick={() => toggleTestExpanded(test.testName)}
                    >
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(test.status)}
                          <span className="font-medium">{test.testName}</span>
                          {getStatusBadge(test.status)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {test.duration}ms
                          </span>
                          <ChevronDown 
                            className={`h-4 w-4 transition-transform ${
                              expandedTests.includes(test.testName) ? 'rotate-180' : ''
                            }`} 
                          />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-4 ml-6 border-l-2 border-muted space-y-2">
                        <p className="text-sm">{test.message}</p>
                        
                        {test.error && (
                          <Alert variant="destructive">
                            <AlertDescription className="text-sm">
                              <strong>خطأ:</strong> {test.error}
                            </AlertDescription>
                          </Alert>
                        )}

                        {test.details && (
                          <details className="text-sm">
                            <summary className="cursor-pointer font-medium text-muted-foreground">
                              عرض التفاصيل
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                              {JSON.stringify(test.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NotificationSystemTestPage;
