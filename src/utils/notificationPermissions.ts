/**
 * Notification Permissions Utility
 * Handles requesting, checking, and managing notification permissions
 */

export interface NotificationPermissionStatus {
  supported: boolean;
  permission: NotificationPermission;
  serviceWorkerRegistered: boolean;
  canRequest: boolean;
}

export class NotificationPermissionManager {
  private static instance: NotificationPermissionManager;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private permissionListeners: Array<(status: NotificationPermissionStatus) => void> = [];

  static getInstance(): NotificationPermissionManager {
    if (!NotificationPermissionManager.instance) {
      NotificationPermissionManager.instance = new NotificationPermissionManager();
    }
    return NotificationPermissionManager.instance;
  }

  /**
   * فحص الحالة الحالية للإشعارات
   */
  getStatus(): NotificationPermissionStatus {
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    const permission = supported ? Notification.permission : 'denied';
    const canRequest = supported && permission === 'default';

    return {
      supported,
      permission,
      serviceWorkerRegistered: !!this.serviceWorkerRegistration,
      canRequest
    };
  }

  /**
   * تسجيل Service Worker
   */
  async registerServiceWorker(): Promise<boolean> {
    try {
      if (!('serviceWorker' in navigator)) {
        console.warn('⚠️ Service Worker not supported');
        return false;
      }

      console.log('🔧 Registering Service Worker...');

      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });

      this.serviceWorkerRegistration = registration;

      console.log('✅ Service Worker registered successfully');

