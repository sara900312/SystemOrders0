# نظام الإشعارات للمتاجر - دليل الاستخدام

## ✅ النظام مكتمل ومطابق للمواصفات المطلوبة

تم تنفيذ نظام الإشعارات بالضبط وفقاً للمواصفات المحددة:

### المواصفات التقنية:
- **Supabase Table**: `notifications` ✅
- **Realtime Channel**: `notifications_channel` ✅  
- **Event Name**: `new_notification` ✅
- **Store Context**: `current_store.id` ✅
- **بدون WebPush أو VAPID keys** ✅

## المكونات المتاحة

### 1. StoreNotificationCenter
مركز الإشعارات الدائم - قائمة تعرض جميع الإشعارات

### 2. StoreNotificationToast  
التنبيهات المنبثقة للإشعارات العاجلة والمهمة

## الاستخدام الأساسي

```tsx
import StoreNotificationCenter from '@/components/stores/StoreNotificationCenter';
import StoreNotificationToast from '@/components/stores/StoreNotificationToast';

const YourStoreDashboard = ({ storeId }) => {
  const current_store = { id: storeId }; // مطلوب بهذا التنسيق

  return (
    <div>
      {/* محتوى لوحة التحكم الخاصة بك */}
      
      {/* إضافة مركز الإشعارات */}
      <StoreNotificationCenter 
        current_store={current_store}
        maxHeight="400px"
        showHeader={true}
      />
      
      {/* إضافة التنبيهات المنبثقة */}
      <StoreNotificationToast 
        current_store={current_store}
        autoHideDuration={10000} // 10 ثواني كما هو مطلوب
      />
    </div>
  );
};
```

## المميزات المنفذة

### الجزء الأول: Store Notification Center
- ✅ **Data Fetching**: استعلام مفلتر بـ `recipient_type='store'` و `recipient_id=current_store.id`
- ✅ **Ordering**: ترتيب حسب `created_at DESC`
- ✅ **State Management**: حفظ في `store_notifications` state variable
- ✅ **Real-time**: اشتراك في `notifications_channel` للاستماع لـ `new_notification`
- ✅ **UI Structure**: عرض العنوان، الرسالة، والوقت المنسق
- ✅ **Visual Distinction**: نقطة ملونة للإشعارات غير المقروءة
- ✅ **User Interaction**: النقر يحدث `read=true` وينتقل للـ `url`

### الجزء الثاني: Toast Notifications
- ✅ **Same Subscription**: نفس `notifications_channel` / `new_notification`
- ✅ **Priority Filter**: فلترة للإشعارات `urgent` أو `high` فقط
- ✅ **UI Overlay**: ظهور في الزاوية العلوية اليمنى
- ✅ **Auto-dismiss**: اختفاء تلقائي بعد 10 ث��اني
- ✅ **Close Button**: زر إغلاق واضح (X)
- ✅ **Click Navigation**: النقر للانتقال للـ `url`

## خيارات التخصيص

### StoreNotificationCenter
```tsx
<StoreNotificationCenter 
  current_store={current_store}
  maxHeight="500px"        // ارتفاع القائمة
  showHeader={true}        // إظهار الرأس
  className="custom-class" // CSS classes إضافية
/>
```

### StoreNotificationToast
```tsx
<StoreNotificationToast 
  current_store={current_store}
  autoHideDuration={8000}  // مدة البقاء بالملي ثانية
/>
```

## أمثلة التكامل

### 1. في الرأس (Header)
```tsx
<div className="dashboard-header flex justify-between">
  <h1>لوحة التحكم</h1>
  <StoreNotificationCenter 
    current_store={current_store}
    maxHeight="300px"
    className="w-80"
  />
</div>
```

### 2. في الشريط الجانبي (Sidebar)
```tsx
<aside className="sidebar">
  <nav>{/* قائمة التنقل */}</nav>
  <StoreNotificationCenter 
    current_store={current_store}
    maxHeight="400px"
  />
</aside>
```

### 3. كنافذة منبثقة
```tsx
<div className="fixed top-4 right-4 z-50">
  <StoreNotificationCenter 
    current_store={current_store}
    className="w-80 shadow-xl"
  />
</div>
```

## اختبار النظام

### 1. استخدام صفحة العرض التجريبي
انتقل إلى `/store-notification-demo` لمشاهدة النظام في العمل

### 2. إرسال إشعار تجريبي برمجياً
```tsx
const sendTestNotification = async () => {
  // إدراج في قاعدة البيانات
  const { error: insertError } = await supabase
    .from('notifications')
    .insert({
      recipient_type: 'store',
      recipient_id: storeId,
      title: 'إشعار تجريبي',
      message: 'هذا إشعار تجريبي',
      priority: 'urgent', // سيظهر كـ toast
      url: '/store-dashboard',
      read: false,
      sent: true
    });

  // إرسال عبر الـ channel
  const { error: broadcastError } = await supabase
    .channel('notifications_channel')
    .send({
      type: 'broadcast',
      event: 'new_notification',
      payload: notificationData
    });
};
```

## آلية العمل

### 1. تشغيل النظام
- المكونات تتصل تلقائياً بـ `notifications_channel`
- تستمع لأحداث `new_notification`
- تفلتر الإشعارات حسب `recipient_type='store'` و `recipient_id=current_store.id`

### 2. عرض الإشعارات
- **جميع ��لإشعارات**: تظهر في `StoreNotificationCenter`
- **الإشعارات العاجلة/المهمة**: تظهر أيضاً كـ toast في `StoreNotificationToast`

### 3. التفاعل
- **النقر على إشعار**: يحدث `read=true` وينتقل للـ `url`
- **النقر على toast**: ينتقل للـ `url` ويخفي الـ toast
- **زر الإغلاق**: يخفي الـ toast فقط

## الملاحظات المهمة

1. **current_store object**: يجب أن يكون بالتنسيق `{ id: string }`
2. **Automatic Setup**: النظام ينشئ جدول الإشعارات تلقائياً إذا لم يكن موجوداً
3. **Real-time Updates**: التحديثات فورية لجميع المتاجر المتصلة
4. **Priority Filtering**: فقط الإشعارات `urgent` و `high` تظهر كـ toasts
5. **Clean UI**: تمييز بصري واضح بين المقروء وغير المقروء

## الدعم والمساعدة

النظام مُعدّ ليعمل بشكل تلقائي مع الحد الأدنى من التكوين. في حالة وجود مشاكل:

1. تأكد من وجود `notifications` table في Supabase
2. تأكد من تفعيل Realtime في مشروع Supabase
3. تحقق من أن `current_store.id` يحتوي على قيمة صحيحة
4. راجع console للرسائل التشخيصية

النظام جاهز للاستخدام الفوري! 🚀
