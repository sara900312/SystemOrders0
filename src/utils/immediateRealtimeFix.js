/**
 * IMMEDIATE REALTIME 401 FIX SCRIPT
 * 
 * Run this script in your browser console to immediately fix Realtime 401 errors
 * 
 * Instructions:
 * 1. Open browser DevTools (F12)
 * 2. Go to Console tab
 * 3. Copy and paste this entire script
 * 4. Press Enter to run
 * 
 * The script will automatically:
 * - Detect the 401 error
 * - Create an anonymous session
 * - Test the Realtime connection
 * - Provide next steps
 */

(async function immediateRealtimeFix() {
  console.log('🚀 Starting immediate Realtime 401 fix...');
  console.log('📋 This script will fix your Supabase Realtime WebSocket 401 errors');

  // Check if supabase is available
  if (typeof window.supabase === 'undefined') {
    // Try to access via global scope or common patterns
    const possibleSupabase = window.supabase || 
                           window.__SUPABASE__ || 
                           (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentOwner?.current?.memoizedProps?.supabase);
    
    if (!possibleSupabase) {
      console.error('❌ Could not find Supabase client instance');
      console.log('💡 Try running this in a page where Supabase is loaded, or access via the app context');
      return;
    }
    window.supabase = possibleSupabase;
  }

  const supabase = window.supabase;

  console.log('✅ Found Supabase client, proceeding with fix...');

  try {
    // Step 1: Check current session
    console.log('🔍 Step 1: Checking current session...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.warn('⚠️ Session check error:', sessionError);
    }

    if (sessionData.session) {
      console.log('✅ Valid session already exists:', {
        user: sessionData.session.user?.email || 'anonymous',
        expires: sessionData.session.expires_at
      });
    } else {
      console.log('ℹ️ No existing session found, creating one...');

      // Step 2: Try anonymous sign-in
      console.log('���� Step 2: Attempting anonymous session creation...');
      
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

      if (authError) {
        console.warn('⚠️ Anonymous sign-in failed:', authError.message);
        
        if (authError.message.includes('disabled') || authError.message.includes('not enabled')) {
          console.log('📋 NEXT STEPS TO FIX:');
          console.log('1. Go to your Supabase Dashboard');
          console.log('2. Navigate to Authentication → Settings');
          console.log('3. Enable "Anonymous sign-ins"');
          console.log('4. Run this script again');
          return;
        }
      } else if (authData.session) {
        console.log('✅ Anonymous session created successfully!');
      }
    }

    // Step 3: Test Realtime connection
    console.log('🧪 Step 3: Testing Realtime connection...');
    
    const testPromise = new Promise((resolve) => {
      const testChannel = supabase
        .channel('fix_test_' + Date.now())
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications'
        }, (payload) => {
          console.log('📩 Test data received:', payload);
        })
        .subscribe((status, err) => {
          console.log('📡 Test channel status:', status);
          
          if (status === 'SUBSCRIBED') {
            console.log('🎉 SUCCESS! Realtime connection is now working!');
            supabase.removeChannel(testChannel);
            resolve({ success: true, status });
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Connection still failing:', err);
            resolve({ success: false, status, error: err });
          }
        });

      // Timeout after 10 seconds
      setTimeout(() => {
        supabase.removeChannel(testChannel);
        resolve({ success: false, status: 'timeout', error: 'Connection test timed out' });
      }, 10000);
    });

    const testResult = await testPromise;
    
    if (testResult.success) {
      console.log('🎉 REALTIME 401 FIX SUCCESSFUL! 🎉');
      console.log('✅ Your Realtime WebSocket connections should now work without 401 errors');
      console.log('💡 You can now use your notification system normally');
      
      // Optional: Test sending a notification
      console.log('🧪 Optional: Testing notification sending...');
      try {
        const { data: notifData, error: notifError } = await supabase.functions.invoke('send-notification', {
          body: {
            title: 'Test Notification 🧪',
            message: 'Realtime 401 fix successful! This is a test notification.',
            type: 'test',
            recipient_id: 'test-user',
            recipient_type: 'admin'
          }
        });
        
        if (!notifError) {
          console.log('✅ Test notification sent successfully!');
        } else {
          console.warn('⚠️ Test notification failed (but Realtime is fixed):', notifError);
        }
      } catch (e) {
        console.log('ℹ️ Could not test notification sending (but Realtime is fixed)');
      }
      
    } else {
      console.error('❌ Realtime connection still not working');
      console.log('🔧 Additional steps needed:');
      console.log('1. Check Supabase Dashboard → Database → Replication');
      console.log('2. Ensure Realtime is enabled for the "notifications" table');
      console.log('3. Check Row Level Security (RLS) policies for the notifications table');
      console.log('4. Ensure the authenticated user/role can read from notifications');
      
      if (testResult.error) {
        console.log('Error details:', testResult.error);
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error during fix:', error);
    console.log('🔧 Manual fix steps:');
    console.log('1. Enable anonymous authentication in Supabase Dashboard');
    console.log('2. Enable Realtime replication for notifications table');
    console.log('3. Check RLS policies');
    console.log('4. See REALTIME_401_FIX.md for detailed instructions');
  }

  console.log('📋 Fix script completed. Check the results above.');
})();

// Alternative: If the above doesn't work, try this simplified version
console.log('💡 If the above script fails, try this manual approach:');
console.log(`
// Manual fix (run line by line):
const { data, error } = await supabase.auth.signInAnonymously();
console.log('Auth result:', { data, error });

// Then test:
const channel = supabase.channel('test').subscribe((status) => {
  console.log('Channel status:', status);
});
`);
