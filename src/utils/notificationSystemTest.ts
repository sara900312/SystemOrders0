/**
 * Comprehensive Notification System Test Suite
 * Tests all components of the notification system end-to-end
 */

import { supabase } from '@/integrations/supabase/client';
import { realtimeNotificationService } from '@/services/realtimeNotificationService';
import { notificationManager } from '@/utils/notificationPermissions';
import { configDiagnostics } from '@/utils/configDiagnostics';

export interface TestResult {
  testName: string;
  status: 'pass' | 'fail' | 'warning' | 'skip';
  duration: number;
  message: string;
  details?: any;
  error?: string;
}

export interface TestSuiteResult {
  overall: 'pass' | 'fail' | 'warning';
  startTime: Date;
  endTime: Date;
  duration: number;
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  testsWarning: number;
  testsSkipped: number;
  results: TestResult[];
  summary: string;
}

export class NotificationSystemTestSuite {
  private results: TestResult[] = [];
  private startTime: Date = new Date();

  /**
   * تشغيل جميع الاختبارات
   */
  async runAllTests(): Promise<TestSuiteResult> {
    console.group('🧪 Starting Notification System Test Suite');
    this.startTime = new Date();
    this.results = [];

    // تشغيل الاختبارات بالترتيب
    await this.testConfiguration();
    await this.testServiceWorkerSetup();
    await this.testNotificationPermissions();
    await this.testSupabaseConnection();
    await this.testRealtimeConnection();
    await this.testEdgeFunctions();
    await this.testNotificationFlow();
    await this.testEndToEndFlow();

    console.groupEnd();

    return this.generateSummary();
  }

  /**
   * اختبار التكوين العام
   */
  private async testConfiguration(): Promise<void> {
    const result = await this.runTest('Configuration Check', async () => {
      const diagnostics = await configDiagnostics.runFullDiagnostics();
      
      if (diagnostics.overall === 'error') {
        throw new Error('Critical configuration issues detected');
      }
      
      return {
        message: `Configuration ${diagnostics.overall}`,
        details: diagnostics
      };
    });

    // تحذير إذا كانت هناك مشاكل في التكوين
    if (result.details?.overall === 'warning') {
      result.status = 'warning';
      result.message = 'Configuration has warnings but should work';
    }
  }

