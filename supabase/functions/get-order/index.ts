import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-store-id, apikey',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json'
};

interface DatabaseOrder {
  id: string;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  customer_notes?: string;
  order_status: string;
  status?: string;
  total_amount: number;
  subtotal?: number;
  created_at: string;
  updated_at?: string;
  main_store_name: string;
  assigned_store_id?: string;
  store_response_status?: string;
  store_response_at?: string;
  rejection_reason?: string;
  order_items?: Array<{
    id: string;
    product_name: string;
    quantity: number;
    price: number;
    discounted_price?: number;
    product_id?: string;
    availability_status?: string;
    products?: {
      id: string;
      name: string;
      price: number;
      discounted_price?: number;
      main_store_name: string;
    };
  }>;
  stores?: {
    id: string;
    name: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // Parse request parameters
    let orderId: string;
    let adminMode = 'true';
    let storeId: string | null = null;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      orderId = url.searchParams.get('orderId') || '';
      adminMode = url.searchParams.get('adminMode') || 'true';
      storeId = req.headers.get('x-store-id');
    } else {
      const body = await req.json();
      orderId = body.orderId || '';
      adminMode = body.adminMode || 'true';
      storeId = body.storeId || req.headers.get('x-store-id');
    }

    // Validate required parameters
    if (!orderId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'orderId parameter is required'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const isAdminMode = adminMode === 'true';
    
    console.log(`📋 get-order request:`, {
      orderId,
      adminMode: isAdminMode,
      storeId,
      method: req.method
    });

    // Fetch order with related data
    console.log(`📋 جلب بيانات الطلب مع order_items...`);
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items:order_items(
          id,
          product_name,
          quantity,
          price,
          discounted_price,
          product_id,
          availability_status,
          products:product_id(
            id,
            name,
            price,
            discounted_price,
            main_store_name
          )
        ),
        stores:assigned_store_id(
          id,
          name
        )
      `)
      .eq('id', orderId)
      .single();

    console.log(`📊 نتيجة استعلام الطلب:`, {
      hasOrder: !!order,
      orderItemsCount: order?.order_items?.length || 0,
      error: orderError
    });

    if (orderError) {
      console.error('❌ Database error - النوع:', typeof orderError);
      console.error('❌ Database error - المحتوى:', orderError);
      console.error('❌ Database error - التفاصيل:', {
        code: orderError.code,
        details: orderError.details,
        hint: orderError.hint,
        message: orderError.message
      });

      let errorMessage = orderError.message || 'Order not found';
      if (orderError.details) {
        errorMessage = `${errorMessage}: ${orderError.details}`;
      }

      return new Response(JSON.stringify({
        success: false,
        error: errorMessage
      }), {
        status: orderError.code === 'PGRST116' ? 404 : 500,
        headers: corsHeaders
      });
    }

    if (!order) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Order not found'
      }), {
        status: 404,
        headers: corsHeaders
      });
    }

    const dbOrder = order as DatabaseOrder;

    // Store authorization check (if not admin mode)
    if (!isAdminMode && storeId) {
      if (dbOrder.assigned_store_id !== storeId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Order not assigned to this store'
        }), {
          status: 403,
          headers: corsHeaders
        });
      }
    }

    // Determine if customer data should be visible
    const shouldShowCustomerData = isAdminMode ||
      (dbOrder.store_response_status &&
       ['available', 'accepted', 'delivered', 'returned'].includes(dbOrder.store_response_status) &&
       dbOrder.store_response_status !== 'customer_rejected' &&
       dbOrder.order_status !== 'customer_rejected');

    // Group order items by product_id and merge duplicates
    const mergedItems: Array<{
      id: number;
      product_id: number;
      quantity: number;
      merged_quantity?: number;
      price: number;
      total_price: number;
      product_name: string;
      discounted_price?: number;
      product: {
        id: number;
        name: string;
        price: number;
        discounted_price?: number;
        main_store_name: string;
      };
    }> = [];

    if (dbOrder.order_items) {
      const itemGroups = new Map();
      
      dbOrder.order_items.forEach(item => {
        const productId = item.product_id || item.id;
        const key = productId;
        
        if (itemGroups.has(key)) {
          const existing = itemGroups.get(key);
          existing.quantity += item.quantity;
          existing.merged_quantity = existing.quantity;
          existing.total_price = existing.quantity * existing.price;
        } else {
          const price = item.discounted_price && item.discounted_price > 0 && item.discounted_price < item.price 
            ? item.discounted_price 
            : item.price;
          
          itemGroups.set(key, {
            id: parseInt(item.id),
            product_id: productId ? parseInt(productId) : 0,
            quantity: item.quantity,
            price: price,
            total_price: item.quantity * price,
            product_name: item.product_name,
            discounted_price: item.discounted_price,
            product: {
              id: item.products?.id ? parseInt(item.products.id) : 0,
              name: item.products?.name || item.product_name,
              price: item.products?.price || item.price,
              discounted_price: item.products?.discounted_price,
              main_store_name: item.products?.main_store_name || dbOrder.main_store_name
            }
          });
        }
      });
      
      mergedItems.push(...Array.from(itemGroups.values()));
    }

    // Build response
    const response = {
      success: true,
      message: 'Order details retrieved successfully',
      order: {
        id: dbOrder.id,
        order_code: dbOrder.order_code,
        customer_name: shouldShowCustomerData ? dbOrder.customer_name : '***',
        customer_phone: shouldShowCustomerData ? dbOrder.customer_phone : '***',
        customer_address: shouldShowCustomerData ? dbOrder.customer_address : '***',
        customer_city: shouldShowCustomerData ? dbOrder.customer_city : '***',
        customer_notes: shouldShowCustomerData ? dbOrder.customer_notes : undefined,
        order_status: dbOrder.order_status || dbOrder.status || 'pending',
        total_amount: dbOrder.total_amount,
        subtotal: dbOrder.subtotal,
        created_at: dbOrder.created_at,
        updated_at: dbOrder.updated_at,
        main_store_name: dbOrder.main_store_name,
        assigned_store_id: dbOrder.assigned_store_id,
        assigned_store_name: dbOrder.stores?.name,
        store_response_status: dbOrder.store_response_status,
        store_response_at: dbOrder.store_response_at,
        rejection_reason: dbOrder.rejection_reason
      },
      order_items: mergedItems,
      assigned_store: dbOrder.stores ? {
        id: dbOrder.stores.id,
        name: dbOrder.stores.name
      } : undefined,
      visibility_info: {
        admin_mode: isAdminMode,
        customer_data_visible: shouldShowCustomerData,
        store_id: storeId
      }
    };

    console.log(`✅ Order retrieved successfully:`, {
      orderId,
      customerDataVisible: shouldShowCustomerData,
      itemsCount: mergedItems.length
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('❌ Edge Function error - النوع:', typeof error);
    console.error('❌ Edge Function error - المحتوى:', error);

    let errorMessage = 'Internal server error';

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object') {
      const errorObj = error as any;
      if (errorObj.message) {
        errorMessage = errorObj.message;
      } else if (errorObj.details) {
        errorMessage = errorObj.details;
      } else {
        try {
          errorMessage = JSON.stringify(error);
        } catch {
          errorMessage = 'خطأ غير محدد في Edge Function';
        }
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    console.error('❌ رسالة خطأ Edge Function منسقة:', errorMessage);

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
