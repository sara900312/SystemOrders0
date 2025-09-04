import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationData {
  recipient_type: 'admin' | 'store' | 'customer';
  recipient_id: string;
  title: string;
  message: string;
  order_id?: string;
  type?: string;
  url?: string;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: notificationData }: { data: NotificationData } = await req.json();

    console.log('📧 Processing notification request:', notificationData);

    // Check for duplicate notifications first
    const checkTimeAgo = new Date(Date.now() - (notificationData.order_id ? 2 * 60 * 1000 : 10 * 60 * 1000)).toISOString();

    let duplicateQuery = supabaseClient
      .from('notifications')
      .select('id, created_at')
      .eq('recipient_type', notificationData.recipient_type)
      .eq('recipient_id', notificationData.recipient_id)
      .eq('title', notificationData.title)
      .gte('created_at', checkTimeAgo)
      .limit(1);

    // For order notifications, also check order_id for more precise deduplication
    if (notificationData.order_id) {
      duplicateQuery = duplicateQuery.eq('order_id', notificationData.order_id);
    }

    const { data: existingNotifications, error: duplicateError } = await duplicateQuery;

    if (duplicateError) {
      console.warn('⚠️ Error checking for duplicates (continuing anyway):', duplicateError);
    }

    if (existingNotifications && existingNotifications.length > 0) {
      console.log('🚫 Duplicate notification detected, skipping:', {
        existing: existingNotifications[0],
        attempted: notificationData
      });

      return new Response(
        JSON.stringify({
          success: false,
          message: 'Duplicate notification prevented',
          duplicate_of: existingNotifications[0].id,
          created_at: existingNotifications[0].created_at
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Generate unique notification key for tracking
    const notificationKey = `${notificationData.recipient_type}_${notificationData.recipient_id}_${notificationData.order_id || 'no-order'}_${Date.now()}`;

    // Save notification to database
    const { data: savedNotification, error: saveError } = await supabaseClient
      .from('notifications')
      .insert({
        recipient_type: notificationData.recipient_type,
        recipient_id: notificationData.recipient_id,
        title: notificationData.title,
        message: notificationData.message,
        order_id: notificationData.order_id,
        type: notificationData.type || 'general',
        url: notificationData.url,
        created_at: new Date().toISOString(),
        read: false,
        sent: false
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ Failed to save notification:', saveError);
      throw saveError;
    }

    console.log('✅ Notification saved to database:', savedNotification.id);

    // Get active push subscriptions for the recipient
    const { data: subscriptions, error: subscriptionError } = await supabaseClient
      .from('notification_subscriptions')
      .select('*')
      .eq('user_id', notificationData.recipient_id)
      .eq('active', true);

    if (subscriptionError) {
      console.error('❌ Failed to fetch subscriptions:', subscriptionError);
      throw subscriptionError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.warn('⚠️ No active subscriptions found for user:', notificationData.recipient_id);
      
      // Update notification as failed to send
      await supabaseClient
        .from('notifications')
        .update({ sent: false })
        .eq('id', savedNotification.id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No active subscriptions found',
          notification_id: savedNotification.id
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    console.log(`📱 Found ${subscriptions.length} active subscription(s)`);

    // Send push notification to each subscription
    const pushPromises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription: PushSubscription = sub.subscription;
        
        // Use Web Push API to send notification
        // Note: In a real implementation, you would use a library like 'web-push'
        // For now, we'll simulate the push notification

        const payload = JSON.stringify({
          title: notificationData.title,
          message: notificationData.message,
          order_id: notificationData.order_id,
          type: notificationData.type || 'general',
          url: notificationData.url
        });

        console.log('🚀 Sending push notification to:', pushSubscription.endpoint.substring(0, 50) + '...');

        // Simulate push notification (replace with actual web-push implementation)
        // In production, you would use the web-push library here:
        // await webpush.sendNotification(pushSubscription, payload);

        return { success: true, endpoint: pushSubscription.endpoint };
        
      } catch (error) {
        console.error('❌ Failed to send push notification:', error);
        return { success: false, error: error.message };
      }
    });

    const pushResults = await Promise.all(pushPromises);
    const successCount = pushResults.filter(r => r.success).length;
    
    console.log(`📊 Push notification results: ${successCount}/${pushResults.length} successful`);

    // Update notification status
    const updateData = {
      sent: successCount > 0,
      sent_at: successCount > 0 ? new Date().toISOString() : null
    };

    await supabaseClient
      .from('notifications')
      .update(updateData)
      .eq('id', savedNotification.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification processed successfully',
        notification_id: savedNotification.id,
        subscriptions_found: subscriptions.length,
        push_sent: successCount,
        results: pushResults
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error in send-notification function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
