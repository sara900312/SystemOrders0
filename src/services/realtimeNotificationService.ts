import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  type: string;
  order_id?: string;
  recipient_id: string;
  recipient_type: string;
  url?: string;
  created_at: string;
}

class RealtimeNotificationService {
  private channel: RealtimeChannel | null = null;
  private isConnected = false;
  private subscribers: Array<(notification: NotificationPayload) => void> = [];

  /**
   * تهيئة اتصال Realtime مع جدول notifications
   */
  async initialize(userId?: string): Promise<void> {
    try {
      console.log('🔧 Initializing Realtime notification service...');

      // التحقق من حالة المصادقة أولاً
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.warn('⚠️ Session error, but continuing with Realtime setup:', sessionError);
      }

      if (!session) {
        console.warn('⚠️ No active session found, Realtime may not work properly');
        // يمكن المتابعة للاستخدام العام أو إنشاء session مؤقت
      } else {
        console.log('✅ Active session found for Realtime connection');
      }

      // إنشاء قناة للإشعارات بمعرف فريد
      const channelName = `notifications_${userId || 'anonymous'}_${Date.now()}`;
      this.channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications'
            // إزالة filter هنا لأن التصفية تتم في العميل
          },
          (payload) => {
            console.log('📩 New notification received via Realtime:', payload.new);
            const notification = payload.new as NotificationPayload;

            // تصفية الإشعارات بن��ءً على المستخدم الحالي
            if (userId && notification.recipient_id === userId) {
              this.handleRealtimeNotification(notification);
            } else if (!userId) {
              // إذا لم يتم تحديد userId، قبول جميع الإشعارات
              this.handleRealtimeNotification(notification);
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Realtime subscription status:', status);

          if (status === 'SUBSCRIBED') {
            this.isConnected = true;
            console.log('✅ Successfully subscribed to notifications channel');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Realtime channel error - this may be due to authentication or network issues');
            this.isConnected = false;
            // محاولة إعادة الاتصال بعد تأخير
            setTimeout(() => this.reconnect(), 5000);
          } else if (status === 'TIMED_OUT') {
            console.warn('⏰ Realtime connection timed out - retrying...');
            this.isConnected = false;
            // محاولة إعادة الاتصال بعد تأخير
            setTimeout(() => this.reconnect(), 3000);
          }
        });

    } catch (error) {
      console.error('❌ Failed to initialize Realtime notifications:', {
        error: error,
        formattedError: JSON.stringify(error, null, 2),
        operation: 'initializeRealtimeNotifications',
        userId,
        stack: error?.stack
      });
    }
  }

  /**
   * معالجة الإشعارات الواردة من Realtime
   */
  private handleRealtimeNotification(notification: NotificationPayload): void {
    console.log('🔔 Processing Realtime notification:', notification);

    // إرسال الإشعار إلى Service Worker
    this.sendToServiceWorker(notification);

    // إشعار المشتركين المحليين
    this.notifySubscribers(notification);
  }

  /**
   * إرسال الإشعار إلى Service Worker
   */
  private sendToServiceWorker(notification: NotificationPayload): void {
    if (navigator.serviceWorker.controller) {
      console.log('📤 Sending notification to Service Worker:', notification);
      
      navigator.serviceWorker.controller.postMessage({
        type: 'NEW_NOTIFICATION',
        payload: notification
      });
    } else {
      console.warn('⚠️ No Service Worker controller available');
      
      // كبديل، عرض إشعار محلي باستخدام Notification API مباشرة
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icons/icon-192x192.svg',
          tag: notification.order_id ? `order-${notification.order_id}` : notification.id
        });
      }
    }
  }

  /**
   * إشعار ��لمشتركين المحليين (للتحديثات في UI)
   */
  private notifySubscribers(notification: NotificationPayload): void {
    this.subscribers.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('❌ Error in notification subscriber:', {
          error: error,
          formattedError: JSON.stringify(error, null, 2),
          operation: 'notificationSubscriberCallback',
          notification,
          stack: error?.stack
        });
      }
    });
  }

  /**
   * الاشتراك في الإشعارات للتحديثات المحلية
   */
  subscribe(callback: (notification: NotificationPayload) => void): () => void {
    this.subscribers.push(callback);
    
    // إرجاع دالة إلغاء الاشتراك
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * إرسال إشعار جديد باستخدام Edge Function
   */
  async sendNotification(notificationData: {
    title: string;
    message: string;
    type: string;
    recipient_id: string;
    recipient_type: string;
    order_id?: string;
    url?: string;
  }): Promise<boolean> {
    try {
      console.log('📤 Sending notification via Edge Function:', notificationData);

      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: notificationData
      });

      if (error) {
        console.error('❌ Error sending notification:', {
          error: error,
          formattedError: JSON.stringify(error, null, 2),
          operation: 'sendNotificationViaEdgeFunction',
          notificationData,
          stack: error?.stack
        });
        return false;
      }

      console.log('✅ Notification sent successfully:', data);
      return true;
    } catch (error) {
      console.error('❌ Exception sending notification:', {
        error: error,
        formattedError: JSON.stringify(error, null, 2),
        operation: 'sendNotification',
        notificationData,
        stack: error?.stack
      });
      return false;
    }
  }

  /**
   * إرسال إشعار اختبار
   */
  async sendTestNotification(userId: string): Promise<boolean> {
    return this.sendNotification({
      title: 'إشعار تجريبي 🧪',
      message: `إشعار تجريبي من Realtime - ${new Date().toLocaleTimeString('ar')}`,
      type: 'test',
      recipient_id: userId,
      recipient_type: 'admin',
      url: '/realtime-test'
    });
  }

  /**
   * إرسال إشعار طلب جديد
   */
  async sendOrderNotification(orderData: {
    order_id: string;
    order_code: string;
    customer_name: string;
    store_id: string;
    total_amount: number;
  }): Promise<boolean> {
    return this.sendNotification({
      title: '🛍️ طلب جديد',
      message: `طلب جديد من ${orderData.customer_name} - الكود: ${orderData.order_code} - المبلغ: ${orderData.total_amount} ريال`,
      type: 'order_received',
      recipient_id: orderData.store_id,
      recipient_type: 'store',
      order_id: orderData.order_id,
      url: `/orders/${orderData.order_id}`
    });
  }

  /**
   * إرسال إشعار تحديث حالة الطلب
   */
  async sendOrderStatusNotification(orderData: {
    order_id: string;
    order_code: string;
    status: string;
    customer_id: string;
  }): Promise<boolean> {
    return this.sendNotification({
      title: '📋 تحديث حالة الطلب',
      message: `تم تحديث حالة الطلب ${orderData.order_code} إلى: ${orderData.status}`,
      type: 'order_status',
      recipient_id: orderData.customer_id,
      recipient_type: 'customer',
      order_id: orderData.order_id,
      url: `/orders/${orderData.order_id}`
    });
  }

  /**
   * التحقق من حالة الاتصال
   */
  isConnectionActive(): boolean {
    return this.isConnected;
  }

  /**
   * إعادة الاتصال
   */
  async reconnect(userId?: string): Promise<void> {
    console.log('🔄 Reconnecting to Realtime...');

    if (this.channel) {
      supabase.removeChannel(this.channel);
    }

    this.isConnected = false;

    // تأخير قصير قبل إعادة الاتصال
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.initialize(userId);
  }

  /**
   * قطع الاتصال وتنظيف الموارد
   */
  disconnect(): void {
    console.log('🔌 Disconnecting from Realtime notifications...');
    
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    
    this.isConnected = false;
    this.subscribers = [];
  }

  /**
   * الحصول على معلومات الحالة للتشخيص
   */
  getStatus(): {
    isConnected: boolean;
    subscribersCount: number;
    channelState: string | null;
    sessionStatus: string;
  } {
    return {
      isConnected: this.isConnected,
      subscribersCount: this.subscribers.length,
      channelState: this.channel?.state || null,
      sessionStatus: 'unknown' // سيتم تحديثه في initialize
    };
  }

  /**
   * فحص إمكانية الوصول لجدول notifications
   */
  async testDatabaseAccess(): Promise<boolean> {
    try {
      console.log('🔍 Testing database access for notifications table...');

      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .limit(1);

      if (error) {
        console.error('❌ Database access test failed:', error);
        return false;
      }

      console.log('✅ Database access test successful');
      return true;
    } catch (error) {
      console.error('❌ Database access test exception:', error);
      return false;
    }
  }

  /**
   * إنشاء جلسة مؤقتة للوصول المحدود إذا لم تكن هناك مصادقة
   */
  async ensureSession(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.warn('⚠️ Session check error:', error);
      }

      if (!session) {
        console.log('🔑 No session found, attempting to create anonymous session...');

        // يمكن إضافة منطق لإنشاء session مؤقت هنا إذا كان ذلك مطلوباً
        // أو استخدام service role key للوصول المحدود
        return false;
      }

      console.log('✅ Valid session exists');
      return true;
    } catch (error) {
      console.error('❌ Session check failed:', error);
      return false;
    }
  }
}

// إنشاء instance واحد للاستخدام العام
export const realtimeNotificationService = new RealtimeNotificationService();

// تصدير النوع للاستخدام في مكونات أخرى
export type { NotificationPayload };
