// Enhanced Service Worker Notification Service
// خدمة الإشعارات المحسنة مع دعم الأزرار

export class ServiceWorkerNotifications {
  private static instance: ServiceWorkerNotifications;
  private isRegistered = false;
  private registration: ServiceWorkerRegistration | null = null;

  private constructor() {}

  public static getInstance(): ServiceWorkerNotifications {
    if (!ServiceWorkerNotifications.instance) {
      ServiceWorkerNotifications.instance = new ServiceWorkerNotifications();
    }
    return ServiceWorkerNotifications.instance;
  }

  // تسجيل Service Worker
  async registerServiceWorker(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers not supported');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered:', this.registration);
      this.isRegistered = true;

      // الانتظار حتى يصبح Service Worker جاهزاً
      await navigator.serviceWorker.ready;

      // الاستماع لرسائل من Service Worker
      this.setupMessageListener();

      return true;
    } catch (error) {
      console.error('SW registration failed:', error);
      return false;
    }
  }

  // إعداد مستمع الرسائل من Service Worker
  private setupMessageListener(): void {
    if (!navigator.serviceWorker) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      const { action, order_id, type, clickAction } = event.data;

      switch (action) {
        case 'accept-order':
          this.handleOrderAcceptance(order_id, type);
          break;
        case 'reject-order':
          this.handleOrderRejection(order_id, type);
          break;
        case 'navigate':
          this.handleNavigation(event.data.url);
          break;
        default:
          console.log('Unknown action from Service Worker:', action);
      }
    });
  }

  // معالجة قبول الطلب
  private handleOrderAcceptance(orderId: string, type: string): void {
    console.log(`Order ${orderId} accepted via notification`);
    
    // يمكن إضافة منطق إضافي هنا مثل:
    // - تحديث حالة الطلب في قاعدة البيانات
    // - إرسال إشعار للعميل
    // - تحديث واجهة المستخدم
    
    // إرسال event مخصص للمكونات الأخرى
    window.dispatchEvent(new CustomEvent('orderAccepted', { 
      detail: { orderId, type, source: 'notification' }
    }));
  }

  // معالجة رفض الطلب
  private handleOrderRejection(orderId: string, type: string): void {
    console.log(`Order ${orderId} rejected via notification`);
    
    // يمكن إضافة منطق إضافي هنا مثل:
    // - تحديث حالة الطلب في قاعدة البيانات
    // - إرسال إشعار للعميل
    // - إظهار نموذج سبب الرفض
    
    // إرسال event مخصص للمكونات الأخرى
    window.dispatchEvent(new CustomEvent('orderRejected', { 
      detail: { orderId, type, source: 'notification' }
    }));
  }

  // معالجة التنقل
  private handleNavigation(url: string): void {
    if (url && typeof window !== 'undefined') {
      window.location.href = url;
    }
  }

  // طلب صلاحية الإشعارات
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return 'denied';
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  // إظهار إشعار طلب مع أزرار الإجراءات - MAIN FUNCTION
  async showOrderNotification(title: string, options: {
    body: string;
    icon?: string;
    actions?: Array<{ action: string; title: string; icon?: string }>;
    tag?: string;
    renotify?: boolean;
    order_id?: string;
    type?: string;
    requireInteraction?: boolean;
  }): Promise<boolean> {
    // التحقق من الصلاحيات
    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    // التأكد من تسجيل Service Worker
    if (!this.isRegistered) {
      const registered = await this.registerServiceWorker();
      if (!registered) {
        console.warn('No active Service Worker to show notification');
        return false;
      }
    }

    // التحقق من وجود Service Worker نشط
    if (!navigator.serviceWorker.controller) {
      console.warn('No active Service Worker controller');
      return false;
    }

    try {
      // إرسال رسالة لـ Service Worker لإظهار الإشعار
      navigator.serviceWorker.controller.postMessage({
        action: 'show-notification',
        title,
        options: {
          body: options.body,
          icon: options.icon || '/icons/icon-192x192.svg',
          badge: '/icons/badge-72x72.svg',
          actions: options.actions || [],
          tag: options.tag || (options.order_id ? `order-${options.order_id}` : 'general'),
          renotify: options.renotify !== false,
          requireInteraction: options.requireInteraction !== false,
          data: {
            order_id: options.order_id,
            type: options.type || 'general'
          }
        }
      });

      console.log('Notification request sent to Service Worker:', title);
      return true;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return false;
    }
  }

  // اختبار الإشعارات
  async testNotification(): Promise<boolean> {
    return this.showOrderNotification('طلب جديد تجريبي', {
      body: 'تم استلام طلب جديد #TEST-1234',
      actions: [
        { action: 'accept', title: 'قبول' },
        { action: 'reject', title: 'رفض' }
      ],
      tag: 'test-order',
      order_id: 'TEST-1234',
      type: 'order'
    });
  }

  // إظهار إشعار ترحيب
  async showWelcomeNotification(): Promise<boolean> {
    return this.showOrderNotification('مرحباً بك!', {
      body: 'نظام الإشعارات مع الأزرار جاهز للعمل',
      actions: [
        { action: 'explore', title: 'استكشاف' },
        { action: 'dismiss', title: 'إغلاق' }
      ],
      tag: 'welcome',
      type: 'welcome'
    });
  }

  // التحقق من حالة الصلاحيات
  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
  }

  // التحقق من دعم Service Worker
  isServiceWorkerSupported(): boolean {
    return 'serviceWorker' in navigator;
  }

  // التحقق من دعم الإشعارات
  isNotificationSupported(): boolean {
    return 'Notification' in window;
  }

  // الحصول على معلومات النظام
  getSystemInfo() {
    return {
      serviceWorkerSupported: this.isServiceWorkerSupported(),
      notificationSupported: this.isNotificationSupported(),
      permission: this.getPermissionStatus(),
      registered: this.isRegistered,
      hasController: !!navigator.serviceWorker?.controller
    };
  }
}

// دوال مساعدة للاستخدام المباشر (كما طلب المستخدم)

// الدالة الرئيسية لإظهار إشعار الطلب
export async function showOrderNotification(
  title: string, 
  options: {
    body: string;
    icon?: string;
    actions?: Array<{ action: string; title: string; icon?: string }>;
    tag?: string;
    renotify?: boolean;
    order_id?: string;
    type?: string;
  }
): Promise<boolean> {
  const service = ServiceWorkerNotifications.getInstance();
  return service.showOrderNotification(title, options);
}

// تسجيل Service Worker
export async function registerServiceWorker(): Promise<boolean> {
  const service = ServiceWorkerNotifications.getInstance();
  return service.registerServiceWorker();
}

// طلب صلاحية الإشعارات
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  const service = ServiceWorkerNotifications.getInstance();
  return service.requestPermission();
}

// اختبار النظام
export async function testNotificationSystem(): Promise<boolean> {
  const service = ServiceWorkerNotifications.getInstance();
  return service.testNotification();
}

// مثال للاستخدام (كما في الكود المطلوب)
export async function exampleUsage(): Promise<void> {
  // مثال الاستخدام المطلوب
  const success = await showOrderNotification('طلب جديد', {
    body: 'تم استلام طلب جديد #1234',
    icon: '/icons/order.png',
    actions: [
      { action: 'accept', title: 'قبول' },
      { action: 'reject', title: 'رفض' }
    ],
    tag: 'order-1234',
    renotify: true,
    order_id: '1234',
    type: 'order'
  });

  console.log('Notification shown:', success);
}

// تصدير الخدمة الرئيسية
export default ServiceWorkerNotifications;
