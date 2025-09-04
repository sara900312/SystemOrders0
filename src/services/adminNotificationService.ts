import { supabase } from '@/integrations/supabase/client';

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
}

export class AdminNotificationService {
  private notifications: AdminNotification[] = [];
  private realtimeChannel: any = null;
  private isListening = false;
  private notificationCallbacks: ((notification: AdminNotification) => void)[] = [];
  private readonly ADMIN_ID = 'admin'; // معرف الإدارة الثابت

  constructor() {
    this.loadNotifications();
    this.requestNotificationPermission();
    // تحميل من قاعدة البيانات بعد فترة قصيرة
    setTimeout(() => {
      this.loadFromDatabase();
    }, 1000);
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
   * تحميل الإشعارات من localStorage
   */
  private loadNotifications() {
    try {
      const stored = localStorage.getItem('admin_notifications');
      if (stored) {
        this.notifications = JSON.parse(stored);
      }
    } catch (error) {
      console.log('Error loading notifications:', error);
      this.notifications = [];
    }
  }

  /**
   * حفظ الإشعارات في localStorage
   */
  private saveNotifications() {
    try {
      localStorage.setItem('admin_notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.log('Error saving notifications:', error);
    }
  }

  /**
   * إضافة إشعار جديد
   */
  async addNotification(notification: Omit<AdminNotification, 'id' | 'timestamp' | 'isRead'>) {
    const newNotification: AdminNotification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      isRead: false
    };

    // إضافة للذاكرة المحلية
    this.notifications.unshift(newNotification);

    // الاحتفاظ بـ 100 إشعار فقط
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    this.saveNotifications();

    // محاولة حفظ في قاعدة البيانات الموحدة
    await this.saveToDatabase(newNotification);

    this.showBrowserNotification(newNotification);
    this.notifyCallbacks(newNotification);

    return newNotification;
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
        requireInteraction: true,
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
        this.markAsRead(notification.id);
        browserNotification.close();
      };

      // إغلاق تلقائي بعد 8 ثواني
      setTimeout(() => {
        browserNotification.close();
      }, 8000);
    }
  }

  /**
   * بدء الاستماع للطلبيات الجديدة
   */
  startListening() {
    if (this.isListening) return;

    this.realtimeChannel = supabase
      .channel('admin-notifications')
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
        console.log('📡 Admin notifications channel status:', status);

        if (status === 'SUBSCRIBED') {
          this.isListening = true;
          console.log('✅ Admin notifications started listening');
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
          // إعادة المحاولة بعد 3 ثوان
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
      title: '🆕 طلب جديد وصل!',
      message: `طلب من ${order.customer_name} - ${order.order_code || order.id.slice(0, 8)}`,
      type: 'new_order',
      orderId: order.id,
      customerName: order.customer_name,
      orderCode: order.order_code,
      url: `/admin-aa-smn-justme9003?orderId=${order.id}`
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
      url: `/admin-aa-smn-justme9003?orderId=${order.id}`
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
      url: `/admin-aa-smn-justme9003?orderId=${order.id}`
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
   * الحصول على جميع الإشعارات
   */
  getNotifications() {
    return this.notifications;
  }

  /**
   * الحصول على عدد الإشعارات غير المقروءة
   */
  getUnreadCount() {
    return this.notifications.filter(n => !n.isRead).length;
  }

  /**
   * تحديد إشعار كمقروء
   */
  markAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      this.saveNotifications();
      this.updateReadStatusInDatabase(notificationId, true);
      this.notifyCallbacks(notification);
    }
  }

  /**
   * تحديد جميع الإشعارات كمقروءة
   */
  async markAllAsRead() {
    this.notifications.forEach(n => n.isRead = true);
    this.saveNotifications();

    // تحديث قاعدة البيانات الموحدة
    try {
      const { error } = await supabase
        .from('notifications') // استخدام الجدول الموحد
        .update({ read: true })
        .eq('recipient_type', 'admin')
        .eq('recipient_id', this.ADMIN_ID)
        .eq('read', false);

      if (error) {
        console.warn('⚠️ Could not mark all as read in database:', error.message);
      } else {
        console.log('✅ All admin notifications marked as read in unified table');
      }
    } catch (error) {
      console.warn('⚠️ Exception marking all as read in database:', error);
    }
  }

  /**
   * حذف إشعار
   */
  deleteNotification(notificationId: string) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveNotifications();
  }

  /**
   * مسح جميع الإشعارات
   */
  clearAll() {
    this.notifications = [];
    this.saveNotifications();
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
   * حفظ الإشعار في قاعدة البيانات الموحدة
   */
  private async saveToDatabase(notification: AdminNotification) {
    try {
      const { error } = await supabase
        .from('notifications') // استخدام الجدول الموحد
        .insert({
          id: notification.id,
          recipient_type: 'admin', // تحديد النوع كإدارة
          recipient_id: this.ADMIN_ID, // معرف الإدارة
          title: notification.title,
          message: notification.message,
          type: notification.type,
          order_id: notification.orderId || null,
          url: notification.url || null,
          read: notification.isRead,
          sent: true,
          created_at: notification.timestamp,
          priority: this.getPriorityFromType(notification.type)
        });

      if (error) {
        console.warn('⚠️ Could not save notification to unified database:', error.message);
        // لا نرمي خطأ هنا لأن الإشعار محفوظ محلياً
      } else {
        console.log('✅ Notification saved to unified database:', notification.id);
      }
    } catch (error) {
      console.warn('⚠️ Exception saving notification to unified database:', error);
    }
  }

  /**
   * تحديد الأولوية حسب النوع
   */
  private getPriorityFromType(type: string): string {
    switch (type) {
      case 'new_order':
        return 'high';
      case 'pending_order':
        return 'urgent';
      case 'store_response':
        return 'medium';
      case 'system':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * تحميل الإشعارات من قاعدة البيانات الموحدة
   */
  async loadFromDatabase() {
    try {
      const { data, error } = await supabase
        .from('notifications') // استخدام الجدول الموحد
        .select('*')
        .eq('recipient_type', 'admin') // فلترة إشعارات الإدارة فقط
        .eq('recipient_id', this.ADMIN_ID)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.warn('⚠️ Could not load notifications from unified database:', error.message);
        return;
      }

      if (data && data.length > 0) {
        // تحويل البيانات إلى تنسيق AdminNotification
        const dbNotifications: AdminNotification[] = data.map(item => ({
          id: item.id,
          title: item.title,
          message: item.message,
          type: item.type as AdminNotification['type'],
          orderId: item.order_id || undefined,
          customerName: undefined, // لا يوجد في الجدول الموحد
          orderCode: undefined, // لا يوجد في الجدول الموحد
          url: item.url || undefined,
          timestamp: item.created_at,
          isRead: item.read
        }));

        // دمج مع الإشعارات المحلية (إزالة المكررات)
        const localIds = new Set(this.notifications.map(n => n.id));
        const newNotifications = dbNotifications.filter(n => !localIds.has(n.id));

        this.notifications = [...this.notifications, ...newNotifications]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 100);

        this.saveNotifications();
        console.log(`📥 Loaded ${newNotifications.length} notifications from unified database`);
      }
    } catch (error) {
      console.warn('⚠️ Exception loading notifications from unified database:', error);
    }
  }

  /**
   * تحديث حالة الق��اءة في قاعدة البيانات الموحدة
   */
  private async updateReadStatusInDatabase(notificationId: string, isRead: boolean) {
    try {
      const { error } = await supabase
        .from('notifications') // استخدام الجدول الموحد
        .update({ read: isRead })
        .eq('id', notificationId)
        .eq('recipient_type', 'admin')
        .eq('recipient_id', this.ADMIN_ID);

      if (error) {
        console.warn('⚠️ Could not update read status in unified database:', error.message);
      } else {
        console.log('✅ Read status updated in unified database:', notificationId);
      }
    } catch (error) {
      console.warn('⚠️ Exception updating read status in unified database:', error);
    }
  }

  /**
   * إضافة إشعار تجريبي
   */
  addTestNotification() {
    this.addNotification({
      title: '🧪 إشعار تجريبي',
      message: 'هذا إشعار تجريبي للتأكد من عمل النظام الموحد - تم حفظه في جدول notifications',
      type: 'system',
      url: '/admin-aa-smn-justme9003'
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
      notificationsCount: this.notifications.length,
      unreadCount: this.getUnreadCount(),
      tableName: 'notifications', // الآن يستخدم الجدول الموحد
      adminId: this.ADMIN_ID
    };
  }
}

// إنشاء instance واحد للخدمة
export const adminNotificationService = new AdminNotificationService();

export default adminNotificationService;
