# حل مشكلة جدول notifications 🗃️

## 📋 المشكلة
الأخطاء التالية كانت تظهر:
```
❌ Error checking for duplicate notifications: Message: column notifications.type does not exist | Code: 42703
❌ Error creating notification: Database Insert: Message: Could not find the 'type' column of 'notifications' in the schema cache | Code: PGRST204
```

## 🔍 السبب
1. **جدول `notifications` غير موجود** في قاعدة البيانات
2. **عمود `type` كان مطلوباً** في الكود لكنه غير موجود في الجدول الفعلي
3. الكود يحاول الوصول لجدول غير موجود

## ✅ الحلول المطبقة

### 1. إزالة الاعتماد على عمود `type`
تم تعديل `centralNotificationManager.ts` لإزالة جميع المراجع لعمود `type`:

```typescript
// ❌ قبل الإصلاح:
interface PendingNotification {
  type: string; // تم إزالته
}

.eq('type', notification.type) // تم إزالته

// ✅ بعد الإصلاح:
interface PendingNotification {
  recipient_id: string;
  recipient_type: 'store' | 'admin' | 'customer';
  title: string;
  message: string;
  order_id?: string;
  // بدون type
}
```

### 2. تحديث منطق فحص التكرار
```typescript
// ❌ قبل: الاعتماد على type
const keyParts = [notification.type, notification.order_id];

// ✅ بعد: الاعتماد على العنوان و order_id
const keyParts = [
  notification.recipient_type,
  notification.recipient_id,
  notification.title.substring(0, 20),
  notification.order_id || 'no-order'
];
```

### 3. تحديث cache duration
```typescript
// ❌ قبل: حسب type
const cacheDuration = notificationType === 'order_assigned' ? 2000 : 5000;

// ✅ بعد: حسب وجود order_id
const cacheDuration = hasOrderId ? 2000 : 5000;
```

### 4. إنشاء أداة فحص جدول notifications
تم إنشاء `createNotificationsTable.ts` للتحقق من وجود الجدول.

## 🗃️ إنشاء جدول notifications

إذا لم يكن الجدول موجوداً، يجب إنشاؤه في Supabase Dashboard:

### SQL لإنشاء الجدول:
```sql
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('store', 'admin', 'customer')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  order_id TEXT,
  read BOOLEAN DEFAULT false,
  sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, recipient_type);
CREATE INDEX idx_notifications_order ON notifications(order_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users" ON notifications
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON notifications
  FOR UPDATE USING (auth.role() = 'authenticated');
```

## 🧪 كيفية فحص الحل

### 1. استخدام أداة الفحص:
```typescript
import { initializeNotificationsTable } from '@/utils/createNotificationsTable';

// في Developer Console
await initializeNotificationsTable();
```

### 2. فحص يدوي:
```sql
-- في Supabase SQL Editor
SELECT * FROM notifications LIMIT 1;
```

### 3. اختبار الإشعارات:
```javascript
// في Developer Console
await centralNotificationManager.notifyStore('test-store', 'Test Title', 'Test Message', 'test-order');
```

## 📊 الأعمدة الجديدة في جدول notifications

| العمود | النوع | الوصف |
|--------|-------|--------|
| `id` | UUID | المفتاح الأساسي |
| `recipient_id` | TEXT | معرف المستلم (store ID, admin, customer ID) |
| `recipient_type` | TEXT | نوع المستلم (store, admin, customer) |
| `title` | TEXT | عنوان الإشعار |
| `message` | TEXT | محتوى الإشعار |
| `order_id` | TEXT | معرف الطلب (اختياري) |
| `read` | BOOLEAN | هل تم قراءة الإشعار |
| `sent` | BOOLEAN | هل تم إرسال الإشعار |
| `created_at` | TIMESTAMP | تاريخ الإنشاء |
| `updated_at` | TIMESTAMP | تاريخ التحديث |

## 🔄 التغييرات المطلوبة في الملفات

### ✅ تم التحديث:
- `centralNotificationManager.ts` - إزالة عمود type
- `orderNotificationTrigger.ts` - تحديث الاستدعاءات
- `storeNotificationService.ts` - تحديث الاستدعاءات

### 📄 ملفات جديدة:
- `createNotificationsTable.ts` - أداة فحص الجدول
- `NOTIFICATIONS_TABLE_FIX.md` - هذا التوثيق

## ⚠️ نقاط مهمة

1. **إنشاء الجدول يدوياً**: يجب إنشاء الجدول في Supabase Dashboard
2. **RLS Policies**: تأكد من إعداد السياسات الأمنية المناسبة
3. **Indexes**: الفهارس تحسن ا��أداء للاستعلامات الكثيرة
4. **النسخ الاحتياطي**: خذ نسخة احتياطية قبل إنشاء جداول جديدة

## 🎯 النتيجة النهائية

بعد تطبيق هذه الحلول:
- ✅ لن تظهر أخطاء "column does not exist"
- ✅ سيعمل نظام الإشعارات بشكل صحيح
- ✅ ستتم إدارة التكرار بكفاءة
- ✅ ستكون البيانات منظمة ومحمية

## 🔧 للمطورين

عند إضافة ميزات جديدة للإشعارات:
1. استخدم الأعمدة الموجودة بدلاً من إنشاء أعمدة جديدة
2. اتبع نمط `recipient_type` للتمييز بين أنواع الإشعارات
3. استخدم `order_id` لربط الإشعارات بالطلبات
4. احرص على اختبار الكود مع الجدول الجديد
