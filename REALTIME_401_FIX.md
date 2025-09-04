# Supabase Realtime 401 Error - Complete Fix Guide

## 🔍 Problem Analysis

Your app is experiencing **401 Unauthorized** errors when connecting to Supabase Realtime WebSocket:

```
❌ GET | 401 | https://wkzjovhlljeaqzoytpeb.supabase.co/realtime/v1/websocket?apikey=REDACTED&log_level=info&vsn=1.0.0
```

### Root Cause
Your authentication architecture doesn't use Supabase auth sessions:
- **Admin login**: Custom Edge Function validation + localStorage flag
- **Store login**: Database RPC validation + localStorage flag  
- **No Supabase sessions**: Never calls `supabase.auth.signIn()`

Supabase Realtime requires either:
1. ✅ Valid authenticated session (JWT token)
2. ✅ Proper RLS policies allowing anon access
3. ✅ Anonymous access enabled in Supabase project

## 🛠️ Solutions (Choose One)

### Option 1: **Quick Fix - Anonymous Sessions** (Recommended)

Update your `realtimeNotificationService.ts`:

```typescript
// Add these methods to your RealtimeNotificationService class:

/**
 * Create anonymous session for Realtime access
 */
private async createAnonymousSession(): Promise<boolean> {
  try {
    console.log('🔐 Creating anonymous session for Realtime...');
    
    const { data, error } = await supabase.auth.signInAnonymously();
    
    if (!error && data.session) {
      console.log('✅ Anonymous session created successfully');
      return true;
    }
    
    console.warn('⚠️ Anonymous sign-in failed:', error?.message);
    return false;
  } catch (error) {
    console.error('❌ Anonymous session creation error:', error);
    return false;
  }
}

/**
 * Enhanced initialize method with 401 handling
 */
async initialize(userId?: string): Promise<void> {
  try {
    console.log('🔧 Initializing Realtime with 401 handling...');

    // Check current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('🔑 No session found, creating anonymous session...');
      const sessionCreated = await this.createAnonymousSession();
      
      if (!sessionCreated) {
        console.warn('⚠️ Could not create session, Realtime may fail');
      }
    }

    // Create channel with retry logic
    await this.createChannelWithRetry(userId);
    
  } catch (error) {
    console.error('❌ Failed to initialize Realtime:', error);
  }
}

/**
 * Create channel with automatic retry on 401 errors
 */
private async createChannelWithRetry(userId?: string, attempt: number = 1): Promise<void> {
  const maxAttempts = 3;
  const channelName = `notifications_${userId || 'anonymous'}_${Date.now()}`;
  
  console.log(`📡 Creating channel ${channelName} (attempt ${attempt})`);
  
  this.channel = supabase
    .channel(channelName)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public', 
      table: 'notifications'
    }, (payload) => {
      const notification = payload.new as NotificationPayload;
      if (userId && notification.recipient_id === userId) {
        this.handleRealtimeNotification(notification);
      } else if (!userId) {
        this.handleRealtimeNotification(notification);
      }
    })
    .subscribe(async (status, err) => {
      console.log(`📡 Channel ${channelName} status:`, status, err);
      
      if (status === 'SUBSCRIBED') {
        this.isConnected = true;
        console.log('✅ Successfully subscribed to notifications channel');
      } else if (status === 'CHANNEL_ERROR') {
        this.isConnected = false;
        
        // Handle 401 specifically
        if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
          console.log('🔐 401 detected, attempting session refresh...');
          
          if (attempt < maxAttempts) {
            // Remove failed channel
            if (this.channel) {
              supabase.removeChannel(this.channel);
            }
            
            // Try to create new session
            await this.createAnonymousSession();
            
            // Retry after delay
            setTimeout(() => {
              this.createChannelWithRetry(userId, attempt + 1);
            }, 2000 * attempt);
          } else {
            console.error('❌ Max retries reached, falling back to polling');
            this.fallbackToPolling(userId);
          }
        }
      }
    });
}

/**
 * Fallback to polling when Realtime fails
 */
private fallbackToPolling(userId?: string): void {
  console.log('🔄 Falling back to polling for notifications...');
  
  const interval = setInterval(async () => {
    try {
      if (!userId) return;
      
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (!error && notifications) {
        notifications.forEach((notification: NotificationPayload) => {
          const createdAt = new Date(notification.created_at);
          const now = new Date();
          const diff = now.getTime() - createdAt.getTime();
          
          // Only process notifications created in the last minute
          if (diff < 60000) {
            console.log('📩 New notification found via polling:', notification);
            this.handleRealtimeNotification(notification);
          }
        });
      }
    } catch (error) {
      console.error('❌ Polling error:', error);
    }
  }, 30000); // Poll every 30 seconds
  
  // Store interval for cleanup
  (this as any).pollingInterval = interval;
}
```

