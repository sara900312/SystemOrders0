import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import OrderDetails from "@/components/OrderDetails";
import { EnhancedOrderCard } from "@/components/orders/EnhancedOrderCard";
import { OrderItems } from "@/components/orders/OrderItems";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ArabicText } from "@/components/ui/arabic-text";
import { ReturnReasonDialog } from "@/components/orders/ReturnReasonDialog";
import { handleError, logError } from "@/utils/errorHandling";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { runStoreNamesFix } from "@/utils/fixStoreNames";
import {
  LogOut,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  RefreshCw,
  User,
  UserX,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { formatCurrency } from "@/utils/currency";
import { getProductNameWithPriority } from "@/utils/productNameFixer";
import { StoreProductAvailabilityCheck } from "@/components/stores/StoreProductAvailabilityCheck";
import { CustomerDeliveryDetails } from "@/components/stores/CustomerDeliveryDetails";
import { CustomerInfoDisplay } from "@/components/stores/CustomerInfoDisplay";
import { submitStoreResponse } from "@/services/storeResponseService";
import { submitTempStoreResponse } from "@/services/temporaryStoreResponseService";
import DivisionCompletionStatus from "@/components/orders/DivisionCompletionStatus";
import { useDivisionCompletion, extractOriginalOrderId, isDividedOrder as checkIsDividedOrder } from "@/hooks/useDivisionCompletion";
import { DeliveryControlForDividedOrder, DeliveryStatusMessage } from "@/components/orders/DeliveryControlForDividedOrder";
import { StoreNotificationBell } from "@/components/ui/store-notification-bell";

type OrderWithProduct = {
  order_id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  product_name: string;
  product_price: number;
  assigned_store_name: string;
  created_at: string;
  order_code: string;
  order_status: string;
  assigned_store_id: string;
  total_amount: number;
  subtotal: number;
  customer_notes: string;
  order_details?: string;
  store_response_status?: string;
  store_response_at?: string;
  order_items?: any[];
  items: {
    name: string;
    price: number;
    quantity: number;
    product_id: number;
  }[];
};

const StoreDashboard = () => {
  const [orders, setOrders] = useState<OrderWithProduct[]>([]);
  const [storeInfo, setStoreInfo] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [pendingReturnOrder, setPendingReturnOrder] = useState<{id: string, code: string} | null>(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [customerDetailsOrderId, setCustomerDetailsOrderId] = useState<string | null>(null);
  
  // حالة اتصال Real-time
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [realtimeErrors, setRealtimeErrors] = useState<string[]>([]);
  const channelRef = useRef<any>(null);
  const pollingIntervalRef = useRef<any>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, dir } = useLanguage();

  // دالة مساعدة لتشخيص بيانات الطلب
  const diagnoseOrderData = (order: any) => {
    const diagnosis = {
      order_id: order.id,
      order_code: order.order_code,
      has_order_items: !!order.order_items,
      order_items_count: order.order_items?.length || 0,
      has_items_json: !!order.items,
      items_json_count: Array.isArray(order.items) ? order.items.length : 0,
      data_source: 'unknown'
    };

    if (order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0) {
      diagnosis.data_source = 'order_items_table';
    } else if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      diagnosis.data_source = 'items_json';
    } else {
      diagnosis.data_source = 'no_data';
    }

    console.log('📊 تشخيص بيانات الطلب:', diagnosis);
    return diagnosis;
  };

  // إعداد Real-time subscriptions مع إعادة المحاولة
  const setupRealtimeSubscription = (storeId: string) => {
    console.log("🔔 بدء إعداد real-time subscriptions للمتج��:", storeId);
    
    try {
      // ��نشاء قناة بمعرف فريد
      const channelName = `store-orders-realtime-${storeId}-${Date.now()}`;
      const channel = supabase.channel(channelName);

      console.log("📡 إنشاء قناة:", channelName);

      // الاستماع لجميع التغييرات في جدول orders (بدون فلتر أولاً)
      channel
        .on(
          'postgres_changes',
          {
            event: '*', // جميع الأحداث
            schema: 'public',
            table: 'orders'
          },
          (payload) => {
            console.log('🔔 تحديث على جدول orders:', payload);
            
            // فحص ما إذا كان التحديث متعلق بهذا المتجر
            const orderData = payload.new || payload.old;
            if (orderData && orderData.assigned_store_id === storeId) {
              console.log('✅ التحديث متعلق بهذا المتجر:', orderData);
              
              if (payload.eventType === 'INSERT') {
                console.log('🆕 طلب جديد تم تعيينه للمتجر');
                fetchOrders(storeId, false);
                toast({
                  title: "طلب جديد! 🎉",
                  description: `تم تع��ين طلب جديد للمتجر - ك��د: ${orderData.order_code || orderData.id.slice(0, 8)}`,
                });
              } else if (payload.eventType === 'UPDATE') {
                console.log('🔄 تحديث طلب في المتجر');
                
                // تحديث محلي سريع إذا أمكن
                setOrders(prevOrders => {
                  const orderExists = prevOrders.find(o => o.order_id === orderData.id);
                  if (orderExists) {
                    console.log('🔄 تحديث محلي للطلب:', orderData.id);
                    return prevOrders.map(order => 
                      order.order_id === orderData.id 
                        ? {
                            ...order,
                            order_status: orderData.order_status || order.order_status,
                            store_response_status: orderData.store_response_status || order.store_response_status,
                            customer_name: orderData.customer_name || order.customer_name,
                            total_amount: orderData.total_amount || order.total_amount
                          }
                        : order
                    );
                  } else {
                    // إذا لم يوجد الطلب، أعد تحمي�� القائمة
                    console.log('🔄 الطلب غير موجود، إعادة ت��ميل القائمة');
                    fetchOrders(storeId, false);
                    return prevOrders;
                  }
                });

                // إشعار للتحديثات المهمة
                if (orderData.order_status && ['delivered', 'returned', 'customer_rejected'].includes(orderData.order_status)) {
                  const statusMessages = {
                    delivered: "تم تسليم الطلب ✅",
                    returned: "تم إرجاع الطلب 🔄", 
                    customer_rejected: "تم رفض الطلب من الزبون 🚫"
                  };
                  toast({
                    title: "تحديث حالة الطلب",
                    description: statusMessages[orderData.order_status as keyof typeof statusMessages] || "تم تحديث الطلب",
                  });
                }
              } else if (payload.eventType === 'DELETE') {
                console.log('🗑️ حذف طلب من المتجر');
                setOrders(prevOrders => 
                  prevOrders.filter(order => order.order_id !== orderData.id)
                );
                toast({
                  title: "تم حذف طلب",
                  description: "تم حذف أحد الطلبات من النظام",
                  variant: "destructive"
                });
              }
            } else {
              console.log('ℹ️ التحديث لا يتعلق بهذا المتجر:', {
                orderStoreId: orderData?.assigned_store_id,
                currentStoreId: storeId
              });
            }
          }
        )
        .subscribe((status) => {
          console.log(`📡 حالة الاشتراك: ${status}`, {
            channelName,
            storeId,
            timestamp: new Date().toISOString()
          });
          
          if (status === 'SUBSCRIBED') {
            setIsRealtimeConnected(true);
            setRealtimeErrors([]);
            console.log('✅ تم الاتصال بـ Real-time بنجاح');
            toast({
              title: "متصل بالنظام 📡",
              description: "سيتم تحديث الطلبات تلقائياً",
            });
          } else if (status === 'CHANNEL_ERROR') {
            setIsRealtimeConnected(false);
            const errorMsg = `خطأ في قناة Real-time: ${status}`;
            setRealtimeErrors(prev => [...prev, errorMsg]);
            console.error('❌ خ��أ في Real-time:', status);
            
            // إعادة المحاولة بعد 5 ثوا��
            setTimeout(() => {
              console.log('🔄 إعادة محاولة الاتصال بـ Real-time...');
              setupRealtimeSubscription(storeId);
            }, 5000);
          } else if (status === 'CLOSED') {
            setIsRealtimeConnected(false);
            console.log('🔌 تم إغلاق اتصال Real-time');
          }
        });

      channelRef.current = channel;
      console.log('📡 تم إعداد Real-time subscription');

    } catch (error) {
      console.error('❌ خطأ في إعداد Real-time:', error);
      setIsRealtimeConnected(false);
      const errorMsg = `خطأ في إعداد Real-time: ${error instanceof Error ? error.message : error}`;
      setRealtimeErrors(prev => [...prev, errorMsg]);
      
      // إعداد polling كبديل
      setupPollingFallback(storeId);
    }
  };

  // إعداد polling كبديل إذا فشل Real-time
  const setupPollingFallback = (storeId: string) => {
    console.log('🔄 إعداد polling كبديل لـ Real-time...');
    
    // تنظيف أي polling سابق
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // إعداد polling كل 10 ثوا��
    pollingIntervalRef.current = setInterval(() => {
      console.log('🔄 تحديث دوري للطلبات (polling fallback)');
      fetchOrders(storeId, false);
    }, 10000);

    toast({
      title: "وضع التحديث التلقائي 🔄",
      description: "سيتم تحديث الطلبات كل 10 ثوان",
      variant: "default"
    });
  };

  useEffect(() => {
    console.log("🔵 StoreDashboard: Checking authentication...");

    // تشغيل إصلاح أسماء المتاجر في بيئة التطوير
    runStoreNamesFix();

    const storeAuth = localStorage.getItem("storeAuth");

    if (!storeAuth) {
      console.log("No storeAuth found, redirecting to login...");
      navigate("/store-login-space9003", { replace: true });
      return;
    }

    try {
      const store = JSON.parse(storeAuth);
      console.log("✅ Store authenticated:", store);
      setStoreInfo(store);
      
      // تحميل الطلبات أولاً
      fetchOrders(store.id).then(() => {
        // ثم إعداد Real-time بعد التحميل الأولي
        setupRealtimeSubscription(store.id);
      });

      // تنظيف عند إلغاء التحميل
      return () => {
        console.log("🧹 تنظيف subscriptions...");
        
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        
        setIsRealtimeConnected(false);
      };

    } catch (error) {
      logError('تحليل بيانات تسجيل الدخول', error, { storeAuth });
      localStorage.removeItem("storeAuth");
      navigate("/store-login-space9003", { replace: true });
    }
  }, [navigate, toast]);

  const fetchOrders = async (storeId: string, showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      console.log('📊 جلب طلبات المتجر:', storeId);

      // Query orders directly from the orders table with proper filtering
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          customer_name,
          customer_phone,
          customer_address,
          customer_city,
          items,
          total_amount,
          subtotal,
          customer_notes,
          order_details,
          order_code,
          order_status,
          status,
          assigned_store_id,
          store_response_status,
          store_response_at,
          created_at,
          stores!assigned_store_id(name),
          order_items(
            id,
            product_name,
            quantity,
            price,
            discounted_price,
            availability_status,
            product_id,
            main_store_name,
            products!product_id(
              id,
              name
            )
          )
        `,
        )
        .eq("assigned_store_id", storeId)
        .in("order_status", ["assigned", "delivered", "returned", "customer_rejected"])
        .or("store_response_status.is.null,store_response_status.neq.unavailable,store_response_status.eq.customer_rejected")
        .order("created_at", { ascending: false });

      if (error) {
        console.error('❌ خطأ في استعلام Supabase:', error);
        throw error;
      }

      // معالجة البيانات وتحويلها
      const transformedOrders: OrderWithProduct[] = data?.map((order) => {
        diagnoseOrderData(order);

        return {
          order_id: order.id,
          customer_name: (() => {
            const name = order.customer_name?.trim();
            if (name && name !== '') return name;
            const orderRef = order.order_code || order.id.slice(0, 8);
            return `${t('customer')} ${orderRef}`;
          })(),
          customer_phone: order.customer_phone || "",
          customer_address: order.customer_address || "",
          customer_city: order.customer_city || "",
          product_name: (() => {
            if (order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0) {
              const productNames = order.order_items.map((item) => getProductNameWithPriority(item))
                .filter(name => name && name.trim() !== '' && name !== 'منتج غير محدد');
              if (productNames.length > 0) return productNames.join(', ');
            }
            if (order.items && Array.isArray(order.items) && order.items.length > 0) {
              const productNames = order.items.map((item) => getProductNameWithPriority(item))
                .filter(name => name && name.trim() !== '' && name !== 'منتج غير محدد');
              if (productNames.length > 0) return productNames.join(', ');
            }
            return `منتج طلب ${order.order_code || order.id.slice(0, 8)}`;
          })(),
          product_price: order.order_items?.[0]?.price || order.items?.[0]?.price || 0,
          assigned_store_name: order.stores?.name || "غير معين",
          created_at: order.created_at,
          order_code: order.order_code || "",
          order_status: order.order_status || order.status || "pending",
          assigned_store_id: order.assigned_store_id || "",
          total_amount: order.total_amount || 0,
          subtotal: order.subtotal || 0,
          customer_notes: order.customer_notes || "",
          order_details: order.order_details || "",
          store_response_status: order.store_response_status,
          store_response_at: order.store_response_at,
          order_items: order.order_items || [],
          items: order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0
            ? order.order_items.map((item: any) => ({
                id: item.id,
                name: getProductNameWithPriority(item),
                product_name: getProductNameWithPriority(item),
                price: item.price || 0,
                quantity: item.quantity || 1,
                discounted_price: item.discounted_price || 0,
                product_id: item.product_id || 0,
                products: item.products || null,
                main_store_name: item.main_store_name || storeInfo?.name || 'المتجر',
              }))
            : order.items && Array.isArray(order.items) && order.items.length > 0
            ? order.items.map((item: any, index: number) => ({
                id: `json-item-${index}`,
                name: getProductNameWithPriority(item),
                product_name: getProductNameWithPriority(item),
                price: item.price || 0,
                quantity: item.quantity || 1,
                product_id: item.product_id || 0,
              }))
            : [],
        };
      }) || [];

      console.log('✅ تم جلب الطلبات بنجاح:', {
        storeId,
        totalOrders: transformedOrders.length,
        ordersByStatus: {
          assigned: transformedOrders.filter(o => o.order_status === 'assigned').length,
          delivered: transformedOrders.filter(o => o.order_status === 'delivered').length,
          returned: transformedOrders.filter(o => o.order_status === 'returned').length
        }
      });

      setOrders(transformedOrders);
    } catch (error) {
      console.error('❌ خطأ في تحميل الطلبات:', error);
      const formattedError = handleError('تحميل الطلبات', error, toast, { storeId });
      setError(formattedError.message);
      setOrders([]);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  };

  // باقي الدوال تبقى نفسها...
  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    const currentOrder = orders.find(order => order.order_id === orderId);
    if (!currentOrder) {
      toast({ title: "خطأ", description: "لم يتم العثور على الطلب", variant: "destructive" });
      return;
    }

    if (currentOrder.order_status === 'delivered') {
      toast({ title: "غير مسموح", description: "لا يمكن تغيير حالة الطلب بعد تسليمه", variant: "destructive" });
      return;
    }

    if (currentOrder.order_status === 'returned') {
      toast({ title: "غير مسموح", description: "لا يمكن تغيير حالة الطلب المرتجع", variant: "destructive" });
      return;
    }

    if (newStatus === 'returned') {
      setPendingReturnOrder({ id: orderId, code: currentOrder.order_code || orderId });
      setShowReturnDialog(true);
      return;
    }

    await updateOrderStatus(orderId, newStatus);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, returnReason?: string) => {
    try {
      console.log('🔄 بدء تحديث حالة الطلب:', { orderId, newStatus, returnReason });

      const updateData: any = {
        order_status: newStatus,
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (returnReason && newStatus === 'returned') {
        updateData.order_details = `Return reason: ${returnReason}`;
      }

      const { data, error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId)
        .select();

      if (error) throw error;

      const statusMessages = {
        delivered: "تم تسليم الطلب بنجاح",
        returned: "تم إرجاع الطلب بنجاح",
        assigned: "تم تحديث حالة الطلب"
      };

      toast({
        title: "تم التحديث",
        description: statusMessages[newStatus as keyof typeof statusMessages] || "تم تحديث حالة الطلب بنجاح",
      });

      fetchOrders(storeInfo!.id, false);
    } catch (error) {
      console.error('❌ خطأ في تحديث حالة الطلب:', error);
      handleError('تحديث حالة الطلب', error, toast, { orderId, newStatus, returnReason });
    }
  };

  const handleReturnConfirm = async (reason: string) => {
    if (pendingReturnOrder) {
      try {
        await updateOrderStatus(pendingReturnOrder.id, 'returned', reason);
        setPendingReturnOrder(null);
        setShowReturnDialog(false);
      } catch (error) {
        console.error('❌ خطأ في إر��اع الطلب:', error);
      }
    }
  };

  const handleReturnCancel = () => {
    setPendingReturnOrder(null);
    setShowReturnDialog(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("storeAuth");
    navigate("/store-login-space9003");
  };

  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowOrderDetails(true);
  };

  const handleCloseOrderDetails = () => {
    setShowOrderDetails(false);
    setSelectedOrderId(null);
  };

  const handleOrderUpdated = () => {
    if (storeInfo?.id) {
      fetchOrders(storeInfo.id, false);
    }
  };

  const handleRefreshOrders = () => {
    if (storeInfo?.id) {
      fetchOrders(storeInfo.id, false);
    }
  };

  const handleStoreAvailableResponse = async (orderId: string) => {
    try {
      if (storeInfo?.id) {
        await fetchOrders(storeInfo.id, false);
      }
    } catch (error) {
      console.error('❌ خطأ في callback توفر المنتج:', error);
    }
  };

  const handleStoreUnavailableResponse = async (orderId: string) => {
    try {
      if (storeInfo?.id) {
        await fetchOrders(storeInfo.id, false);
      }
      setShowOrderDetails(false);
    } catch (error) {
      console.error('��� خطأ في callback رفض ا��طلب:', error);
    }
  };

  const handleDeliveryConfirm = async (orderId: string) => {
    try {
      setCustomerDetailsOrderId(orderId);
      setShowCustomerDetails(true);
      setShowOrderDetails(false);
      toast({ title: "جاهز للتسليم", description: "تم تأكيد جاهزية الطلب للتسليم. تفاصيل العميل متاحة الآن." });
    } catch (error) {
      console.error('❌ خطأ في تأكيد التسليم:', error);
      handleError('تأكيد التسليم', error, toast, { orderId });
    }
  };

  const handleDeliveryComplete = async (orderId: string) => {
    try {
      setShowCustomerDetails(false);
      setCustomerDetailsOrderId(null);
      if (storeInfo?.id) {
        fetchOrders(storeInfo.id, false);
      }
      toast({ title: "تم التسليم بنجاح ✅", description: "تم تأكيد تسليم الطلب للعميل بنجاح" });
    } catch (error) {
      console.error('❌ خطأ في إكمال التسليم:', error);
      handleError('إكمال التسليم', error, toast, { orderId });
    }
  };

  const handleReturnOrder = async (orderId: string, returnReason: string) => {
    try {
      setShowCustomerDetails(false);
      setCustomerDetailsOrderId(null);
      setShowOrderDetails(false);
      if (storeInfo?.id) {
        await fetchOrders(storeInfo.id, false);
      }
      toast({ title: "تم إرجاع الطلب 🔄", description: `تم إرجاع الطلب بنجاح - السبب: ${returnReason}`, variant: "destructive" });
    } catch (error) {
      console.error('❌ خطأ في إرجاع الطلب:', error);
      handleError('إرجاع الطلب', error, toast, { orderId, returnReason });
    }
  };

  const isDividedOrder = (order: OrderWithProduct) => {
    return checkIsDividedOrder(order.order_details);
  };

  const getOriginalOrderId = (order: OrderWithProduct) => {
    return extractOriginalOrderId(order.order_details);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "معلقة", variant: "secondary" as const, icon: Clock },
      assigned: { label: t('assigned'), variant: "default" as const, icon: Package },
      delivered: { label: t('delivered'), variant: "default" as const, icon: CheckCircle },
      completed: { label: t('delivered'), variant: "default" as const, icon: CheckCircle },
      returned: { label: t('returned'), variant: "destructive" as const, icon: XCircle },
      customer_rejected: { label: t('customer.rejected'), variant: "destructive" as const, icon: UserX },
    };

    return statusMap[status as keyof typeof statusMap] || {
      label: status, variant: "secondary" as const, icon: Package
    };
  };

  const getStatusStats = () => {
    const stats = {
      total: orders.length,
      assigned: orders.filter((order) => order.order_status === "assigned").length,
      delivered: orders.filter((order) => order.order_status === "delivered").length,
      returned: orders.filter((order) => order.order_status === "returned").length,
      customer_rejected: orders.filter((order) => order.order_status === "customer_rejected").length,
    };
    return stats;
  };

  const getOrdersByStatus = (status: string) => {
    return orders.filter((order) => order.order_status === status);
  };

  const renderOrderCard = (order: OrderWithProduct) => {
    const statusInfo = getStatusBadge(order.order_status || "assigned");
    const StatusIcon = statusInfo.icon;

    return (
      <div
        key={order.order_id}
        className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
      >
        <div className="flex flex-col space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <StatusIcon className="w-5 h-5 text-muted-foreground" />
              <div className="flex flex-col">
                <h3 className="font-bold text-lg text-blue-800">
                  {(() => {
                    const name = order.customer_name?.trim();
                    if (name && name !== '') return name;
                    const orderRef = order.order_code || order.order_id.slice(0, 8);
                    return `${t('customer')} ${orderRef}`;
                  })()}
                </h3>
                <p className="text-sm text-gray-600">طلب #{order.order_code || order.order_id.slice(0, 8)}</p>
              </div>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => handleViewOrder(order.order_id)} className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {t('details')}
              </Button>
              
              <Select
                value={order.order_status || "assigned"}
                onValueChange={(newStatus) => handleStatusUpdate(order.order_id, newStatus)}
                disabled={order.order_status === 'delivered' || order.order_status === 'returned' || order.order_status === 'customer_rejected'}
              >
                <SelectTrigger className={`w-40 ${
                  order.order_status === 'delivered' || order.order_status === 'returned' || order.order_status === 'customer_rejected'
                    ? 'opacity-60 cursor-not-allowed' : ''
                }`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assigned">{t('assigned')}</SelectItem>
                  <SelectItem value="delivered" disabled={order.store_response_status !== 'available'}>
                    {t('delivered')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-3">
            {(() => {
              let itemsToShow = [];
              if (order.order_items && Array.isArray(order.order_items) && order.order_items.length > 0) {
                itemsToShow = order.order_items.map((item, index) => ({
                  id: item.id || `order-item-${index}`,
                  product_name: getProductNameWithPriority(item),
                  name: getProductNameWithPriority(item),
                  quantity: item.quantity || 1,
                  price: item.price || 0,
                  discounted_price: item.discounted_price || 0,
                  product_id: item.product_id
                }));
              } else if (order.items && Array.isArray(order.items) && order.items.length > 0) {
                itemsToShow = order.items.map((item, index) => ({
                  id: item.product_id || `item-${index}`,
                  product_name: getProductNameWithPriority(item),
                  name: getProductNameWithPriority(item),
                  quantity: item.quantity || 1,
                  price: item.price || 0,
                  discounted_price: 0,
                  product_id: item.product_id
                }));
              } else {
                itemsToShow = [{
                  id: `default-${order.order_id}`,
                  product_name: order.product_name || `منتج طلب ${order.order_code || order.order_id.slice(0, 8)}`,
                  name: order.product_name || `منتج طلب ${order.order_code || order.order_id.slice(0, 8)}`,
                  quantity: 1,
                  price: order.total_amount || 0,
                  discounted_price: 0
                }];
              }

              return itemsToShow && itemsToShow.length > 0 && (
                <OrderItems
                  items={itemsToShow}
                  compact={true}
                  hidePrices={false}
                  assignedStoreName={order.assigned_store_name || storeInfo?.name}
                />
              );
            })()}
          </div>

          {/* Division completion status */}
          {isDividedOrder(order) && getOriginalOrderId(order) && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold mb-2 text-blue-800 flex items-center gap-2">
                <Package className="w-4 h-4" />
                حالة اكتمال الطلب المقسم
              </h4>
              <DivisionCompletionStatus
                originalOrderId={getOriginalOrderId(order)!}
                autoRefresh={true}
                showDetails={false}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-lg">
          <Loader2 className="w-6 h-6 animate-spin" />
          جاري التحميل...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-destructive mb-4">{error}</div>
          <Button onClick={() => fetchOrders(storeInfo?.id || "")}>
            المحاولة مرة أخرى
          </Button>
        </div>
      </div>
    );
  }

  const stats = getStatusStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-6" dir={dir}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">
              {t('store.name')}: {storeInfo?.name}
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              {t('store.dashboard')} 
              {isRealtimeConnected ? (
                <span className="flex items-center gap-1 text-green-600">
                  <Wifi className="w-4 h-4" />
                  <ArabicText>{t('realtime.connected')}</ArabicText>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-orange-600">
                  <WifiOff className="w-4 h-4" />
                  <ArabicText>{t('periodic.update')}</ArabicText>
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <ThemeToggle />
              <LanguageToggle />
            </div>

            {storeInfo?.id && (
              <StoreNotificationBell storeId={storeInfo.id} refreshInterval={30} />
            )}

            <Button
              onClick={handleRefreshOrders}
              variant="outline"
              disabled={isRefreshing}
              className="gap-2"
            >
              {isRefreshing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  {t('loading')}
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  {t('store.refresh')}
                </>
              )}
            </Button>
            <Button onClick={handleLogout} variant="outline" className="gap-2">
              <LogOut className="w-4 h-4" />
              {t('store.logout')}
            </Button>
          </div>
        </div>

        {/* Real-time Status */}
        {realtimeErrors.length > 0 && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">تحذيرات Real-time:</h4>
            <ul className="text-sm text-yellow-700">
              {realtimeErrors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Package className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-muted-foreground">{t('store.orders.total')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Clock className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.assigned}</p>
                  <p className="text-muted-foreground">{t('store.orders.assigned')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.delivered}</p>
                  <p className="text-muted-foreground">{t('store.orders.delivered')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <XCircle className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.returned}</p>
                  <p className="text-muted-foreground">{t('store.orders.returned')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <UserX className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.customer_rejected}</p>
                  <p className="text-muted-foreground">
                    <ArabicText>{t('customer.rejected')}</ArabicText>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders List with Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>{t('store.orders')}</CardTitle>
            <CardDescription>
              {t('store.orders.description')}&nbsp;
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="assigned" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="assigned">📦 {t('store.tab.assigned')} ({stats.assigned})</TabsTrigger>
                <TabsTrigger value="delivered">✅ {t('delivered')} ({stats.delivered})</TabsTrigger>
                <TabsTrigger value="returned">🔁 مرتجع ({stats.returned})</TabsTrigger>
                <TabsTrigger value="customer_rejected">🚫 <ArabicText>{t('customer.rejected')}</ArabicText> ({stats.customer_rejected})</TabsTrigger>
              </TabsList>

              <TabsContent value="assigned" className="space-y-4 max-h-96 overflow-y-auto">
                {getOrdersByStatus("assigned").map((order) => renderOrderCard(order))}
                {getOrdersByStatus("assigned").length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('no.orders.assigned')}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="delivered" className="space-y-4 max-h-96 overflow-y-auto">
                {getOrdersByStatus("delivered").map((order) => renderOrderCard(order))}
                {getOrdersByStatus("delivered").length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('no.orders.delivered')}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="returned" className="space-y-4 max-h-96 overflow-y-auto">
                {getOrdersByStatus("returned").map((order) => renderOrderCard(order))}
                {getOrdersByStatus("returned").length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('no.returned.orders')}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="customer_rejected" className="space-y-4 max-h-96 overflow-y-auto">
                {getOrdersByStatus("customer_rejected").map((order) => renderOrderCard(order))}
                {getOrdersByStatus("customer_rejected").length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ArabicText>{t('no.rejected.orders')}</ArabicText>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <Dialog open={showOrderDetails} onOpenChange={setShowOrderDetails}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[80vh] overflow-y-auto" dir={dir}>
          <DialogHeader>
            <DialogTitle>
              {(() => {
                if (!selectedOrderId) return t('store.order.details');
                const selectedOrder = orders.find(o => o.order_id === selectedOrderId);
                if (selectedOrder?.order_status === "assigned") {
                  if (!selectedOrder?.store_response_status) {
                    return t('store.dialog.inventory.status');
                  } else if (selectedOrder?.store_response_status === "available") {
                    return t('store.dialog.available.customer');
                  }
                }
                return t('store.order.details');
              })()}
            </DialogTitle>
          </DialogHeader>
          {selectedOrderId && (() => {
            const selectedOrder = orders.find(o => o.order_id === selectedOrderId);
            if (selectedOrder?.order_status === "assigned") {
              return (
                <StoreProductAvailabilityCheck
                  storeId={storeInfo?.id || ""}
                  order={{
                    id: selectedOrder.order_id,
                    order_code: selectedOrder.order_code,
                    customer_name: selectedOrder.customer_name,
                    customer_phone: selectedOrder.customer_phone,
                    customer_address: selectedOrder.customer_address,
                    customer_notes: selectedOrder.customer_notes,
                    total_amount: selectedOrder.total_amount,
                    subtotal: selectedOrder.subtotal,
                    created_at: selectedOrder.created_at,
                    order_status: selectedOrder.order_status,
                    store_response_status: selectedOrder.store_response_status,
                    order_items: selectedOrder.order_items || [],
                    items: selectedOrder.items || []
                  }}
                  onAvailableResponse={handleStoreAvailableResponse}
                  onUnavailableResponse={handleStoreUnavailableResponse}
                  onDeliveryConfirm={handleDeliveryConfirm}
                />
              );
            }
            return (
              <OrderDetails
                orderId={selectedOrder?.order_id || ""}
                onClose={handleCloseOrderDetails}
                onOrderUpdated={handleOrderUpdated}
              />
            );
          })()}
        </DialogContent>
      </Dialog>

      <ReturnReasonDialog
        isOpen={showReturnDialog}
        onClose={handleReturnCancel}
        onConfirm={handleReturnConfirm}
        orderCode={pendingReturnOrder?.code || ""}
      />

      <Dialog open={showCustomerDetails} onOpenChange={setShowCustomerDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir={dir}>
          <DialogHeader>
            <DialogTitle>{t('customer.details.delivery')}</DialogTitle>
          </DialogHeader>
          {customerDetailsOrderId && (() => {
            const customerOrder = orders.find(o => o.order_id === customerDetailsOrderId);
            return customerOrder && (
              <CustomerDeliveryDetails
                order={{
                  id: customerOrder.order_id,
                  order_code: customerOrder.order_code,
                  customer_name: customerOrder.customer_name,
                  customer_phone: customerOrder.customer_phone,
                  customer_address: customerOrder.customer_address,
                  customer_city: customerOrder.customer_city,
                  customer_notes: customerOrder.customer_notes,
                  total_amount: customerOrder.total_amount,
                  created_at: customerOrder.created_at,
                  order_status: customerOrder.order_status,
                  order_items: customerOrder.order_items || [],
                  items: customerOrder.items || []
                }}
                onDeliveryComplete={handleDeliveryComplete}
                onReturnOrder={handleReturnOrder}
                onClose={() => setShowCustomerDetails(false)}
              />
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StoreDashboard;