      // الاستماع لرسائل Service Worker
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));

      // تحديث المستمعين
      this.notifyListeners();

      return true;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      return false;
    }
  }

  /**
   * طلب صلاحية الإشعارات
   */
  async requestPermission(): Promise<NotificationPermission> {
    try {
      if (!('Notification' in window)) {
        console.warn('⚠️ Notifications not supported');
        return 'denied';
      }

      if (Notification.permission === 'granted') {
        console.log('✅ Notification permission already granted');
        return 'granted';
      }

      if (Notification.permission === 'denied') {
        console.warn('⚠️ Notification permission previously denied');
        return 'denied';
      }

      console.log('🔔 Requesting notification permission...');

      const permission = await Notification.requestPermission();

      console.log('📋 Permission result:', permission);

      // تحديث المستمعين
      this.notifyListeners();

      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        
        // إرسال إشعار تجريبي للتأكيد
        this.sendTestNotification();
      } else {
        console.warn('⚠️ Notification permission not granted:', permission);
      }

      return permission;
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      return 'denied';
    }
  }

  /**
   * إعداد كامل للإشعارات (Service Worker + Permission)
   */
  async initialize(): Promise<NotificationPermissionStatus> {
    console.log('🚀 Initializing notification system...');

    // 1. تسجيل Service Worker
    const swRegistered = await this.registerServiceWorker();
    
    if (!swRegistered) {
      console.error('❌ Failed to register Service Worker');
      return this.getStatus();
    }

    // 2. فحص الصلاحية الحالية
    const status = this.getStatus();
    
    if (status.permission === 'default') {
      console.log('🔔 Notification permission not set, will request when needed');
    } else if (status.permission === 'granted') {
      console.log('✅ Notification permission already granted');
    } else {
      console.warn('⚠️ Notification permission denied');
    }

    return status;
  }

  /**
   * طلب الإعداد الكامل مع واجهة مستخدم
   */
  async requestFullSetup(): Promise<boolean> {
    try {
      // 1. تسجيل Service Worker
      const swRegistered = await this.registerServiceWorker();
      if (!swRegistered) {
        throw new Error('فشل في تسجيل Service Worker');
      }

      // 2. طلب صلاحية الإشعارات
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        throw new Error('لم يتم منح صلاحية الإشعارات');
      }

      console.log('🎉 Notification system fully set up!');
      return true;
    } catch (error) {
      console.error('❌ Failed to set up notifications:', error);
      return false;
    }
  }

  /**
   * إرسال إشعار تجريبي
   */
  async sendTestNotification(): Promise<boolean> {
    try {
      if (!this.serviceWorkerRegistration) {
        console.warn('⚠️ No Service Worker registration available');
        return false;
      }

      if (Notification.permission !== 'granted') {
        console.warn('⚠️ Notification permission not granted');
        return false;
      }

      // إرسال رسالة للـ Service Worker
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'TEST_NOTIFICATION'
        });
        console.log('✅ Test notification sent via Service Worker');
        return true;
      } else {
        // بديل مباشر
        new Notification('إشعار تجريبي', {
          body: 'تم إعداد النظام بنجاح! ستصلك الإشعارات الآن',
          icon: '/icons/icon-192x192.svg',
          tag: 'test-setup'
        });
        console.log('✅ Test notification sent directly');
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to send test notification:', error);
      return false;
    }
  }

  /**
   * الاستماع لتغييرات حالة الإشعارات
   */
  addStatusListener(callback: (status: NotificationPermissionStatus) => void): () => void {
    this.permissionListeners.push(callback);
    
    // إرسال الحالة الحالية فوراً
    callback(this.getStatus());
    
    // إرجاع دالة إلغاء الاشتراك
    return () => {
      const index = this.permissionListeners.indexOf(callback);
      if (index > -1) {
        this.permissionListeners.splice(index, 1);
      }
    };
  }

  /**
   * معالجة رسائل Service Worker
   */
  private handleServiceWorkerMessage(event: MessageEvent): void {
    console.log('💬 Message from Service Worker:', event.data);

    if (event.data?.type === 'PERMISSION_REQUIRED') {
      console.log('🔔 Service Worker requesting notification permission');
      
      // يمكن عرض واجهة مستخدم هنا لطلب الصلاحية
      this.showPermissionPrompt(event.data.message);
    }
  }

  /**
   * عرض طلب صلاحية للمستخدم
   */
  private showPermissionPrompt(message: string): void {
    // يمكن تخصيص هذه الدالة لعرض واجهة مستخدم مناسبة
    console.log('🔔 Permission prompt:', message);
    
    // مثال بسيط
    if (confirm(`${message}\n\nهل تريد تفعيل الإشعارات الآن؟`)) {
      this.requestPermission();
    }
  }

  /**
   * إشعار المستمعين بتغييرات الحالة
   */
  private notifyListeners(): void {
    const status = this.getStatus();
    this.permissionListeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('❌ Error in permission listener:', error);
      }
    });
  }

  /**
   * إزالة الإعداد (للتطوير والاختبار)
   */
  async reset(): Promise<void> {
    try {
      if (this.serviceWorkerRegistration) {
        await this.serviceWorkerRegistration.unregister();
        this.serviceWorkerRegistration = null;
      }

      console.log('🧹 Notification system reset');
      this.notifyListeners();
    } catch (error) {
      console.error('❌ Error resetting notification system:', error);
    }
  }

  /**
   * فحص ما إذا كان المتصفح يدعم الإشعارات
   */
  static isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * الحصول على معلومات مفصلة عن حالة النظام
   */
  getDetailedStatus(): {
    browserSupport: boolean;
    notificationAPI: boolean;
    serviceWorkerAPI: boolean;
    currentPermission: NotificationPermission;
    serviceWorkerState: string | null;
    serviceWorkerScope: string | null;
  } {
    const registration = this.serviceWorkerRegistration;
    
    return {
      browserSupport: NotificationPermissionManager.isSupported(),
      notificationAPI: 'Notification' in window,
      serviceWorkerAPI: 'serviceWorker' in navigator,
      currentPermission: 'Notification' in window ? Notification.permission : 'denied',
      serviceWorkerState: registration?.active?.state || null,
      serviceWorkerScope: registration?.scope || null
    };
  }
}

// إنشاء instance مشترك
export const notificationManager = NotificationPermissionManager.getInstance();

// دوال مساعدة سريعة
export const requestNotificationPermission = () => notificationManager.requestPermission();
export const initializeNotifications = () => notificationManager.initialize();
export const isNotificationSupported = () => NotificationPermissionManager.isSupported();
export const getNotificationStatus = () => notificationManager.getStatus();

export default notificationManager;
