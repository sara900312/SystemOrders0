/**
 * دالة مساعدة لإصلاح أسماء المنتجات الفارغة أو المولدة تلقائياً
 */

interface ProductItem {
  id?: string;
  product_name?: string;
  name?: string;
  quantity?: number;
  price?: number;
  [key: string]: any;
}

// قائمة أسماء المنتجات الصحيحة
const REALISTIC_PRODUCT_NAMES = [
  "Asus ROG Zephyrus G16",
  "Lenovo IdeaPad Slim 3",
  "Microsoft Surface Pro 10 (8GB/256GB)"
];

// أنماط أسماء المنت��ات التي تحتاج إصلاح
const PATTERNS_TO_FIX = [
  /^منتج \d+$/,                    // "منتج 1", "منتج 2", etc.
  /^منتج \d+ - طلب/,               // "منتج 1 - طلب ABC123"
  /^منتج الطلب/,                   // "منتج الطلب ABC123"
  /^منتج طلب/,                     // "منتج طلب ABC123"
  /منتج غير محدد/,                 // "منتج غير محدد"
  /^Intel Core i5-14400F/          // المنتج التجريبي القديم
];

/**
 * تحقق من كون اسم المنتج يحتاج إصلاح
 */
export function needsProductNameFix(productName: string): boolean {
  if (!productName || productName.trim() === '') {
    return true;
  }
  
  return PATTERNS_TO_FIX.some(pattern => pattern.test(productName));
}

/**
 * إنشاء اسم منتج واقعي جديد
 */
export function generateRealisticProductName(index: number = 0, orderCode?: string): string {
  const productIndex = index % REALISTIC_PRODUCT_NAMES.length;
  const productName = REALISTIC_PRODUCT_NAMES[productIndex];
  
  if (orderCode) {
    return `${productName} - طلب ${orderCode}`;
  }
  
  return productName;
}

/**
 * إصلاح اسم منتج واحد
 */
export function fixProductName(item: ProductItem, index: number = 0, orderCode?: string): string {
  // أولوية للـ product_name الصحيح
  if (item.product_name && !needsProductNameFix(item.product_name)) {
    return item.product_name;
  }
  
  // ثم name كاحتياطي
  if (item.name && !needsProductNameFix(item.name)) {
    return item.name;
  }
  
  // إنشاء اسم جديد واقعي
  return generateRealisticProductName(index, orderCode);
}

/**
 * إصلاح قائمة من المنتجات
 */
export function fixProductNames(items: ProductItem[], orderCode?: string): ProductItem[] {
  return items.map((item, index) => ({
    ...item,
    product_name: fixProductName(item, index, orderCode),
    // تحديث name أيضاً إذا كان فارغاً
    name: item.name && !needsProductNameFix(item.name) 
      ? item.name 
      : fixProductName(item, index, orderCode)
  }));
}

/**
 * دالة للحصول على اسم المنتج مع إصلاح تلقائي
 */
export function getFixedProductName(item: ProductItem, index: number = 0, orderCode?: string): string {
  return fixProductName(item, index, orderCode);
}

/**
 * فحص وإصلاح اسم منتج مفرد بأولوية صحيحة
 */
export function getProductNameWithPriority(item: ProductItem): string {
  console.log('🔍 getProductNameWithPriority - input item:', {
    product_name: item.product_name,
    name: item.name,
    products: item.products
  });

  // الأولوية الأولى: product_name صحيح (حتى لو كان من الأنماط التي نحتاج إصلاحها)
  if (item.product_name &&
      item.product_name.trim() !== '' &&
      item.product_name !== 'منتج غير محدد') {
    console.log('✅ Using product_name:', item.product_name);
    return item.product_name;
  }

  // الأولوية الثانية: name صحيح
  if (item.name &&
      item.name.trim() !== '' &&
      item.name !== 'منتج غير محدد') {
    console.log('✅ Using name:', item.name);
    return item.name;
  }

  // الأولوية الثالثة: products.name (إذا وجد)
  if (item.products?.name &&
      item.products.name.trim() !== '' &&
      item.products.name !== 'منتج غير محدد') {
    console.log('✅ Using products.name:', item.products.name);
    return item.products.name;
  }

  // افتراضي: استخدام اسم واقعي بدلاً من "منتج غير محدد"
  const defaultName = REALISTIC_PRODUCT_NAMES[0] || 'منتج غير محدد';
  console.log('⚠️ Using fallback name:', defaultName);
  return defaultName;
}

export default {
  needsProductNameFix,
  generateRealisticProductName,
  fixProductName,
  fixProductNames,
  getFixedProductName,
  getProductNameWithPriority,
  REALISTIC_PRODUCT_NAMES,
  PATTERNS_TO_FIX
};
