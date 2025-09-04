import { supabase } from '@/integrations/supabase/client';
import { centralNotificationManager } from './centralNotificationManager';
import { NotificationData } from '@/hooks/useNotifications';

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: 'new_order' | 'pending_order' | 'store_response' | 'system';
  orderId?: string;
  customerName?: string;
  orderCode?: string;
  timestamp: string;
  isRead: boolean;
  url?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

/**
 * Unified Admin Notification Service
 * Uses ONLY the notifications table as specified - NO admin_notifications table
 * Integrates with the centralized notification system
 */
export class UnifiedAdminNotificationService {
  private realtimeChannel: any = null;
  private isListening = false;
  private notificationCallbacks: ((notification: AdminNotification) => void)[] = [];
  private readonly ADMIN_ID = 'admin'; // Admin recipient_id for notifications

  constructor() {
    this.requestNotificationPermission();
  }

  /**
   * طلب إذن الإشعارات من المستخدم
   */
  async requestNotificationPermission() {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    }
  }

  /**
   * إضافة إشعار جديد باستخدام النظام الموحد
   */
  async addNotification(notification: Omit<AdminNotification, 'id' | 'timestamp' | 'isRead'>) {
    const priority = notification.priority || 'medium';
    
    // Use centralNotificationManager to create notification in unified notifications table
    const success = await centralNotificationManager.notifyAdmin(
      notification.title,
      notification.message,
      notification.orderId
    );

    if (success) {
      // Create a structured notification object for callbacks
      const newNotification: AdminNotification = {
        ...notification,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        isRead: false,
        priority
      };

      this.showBrowserNotification(newNotification);
      this.notifyCallbacks(newNotification);

      // Add URL to the notification if provided
      if (notification.url) {
        try {
          // Find the most recent notification for this admin and update its URL
          const { data, error } = await supabase
            .from('notifications')
            .select('id')
            .eq('recipient_type', 'admin')
            .eq('recipient_id', this.ADMIN_ID)
            .eq('title', notification.title)
            .order('created_at', { ascending: false })
            .limit(1);

          if (data && data.length > 0) {
            await supabase
              .from('notifications')
              .update({ 
                url: notification.url,
                priority: priority,
                type: notification.type 
              })
              .eq('id', data[0].id);
          }
        } catch (error) {
          console.warn('⚠️ Could not update notification URL:', error);
        }
      }

      return newNotification;
    }

    return null;
  }

  /**
   * عرض Browser Notification
   */
  private showBrowserNotification(notification: AdminNotification) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.orderId ? `order-${notification.orderId}` : notification.id,
        requireInteraction: notification.priority === 'urgent',
        data: {
          notificationId: notification.id,
          orderId: notification.orderId,
          url: notification.url
        }
      });

      browserNotification.onclick = () => {
        window.focus();
        if (notification.url) {
          window.location.href = notification.url;
        }
        browserNotification.close();
      };

      // إغلاق تلقائي بعد 8 ثواني (إلا إذا كان urgent)
      if (notification.priority !== 'urgent') {
        setTimeout(() => {
          browserNotification.close();
        }, 8000);
      }
    }
  }

  /**
   * بدء الاستماع للطلبيات الجديدة - يستخدم نفس القنوات الموجودة
   */
  startListening() {
    if (this.isListening) return;

    this.realtimeChannel = supabase
      .channel('unified-admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          const order = payload.new as any;
          this.handleNewOrder(order);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          const oldOrder = payload.old as any;
          const newOrder = payload.new as any;
          
          // إشعار عند تغيير الحالة إلى معلق
          if (oldOrder.order_status !== 'pending' && newOrder.order_status === 'pending') {
            this.handlePendingOrder(newOrder);
          }
          
          // إشعار عند استجابة المتجر
          if (oldOrder.store_response_status !== newOrder.store_response_status && newOrder.store_response_status) {
            this.handleStoreResponse(newOrder);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Unified admin notifications channel status:', status);

        if (status === 'SUBSCRIBED') {
          this.isListening = true;
          console.log('✅ Unified admin notifications started listening');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ خطأ في Real-time: CHANNEL_ERROR');
          this.isListening = false;
          // إعادة المحاولة بعد 5 ثوان
          setTimeout(() => {
            console.log('🔄 إعادة محاولة الاتصال بـ Real-time...');
            this.stopListening();
            this.startListening();
          }, 5000);
        } else if (status === 'TIMED_OUT') {
          console.warn('⏰ انتهت مهلة الاتصال بـ Real-time، إعادة محاولة...');
          this.isListening = false;
          setTimeout(() => {
            this.stopListening();
            this.startListening();
          }, 3000);
        } else if (status === 'CLOSED') {
          console.log('🔒 تم إغلاق اتصال Real-time');
          this.isListening = false;
        }
      });
  }

  /**
   * إيقاف الاستماع
   */
  stopListening() {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
      this.isListening = false;
    }
  }

  /**
   * معالجة الطلب الجديد
   */
  private handleNewOrder(order: any) {
    this.addNotification({
      title: '��� طلب جديد وصل!',
      message: `طلب من ${order.customer_name} - ${order.order_code || order.id.slice(0, 8)}`,
      type: 'new_order',
      orderId: order.id,
      customerName: order.customer_name,
      orderCode: order.order_code,
      url: `/admin-aa-smn-justme9003?orderId=${order.id}`,
      priority: 'high'
    });

    this.playNotificationSound();
  }

  /**
   * معالجة الطلب المعلق
   */
  private handlePendingOrder(order: any) {
    this.addNotification({
      title: '⏳ طلب في انتظار المعالجة',
      message: `طلب ${order.customer_name} يحتاج تعيين - ${order.order_code || order.id.slice(0, 8)}`,
      type: 'pending_order',
      orderId: order.id,
      customerName: order.customer_name,
      orderCode: order.order_code,
      url: `/admin-aa-smn-justme9003?orderId=${order.id}`,
      priority: 'urgent'
    });

    this.playNotificationSound();
  }

  /**
   * معالجة استجابة المتجر
   */
  private handleStoreResponse(order: any) {
    const isAccepted = ['available', 'accepted'].includes(order.store_response_status);
    const title = isAccepted ? '✅ قبول طلب' : '❌ رفض طلب';
    const message = `المتجر ${isAccepted ? 'قبل' : 'رفض'} طلب ${order.customer_name}`;

    this.addNotification({
      title,
      message,
      type: 'store_response',
      orderId: order.id,
      customerName: order.customer_name,
      orderCode: order.order_code,
      url: `/admin-aa-smn-justme9003?orderId=${order.id}`,
      priority: isAccepted ? 'medium' : 'high'
    });

    this.playNotificationSound();
  }

  /**
   * تشغيل صوت التنبيه
   */
  private playNotificationSound() {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);

      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Cannot play notification sound:', error);
    }
  }

  /**
   * الحصول على جميع الإشعارات من النظام الموحد
   */
  async getNotifications(): Promise<NotificationData[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_type', 'admin')
        .eq('recipient_id', this.ADMIN_ID)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('❌ Error fetching admin notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Exception fetching admin notifications:', error);
      return [];
    }
  }

  /**
   * الحصول على عدد الإشعارات غير المقروءة
   */
  async getUnreadCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_type', 'admin')
        .eq('recipient_id', this.ADMIN_ID)
        .eq('read', false);

      if (error) {
        console.error('❌ Error fetching unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('❌ Exception fetching unread count:', error);
      return 0;
    }
  }

  /**
   * تحديد إشعار كمقروء
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('❌ Error marking notification as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Exception marking notification as read:', error);
      return false;
    }
  }

  /**
   * تحديد جميع الإشعارات كمقروءة
   */
  async markAllAsRead(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('recipient_type', 'admin')
        .eq('recipient_id', this.ADMIN_ID)
        .eq('read', false);

      if (error) {
        console.error('❌ Error marking all as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Exception marking all as read:', error);
      return false;
    }
  }

  /**
   * إضافة callback للتنبيه عند الإشعارات الجديدة
   */
  onNotification(callback: (notification: AdminNotification) => void) {
    this.notificationCallbacks.push(callback);
  }

  /**
   * إزالة callback
   */
  removeNotificationCallback(callback: (notification: AdminNotification) => void) {
    this.notificationCallbacks = this.notificationCallbacks.filter(cb => cb !== callback);
  }

  /**
   * إشعار جميع الـ callbacks
   */
  private notifyCallbacks(notification: AdminNotification) {
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error in notification callback:', error);
      }
    });
  }

  /**
   * إضافة إشعار تجريبي
   */
  async addTestNotification() {
    await this.addNotification({
      title: '🧪 إشعار تجريبي',
      message: 'هذا إشعار تجريبي للتأكد من عمل النظام الموحد - تم حفظه في جدول notifications',
      type: 'system',
      url: '/admin-aa-smn-justme9003',
      priority: 'medium'
    });
  }

  /**
   * الحصول على حالة الخدمة
   */
  getStatus() {
    return {
      isListening: this.isListening,
      notificationPermission: 'Notification' in window ? Notification.permission : 'not_supported',
      hasNotificationAPI: 'Notification' in window,
      tableName: 'notifications', // Using unified table
      adminId: this.ADMIN_ID
    };
  }

  /**
   * إنشاء إشعار مخصص
   */
  async createCustomNotification(
    title: string,
    message: string,
    options?: {
      type?: string;
      orderId?: string;
      url?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
    }
  ): Promise<boolean> {
    return await centralNotificationManager.createNotification({
      recipient_id: this.ADMIN_ID,
      recipient_type: 'admin',
      title,
      message,
      order_id: options?.orderId
    });
  }
}

// إنشاء instance واحد للخدمة الموحدة
export const unifiedAdminNotificationService = new UnifiedAdminNotificationService();

export default unifiedAdminNotificationService;
