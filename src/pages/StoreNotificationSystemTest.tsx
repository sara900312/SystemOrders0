import React, { useState } from 'react';
import StoreNotificationSystem from '@/components/stores/StoreNotificationSystem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  Store, 
  TestTube, 
  Settings, 
  Info,
  CheckCircle,
  Clock,
  Zap,
  MessageSquare,
  Radio
} from 'lucide-react';

const StoreNotificationSystemTest: React.FC = () => {
  const [selectedStoreId, setSelectedStoreId] = useState('demo-store-001');
  const [customStoreId, setCustomStoreId] = useState('');

  // Sample store IDs for testing
  const sampleStores = [
    { id: 'demo-store-001', name: 'متجر الشام' },
    { id: 'demo-store-002', name: 'متجر الأردن' },
    { id: 'demo-store-003', name: 'متجر ��غداد' },
    { id: 'test-store-debug', name: 'متجر الاختبار' },
  ];

  const current_store = { id: selectedStoreId };

  const handleStoreChange = (storeId: string) => {
    setSelectedStoreId(storeId);
  };

  const handleCustomStoreSubmit = () => {
    if (customStoreId.trim()) {
      setSelectedStoreId(customStoreId.trim());
      setCustomStoreId('');
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-right">
            نظام الإشعارات للمتاجر - اختبار شامل
          </h1>
        </div>
        <p className="text-muted-foreground text-right">
          نظام شامل للإشعارات الفورية مع قائمة دائمة وتنبيهات منبثقة للمتاجر باستخدام المواصفات الدقيقة
        </p>
      </div>

      {/* Technical Specifications */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="w-5 h-5" />
            المواصفات التقنية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Supabase Realtime:</h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span>Channel:</span>
                  <Badge variant="outline" className="font-mono">notifications_channel</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Event:</span>
                  <Badge variant="outline" className="font-mono">new_notification</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Table:</span>
                  <Badge variant="outline" className="font-mono">notifications</Badge>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">التصفية:</h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span>recipient_type:</span>
                  <Badge variant="outline" className="font-mono">'store'</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>recipient_id:</span>
                  <Badge variant="outline" className="font-mono">current_store.id</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Toast Filter:</span>
                  <Badge variant="outline" className="font-mono">'urgent' | 'high'</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Store Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            اختيار المتجر (current_store.id)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Sample Stores */}
            <div>
              <Label className="text-sm font-medium">المتاجر التجريبية:</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {sampleStores.map((store) => (
                  <Button
                    key={store.id}
                    onClick={() => handleStoreChange(store.id)}
                    variant={selectedStoreId === store.id ? "default" : "outline"}
                    size="sm"
                    className="justify-start"
                  >
                    {store.name}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Custom Store ID */}
            <div className="flex gap-2">
              <Input
                placeholder="أدخل معرف متجر مخصص"
                value={customStoreId}
                onChange={(e) => setCustomStoreId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCustomStoreSubmit()}
              />
              <Button onClick={handleCustomStoreSubmit} disabled={!customStoreId.trim()}>
                تطبيق
              </Button>
            </div>

            {/* Current Selection */}
            <Alert>
              <Store className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>المتجر المحدد حالياً (current_store.id):</span>
                <Badge variant="outline" className="font-mono">
                  {selectedStoreId}
                </Badge>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Features Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            مميزات النظام
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Bell className="w-6 h-6 text-blue-600" />
              <div>
                <h4 className="font-medium text-sm">إشعارات فورية</h4>
                <p className="text-xs text-muted-foreground">عبر notifications_channel</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h4 className="font-medium text-sm">تتبع القراءة</h4>
                <p className="text-xs text-muted-foreground">تحديث فوري لحالة read</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <Zap className="w-6 h-6 text-purple-600" />
              <div>
                <h4 className="font-medium text-sm">أولويات متعددة</h4>
                <p className="text-xs text-muted-foreground">urgent, high, medium, low</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
              <MessageSquare className="w-6 h-6 text-orange-600" />
              <div>
                <h4 className="font-medium text-sm">تنبيهات منبثقة</h4>
                <p className="text-xs text-muted-foreground">للإشعارات urgent & high</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification System */}
      <Tabs defaultValue="live" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="live" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            النظام المباشر
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-2">
            <TestTube className="w-4 h-4" />
            الاختبار والتجريب
          </TabsTrigger>
        </TabsList>

        {/* Live System */}
        <TabsContent value="live" className="space-y-4">
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              النظام يعمل بشكل مباشر باستخدام <strong>notifications_channel</strong> و <strong>new_notification</strong> event.
              ستظهر الإشعارات الجديدة فور وصولها وسيتم حفظ الحالة.
            </AlertDescription>
          </Alert>
          
          <StoreNotificationSystem
            current_store={current_store}
            showTestPanel={false}
            notificationCenterProps={{
              maxHeight: "500px",
              showHeader: true,
              className: "shadow-md"
            }}
            toastProps={{
              autoHideDuration: 12000
            }}
          />
        </TabsContent>

        {/* Testing Panel */}
        <TabsContent value="testing" className="space-y-4">
          <Alert>
            <TestTube className="h-4 w-4" />
            <AlertDescription>
              استخدم هذه الأدوات لاختبار النظام وإرسال إشعارات تجريبية ل��متجر المحدد باستخدام المواصفات الدقيقة.
            </AlertDescription>
          </Alert>
          
          <StoreNotificationSystem
            current_store={current_store}
            showTestPanel={true}
            notificationCenterProps={{
              maxHeight: "400px",
              showHeader: true,
              className: "shadow-md"
            }}
            toastProps={{
              autoHideDuration: 8000
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Implementation Details */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            تفاصيل التنفيذ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-right">
            <div>
              <h4 className="font-medium mb-2">الجزء الأول: مركز الإشعارات</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• استعلام قاعدة البيانات: <code>recipient_type='store' AND recipient_id=current_store.id</code></li>
                <li>• ترتيب حسب: <code>created_at DESC</code></li>
                <li>• الاشتراك الفوري: <code>notifications_channel</code> / <code>new_notification</code></li>
                <li>• إضافة الإشعارات الجديدة إلى أعلى القائمة (<code>store_notifications</code>)</li>
                <li>• تمييز بصري للإشعارات غير المقروءة (نقطة ملونة)</li>
                <li>• عند النقر: تحديث <code>read=true</code> + الانتقال للـ <code>url</code></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">الجزء الثاني: التنبيهات المنبثقة</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• نفس الاشتراك: <code>notifications_channel</code> / <code>new_notification</code></li>
                <li>• فلترة إضافية: <code>priority='urgent' OR priority='high'</code></li>
                <li>• ظهور في الزاوية (top-right) كـ overlay</li>
                <li>• اختفاء تلقائي بعد 10 ثواني</li>
                <li>• زر إغلاق واضح (X)</li>
                <li>• النقر على الجسم ← الانتقال للـ <code>url</code></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StoreNotificationSystemTest;
