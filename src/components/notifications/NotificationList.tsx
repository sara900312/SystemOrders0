import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  BellRing, 
  Clock, 
  CheckCircle, 
  ExternalLink, 
  RefreshCw,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useNotifications, NotificationData } from '@/hooks/useNotifications';

interface NotificationListProps {
  userContext: {
    type: 'store' | 'admin' | 'customer';
    id: string;
  };
  className?: string;
  maxHeight?: string;
  showHeader?: boolean;
  showConnectionStatus?: boolean;
  limit?: number;
  autoMarkAsRead?: boolean;
}

/**
 * Reusable notification list component for Store & Admin dashboards
 * Uses ONLY the notifications table as specified
 */
export const NotificationList: React.FC<NotificationListProps> = ({
  userContext,
  className = "",
  maxHeight = "400px",
  showHeader = true,
  showConnectionStatus = true,
  limit = 50,
  autoMarkAsRead = false
}) => {
  const { toast } = useToast();
  
  // Use the core notification hook
  const {
    notifications,
    loading,
    error,
    unreadCount,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    navigateToNotification,
    isConnected,
    tableExists
  } = useNotifications(userContext, {
    limit,
    enableRealtime: true,
    autoMarkAsRead
  });

  // Handle notification click
  const handleNotificationClick = async (notification: NotificationData) => {
    try {
      if (!notification.read) {
        const success = await markAsRead(notification.id);
        if (!success) {
          toast({
            title: 'خطأ',
            description: 'فشل في تحديث حالة الإشعار',
            variant: 'destructive',
          });
          return;
        }
      }

      // Navigate to URL if specified
      navigateToNotification(notification);
    } catch (err) {
      console.error('❌ Error handling notification click:', err);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء فتح الإشعار',
        variant: 'destructive',
      });
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    const success = await markAllAsRead();
    if (success) {
      toast({
        title: 'تم',
        description: 'تم تحديد جميع الإشعارات كمقروءة',
      });
    } else {
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث الإشعارات',
        variant: 'destructive',
      });
    }
  };

  // Get priority color and icon
  const getPriorityStyles = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return {
          color: 'bg-red-500 text-white',
          icon: '🚨'
        };
      case 'high':
        return {
          color: 'bg-orange-500 text-white',
          icon: '⚠️'
        };
      case 'medium':
        return {
          color: 'bg-blue-500 text-white',
          icon: '📢'
        };
      case 'low':
        return {
          color: 'bg-gray-500 text-white',
          icon: 'ℹ️'
        };
      default:
        return {
          color: 'bg-gray-400 text-white',
          icon: '📝'
        };
    }
  };

  // Get user type display name
  const getUserTypeDisplayName = (type: string) => {
    switch (type) {
      case 'store': return 'المتجر';
      case 'admin': return 'الإدارة';
      case 'customer': return 'العميل';
      default: return type;
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              الإشعارات - {getUserTypeDisplayName(userContext.type)}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">ج��ري التحميل...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error || !tableExists) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              الإشعارات - {getUserTypeDisplayName(userContext.type)}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'جدول الإشعارات غير متوفر. يرجى التأكد من إنشاؤه في قاعدة البيانات.'}
            </AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Button 
              onClick={refreshNotifications} 
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
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
              الإشعارات - {getUserTypeDisplayName(userContext.type)}
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* Connection status */}
              {showConnectionStatus && (
                <div className="flex items-center gap-1">
                  {isConnected ? (
                    <Wifi className="w-4 h-4 text-green-500" title="متصل في الوقت الفعلي" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-red-500" title="غير متصل" />
                  )}
                </div>
              )}
              
              {/* Action buttons */}
              <Button
                onClick={refreshNotifications}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="تحديث"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              
              {unreadCount > 0 && (
                <Button
                  onClick={handleMarkAllAsRead}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                >
                  تحديد الكل كمقروء
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent className="p-0">
        <ScrollArea className="h-full" style={{ maxHeight }}>
          {notifications.length === 0 ? (
            <div className="text-center py-8 px-4 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد إشعارات حالياً</p>
              <p className="text-sm text-muted-foreground mt-1">
                ستظهر هنا الإشعارات الجديدة تلقائياً
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification, index) => {
                const priorityStyles = getPriorityStyles(notification.priority);
                
                return (
                  <div key={notification.id}>
                    <div
                      className={cn(
                        "p-4 cursor-pointer transition-colors hover:bg-muted/50",
                        !notification.read && "bg-blue-50 border-r-4 border-blue-500"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Visually distinguish between read and unread notifications */}
                        <div className="flex-shrink-0 mt-1">
                          {!notification.read ? (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" title="غير مقروء"></div>
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
                              {priorityStyles.icon} {notification.title}
                            </h4>
                            
                            <div className="flex items-center gap-2 ml-2">
                              {notification.priority && (
                                <Badge 
                                  variant="outline" 
                                  className={cn("text-xs px-1 py-0", priorityStyles.color)}
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
                            {/* A formatted timestamp based on the created_at field */}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {formatDistanceToNow(new Date(notification.created_at), { 
                                addSuffix: true, 
                                locale: ar 
                              })}
                            </div>
                            
                            {/* Additional info */}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {notification.order_id && (
                                <span className="bg-muted px-1 rounded">
                                  طلب: {notification.order_id.slice(0, 8)}...
                                </span>
                              )}
                              {!notification.read && (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs p-1 h-auto"
                                  title="تحديد كمقروء"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {index < notifications.length - 1 && <Separator />}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default NotificationList;
