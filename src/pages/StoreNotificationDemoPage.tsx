import React, { useState } from 'react';
import StoreNotificationCenter from '@/components/stores/StoreNotificationCenter';
import StoreNotificationToast from '@/components/stores/StoreNotificationToast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Store, 
  TestTube, 
  Info,
  CheckCircle,
  Radio,
  Zap,
  MessageSquare,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const StoreNotificationDemoPage: React.FC = () => {
  const [selectedStoreId, setSelectedStoreId] = useState('demo-store-001');
  const [testTitle, setTestTitle] = useState('إشعار اختبار');
  const [testMessage, setTestMessage] = useState('هذا إشعار اختبار لنظام الإشعارات الفوري');
  const [testPriority, setTestPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [testUrl, setTestUrl] = useState('/store-dashboard');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Sample stores for testing
  const sampleStores = [
    { id: 'demo-store-001', name: 'متجر الشام' },
    { id: 'demo-store-002', name: 'متجر الأردن' },
    { id: 'demo-store-003', name: 'متجر بغداد' },
    { id: 'test-store-004', name: 'متجر الاختبار' },
  ];

  const current_store = { id: selectedStoreId };

  // Send test notification using exact specifications
  const sendTestNotification = async () => {
    setLoading(true);
    try {
      // First insert into database
      const testNotification = {
        recipient_type: 'store',
        recipient_id: selectedStoreId,
        title: testTitle,
        message: testMessage,
        priority: testPriority,
        url: testUrl,
        read: false,
        sent: true,
        created_at: new Date().toISOString()
      };

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

      toast({
        title: 'تم الإرسال',
        description: `تم إرسال إشعار ${testPriority} للمتجر ${selectedStoreId}`,
      });

    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إرسال الإشعار التجريبي',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">
            نظام الإشعارات للمتاجر - عرض شامل
          </h1>
        </div>
        <p className="text-muted-foreground">
          نظام إشعارات فوري متكامل باستخدام Supabase Realtime مع قائمة دائمة وتنبيهات منبثقة
        </p>
      </div>

      {/* Technical Specifications */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="w-5 h-5" />
            المواصفات التق��ية المنفذة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold">Supabase Integration:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Table:</span>
                  <Badge variant="outline" className="font-mono">notifications</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Realtime Channel:</span>
                  <Badge variant="outline" className="font-mono">notifications_channel</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Event Name:</span>
                  <Badge variant="outline" className="font-mono">new_notification</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Store Context:</span>
                  <Badge variant="outline" className="font-mono">current_store.id</Badge>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold">Query Filters:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>recipient_type:</span>
                  <Badge variant="outline" className="font-mono">'store'</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>recipient_id:</span>
                  <Badge variant="outline" className="font-mono">current_store.id</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Order:</span>
                  <Badge variant="outline" className="font-mono">created_at DESC</Badge>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {sampleStores.map((store) => (
                <Button
                  key={store.id}
                  onClick={() => setSelectedStoreId(store.id)}
                  variant={selectedStoreId === store.id ? "default" : "outline"}
                  size="sm"
                >
                  {store.name}
                </Button>
              ))}
            </div>
            
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

      {/* Main Demo */}
      <Tabs defaultValue="live" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="live">النظام المباشر</TabsTrigger>
          <TabsTrigger value="testing">الاختبار والتجريب</TabsTrigger>
        </TabsList>

        {/* Live System */}
        <TabsContent value="live" className="space-y-6">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              النظام يعمل بشكل مباشر. الإشعارات الجديدة ستظهر فوراً في القائمة أدناه، 
              والإشعارات العاجلة/المهمة ستظهر كتنبيهات منبثقة.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Features Overview */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    المميزات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Bell className="w-5 h-5 text-blue-600" />
                    <div>
                      <h4 className="font-medium text-sm">إشعارات فورية</h4>
                      <p className="text-xs text-muted-foreground">عبر notifications_channel</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <h4 className="font-medium text-sm">تتبع القراءة</h4>
                      <p className="text-xs text-muted-foreground">تحديث فوري لحالة read</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <Zap className="w-5 h-5 text-purple-600" />
                    <div>
                      <h4 className="font-medium text-sm">أولويات متعددة</h4>
                      <p className="text-xs text-muted-foreground">urgent, high, medium, low</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-orange-600" />
                    <div>
                      <h4 className="font-medium text-sm">تنبيهات منبثقة</h4>
                      <p className="text-xs text-muted-foreground">للإشعارات urgent & high</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Notification Center */}
            <div className="lg:col-span-2">
              <StoreNotificationCenter 
                current_store={current_store}
                maxHeight="500px"
                showHeader={true}
                className="shadow-md"
              />
            </div>
          </div>

          {/* Toast Notifications */}
          <StoreNotificationToast 
            current_store={current_store}
            autoHideDuration={10000}
          />
        </TabsContent>

        {/* Testing Panel */}
        <TabsContent value="testing" className="space-y-6">
          <Alert>
            <TestTube className="h-4 w-4" />
            <AlertDescription>
              استخدم النموذج أدناه لإرسال إشعارات تجريبية وملاحظة كيفية عمل النظام في الوقت الفعلي.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Test Form */}
            <Card>
              <CardHeader>
                <CardTitle>إرسال إشعار تجريبي</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">العنوان</Label>
                  <Input
                    id="title"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    placeholder="عنوان الإشعار"
                  />
                </div>

                <div>
                  <Label htmlFor="message">الرسالة</Label>
                  <Input
                    id="message"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="محتوى الإشعار"
                  />
                </div>

                <div>
                  <Label htmlFor="priority">الأولوية</Label>
                  <Select value={testPriority} onValueChange={(value: any) => setTestPriority(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">منخفض (low)</SelectItem>
                      <SelectItem value="medium">متوسط (medium)</SelectItem>
                      <SelectItem value="high">مهم (high) - سيظهر toast</SelectItem>
                      <SelectItem value="urgent">عاجل (urgent) - سيظهر toast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="url">الرابط (URL)</Label>
                  <Input
                    id="url"
                    value={testUrl}
                    onChange={(e) => setTestUrl(e.target.value)}
                    placeholder="/store-dashboard"
                  />
                </div>

                <Separator />

                <Button 
                  onClick={sendTestNotification} 
                  disabled={loading || !testTitle || !testMessage}
                  className="w-full"
                >
                  {loading ? 'جاري الإرسال...' : 'إرسال إشعار تجريبي'}
                </Button>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>ملاحظة:</strong> الإشعارات ذات الأولوية "مهم" أو "عاجل" ستظهر كتنبيهات منبثقة، 
                    بينما جميع الإشعارات ستظهر في القائمة.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Live Notification Center */}
            <StoreNotificationCenter 
              current_store={current_store}
              maxHeight="400px"
              showHeader={true}
              className="shadow-md"
            />
          </div>

          {/* Toast Notifications for Testing */}
          <StoreNotificationToast 
            current_store={current_store}
            autoHideDuration={8000}
          />
        </TabsContent>
      </Tabs>

      {/* Implementation Details */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>تفاصيل التنفيذ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">الجزء الأول: مركز الإشعارات (Store Notification Center)</h4>
              <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                <li>استعلام قاعدة البيانات بالفلاتر: <code>recipient_type='store' AND recipient_id=current_store.id</code></li>
                <li>ترتيب النتائج حسب: <code>created_at DESC</code></li>
                <li>حفظ الإشعارات في: <code>store_notifications</code> state variable</li>
                <li>اشتراك فوري في: <code>notifications_channel</code> للاستماع لـ <code>new_notification</code></li>
                <li>إضافة الإشعارات الجديدة في أعلى القائمة</li>
                <li>تمييز بصري للإشعارات غير المقروءة (نقطة ملونة)</li>
                <li>عند النقر: تحديث <code>read=true</code> والانتقال للـ <code>url</code></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">الجزء الثاني: التنبيهات المنبثقة (Toast Notifications)</h4>
              <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                <li>استخدام نفس الاشتراك: <code>notifications_channel / new_notification</code></li>
                <li>فلترة إضافية للأولوية: <code>priority='urgent' OR priority='high'</code></li>
                <li>ظهور كـ overlay في الزاوية العلوية اليمنى</li>
                <li>عرض العنوان والرسالة</li>
                <li>زر إغلاق واضح (X)</li>
                <li>اختفاء تلقائي بعد 10 ثواني</li>
                <li>النقر على الجسم للانتقال للـ <code>url</code></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StoreNotificationDemoPage;
