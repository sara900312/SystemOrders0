import React, { useState, useEffect } from 'react';
import { Bell, BellRing, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ArabicText } from '@/components/ui/arabic-text';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  type: 'order_assigned' | 'order_reminder' | 'system' | 'general';
  order_id?: string;
  order_code?: string;
}

interface StoreNotificationBellProps {
  storeId: string;
  refreshInterval?: number; // بالثواني، افتراضي 30 ثانية
}

export const StoreNotificationBell: React.FC<StoreNotificationBellProps> = ({ 
  storeId, 
  refreshInterval = 30 
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // جلب الإشعارات من قاعدة البيانا��
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', storeId)
        .eq('recipient_type', 'store')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('❌ Error fetching store notifications:', {
          message: error.message || String(error),
          code: error.code,
          details: error.details,
          hint: error.hint,
          storeId: storeId
        });
        return;
      }

      if (data) {
        setNotifications(data);
        const unread = data.filter(n => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('❌ Exception fetching store notifications:', {
        message: error instanceof Error ? error.message : String(error),
        storeId: storeId
      });
    } finally {
      setIsLoading(false);
    }
  };

  // تحديث الإشعار كمقروء
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (!error) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // تحديد لون الإشعار حسب النوع
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order_assigned':
        return 'border-blue-200 bg-blue-50';
      case 'order_reminder':
        return 'border-orange-200 bg-orange-50';
      case 'system':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  // تحديد أيقونة النوع
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'order_assigned':
        return '📦';
      case 'order_reminder':
        return '⏰';
      case 'system':
        return '🚨';
      default:
        return '📢';
    }
  };

  // جلب الإشعارات عند التحميل الأول فقط
  useEffect(() => {
    if (!storeId) return;

    // جلب فوري عند التحميل
    fetchNotifications();
  }, [storeId]);

  // الاستماع لتحديثات في الوقت الفعلي
  useEffect(() => {
    if (!storeId) return;

    const channel = supabase
      .channel(`store-notifications-bell-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${storeId}`
        },
        (payload) => {
          console.log('New notification received:', payload);

          const newNotification = payload.new as Notification;

          // إضافة الإشعار الجديد للقائمة بدلاً من إعادة جلب الكل
          if (newNotification) {
            setNotifications(prev => {
              // تحقق من عدم وجود الإشعار بالفعل لمنع التكرار
              const exists = prev.some(n =>
                n.id === newNotification.id ||
                (n.order_id === newNotification.order_id &&
                 n.type === newNotification.type &&
                 n.order_id &&
                 Math.abs(new Date(n.created_at).getTime() - new Date(newNotification.created_at).getTime()) < 60000) // إذا كان نفس الطلب ونفس النوع خلال دقيقة واحدة
              );

              if (exists) {
                console.log('Duplicate notification prevented:', newNotification.id);
                return prev;
              }

              // إضافة الإشعار الجديد في المقدمة
              return [newNotification, ...prev].slice(0, 20); // الاحتفاظ بـ 20 إشعار فقط
            });

            // تحديث عدد الإشعارات غير المقروءة
            if (!newNotification.read) {
              setUnreadCount(prev => prev + 1);
            }
          }

          // إظهار إشعار متصفح إذا كان مسموحاً (مع tag لمنع التكرار)
          if ('Notification' in window && Notification.permission === 'granted' && newNotification) {
            // استخدام tag أكثر ذكاءً يأخذ في الاعتبار نوع الإشعار والطلب
            const tagKey = newNotification.order_id
              ? `store-${storeId}-order-${newNotification.order_id}-${newNotification.type}`
              : `store-${storeId}-${newNotification.type}-${Date.now()}`;

            new Notification(newNotification.title || 'إشعار جديد', {
              body: newNotification.message,
              icon: '/favicon.ico',
              tag: tagKey, // tag ذكي لمنع التكرار
              requireInteraction: false,
              renotify: false // منع إعادة الإشع��ر لنفس التاغ
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId]);

  // طلب إذن الإشعارات
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5 text-orange-500" />
          ) : (
            <Bell className="h-5 w-5 text-muted-foreground" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <ArabicText as={CardTitle} className="text-lg">الإشعارات</ArabicText>
                <ArabicText as={CardDescription}>
                  {unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : 'جميع الإشعارات مقروءة'}
                </ArabicText>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  <ArabicText>جاري التحميل...</ArabicText>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <ArabicText>لا توجد إشعارات</ArabicText>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-accent/50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                      }`}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg">{getTypeIcon(notification.type)}</span>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-sm font-medium ${
                              !notification.read ? 'text-blue-900' : 'text-foreground'
                            }`}>
                              <ArabicText>{notification.title || 'إشعار'}</ArabicText>
                            </h4>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                          <ArabicText className="text-sm text-muted-foreground leading-relaxed">
                            {notification.message}
                          </ArabicText>
                          {notification.order_code && (
                            <p className="text-xs text-blue-600 font-medium">
                              الطلب: {notification.order_code}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: ar
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
};
