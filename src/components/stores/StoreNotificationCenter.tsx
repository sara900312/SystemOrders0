import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ensureNotificationsTableExists } from '@/utils/setupNotificationsTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Bell, BellRing, Clock, CheckCircle, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  order_id?: string;
  created_at: string;
  read: boolean;
  sent: boolean;
  url?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  type?: string;
  recipient_id: string;
  recipient_type: string;
}

interface StoreNotificationCenterProps {
  current_store: {
    id: string;
  };
  className?: string;
  maxHeight?: string;
  showHeader?: boolean;
}

export const StoreNotificationCenter: React.FC<StoreNotificationCenterProps> = ({
  current_store,
  className = "",
  maxHeight = "400px",
  showHeader = true
}) => {
  const [store_notifications, setStoreNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  // Setup notifications table and fetch initial data
  const setupAndFetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Ensure notifications table exists
      const tableExists = await ensureNotificationsTableExists();
      if (!tableExists) {
        throw new Error('Failed to setup notifications table');
      }

      // Fetch notifications for this store (exact query as specified)
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_type', 'store')
        .eq('recipient_id', current_store.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        throw fetchError;
      }

      const notificationList = data || [];
      setStoreNotifications(notificationList);
      setUnreadCount(notificationList.filter(n => !n.read).length);

      console.log(`📋 Loaded ${notificationList.length} notifications for store ${current_store.id}`);
    } catch (err) {
      console.error('❌ Error setting up notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [current_store.id]);

  // Setup real-time subscription using exact specifications
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupRealtime = async () => {
      // Initial setup and fetch
      await setupAndFetchNotifications();

      // Setup real-time subscription using exact channel and event names
      const channel = supabase
        .channel('notifications_channel')
        .on('broadcast',
          {
            event: 'new_notification'
          },
          (payload) => {
            console.log('🔔 New notification event received:', payload);
            const newNotification = payload.payload as Notification;
            
            // Check if the payload's recipient_type is 'store' and recipient_id matches current_store.id
            if (newNotification.recipient_type === 'store' && 
                newNotification.recipient_id === current_store.id) {
              
              // Prepend the new notification object to the store_notifications state array
              setStoreNotifications(prev => [newNotification, ...prev]);
              setUnreadCount(prev => prev + 1);
              
              console.log('✅ Added new notification to store list');
            }
          }
        )
        .subscribe((status) => {
          console.log(`📡 notifications_channel status:`, status);
          
          if (status === 'SUBSCRIBED') {
            console.log(`✅ Successfully subscribed to notifications_channel for store: ${current_store.id}`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`❌ Channel error for notifications_channel`);
            setError('Connection error. Please refresh the page.');
          }
        });

      unsubscribe = () => {
        supabase.removeChannel(channel);
        console.log(`🔔 Unsubscribed from notifications_channel`);
      };
    };

    if (current_store?.id) {
      setupRealtime();
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [current_store.id, setupAndFetchNotifications]);

  // Mark notification as read and navigate to URL
  const handleNotificationClick = async (notification: Notification) => {
    try {
      // 1. Trigger a Supabase database update to set the read property to true
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notification.id);

      if (error) {
        throw error;
      }

      // 2. Upon successful update, remove the "unread" indicator dot from the UI
      setStoreNotifications(prev =>
        prev.map(n =>
          n.id === notification.id ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      console.log('✅ Notification marked as read:', notification.id);

      // 3. Navigate the user to the URL specified in the notification's url field
      if (notification.url) {
        window.location.href = notification.url;
      }
    } catch (err) {
      console.error('❌ Error handling notification click:', err);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث حالة الإشعار',
        variant: 'destructive',
      });
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('recipient_id', current_store.id)
        .eq('recipient_type', 'store')
        .eq('read', false);

      if (error) {
        throw error;
      }

      setStoreNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);

      toast({
        title: 'تم',
        description: 'تم تحديد جميع الإشعارات كمقروءة',
      });
    } catch (err) {
      console.error('❌ Error marking all notifications as read:', err);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث الإشعارات',
        variant: 'destructive',
      });
    }
  };

  // Get priority color
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-blue-500 text-white';
      case 'low': return 'bg-gray-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  // Get priority icon
  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case 'urgent': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '📢';
      case 'low': return 'ℹ️';
      default: return '📝';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              الإشعارات
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">جاري التحميل...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              الإشعارات
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={setupAndFetchNotifications} variant="outline">
              إعادة المحاولة
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {unreadCount > 0 ? (
                <BellRing className="w-5 h-5 text-orange-500" />
              ) : (
                <Bell className="w-5 h-5" />
              )}
              الإشعارات
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            {unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                تحديد الكل كمقروء
              </Button>
            )}
          </div>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <ScrollArea className="h-full" style={{ maxHeight }}>
          {store_notifications.length === 0 ? (
            <div className="text-center py-8 px-4 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد إشعارات حالياً</p>
            </div>
          ) : (
            <div className="space-y-1">
              {store_notifications.map((notification, index) => (
                <div key={notification.id}>
                  <div
                    className={cn(
                      "p-4 cursor-pointer transition-colors hover:bg-muted/50",
                      !notification.read && "bg-blue-50 border-r-4 border-blue-500"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Unread indicator - small, colored dot */}
                      <div className="flex-shrink-0 mt-1">
                        {!notification.read ? (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        ) : (
                          <div className="w-2 h-2"></div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          {/* The notification title */}
                          <h4 className={cn(
                            "text-sm font-medium text-right",
                            !notification.read && "font-semibold"
                          )}>
                            {getPriorityIcon(notification.priority)} {notification.title}
                          </h4>
                          <div className="flex items-center gap-2 ml-2">
                            {notification.priority && (
                              <Badge 
                                variant="outline" 
                                className={cn("text-xs px-1 py-0", getPriorityColor(notification.priority))}
                              >
                                {notification.priority}
                              </Badge>
                            )}
                            {notification.url && (
                              <ExternalLink className="w-3 h-3 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        
                        {/* The notification message */}
                        <p className="text-sm text-muted-foreground mt-1 text-right">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          {/* A formatted timestamp (e.g., "5 minutes ago") based on the created_at field */}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(notification.created_at), { 
                              addSuffix: true, 
                              locale: ar 
                            })}
                          </div>
                          
                          {!notification.read && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotificationClick(notification);
                              }}
                              variant="ghost"
                              size="sm"
                              className="text-xs p-1 h-auto"
                            >
                              <CheckCircle className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {index < store_notifications.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default StoreNotificationCenter;
