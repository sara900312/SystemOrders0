import { supabase } from '@/integrations/supabase/client';

interface NotificationEntry {
  id: string;
  recipient_id: string;
  recipient_type: 'store' | 'admin' | 'customer';
  title: string;
  message: string;
  order_id?: string;
  type: string;
  created_at: string;
}

interface PendingNotification {
  recipient_id: string;
  recipient_type: 'store' | 'admin' | 'customer';
  title: string;
  message: string;
  order_id?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export class CentralNotificationManager {
  private static instance: CentralNotificationManager;
  private recentNotifications: Set<string> = new Set();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق
  private readonly ORDER_ASSIGNED_CACHE_DURATION = 2 * 60 * 1000; // 2 دقيقة للطلبات المخصصة

  /**
   * تنسيق ر��ائل الأخطاء بشكل واضح
   */
  private formatError(error: any, context: string = ''): string {
    if (!error) return 'Unknown error';

    const errorParts = [];

    if (error.message) errorParts.push(`Message: ${error.message}`);
    if (error.code) errorParts.push(`Code: ${error.code}`);
    if (error.details) errorParts.push(`Details: ${error.details}`);
    if (error.hint) errorParts.push(`Hint: ${error.hint}`);

    if (errorParts.length === 0) {
      // إذا لم نجد خصائص معروفة، نحاول تحويل الكائن إلى JSON
      try {
        return JSON.stringify(error, null, 2);
      } catch {
        return String(error);
      }
    }

    const formatted = errorParts.join(' | ');
    return context ? `${context}: ${formatted}` : formatted;
  }

  static getInstance(): CentralNotificationManager {
    if (!CentralNotificationManager.instance) {
      CentralNotificationManager.instance = new CentralNotificationManager();
    }
    return CentralNotificationManager.instance;
  }

  /**
   * إنشاء إشعار مع فحص التكرار
   */
  async createNotification(notification: PendingNotification): Promise<boolean> {
    // إنشاء مفتاح فريد للإشعار
    const notificationKey = this.generateNotificationKey(notification);
    
    // فحص التكرار في الذاكرة المؤقتة
    if (this.recentNotifications.has(notificationKey)) {
      console.log('🚫 Duplicate notification prevented:', notificationKey);
      return false;
    }

    try {
      // فحص التكرار في قاعدة البيانات (آخر 2 دقيقة للطلبات المخصصة)
      const checkDuration = notification.order_id ? 2 * 60 * 1000 : 10 * 60 * 1000;
      const checkTimeAgo = new Date(Date.now() - checkDuration).toISOString();

      let query = supabase
        .from('notifications')
        .select('id')
        .eq('recipient_id', notification.recipient_id)
        .eq('recipient_type', notification.recipient_type)
        .gte('created_at', checkTimeAgo)
        .limit(1);

      // للطلبات، فحص order_id أيضاً لمنع التكرار بشكل أكثر دقة
      if (notification.order_id) {
        query = query.eq('order_id', notification.order_id);
      }

      const { data: existingNotifications, error: checkError } = await query;

      if (checkError) {
        console.error('❌ Error checking for duplicate notifications:', this.formatError(checkError));
        // المتابعة رغم الخطأ لضمان عدم فقدان الإشعارات المهمة
      }

      if (existingNotifications && existingNotifications.length > 0) {
        console.log('🚫 Duplicate notification found in database, skipping');
        this.addToCache(notificationKey, !!notification.order_id);
        return false;
      }

      // إدراج الإشعار الجديد
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          recipient_id: notification.recipient_id,
          recipient_type: notification.recipient_type,
          title: notification.title,
          message: notification.message,
          order_id: notification.order_id,
          priority: notification.priority,
          read: false,
          sent: false
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating notification:', this.formatError(error, 'Database Insert'));
        return false;
      }

      if (data) {
        console.log('✅ Notification created successfully:', data.id);
        this.addToCache(notificationKey, !!notification.order_id);
        return true;
      }

      return false;

    } catch (error) {
      console.error('❌ Exception in createNotification:', this.formatError(error, 'Unexpected Error'));
      return false;
    }
  }

  /**
   * إنشاء مفتاح فريد للإشعار
   */
  private generateNotificationKey(notification: PendingNotification): string {
    const keyParts = [
      notification.recipient_type,
      notification.recipient_id,
      notification.title.substring(0, 20), // أول 20 حرف من العنوان
      notification.order_id || 'no-order'
    ];

    return keyParts.join('|');
  }

  /**
   * إضافة المفتاح للذاكرة المؤقتة
   */
  private addToCache(key: string, hasOrderId?: boolean): void {
    this.recentNotifications.add(key);

    // تحديد المدة حسب وجود order_id (الطلبات لها مدة أقصر)
    const cacheDuration = hasOrderId
      ? this.ORDER_ASSIGNED_CACHE_DURATION
      : this.CACHE_DURATION;

    // إزالة المفتاح بعد المدة المحددة
    setTimeout(() => {
      this.recentNotifications.delete(key);
    }, cacheDuration);
  }

  /**
   * تنظيف الذاكرة المؤقتة
   */
  clearCache(): void {
    this.recentNotifications.clear();
    console.log('🧹 Notification cache cleared');
  }

  /**
   * الحصول على حالة الذاكرة المؤقتة
   */
  getCacheStatus(): { size: number; keys: string[] } {
    return {
      size: this.recentNotifications.size,
      keys: Array.from(this.recentNotifications)
    };
  }

  /**
   * إرسال إشعار للمتجر مع فحص التكرار
   */
  async notifyStore(
    storeId: string,
    title: string,
    message: string,
    orderId?: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'high'
  ): Promise<boolean> {
    return await this.createNotification({
      recipient_id: storeId,
      recipient_type: 'store',
      title,
      message,
      order_id: orderId,
      priority
    });
  }

  /**
   * إرسال إشعار للأدمن مع فحص التكرار
   */
  async notifyAdmin(
    title: string,
    message: string,
    orderId?: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ): Promise<boolean> {
    return await this.createNotification({
      recipient_id: 'admin',
      recipient_type: 'admin',
      title,
      message,
      order_id: orderId,
      priority
    });
  }

  /**
   * إرسال إشعار للعميل مع فحص التكرار
   */
  async notifyCustomer(
    customerId: string,
    title: string,
    message: string,
    orderId?: string
  ): Promise<boolean> {
    return await this.createNotification({
      recipient_id: customerId,
      recipient_type: 'customer',
      title,
      message,
      order_id: orderId
    });
  }
}

// إنشاء instance مشترك
export const centralNotificationManager = CentralNotificationManager.getInstance();

export default centralNotificationManager;