  /**
   * اختبار إعداد Service Worker
   */
  private async testServiceWorkerSetup(): Promise<void> {
    await this.runTest('Service Worker Registration', async () => {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker not supported in this browser');
      }

      const registration = await navigator.serviceWorker.register('/service-worker.js');
      
      // انتظار تفعيل Service Worker
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Service Worker activation timeout')), 10000);
        
        if (registration.active) {
          clearTimeout(timeout);
          resolve(registration.active);
        } else {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'activated') {
                  clearTimeout(timeout);
                  resolve(newWorker);
                }
              });
            }
          });
        }
      });

      return {
        message: 'Service Worker registered and activated successfully',
        details: {
          scope: registration.scope,
          state: registration.active?.state
        }
      };
    });
  }

  /**
   * اختبار صلاحيات الإشعارات
   */
  private async testNotificationPermissions(): Promise<void> {
    await this.runTest('Notification Permissions', async () => {
      if (!('Notification' in window)) {
        throw new Error('Notifications not supported in this browser');
      }

      const currentPermission = Notification.permission;
      
      if (currentPermission === 'denied') {
        return {
          message: 'Notification permission denied by user',
          status: 'warning' as const,
          details: { permission: currentPermission }
        };
      }

      if (currentPermission === 'default') {
        // محاولة طلب الصلاحية
        const permission = await notificationManager.requestPermission();
        if (permission !== 'granted') {
          return {
            message: 'User did not grant notification permission',
            status: 'warning' as const,
            details: { permission }
          };
        }
      }

      return {
        message: 'Notification permissions ready',
        details: { permission: Notification.permission }
      };
    });
  }

  /**
   * اختبار اتصال Supabase
   */
  private async testSupabaseConnection(): Promise<void> {
    await this.runTest('Supabase Connection', async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .limit(1);

      if (error) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }

      return {
        message: 'Supabase connection successful',
        details: { recordsFound: data?.length || 0 }
      };
    });
  }

  /**
   * اختبار اتصال Realtime
   */
  private async testRealtimeConnection(): Promise<void> {
    await this.runTest('Realtime Connection', async () => {
      // تهيئة خدمة Realtime
      await realtimeNotificationService.initialize('test-user');

      // انتظار حتى تصبح متصلة
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Realtime connection timeout')), 10000);
        
        const checkConnection = () => {
          if (realtimeNotificationService.isConnectionActive()) {
            clearTimeout(timeout);
            resolve(true);
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        
        checkConnection();
      });

      const status = realtimeNotificationService.getStatus();
      
      return {
        message: 'Realtime connection established',
        details: status
      };
    });
  }

  /**
   * اختبار Edge Functions
   */
  private async testEdgeFunctions(): Promise<void> {
    await this.runTest('Edge Functions Connectivity', async () => {
      // استيراد خدمة Edge Functions للاختبار
      const { EdgeFunctionsService } = await import('@/services/edgeFunctionsService');
      
      const connectivity = await EdgeFunctionsService.checkConnectivity();
      
      if (!connectivity.isConnected) {
        throw new Error(`Edge Functions not accessible: ${connectivity.error || 'Unknown error'}`);
      }

      return {
        message: 'Edge Functions accessible',
        details: connectivity
      };
    });
  }

  /**
   * اختبار تدفق الإشعارات
   */
  private async testNotificationFlow(): Promise<void> {
    await this.runTest('Notification Flow', async () => {
      const testNotification = {
        title: 'اختبار النظام 🧪',
        message: `إشعار تجريبي - ${new Date().toLocaleTimeString('ar')}`,
        type: 'test',
        recipient_id: 'test-user',
        recipient_type: 'admin' as const
      };

      // إرسال إشعار عبر Edge Function
      const success = await realtimeNotificationService.sendNotification(testNotification);
      
      if (!success) {
        throw new Error('Failed to send test notification');
      }

      return {
        message: 'Test notification sent successfully',
        details: testNotification
      };
    });
  }

  /**
   * اختبار النظام من البداية للنهاية
   */
  private async testEndToEndFlow(): Promise<void> {
    await this.runTest('End-to-End Flow', async () => {
      let notificationReceived = false;
      let realtimeReceived = false;

      // الاشتراك في إشعارات Realtime
      const unsubscribe = realtimeNotificationService.subscribe((notification) => {
        console.log('📬 Test notification received via Realtime:', notification);
        realtimeReceived = true;
      });

      // الاستماع لرسائل Service Worker
      const messageHandler = (event: MessageEvent) => {
        if (event.data?.type === 'TEST_NOTIFICATION') {
          console.log('📬 Test notification received via Service Worker');
          notificationReceived = true;
        }
      };

      navigator.serviceWorker.addEventListener('message', messageHandler);

      try {
        // إرسال إشعار تجريبي
        const testResult = await realtimeNotificationService.sendTestNotification('test-user');
        
        if (!testResult) {
          throw new Error('Failed to send end-to-end test notification');
        }

        // انتظار استلام الإشعار
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('End-to-end test timeout - notification not received'));
          }, 15000);

          const checkReceived = () => {
            if (realtimeReceived || notificationReceived) {
              clearTimeout(timeout);
              resolve(true);
            } else {
              setTimeout(checkReceived, 100);
            }
          };

          checkReceived();
        });

        return {
          message: 'End-to-end notification flow successful',
          details: {
            realtimeReceived,
            serviceWorkerReceived: notificationReceived
          }
        };
      } finally {
        // تنظيف المستمعين
        unsubscribe();
        navigator.serviceWorker.removeEventListener('message', messageHandler);
      }
    });
  }

  /**
   * تشغيل اختبار واحد مع معالجة الأخطاء
   */
  private async runTest(
    testName: string,
    testFunction: () => Promise<{
      message: string;
      status?: 'pass' | 'fail' | 'warning' | 'skip';
      details?: any;
    }>
  ): Promise<TestResult> {
    const startTime = Date.now();
    
    console.group(`🧪 Running test: ${testName}`);
    
    try {
      const testResult = await testFunction();
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        testName,
        status: testResult.status || 'pass',
        duration,
        message: testResult.message,
        details: testResult.details
      };

      console.log(`${this.getStatusEmoji(result.status)} ${result.message} (${duration}ms)`);
      if (result.details) {
        console.log('📋 Details:', result.details);
      }

      this.results.push(result);
      console.groupEnd();
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      const result: TestResult = {
        testName,
        status: 'fail',
        duration,
        message: `Test failed: ${errorMessage}`,
        error: errorMessage
      };

      console.error(`❌ ${result.message} (${duration}ms)`);
      console.error('Error details:', error);

      this.results.push(result);
      console.groupEnd();
      
      return result;
    }
  }

  /**
   * إنشاء ملخص النتائج
   */
  private generateSummary(): TestSuiteResult {
    const endTime = new Date();
    const duration = endTime.getTime() - this.startTime.getTime();

    const testsPassed = this.results.filter(r => r.status === 'pass').length;
    const testsFailed = this.results.filter(r => r.status === 'fail').length;
    const testsWarning = this.results.filter(r => r.status === 'warning').length;
    const testsSkipped = this.results.filter(r => r.status === 'skip').length;

    let overall: 'pass' | 'fail' | 'warning' = 'pass';
    if (testsFailed > 0) {
      overall = 'fail';
    } else if (testsWarning > 0) {
      overall = 'warning';
    }

    const summary = `${testsPassed}/${this.results.length} tests passed, ${testsFailed} failed, ${testsWarning} warnings`;

    const result: TestSuiteResult = {
      overall,
      startTime: this.startTime,
      endTime,
      duration,
      testsRun: this.results.length,
      testsPassed,
      testsFailed,
      testsWarning,
      testsSkipped,
      results: this.results,
      summary
    };

    console.log(`\n📊 Test Suite Summary: ${this.getStatusEmoji(overall)} ${overall.toUpperCase()}`);
    console.log(`⏱️ Duration: ${duration}ms`);
    console.log(`📈 Results: ${summary}`);

    return result;
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'warning': return '⚠️';
      case 'skip': return '⏭️';
      default: return '❓';
    }
  }
}

// دوال مساعدة للاستخدام السريع
export const runNotificationTests = async (): Promise<TestSuiteResult> => {
  const testSuite = new NotificationSystemTestSuite();
  return await testSuite.runAllTests();
};

export const runQuickTest = async (): Promise<{
  healthy: boolean;
  issues: string[];
  recommendations: string[];
}> => {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // اختبار سريع للتكوين
  const healthCheck = await configDiagnostics.quickHealthCheck();
  if (!healthCheck.healthy) {
    issues.push(...healthCheck.errors);
    recommendations.push('Run full configuration diagnostics');
  }

  // اختبار الصلاحيات
  if (Notification.permission === 'denied') {
    issues.push('Notification permission denied');
    recommendations.push('Ask user to enable notifications in browser settings');
  }

  // اختبار Service Worker
  if (!('serviceWorker' in navigator)) {
    issues.push('Service Worker not supported');
  }

  return {
    healthy: issues.length === 0,
    issues,
    recommendations: recommendations.length === 0 ? ['System appears healthy!'] : recommendations
  };
};

export default NotificationSystemTestSuite;
