import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Settings, TestTube, History, Code, Smartphone, Zap } from 'lucide-react';
import PushNotificationManager from '@/components/admin/PushNotificationManager';
import { NotificationList } from '@/components/notifications/NotificationList';
import RealtimeStatus from '@/components/ui/realtime-status';
import { Link } from 'react-router-dom';

const AdvancedNotificationsPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6" dir="rtl">
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-primary mb-2 flex items-center gap-3">
          <Bell className="w-10 h-10" />
          نظام الإشعارات المتقدم
        </h1>
        <p className="text-lg text-muted-foreground">
          إدارة شاملة لنظام الإشعارات مع Service Worker وأزرار التفاعل
        </p>
      </div>

      <Tabs defaultValue="manager" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="manager" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            الإدارة
          </TabsTrigger>
          <TabsTrigger value="realtime" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Realtime
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            السجل
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            المميزات
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-2">
            <TestTube className="w-4 h-4" />
            الاختبار
          </TabsTrigger>
          <TabsTrigger value="code" className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            الكود
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manager">
          <PushNotificationManager />
        </TabsContent>

        <TabsContent value="realtime">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  نظام Realtime المحدث
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <RealtimeStatus showDetails={true} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-3">🚀 الميزات الجديدة</h3>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <Badge variant="default">✅</Badge>
                          <span>اتصال Realtime مباشر مع Supabase</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Badge variant="default">✅</Badge>
                          <span>Edge Function متكامل للإرسال</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Badge variant="default">✅</Badge>
                          <span>تواصل مباشر مع Service Worker</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Badge variant="default">✅</Badge>
                          <span>منع التكرار على مستوى الخادم</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Badge variant="default">✅</Badge>
                          <span>مراقبة حالة الاتصال في الوقت الفعلي</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3">⚡ كيف يعمل النظام</h3>
                      <div className="space-y-3 text-sm">
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <h4 className="font-medium text-blue-800 mb-1">1. الإرسال</h4>
                          <p className="text-blue-700">Edge Function يستلم البيانات ويدخلها في جدول notifications</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <h4 className="font-medium text-green-800 mb-1">2. Realtime</h4>
                          <p className="text-green-700">Supabase Realtime يرسل الإشعار فوراً للمتصفح</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <h4 className="font-medium text-purple-800 mb-1">3. Service Worker</h4>
                          <p className="text-purple-700">Frontend يرسل البيانات للService Worker الذي يعرض الإشعار</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Link to="/realtime-notification-test">
                      <Button className="flex items-center gap-2">
                        <TestTube className="w-4 h-4" />
                        اختبار النظام الجديد
                      </Button>
                    </Link>
                    <Link to="/service-worker-demo">
                      <Button variant="outline" className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        العرض التوضيحي
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                سجل الإشعارات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NotificationList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  مميزات النظام المتقدم
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">🚀 الميزات الأساسية</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <Badge variant="default">✅</Badge>
                        <span>Service Worker متقدم مع تخزين مؤقت</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Badge variant="default">✅</Badge>
                        <span>إشعارات فورية مع أزرار تفاعلية</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Badge variant="default">✅</Badge>
                        <span>دعم VAPID للأمان</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Badge variant="default">✅</Badge>
                        <span>دعم اللغة العربية والاتجاه RTL</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Badge variant="default">✅</Badge>
                        <span>اهتزاز مخصص للهواتف</span>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">⚡ الميزات المتقدمة</h3>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <Badge variant="secondary">🔄</Badge>
                        <span>تحديث تلقائي للService Worker</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Badge variant="secondary">📊</Badge>
                        <span>تتبع إحصائيات الإشعارات</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Badge variant="secondary">🎯</Badge>
                        <span>استهداف دقيق حسب نوع المستخدم</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Badge variant="secondary">🔀</Badge>
                        <span>إجراءات مختلفة حسب نوع الإشعار</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Badge variant="secondary">💾</Badge>
                        <span>تخزين مؤقت ذكي للموارد</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🎮 أنواع الإجراءات المتاحة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">📋 طلبات جديدة</h4>
                    <div className="space-y-1">
                      <Badge variant="outline">✅ قبول الطلب</Badge>
                      <Badge variant="outline">❌ رفض الطلب</Badge>
                      <Badge variant="outline">👁️ عرض التفاصيل</Badge>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">📈 تحديثات الحالة</h4>
                    <div className="space-y-1">
                      <Badge variant="outline">📋 عرض الطلب</Badge>
                      <Badge variant="outline">✖️ إغلاق</Badge>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">⚠️ تنبيهات النظام</h4>
                    <div className="space-y-1">
                      <Badge variant="outline">👁️ عرض</Badge>
                      <Badge variant="outline">✖️ إغلاق</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="testing">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="w-5 h-5" />
                  اختبارات النظام
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">🧪 اختبارات الوظائف</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>1. اختبار Service Worker:</strong></p>
                      <p className="text-muted-foreground mr-4">- تسجيل وتفعيل Service Worker</p>
                      <p className="text-muted-foreground mr-4">- التحقق من التخزين المؤقت</p>
                      
                      <p><strong>2. اختبار الإشعارات:</strong></p>
                      <p className="text-muted-foreground mr-4">- طلب الأذونات</p>
                      <p className="text-muted-foreground mr-4">- إرسال إشعارات تجريبية</p>
                      <p className="text-muted-foreground mr-4">- اختبار أزرار التفاعل</p>
                      
                      <p><strong>3. اختبار قاعدة البيانات:</strong></p>
                      <p className="text-muted-foreground mr-4">- إنشاء إشعارات</p>
                      <p className="text-muted-foreground mr-4">- تحديث الحالة</p>
                      <p className="text-muted-foreground mr-4">- Real-time updates</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">📱 اختبارات الأجهزة</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>الأجهزة المدعومة:</strong></p>
                      <p className="text-muted-foreground mr-4">✅ Chrome Desktop/Mobile</p>
                      <p className="text-muted-foreground mr-4">✅ Firefox Desktop/Mobile</p>
                      <p className="text-muted-foreground mr-4">✅ Edge Desktop/Mobile</p>
                      <p className="text-muted-foreground mr-4">✅ Safari Desktop</p>
                      <p className="text-muted-foreground mr-4">⚠️ Safari Mobile (محدود)</p>
                      
                      <p><strong>المميزات المختبرة:</strong></p>
                      <p className="text-muted-foreground mr-4">🔔 صوت الإشعار</p>
                      <p className="text-muted-foreground mr-4">📳 الاهتزاز</p>
                      <p className="text-muted-foreground mr-4">🎨 الأيقونات والشارات</p>
                      <p className="text-muted-foreground mr-4">🎯 أزرار الإجراءات</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="code">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  تفاصيل التنفيذ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">📁 ملفات النظام</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p><code className="bg-muted px-2 py-1 rounded">/public/service-worker.js</code></p>
                        <p className="text-sm text-muted-foreground">Service Worker الرئيسي مع معالجة الإشعارات</p>
                        
                        <p><code className="bg-muted px-2 py-1 rounded">/src/services/notificationService.ts</code></p>
                        <p className="text-sm text-muted-foreground">خدمة إدارة الإشعارات والاشتراكات</p>
                      </div>
                      <div className="space-y-2">
                        <p><code className="bg-muted px-2 py-1 rounded">/src/components/admin/PushNotificationManager.tsx</code></p>
                        <p className="text-sm text-muted-foreground">واجهة إدارة الإشعارات</p>
                        
                        <p><code className="bg-muted px-2 py-1 rounded">/public/manifest.json</code></p>
                        <p className="text-sm text-muted-foreground">إعدادات تطبيق PWA</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">🔧 الإعدادات الرئيسية</h3>
                    <div className="bg-muted p-4 rounded-lg text-sm">
                      <pre className="overflow-x-auto">
{`// معالج الإشعارات في Service Worker
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const options = {
    body: data.message,
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/badge-72x72.svg',
    actions: [
      { action: 'accept', title: '✅ قبول' },
      { action: 'reject', title: '❌ رفض' },
      { action: 'view', title: '👁️ عرض' }
    ],
    lang: 'ar',
    dir: 'rtl',
    requireInteraction: true
  };
  
  e.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});`}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">🔑 متطلبات VAPID</h3>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">
                        لتفعيل Push Notifications بالكامل، تحتاج لإعداد VAPID keys في:
                      </p>
                      <ul className="text-sm space-y-1">
                        <li>• Supabase Edge Functions</li>
                        <li>• متغير البيئة VAPID_PUBLIC_KEY</li>
                        <li>• خدمة Firebase Cloud Messaging (اختياري)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedNotificationsPage;
