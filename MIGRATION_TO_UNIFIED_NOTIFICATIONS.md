# الانتقال إلى نظام الإشعارات الموحد

## 🎯 الهدف

تم تحديث النظام لاستخدام جدول `notifications` الموحد فقط، وإزالة الاعتماد على جدول `admin_notifications` المنفصل. هذا يضمن:

- ✅ **جدول واحد موحد** لجميع أنواع الإشعارات
- ✅ **فلترة صحيحة** باستخدام `recipient_type` و `recipient_id`
- ✅ **نظام Real-time موحد** عبر `notifications_channel`
- ✅ **سهولة الصيانة** وتجنب تضارب البيانات

## 🗃️ هيكل الجدول الموحد

```sql
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('store', 'admin', 'customer')),
  recipient_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  order_id TEXT,
  read BOOLEAN DEFAULT false,
  sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  url TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  type TEXT
);
```

## 📋 الملفات المحدثة

### 1. الملفات الأساسية (High Priority)

#### `src/services/adminNotificationService.ts`
**التغييرات:**
- ✅ تغيير جميع استعلامات `.from('admin_notifications')` إلى `.from('notifications')`
- ✅ إضافة `recipient_type: 'admin'` و `recipient_id: 'admin'` في جميع العمليات
- ✅ تحديث عمليات التحميل والحفظ لتتوافق مع الجدول الموحد
- ✅ إضافة خاصية `tableName: 'notifications'` في `getStatus()`

**مثال:**
```typescript
// من
await supabase.from('admin_notifications').insert({...})

// إلى  
await supabase.from('notifications').insert({
  recipient_type: 'admin',
  recipient_id: this.ADMIN_ID,
  ...
})
```

#### `src/integrations/supabase/types.ts`
**التغييرات:**
- ❌ إزالة تعريف جدول `admin_notifications` بالكامل
- ✅ إضافة تعريف جدول `notifications` الموحد

#### `src/utils/realtimeChannelFix.ts`
**التغييرات:**
- ✅ تحديث دالة `createNotificationsChannel` لتستخدم جدول `notifications`
- ✅ إضافة معامل `recipientType` للفلترة الصحيحة
- ✅ استخدام فلترة مركبة: `recipient_type=eq.${recipientType}.and.recipient_id=eq.${recipientId}`

#### `src/services/realtimeService.ts`
**التغييرات:**
- ✅ تحديث `subscribeToAdminNotifications` لتستخدم جدول `notifications`
- ✅ إضافة دوال جديدة: `subscribeToStoreNotifications` و `subscribeToCustomerNotifications`
- ✅ فلترة صحيحة حسب `recipient_type` و `recipient_id`

#### `src/hooks/useRealtimeChannels.ts`
**التغييرات:**
- ✅ تحديث الاشتراك من `admin_notifications` إلى `notifications`
- ❌ إزالة الاشتراك في `store_notifications` (غير موجود)
- ✅ فلترة موحدة للإشعارات حسب `recipient_type`

### 2. واجهات المستخدم (UI Components)

#### `src/components/ui/admin-notification-bell.tsx`
**التغييرات:**
- ✅ عرض معلومات إضافية في إعدادات الجرس (اسم الجدول، معرف الإدارة)
- ✅ تحديث النصوص لتوضح استخدام النظام الموحد
- ✅ عرض "يستخدم جدول notifications" في الحالة الفارغة

#### `src/pages/AdminNotificationsTest.tsx`
**التغييرات:**
- ✅ تحديث جميع الاستعلامات لتستخدم جدول `notifications`
- ✅ إضافة فلترة `recipient_type='admin'` و `recipient_id='admin'`
- ✅ تحديث أسماء الحقول من `is_read` إلى `read`
- ✅ تحديث النصوص والأوصاف لتذكر الجدول الموحد
- ✅ عرض معلومات إضافية: أولوية، حالة الإرسال، نوع المستلم

### 3. صفحات جديدة

#### `src/pages/UnifiedNotificationStatus.tsx` (جديد)
صفحة شاملة لمراقبة حالة النظام الموحد:
- ✅ فحص وجود جدول `notifications`
- ✅ التأكد من عدم استخدام `admin_notifications`
- ✅ إحصائيات الإشعارات حسب النوع (admin/store/customer)
- ✅ اختبار إنشاء إشعارات تجريبية
- ✅ عرض تفاصيل التحديث والملفات المعدلة