### Option 2: **Supabase Project Configuration**

Enable anonymous access in your Supabase project:

1. **Go to Supabase Dashboard** → Your Project → Authentication → Settings
2. **Enable Anonymous sign-ins**: Turn ON
3. **Update RLS Policies** for notifications table:

```sql
-- Allow anonymous users to subscribe to notifications
CREATE POLICY "Enable read access for anon users" ON "public"."notifications"
AS PERMISSIVE FOR SELECT
TO anon
USING (true);

-- Or more restrictive - only for specific recipient types
CREATE POLICY "Enable notifications for stores" ON "public"."notifications"
AS PERMISSIVE FOR SELECT
TO anon
USING (recipient_type = 'store' OR recipient_type = 'admin');
```

4. **Enable Realtime** for the notifications table:
   - Go to Database → Replication
   - Enable Realtime for `notifications` table

### Option 3: **System User Session** (Alternative)

Create a dedicated system user for Realtime:

1. **Create system user** in Supabase Auth:
   - Email: `realtime-system@yourdomain.com`
   - Password: Strong password
   
2. **Update service** to use system credentials:

```typescript
private async createSystemSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'realtime-system@yourdomain.com',
      password: 'your-secure-password'
    });
    
    if (!error && data.session) {
      console.log('✅ System session created for Realtime');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ System session creation failed:', error);
    return false;
  }
}
```

## 🧪 Testing Your Fix

Use the diagnostic tools I created:

```typescript
// Test the fix
import { runNotificationTests } from '@/utils/notificationSystemTest';

const results = await runNotificationTests();
console.log('Test Results:', results);
```

Or use the test page component:
```typescript
import NotificationSystemTestPage from '@/components/test/NotificationSystemTestPage';

// Add to your routes to test the system
```

## 🔍 Verification Steps

1. **Check console logs** for authentication success:
   ```
   ✅ Anonymous session created successfully
   ✅ Successfully subscribed to notifications channel
   ```

2. **Test notification flow**:
   ```typescript
   await realtimeNotificationService.sendTestNotification('user-id');
   ```

3. **Monitor WebSocket connection** in Network tab - should see 200/101 instead of 401

## 🚨 Important Notes

### For Production:
- **Don't commit** system user credentials to code
- **Use environment variables** for sensitive data
- **Consider security implications** of anonymous access
- **Test thoroughly** before deploying

### Alternative: **Keep Current Architecture**
If you want to maintain your current auth system:
1. Enable anonymous Realtime access in Supabase
2. Use RLS policies to restrict data access
3. Filter notifications client-side based on your localStorage auth

## 📋 Answers to Your Questions

1. **Should frontend use anon key only?**
   - Yes, with proper RLS policies OR anonymous sessions

2. **Specific configuration needed?**
   - Enable anonymous sign-ins in Supabase Dashboard
   - Set up RLS policies for notifications table
   - Enable Realtime replication

3. **Could it be CORS/role restrictions?**
   - Not CORS - it's authentication (401)
   - Yes, role restrictions - anon role doesn't have Realtime access by default

4. **Need to regenerate anon key?**
   - No, the key is valid - the issue is authentication method

Choose **Option 1** for the quickest fix that works with your current architecture!
