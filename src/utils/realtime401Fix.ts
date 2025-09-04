/**
 * Immediate Fix for Supabase Realtime 401 Errors
 * 
 * This utility provides an immediate solution for the 401 Unauthorized errors
 * when connecting to Supabase Realtime WebSocket.
 * 
 * Usage:
 * import { fixRealtimeAuth } from '@/utils/realtime401Fix';
 * await fixRealtimeAuth();
 */

import { supabase } from '@/integrations/supabase/client';

interface FixResult {
  success: boolean;
  method: string;
  message: string;
  sessionInfo?: any;
}

/**
 * Main function to fix Realtime authentication
 */
export async function fixRealtimeAuth(): Promise<FixResult> {
  console.log('🔧 Starting Realtime 401 fix...');

  // Method 1: Check if session already exists
  const existingSession = await checkExistingSession();
  if (existingSession.success) {
    return existingSession;
  }

  // Method 2: Try anonymous sign-in
  const anonymousResult = await tryAnonymousSignIn();
  if (anonymousResult.success) {
    return anonymousResult;
  }

  // Method 3: Try system user (fallback)
  const systemResult = await trySystemUser();
  if (systemResult.success) {
    return systemResult;
  }

  // All methods failed
  return {
    success: false,
    method: 'none',
    message: 'All authentication methods failed. Please check Supabase project configuration.'
  };
}

/**
 * Check if there's already a valid session
 */
async function checkExistingSession(): Promise<FixResult> {
  try {
    console.log('🔍 Checking existing session...');

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.warn('⚠️ Session check error:', error);
      return { success: false, method: 'existing', message: `Session check failed: ${error.message}` };
    }

    if (session) {
      console.log('✅ Valid session already exists');
      return {
        success: true,
        method: 'existing',
        message: 'Valid session already exists',
        sessionInfo: {
          user: session.user?.email || 'anonymous',
          expires: session.expires_at,
          access_token: session.access_token?.substring(0, 20) + '...'
        }
      };
    }

    console.log('ℹ️ No existing session found');
    return { success: false, method: 'existing', message: 'No existing session' };
  } catch (error) {
    console.error('❌ Error checking session:', error);
    return { success: false, method: 'existing', message: `Exception: ${error}` };
  }
}

/**
 * Try to create anonymous session
 */
async function tryAnonymousSignIn(): Promise<FixResult> {
  try {
    console.log('🔐 Attempting anonymous sign-in...');

    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      console.warn('⚠️ Anonymous sign-in failed:', error.message);
      return { 
        success: false, 
        method: 'anonymous', 
        message: `Anonymous sign-in failed: ${error.message}. You may need to enable anonymous auth in Supabase Dashboard.` 
      };
    }

    if (data.session) {
      console.log('✅ Anonymous session created successfully');
      return {
        success: true,
        method: 'anonymous',
        message: 'Anonymous session created successfully',
        sessionInfo: {
          user: 'anonymous',
          expires: data.session.expires_at,
          access_token: data.session.access_token?.substring(0, 20) + '...'
        }
      };
    }

    return { success: false, method: 'anonymous', message: 'Anonymous sign-in returned no session' };
  } catch (error) {
    console.error('❌ Anonymous sign-in exception:', error);
    return { success: false, method: 'anonymous', message: `Exception: ${error}` };
  }
}

/**
 * Try to sign in with system user
 */
async function trySystemUser(): Promise<FixResult> {
  try {
    console.log('🔐 Attempting system user sign-in...');

    // These credentials should be configured in your Supabase project
    const systemCredentials = {
      email: 'realtime-system@builder.io',
      password: 'realtime-access-2024-secure'
    };

    const { data, error } = await supabase.auth.signInWithPassword(systemCredentials);

    if (error) {
      console.warn('⚠️ System user sign-in failed:', error.message);
      return { 
        success: false, 
        method: 'system', 
        message: `System user sign-in failed: ${error.message}. You may need to create a system user in Supabase Auth.` 
      };
    }

    if (data.session) {
      console.log('✅ System user session created successfully');
      return {
        success: true,
        method: 'system',
        message: 'System user session created successfully',
        sessionInfo: {
          user: systemCredentials.email,
          expires: data.session.expires_at,
          access_token: data.session.access_token?.substring(0, 20) + '...'
        }
      };
    }

    return { success: false, method: 'system', message: 'System user sign-in returned no session' };
  } catch (error) {
    console.error('❌ System user sign-in exception:', error);
    return { success: false, method: 'system', message: `Exception: ${error}` };
  }
}

