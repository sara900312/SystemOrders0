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
  MessageSquare
} from 'lucide-react';

const StoreNotificationSystemDemo: React.FC = () => {
  const [selectedStoreId, setSelectedStoreId] = useState('demo-store-001');
  const [customStoreId, setCustomStoreId] = useState('');

  // Sample store IDs for testing
  const sampleStores = [
    { id: 'demo-store-001', name: 'متجر الشام' },
    { id: 'demo-store-002', name: 'متجر الأردن' },
    { id: 'demo-store-003', name: 'متجر بغداد' },
    { id: 'test-store-debug', name: 'متجر الاختبار' },
  ];

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
            نظام الإشعارات للمتاجر - عرض تجريبي
          </h1>
        </div>
        <p className="text-muted-foreground text-right">
          نظام شامل للإشعارات الفورية مع قائمة دائمة وتنبيهات منبثقة للمتاجر
        </p>
      </div>

      {/* Store Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            اختيار المتجر
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
                <span>المتجر المحدد حالياً:</span>
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
                <p className="text-xs text-muted-foreground">استقبال فوري للإشعارات</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h4 className="font-medium text-sm">تتبع القراءة</h4>
                <p className="text-xs text-muted-foreground">تمييز المقروء وغير المقروء</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <Zap className="w-6 h-6 text-purple-600" />
              <div>
                <h4 className="font-medium text-sm">أولويات متعددة</h4>
                <p className="text-xs text-muted-foreground">عادي، مهم، عاجل</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
              <MessageSquare className="w-6 h-6 text-orange-600" />
              <div>
                <h4 className="font-medium text-sm">تنبيهات منبثقة</h4>
                <p className="text-xs text-muted-foreground">للإشعارات العاجلة</p>
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
              النظام يعمل بشكل مباشر. ستظهر الإشعارات الجديدة فور وصولها وسيتم حفظ الحالة.
            </AlertDescription>
          </Alert>
          
          <StoreNotificationSystem
            storeId={selectedStoreId}
            showTestPanel={false}
            notificationCenterProps={{
              maxHeight: "500px",
              showHeader: true,
              className: "shadow-md"
            }}
            toastProps={{
              autoHideDuration: 12000,
              showOnlyUrgent: false
            }}
          />
        </TabsContent>

        {/* Testing Panel */}
        <TabsContent value="testing" className="space-y-4">
          <Alert>
            <TestTube className="h-4 w-4" />
            <AlertDescription>
              استخدم هذه الأدوات لاختبار النظام وإرسال إشعارات تجريبية للمتجر المحدد.
            </AlertDescription>
          </Alert>
          
          <StoreNotificationSystem
            storeId={selectedStoreId}
            showTestPanel={true}
            notificationCenterProps={{
              maxHeight: "400px",
              showHeader: true,
              className: "shadow-md"
            }}
            toastProps={{
              autoHideDuration: 8000,
              showOnlyUrgent: false
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Usage Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            طريقة الاستخدام
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-right">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">الإشعارات الفورية:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• الإشعارات تظهر فوراً عند إرسالها</li>
                  <li>• التنبيهات المنبثقة للإشعارات العاجلة</li>
                  <li>• النقر على الإشعار يعلّمه كمقروء</li>
                  <li>• إمكانية الانتقال للرابط المرفق</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">الإدارة والتحكم:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• تحديد جميع الإشعارات كمقروءة</li>
                  <li>• فلترة حسب الأولوية والنوع</li>
                  <li>• إظهار الوقت النسبي للإشعار</li>
                  <li>• واجهة مستجيبة لجميع الشاشات</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StoreNotificationSystemDemo;