## 📊 الفلترة الصحيحة

### للإدارة (Admin)
```sql
SELECT * FROM notifications 
WHERE recipient_type = 'admin' 
  AND recipient_id = 'admin'
```

### للمتاجر (Stores)  
```sql
SELECT * FROM notifications 
WHERE recipient_type = 'store' 
  AND recipient_id = 'store-123'
```

### للعملاء (Customers)
```sql  
SELECT * FROM notifications 
WHERE recipient_type = 'customer' 
  AND recipient_id = 'customer-456'
```

## 🔄 Real-time Subscriptions

### قبل التحديث
```typescript
// كانت منفصلة
supabase.channel('admin-notifications')
  .on('postgres_changes', { table: 'admin_notifications' }, ...)

supabase.channel('store-notifications')  
  .on('postgres_changes', { table: 'store_notifications' }, ...)
```

### بعد التحديث
```typescript
// موحدة مع فلترة
supabase.channel('notifications_channel')
  .on('postgres_changes', { 
    table: 'notifications',
    filter: 'recipient_type=eq.admin.and.recipient_id=eq.admin'
  }, ...)

supabase.channel('store-notifications')
  .on('postgres_changes', { 
    table: 'notifications',
    filter: 'recipient_type=eq.store.and.recipient_id=eq.store-123'
  }, ...)
```

## ✅ مزايا النظام الموحد

### 1. **بساطة البنية**
- جدول واحد بدلاً من عدة جداول منفصلة
- استعلامات موحدة وأسهل في الصيانة
- تجنب تضارب البيانات بين الجداول

### 2. **فلترة محسنة**
- استخدام `recipient_type` للتمييز بين أنواع المستلمين
- استخدام `recipient_id` لتحديد المستلم المحدد
- إمكانية الاستعلام الشامل أو المفلتر

### 3. **أداء أفضل**
- فهارس محسنة على `recipient_type` و `recipient_id`
- استعلامات أسرع مع فلترة صحيحة
- ذاكرة تخزين مؤقت موحدة

### 4. **مرونة أكبر**
- سهولة إضافة أنواع جديدة من المستلمين
- إمكانية استعلام إحصائيات شاملة
- دعم أولويات ومعلومات إضافية موحدة

## 🧪 الاختبار والتحقق

### فحص النظام
قم بزيارة صفحة `/unified-notification-status` للتحقق من:
- ✅ وجود جدول `notifications`
- ✅ عدم وجود جدول `admin_notifications` 
- ✅ عمل الخدمات بشكل صحيح
- ✅ إحصائيات الإشعارات

### إنشاء إشعارات تجريبية
```typescript
import { centralNotificationManager } from '@/services/centralNotificationManager';

// للإدارة
await centralNotificationManager.notifyAdmin('عنوان', 'رسالة');

// للمتجر  
await centralNotificationManager.notifyStore('store-123', 'عنوان', 'رسالة');

// للعميل
await centralNotificationManager.notifyCustomer('customer-456', 'عنوان', 'رسالة');
```

## 🔧 استكمال التحديث

### ملفات قد تحتاج مراجعة إضافية:
- `src/utils/setupAdminNotifications.ts` - قد يحتاج حذف أو تحديث
- `supabase/migrations/001_create_admin_notifications.sql` - قد يحتاج استبدال
- أي ملفات أخرى تشير لجدول `admin_notifications`

### تحديث قاعدة البيانات:
إذا كان لديك بيانات موجودة في `admin_notifications`:
```sql
-- نقل البيانات (اختياري)
INSERT INTO notifications (
  id, recipient_type, recipient_id, title, message, 
  order_id, read, sent, created_at, url, type, priority
)
SELECT 
  id, 'admin', 'admin', title, message,
  order_id, is_read, true, created_at, url, type, 'medium'
FROM admin_notifications;

-- حذف الجدول القديم (بعد التأكد)
-- DROP TABLE admin_notifications;
```

## 🎉 النتيجة

النظام الآن يستخدم **جدول `notifications` الموحد فقط** كما طُلب، مع:
- ✅ فلترة صحيحة للإدارة باستخدام `recipient_type='admin'`
- ✅ دعم كامل لل��تاجر والعملاء
- ✅ Real-time موحد ومحسن
- ✅ واجهات محدثة وموثقة
- ✅ أدوات فحص ومراقبة

**جميع الإشعارات الآن في مكان واحد موحد! 🚀**
