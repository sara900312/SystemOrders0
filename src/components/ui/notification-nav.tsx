import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Settings, Smartphone, TestTube, Zap } from 'lucide-react';

const NotificationNav: React.FC = () => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          نظام الإشعارات المتقدم
          <Badge variant="default" className="mr-2">
            <Zap className="w-3 h-3 mr-1" />
            جديد!
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <Link to="/advanced-notifications">
            <Button variant="default" className="w-full h-auto p-4 flex flex-col items-center gap-2">
              <Smartphone className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium">الإدارة المتقدمة</div>
                <div className="text-xs opacity-80">Service Worker + Push</div>
              </div>
            </Button>
          </Link>
          
          <Link to="/notification-test">
            <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2">
              <TestTube className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium">الاختبار السريع</div>
                <div className="text-xs opacity-80">إشعارات أساسية</div>
              </div>
            </Button>
          </Link>
          
          <Link to="/admin-notifications-test">
            <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2">
              <Settings className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium">إعدادات الإدارة</div>
                <div className="text-xs opacity-80">إشعارات الإدارة</div>
              </div>
            </Button>
          </Link>
          
          <Link to="/realtime-test">
            <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2">
              <Bell className="w-6 h-6" />
              <div className="text-center">
                <div className="font-medium">Real-time</div>
                <div className="text-xs opacity-80">الوقت الفعلي</div>
              </div>
            </Button>
          </Link>

          <Link to="/service-worker-demo">
            <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2 border-blue-200 hover:bg-blue-50">
              <Smartphone className="w-6 h-6 text-blue-600" />
              <div className="text-center">
                <div className="font-medium text-blue-600">عرض توضيحي</div>
                <div className="text-xs text-blue-500">Service Worker</div>
              </div>
            </Button>
          </Link>

          <Link to="/realtime-notification-test">
            <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2 border-green-200 hover:bg-green-50">
              <Zap className="w-6 h-6 text-green-600" />
              <div className="text-center">
                <div className="font-medium text-green-600">Realtime محدث</div>
                <div className="text-xs text-green-500">Edge Function + SW</div>
              </div>
            </Button>
          </Link>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-800">
            <strong>🚀 النظام المحدث يتضمن:</strong>
            <div className="mt-1 text-xs space-y-1">
              <div>✅ Service Worker متقدم مع أزرار تفاعلية</div>
              <div>✅ Realtime متكامل ��ع Edge Function</div>
              <div>✅ إشعارات فورية عبر Supabase Realtime</div>
              <div>✅ دعم VAPID وتخزين مؤقت ذكي</div>
              <div>🆕 منع التكرار على مستوى الخادم</div>
              <div>🆕 تواصل مباشر بين Frontend و Service Worker</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationNav;
