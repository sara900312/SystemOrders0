# نظام الإشعارات للمتاجر - Store Notification System

## نظرة عامة

تم إنشاء نظام شامل للإشعارات الفورية للمتاجر يتضمن:

1. **مركز الإشعارات الدائم** - قائمة تعرض جميع الإشعارات
2. **التنبيهات المنبثقة** - إشعارات فورية للحالات العاجلة
3. **الإشعارات الفورية** - تحديثات مباشرة عبر Supabase Realtime
4. **إدارة حالة القراءة** - تتبع الإشعارات المقروءة وغير المقروءة

## الملفات المُنشأة

### المكونات الأساسية
- `src/components/stores/StoreNotificationCenter.tsx` - مركز الإشعارات الرئيسي
- `src/components/stores/StoreNotificationToast.tsx` - التنبيهات المنبثقة
- `src/components/stores/StoreNotificationSystem.tsx` - النظام المتكامل

### الأدوات والخدمات
- `src/utils/setupNotificationsTable.ts` - إعداد جدول قاعدة البيانات
- `src/services/storeNotificationService.ts` - خدمة الإشعارات (موجودة مسبقاً)

### الأنواع والواجهات
- `src/types/notifications.ts` - تعريفات الأنواع

### العروض التجريبية والأمثلة
- `src/pages/StoreNotificationSystemDemo.tsx` - صفحة عرض تجريبي
- `src/examples/StoreNotificationIntegration.example.tsx` - أمثلة التكامل

## البنية التقنية

### قاعدة البيانات
```sql
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('admin', 'store', 'customer')),
  recipient_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  order_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read BOOLEAN DEFAULT false,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  url TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  type TEXT DEFAULT 'general'
);
```

### Supabase Realtime
- **Channel**: `store-notifications-{storeId}`
- **Event**: `new_notification`
- **Filter**: `recipient_id=eq.{storeId} AND recipient_type=eq.store`

## الاستخدام

### التكامل الأساسي

```tsx
import StoreNotificationSystem from '@/components/stores/StoreNotificationSystem';

const YourStoreDashboard = () => {
  const storeId = "your-store-id"; // من السياق أو المصادقة

  return (
    <div>
      {/* محتوى لوحة التحكم */}
      
      {/* إضافة نظام الإشعارات */}
      <StoreNotificationSystem 
        storeId={storeId}
        notificationCenterProps={{
          maxHeight: "400px",
          showHeader: true
        }}
        toastProps={{
          autoHideDuration: 10000,
          showOnlyUrgent: true
        }}
      />
    </div>
  );
};
```

### الاستخدام المنفصل

```tsx
// مركز الإشعارات فقط
<StoreNotificationCenter 
  storeId={storeId}
  maxHeight="300px"
  showHeader={false}
/>

// التنبيهات المنبثقة فقط
<StoreNotificationToast 
  storeId={storeId}
  autoHideDuration={8000}
  showOnlyUrgent={true}
/>
```

## المميزات

### 1. مركز الإشعارات (StoreNotificationCenter)
- ✅ عرض قائمة الإشعارات مرتبة حسب التاريخ
- ✅ تمييز الإشعارات غير المقروءة
- ✅ تحديد الإشعارات كمقروءة عند النقر
- ✅ الانتقال للروابط المرفقة
- ✅ عداد الإشعارات غير المقروءة
- ✅ تحديد جميع الإشعارات كمقروءة
- ✅ أولويات متعددة (منخفض، متوسط، مرتفع، عاجل)
- ✅ أوقات نسبية بالعربية
- ✅ تحديثات فورية عبر Realtime

### 2. التنبيهات المنبثقة (StoreNotificationToast)
- ✅ ظهور فوري للإشعارات الجديدة
- ✅ فلترة حسب الأولوية
- ✅ إخفاء تلقائي بعد وقت محدد
- ✅ النقر للانتقال للرابط
- ✅ زر إغلاق يدوي
- ✅ تصميم متجاوب

### 3. النظام المتكامل (StoreNotificationSystem)
- ✅ إعداد تلقائي لجدول قاعدة البيانات
- ✅ إضافة إشعارات تجريبية
- ✅ لوحة اختبار للمطورين
- ✅ مراقبة حالة النظام
- ✅ إعادة المحاولة في حالة الخطأ

## أنواع الإشعارات

### حسب النوع
- `order_assigned` - طلب جديد مُعيّن للمتجر
- `order_reminder` - تذكير بطلب في انتظار الرد
- `system` - إشعارات النظام
- `general` - إشعارات عامة

### حسب الأولوية
- `urgent` 🚨 - عاجل (أحمر)
- `high` ⚠️ - مرتفع (برتقالي)
- `medium` 📢 - متوسط (أزرق)
- `low` ℹ️ - منخفض (رمادي)

## خصائص متقدمة

### التخصيص
```tsx
<StoreNotificationSystem 
  storeId={storeId}
  showTestPanel={process.env.NODE_ENV === 'development'}
  notificationCenterProps={{
    maxHeight: "500px",
    showHeader: true,
    className: "custom-notifications"
  }}
  toastProps={{
    autoHideDuration: 15000,
    showOnlyUrgent: false
  }}
/>
```

### إرسال الإشعارات برمجياً
```tsx
import { storeNotificationService } from '@/services/storeNotificationService';

// إشعار طلب جديد
await storeNotificationService.notifyNewOrder(
  storeId, 
  orderCode, 
  customerName, 
  orderId
);

// إشعار عام
await storeNotificationService.sendGeneralNotification(
  storeId,
  'العنوان',
  'الرسالة'
);

// إشعار مخصص
await storeNotificationService.sendNotification({
  storeId,
  title: 'إشعار مخصص',
  message: 'رسالة مخصصة',
  type: 'system',
  priority: 'urgent',
  url: '/custom-page'
});
```

## الأمان والأداء

### التحكم بالوصول
- الإشعارات محدودة بـ `recipient_id` و `recipient_type`
- فلترة تلقائية للمتجر المحدد
- منع الوصول للإشعارات غير المصرح بها

### الأداء
- تحديد عدد الإشعارات المعروضة (افتراضي: 50)
- تنظيف تلقائي للإشعارات القديمة (أكثر من 30 يوم)
- فهرسة مُحسّنة لقاعدة البيانات
- إلغاء الاشتراك التلقائي عند إزالة المكون

## العرض التجريبي

لعرض النظام والتجريب:
1. انتقل إلى `/store-notification-demo`
2. اختر متجر من القائمة أو أدخل معرف مخصص
3. استخدم أدوات الاختبار لإرسال إشعارات تجريبية
4. راقب النظام في العمل

## المت��لبات

- React 18+
- Supabase client
- TailwindCSS
- Radix UI components
- date-fns للتواريخ
- lucide-react للأيقونات

## التثبيت والإعداد

1. **إعداد قاعدة البيانات**: النظام ينشئ الجدول تلقائياً عند أول استخدام
2. **تضمين المكونات**: استورد المكونات في صفحات المتاجر
3. **تكوين Realtime**: تأكد من تفعيل Realtime في Supabase
4. **اختبار النظام**: استخدم صفحة العرض التجريبي للتأكد من العمل

## الدعم والتطوير

- الكود موثق بالكامل
- أمثلة شاملة للتكامل
- لوحة اختبار للمطورين
- رسائل خطأ واضحة
- تسجيل مفصل في console

---

هذا النظام جاهز للاستخدام الفوري في لوحات تحكم المتاجر ويوفر تجربة مستخدم ممتازة للإشعارات الفورية.
