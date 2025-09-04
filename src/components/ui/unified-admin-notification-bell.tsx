import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Settings, Trash2, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuHeader,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNotifications, NotificationData } from '@/hooks/useNotifications';
import { NotificationToast } from '@/components/notifications/NotificationToast';

interface UnifiedAdminNotificationBellProps {
  className?: string;
  adminId?: string;
}

/**
 * Unified Admin Notification Bell Component
 * Uses ONLY the notifications table as specified - NO admin_notifications table
 * Integrates with the new unified notification system
 */
export const UnifiedAdminNotificationBell: React.FC<UnifiedAdminNotificationBellProps> = ({ 
  className = "",
  adminId = "admin"
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Use the unified notification hook
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
  } = useNotifications(
    { type: 'admin', id: adminId },
    { limit: 20, enableRealtime: true }
  );

  // Handle notification click
  const handleNotificationClick = async (notification: NotificationData) => {
    try {
      if (!notification.read) {
        await markAsRead(notification.id);
      }
      navigateToNotification(notification);
      setIsOpen(false);
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  // Get notification type icon
  const getNotificationIcon = (notification: NotificationData) => {
    if (notification.type?.includes('order')) {
      return '📦';
    }
    if (notification.priority === 'urgent') {
      return '🚨';
    }
    if (notification.priority === 'high') {
      return '⚠️';
    }
    return '📝';
  };

  // Get priority color
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <>
      {/* Toast notifications for urgent alerts */}
      <NotificationToast 
        userContext={{ type: 'admin', id: adminId }}
        priorityFilter={['urgent', 'high']}
      />

      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "relative h-9 w-9 rounded-full",
              unreadCount > 0 && "text-orange-600",
              className
            )}
          >
            {unreadCount > 0 ? (
              <BellRing className="h-4 w-4" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            
            {/* Unread count badge */}
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}

            {/* Connection status indicator */}
            {!isConnected && (
              <div className="absolute -bottom-1 -right-1 h-2 w-2 bg-red-500 rounded-full" 
                   title="غير متصل بالوقت الفعلي" />
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent 
          align="end" 
          className="w-80 max-h-96"
          side="bottom"
        >
          <DropdownMenuHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">إشعارات الإدارة</h3>
                {isConnected && (
                  <div className="h-2 w-2 bg-green-500 rounded-full" title="متصل بالوقت الفعلي" />
                )}
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  onClick={refreshNotifications}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  title="تحديث"
                >
                  <Settings className="h-3 w-3" />
                </Button>
                
                {unreadCount > 0 && (
                  <Button
                    onClick={handleMarkAllAsRead}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    title="تحديد الكل كمقروء"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {unreadCount} إشعار غير مقروء
              </p>
            )}
          </DropdownMenuHeader>

          <DropdownMenuSeparator />

          {/* Error state */}
          {(error || !tableExists) && (
            <div className="p-4 text-center">
              <div className="text-red-600 text-sm mb-2">
                {error || 'جدول الإشعارات غير متوفر'}
              </div>
              <Button
                onClick={refreshNotifications}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                إعادة المحاولة
              </Button>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-xs text-muted-foreground">جاري التحميل...</p>
            </div>
          )}

          {/* Notifications list */}
          {!loading && !error && tableExists && (
            <ScrollArea className="max-h-64">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">لا توجد إشعارات</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={cn(
                        "flex items-start gap-3 p-3 cursor-pointer focus:bg-muted",
                        !notification.read && "bg-blue-50 border-r-2 border-blue-500",
                        getPriorityColor(notification.priority)
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <span className="text-sm">
                          {getNotificationIcon(notification)}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0 text-right">
                        <div className="flex items-start justify-between">
                          <h4 className={cn(
                            "text-sm font-medium leading-tight",
                            !notification.read && "font-semibold"
                          )}>
                            {notification.title}
                          </h4>
                          
                          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                            {notification.priority && notification.priority !== 'medium' && (
                              <Badge 
                                variant="outline" 
                                className="text-xs px-1 py-0"
                              >
                                {notification.priority}
                              </Badge>
                            )}
                            {notification.url && (
                              <ExternalLink className="h-3 w-3 opacity-60" />
                            )}
                            {!notification.read && (
                              <div className="h-2 w-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), { 
                              addSuffix: true, 
                              locale: ar 
                            })}
                          </p>
                          
                          {notification.order_id && (
                            <span className="text-xs bg-muted px-1 rounded">
                              طلب: {notification.order_id.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
          
          {notifications.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-center justify-center text-sm text-muted-foreground"
                onClick={() => setIsOpen(false)}
              >
                عرض جميع الإشعارات
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default UnifiedAdminNotificationBell;
