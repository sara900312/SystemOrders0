# إعداد الإشعارات للموبايل 📱

تم تحديث نظام الإشعارات لدعم أجهزة الأندرويد والآيفون بشكل محسّن.

## ✅ الملفات المحدثة

### 1. Service Worker (`public/service-worker.js`)
- **دعم اللغة العربية**: `lang: 'ar'`, `dir: 'auto'`
- **الاهتزاز للموبايل**: `vibrate: [200, 100, 200]`
- **أيقونات محسّنة**: أيقونات منفصلة للإشعار والشارة والأزرار
- **إعادة الإشعار**: `renotify: true` 
- **تفاعل مطلوب**: `requireInteraction: true`
- **أزرار الإجراءات**: عرض الطلب وإغلاق

### 2. Web App Manifest (`public/manifest.json`)
- **دعم PWA كامل**: تطبيق ويب تقدمي
- **أيقونات متعددة الأحجام**: من 72x72 إلى 512x512
- **دعم العربية**: `lang: "ar"`, `dir: "rtl"`
- **وضع التطبيق المستقل**: `display: "standalone"`

### 3. HTML Head (`index.html`)
- **دعم iOS Safari**: meta tags خاصة بـ Apple
- **أيقونات Apple Touch**: لإضافة للشاشة الرئيسية
- **PWA Meta Tags**: للتشغيل كتطبيق

### 4. الأيقونات (`public/icons/`)
- **أيقونة التطبيق الرئيسية**: icon-192x192.svg
- **أيقونة الشارة**: badge-72x72.svg  
- **أيقونة العرض**: view.svg
- **أيقونة الإغلاق**: close.svg
- **أيقونة كبيرة**: icon-512x512.svg

## 🚀 للاستخدام الإنتاجي

### 1. تحويل الأيقونات إلى PNG
الأيقونات الحالية بصيغة SVG للاختبار. للإنتاج:
```bash
# استخدم أداة تحويل مثل ImageMagick
convert icon-192x192.svg icon-192x192.png
```

### 2. إعداد VAPID Keys
في `src/services/notificationService.ts`:
```javascript
// يجب الحصول على VAPID Key حقيقي من Supabase
const VAPID_PUBLIC_KEY = 'your-real-vapid-public-key';
```

### 3. إعداد قاعدة البيانات
تأكد من وجود جدول `notification_subscriptions`:
```sql
CREATE TABLE notification_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  user_type TEXT NOT NULL,
  subscription JSONB NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. اختبار على الأجهزة المختلفة

#### أندرويد (Chrome/Firefox):
- ✅ دعم كامل للـ Service Workers
- ✅ دعم Push Notifications
- ✅ دعم الاهتزاز
- ✅ دعم أزرار الإجراءات

#### iOS Safari (16.4+):
- ✅ دعم محدود للـ Service Workers  
- ✅ دعم Push Notifications (مع قيود)
- ❌ لا يدعم الاهتزاز
- ❌ دعم محدود لأزرار الإجراءات

#### iOS Chrome/Firefox:
- ❌ لا يدعم Push Notifications (يستخدم Safari engine)

## 📝 ملاحظات مهمة

### للأندرويد:
- يعمل بشكل كامل مع جميع المتصفحات
- يمكن إضافة التطبيق للشاشة الرئيسية
- دعم كامل لجميع ميزات الإشعارات

### للآيفون:
- يتطلب iOS 16.4 أو أحدث
- يعمل فقط مع Safari
- يجب إضافة التطبيق للشاشة الرئيسية لتفعيل الإشعارات
- قيود على ميزات معينة

### للاختبار:
1. افتح التطبيق على الموبايل
2. امنح إذن الإشعارات
3. أضف التطبيق للشاشة الرئيسية (للآيفون)
4. اختبر إرسال إشعار من لوحة الإدارة

## 🔧 استكشاف الأخطاء

### إذا لم تعمل الإشعارات:
1. تحقق من صحة VAPID Key
2. تحقق من إذن الإشعارات في المتصفح
3. تحقق من تسجيل Service Worker في Developer Tools
4. تحقق من اتصال قاعدة البيانات

### سجلات التشخيص:
```javascript
// في Developer Console
await notificationService.testDatabaseConnection();
await notificationService.checkNotificationPermission();
```

## 📚 مراجع إضافية

- [Web Push Notifications](https://web.dev/push-notifications/)
- [PWA on iOS](https://web.dev/ios-pwa/)
- [Service Workers](https://web.dev/service-workers/)
- [Web App Manifest](https://web.dev/add-manifest/)
