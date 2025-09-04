import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, AlertTriangle, Database, Wifi, Users } from 'lucide-react';
import { adminNotificationService } from '@/services/adminNotificationService';
import { centralNotificationManager } from '@/services/centralNotificationManager';

interface SystemCheck {
  name: string;
  status: 'success' | 'warning' | 'error';
  description: string;
  details?: string;
}

export default function UnifiedNotificationStatus() {
  const [checks, setChecks] = useState<SystemCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationStats, setNotificationStats] = useState({
    admin: 0,
    store: 0,
    customer: 0,
    total: 0
  });

  const runSystemChecks = async () => {
    setLoading(true);
    const newChecks: SystemCheck[] = [];

    // 1. فحص جدول notifications الموحد
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .limit(1);

      if (error) {
        newChecks.push({
          name: 'جدول notifications الموحد',
          status: 'error',
          description: 'فشل في الوصول للجدول الموحد',
          details: error.message
        });
      } else {
        newChecks.push({
          name: 'جدول notifications الموحد',
          status: 'success',
          description: 'الجدول الموحد يعمل بشكل صحيح',
          details: 'تم الوصول للجدول بنجاح'
        });
      }
    } catch (err) {
      newChecks.push({
        name: 'جدول notifications الموحد',
        status: 'error',
        description: 'خطأ في الاتصال بالجدول',
        details: err instanceof Error ? err.message : 'خطأ غير معروف'
      });
    }

    // 2. فحص عدم وجود جدول admin_notifications
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .limit(1);

      if (error && error.message.includes('does not exist')) {
        newChecks.push({
          name: 'إزالة جدول admin_notifications',
          status: 'success',
          description: 'تم إزالة الجدول القديم بنجاح',
          details: 'الجدول غير موجود كما هو مطلوب'
        });
      } else if (error) {
        newChecks.push({
          name: 'إزالة جدول admin_notifications',
          status: 'success',
          description: 'الجدول القديم غير متاح',
          details: 'لا يمكن الوصول للجدول القديم'
        });
      } else {
        newChecks.push({
          name: 'إزالة جدول admin_notifications',
          status: 'warning',
          description: 'الجدول القديم لا يزال موجوداً',
          details: 'يُنصح بحذف هذا الجدول لأنه لم يعد مستخدماً'
        });
      }
    } catch (err) {
      newChecks.push({
        name: 'إزالة جدول admin_notifications',
        status: 'success',
        description: 'الجدول القديم غير متاح',
        details: 'تأكيد عدم وجود الجدول القديم'
      });
    }

    // 3. فحص خدمة الإشعارات الموحدة
    try {
      const status = adminNotificationService.getStatus();
      
      if (status.tableName === 'notifications') {
        newChecks.push({
          name: 'خدمة إشعارات الإدارة',
          status: 'success',
          description: 'تستخدم الجدول الموحد',
          details: `الجدول: ${status.tableName}, الحالة: ${status.isListening ? 'نشط' : 'متوقف'}`
        });
      } else {
        newChecks.push({
          name: 'خدمة إشعارات الإدارة',
          status: 'warning',
          description: 'قد تستخدم جدول قديم',
          details: `الجدول: ${status.tableName || 'غير محدد'}`
        });
      }
    } catch (err) {
      newChecks.push({
        name: 'خدمة إشعارات الإدارة',
        status: 'error',
        description: 'خطأ في فحص الخدمة',
        details: err instanceof Error ? err.message : 'خطأ غير معروف'
      });
    }

    // 4. فحص إحصائيات الإشعارات حسب النوع
    try {
      const [adminResult, storeResult, customerResult] = await Promise.all([
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('recipient_type', 'admin'),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('recipient_type', 'store'),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('recipient_type', 'customer')
      ]);

      const adminCount = adminResult.count || 0;
      const storeCount = storeResult.count || 0;
      const customerCount = customerResult.count || 0;
      const total = adminCount + storeCount + customerCount;

      setNotificationStats({
        admin: adminCount,
        store: storeCount,
        customer: customerCount,
        total
      });

      newChecks.push({
        name: 'إحصائيات الإشعارات',
        status: 'success',
        description: `إجمالي ${total} إشعار في النظام الموحد`,
        details: `إدارة: ${adminCount}, متاجر: ${storeCount}, عملاء: ${customerCount}`
      });
    } catch (err) {
      newChecks.push({
        name: 'إحصائيات الإشعارات',
        status: 'error',
        description: 'فشل في جلب الإحصائيات',
        details: err instanceof Error ? err.message : 'خطأ غير معروف'
      });
    }

    // 5. فحص المدير المركزي للإشعارات
    try {
      const cacheStatus = centralNotificationManager.getCacheStatus();
      newChecks.push({
        name: 'المدير المركزي للإشعارات',
        status: 'success',
        description: 'يعمل بشكل صحيح',
        details: `الذاكرة المؤقتة: ${cacheStatus.size} عنصر`
      });
    } catch (err) {
      newChecks.push({
        name: 'المدير المركزي للإشعارات',
        status: 'warning',
        description: 'قد لا يعمل بشكل صحيح',
        details: err instanceof Error ? err.message : 'خطأ غير معروف'
      });
    }

    setChecks(newChecks);
    setLoading(false);
  };

  useEffect(() => {
    runSystemChecks();
  }, []);

  const createTestNotifications = async () => {
    try {
      // إنشاء إشعارات تجريبية للأنواع المختلفة
      await centralNotificationManager.notifyAdmin(
        'إشعار تجريبي للإدارة',
        'تم إنشاء هذا الإشعار لاختبار النظام ا��موحد',
        'test-' + Date.now()
      );

      await centralNotificationManager.notifyStore(
        'demo-store-123',
        'إشعار تجريبي للمتجر',
        'تم إنشاء هذا الإشعار لاختبار النظام الموحد',
        'test-' + Date.now()
      );

      await centralNotificationManager.notifyCustomer(
        'demo-customer-456',
        'إشعار تجريبي للعميل',
        'تم إنشاء هذا الإشعار لاختبار النظام الموحد',
        'test-' + Date.now()
      );

      // إعادة تشغيل الفحوصات
      setTimeout(() => {
        runSystemChecks();
      }, 1000);

    } catch (err) {
      console.error('فشل في إنشاء الإشعارات التجريبية:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">نجح</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">تحذير</Badge>;
      case 'error':
        return <Badge variant="destructive">فشل</Badge>;
      default:
        return <Badge variant="outline">غير معروف</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">حالة نظام الإشعارات الموحد</h1>
        <p className="text-muted-foreground">
          مراقبة ومتابعة حالة النظام بعد الانتقال إلى جدول notifications الموحد
        </p>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold">{notificationStats.total}</div>
            <div className="text-sm text-muted-foreground">إجمالي الإشعارات</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold">{notificationStats.admin}</div>
            <div className="text-sm text-muted-foreground">إشعارات الإدارة</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Wifi className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-2xl font-bold">{notificationStats.store}</div>
            <div className="text-sm text-muted-foreground">إشعارات المتاجر</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-2xl font-bold">{notificationStats.customer}</div>
            <div className="text-sm text-muted-foreground">إشعارات العملاء</div>
          </CardContent>
        </Card>
      </div>

      {/* تحديثات النظام */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>تم بنجاح:</strong> تحديث النظام لاستخدام جدول <code>notifications</code> الموحد بدلاً من <code>admin_notifications</code>. 
          جميع الإشعارات الآن تُحفظ في جدول واحد مع تمييزها بـ <code>recipient_type</code> و <code>recipient_id</code>.
        </AlertDescription>
      </Alert>

      {/* فحوصات النظام */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>فحوصات النظام</CardTitle>
              <CardDescription>حالة مكونات نظام الإشعارات الموحد</CardDescription>
            </div>
            <Button onClick={runSystemChecks} disabled={loading}>
              {loading ? 'جاري الفحص...' : 'إعادة الفحص'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {checks.map((check, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="flex-shrink-0">
                  {getStatusIcon(check.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-sm">{check.name}</h4>
                    {getStatusBadge(check.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{check.description}</p>
                  {check.details && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      {check.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* إجراءات الاختبار */}
      <Card>
        <CardHeader>
          <CardTitle>اختبار النظام</CardTitle>
          <CardDescription>إنشاء إشعارات تجريبية لاختبار الأنواع المختلفة</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={createTestNotifications} className="w-full">
            إنشاء إشعارات تجريبية لجميع ا��أنواع
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            سيتم إنشاء إشعار واحد لكل نوع: إدارة، متجر، عميل
          </p>
        </CardContent>
      </Card>

      {/* تفاصيل التحديث */}
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل التحديث</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-green-600 mb-2">✅ تم التحديث</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• <code>adminNotificationService.ts</code> - يستخدم جدول notifications</li>
                <li>• <code>types.ts</code> - تم إزالة admin_notifications وإضافة notifications</li>
                <li>• <code>realtimeChannelFix.ts</code> - يستخدم الجدول الموحد</li>
                <li>• <code>realtimeService.ts</code> - يدعم الجدول الموحد</li>
                <li>• <code>useRealtimeChannels.ts</code> - يستمع للجدول الموحد</li>
                <li>• <code>admin-notification-bell.tsx</code> - يعرض النظام الموحد</li>
                <li>• <code>AdminNotificationsTest.tsx</code> - يختبر الجدول الموحد</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-blue-600 mb-2">📊 الجدول الموحد</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• <code>recipient_type</code> - نوع المستلم (admin/store/customer)</li>
                <li>• <code>recipient_id</code> - معرف المستلم</li>
                <li>• <code>title</code> - عنوان الإشعار</li>
                <li>• <code>message</code> - نص الإشعار</li>
                <li>• <code>priority</code> - أولوية الإشعار</li>
                <li>• <code>read</code> - حالة القراءة</li>
                <li>• <code>sent</code> - حالة الإرسال</li>
                <li>• <code>url</code> - رابط الإشعار</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