/**
 * Test Realtime connection after fixing auth
 */
export async function testRealtimeConnection(): Promise<{
  connected: boolean;
  message: string;
  channelState?: string;
}> {
  return new Promise((resolve) => {
    console.log('🧪 Testing Realtime connection...');

    const testChannel = supabase
      .channel('test_connection_' + Date.now())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications'
      }, (payload) => {
        console.log('📩 Test channel received data:', payload);
      })
      .subscribe((status, err) => {
        console.log('📡 Test channel status:', status, err);

        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime connection test successful');
          supabase.removeChannel(testChannel);
          resolve({
            connected: true,
            message: 'Realtime connection successful',
            channelState: status
          });
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime connection test failed');
          resolve({
            connected: false,
            message: `Connection failed: ${err?.message || 'Unknown error'}`,
            channelState: status
          });
        }
      });

    // Timeout after 10 seconds
    setTimeout(() => {
      supabase.removeChannel(testChannel);
      resolve({
        connected: false,
        message: 'Connection test timed out after 10 seconds',
        channelState: 'timeout'
      });
    }, 10000);
  });
}

/**
 * Complete fix and test workflow
 */
export async function fixAndTestRealtime(): Promise<{
  authFixed: boolean;
  connectionWorking: boolean;
  authResult: FixResult;
  connectionResult: any;
  instructions: string[];
}> {
  console.log('🚀 Starting complete Realtime fix and test...');

  const authResult = await fixRealtimeAuth();
  const connectionResult = authResult.success 
    ? await testRealtimeConnection()
    : { connected: false, message: 'Auth fix failed' };

  const instructions: string[] = [];

  // Generate specific instructions based on results
  if (authResult.success && connectionResult.connected) {
    instructions.push('✅ Success! Realtime is now working correctly.');
    instructions.push('🔄 You can now use your existing Realtime services without modification.');
  } else if (authResult.success && !connectionResult.connected) {
    instructions.push('⚠️ Authentication was fixed but connection still fails.');
    instructions.push('🔧 Check Supabase Dashboard → Database → Replication → Enable Realtime for notifications table.');
    instructions.push('🔧 Check RLS policies to ensure the authenticated user can read notifications.');
  } else if (!authResult.success) {
    if (authResult.message.includes('anonymous auth')) {
      instructions.push('🔧 Enable anonymous authentication in Supabase Dashboard:');
      instructions.push('   → Go to Authentication → Settings → Enable anonymous sign-ins');
    }
    if (authResult.message.includes('system user')) {
      instructions.push('🔧 Create a system user in Supabase Dashboard:');
      instructions.push('   → Go to Authentication → Users → Invite a user');
      instructions.push('   → Email: realtime-system@builder.io');
      instructions.push('   → Set a secure password');
    }
    instructions.push('🔧 Alternative: Check REALTIME_401_FIX.md for complete configuration guide');
  }

  return {
    authFixed: authResult.success,
    connectionWorking: connectionResult.connected,
    authResult,
    connectionResult,
    instructions
  };
}

/**
 * Quick diagnostic function
 */
export async function diagnoseRealtimeIssue(): Promise<{
  currentSession: any;
  anonymousEnabled: boolean;
  suggestions: string[];
}> {
  console.log('🔍 Diagnosing Realtime authentication issue...');

  const { data: { session } } = await supabase.auth.getSession();
  
  // Test if anonymous auth is enabled
  let anonymousEnabled = false;
  try {
    const { error } = await supabase.auth.signInAnonymously();
    anonymousEnabled = !error || !error.message.includes('disabled');
  } catch (e) {
    anonymousEnabled = false;
  }

  const suggestions: string[] = [];

  if (!session) {
    suggestions.push('❌ No active Supabase session found');
    if (!anonymousEnabled) {
      suggestions.push('🔧 Enable anonymous authentication in Supabase Dashboard');
    }
    suggestions.push('🔧 Or create a system user for Realtime access');
  }

  suggestions.push('📋 Use fixAndTestRealtime() function to automatically fix the issue');

  return {
    currentSession: session ? {
      user: session.user?.email || 'anonymous',
      expires: session.expires_at
    } : null,
    anonymousEnabled,
    suggestions
  };
}

// Export convenience functions
export const fix401 = fixRealtimeAuth;
export const testConnection = testRealtimeConnection;
export const diagnose = diagnoseRealtimeIssue;

// Default export
export default {
  fix: fixRealtimeAuth,
  test: testRealtimeConnection,
  fixAndTest: fixAndTestRealtime,
  diagnose: diagnoseRealtimeIssue
};
