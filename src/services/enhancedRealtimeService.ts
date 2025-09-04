/**
 * Enhanced Realtime Service with Anonymous Session Support
 * Handles 401 errors by creating anonymous sessions for Realtime access
 */

import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeConfig {
  enableAnonymousAccess: boolean;
  autoRetry: boolean;
  maxRetries: number;
  retryDelay: number;
}

class EnhancedRealtimeService {
  private static instance: EnhancedRealtimeService;
  private channels: Map<string, RealtimeChannel> = new Map();
  private isInitialized = false;
  private hasValidSession = false;
  private config: RealtimeConfig = {
    enableAnonymousAccess: true,
    autoRetry: true,
    maxRetries: 3,
    retryDelay: 2000
  };

  static getInstance(): EnhancedRealtimeService {
    if (!EnhancedRealtimeService.instance) {
      EnhancedRealtimeService.instance = new EnhancedRealtimeService();
    }
    return EnhancedRealtimeService.instance;
  }

  /**
   * Initialize Realtime with proper authentication handling
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔧 Initializing Enhanced Realtime Service...');

      // Check current session
      const sessionResult = await this.checkAndEnsureSession();
      
      if (!sessionResult && !this.config.enableAnonymousAccess) {
        throw new Error('No valid session and anonymous access disabled');
      }

      this.isInitialized = true;
      console.log('✅ Enhanced Realtime Service initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced Realtime Service:', error);
      return false;
    }
  }

  /**
   * Check current session and create anonymous session if needed
   */
  private async checkAndEnsureSession(): Promise<boolean> {
    try {
      console.log('🔍 Checking Supabase session...');

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.warn('⚠️ Session check error:', error);
      }

      if (session) {
        console.log('✅ Valid session found:', {
          user: session.user?.email || 'anonymous',
          expires: session.expires_at
        });
        this.hasValidSession = true;
        return true;
      }

      // No session found - try to create anonymous session
      if (this.config.enableAnonymousAccess) {
        console.log('🔑 No session found, creating anonymous session...');
        return await this.createAnonymousSession();
      }

      console.warn('⚠️ No session and anonymous access disabled');
      return false;
    } catch (error) {
      console.error('❌ Session check failed:', error);
      return false;
    }
  }

  /**
   * Create anonymous session for Realtime access
   */
  private async createAnonymousSession(): Promise<boolean> {
    try {
      console.log('🔐 Creating anonymous session...');

      // Method 1: Try anonymous sign-in (if enabled in Supabase)
      const { data, error } = await supabase.auth.signInAnonymously();

      if (!error && data.session) {
        console.log('✅ Anonymous session created successfully');
        this.hasValidSession = true;
        return true;
      }

      console.warn('⚠️ Anonymous sign-in not available:', error?.message);

      // Method 2: Use a temporary user approach (fallback)
      return await this.createTemporarySession();
    } catch (error) {
      console.error('❌ Failed to create anonymous session:', error);
      return false;
    }
  }

  /**
   * Create temporary session with a system user (fallback)
   */
  private async createTemporarySession(): Promise<boolean> {
    try {
      console.log('🔄 Attempting temporary session creation...');

      // This would require a system user in your Supabase project
      // You can create one with email like "system@yourdomain.com"
      const systemEmail = 'realtime@system.local';
      const systemPassword = 'realtime-access-2024';

      const { data, error } = await supabase.auth.signInWithPassword({
        email: systemEmail,
        password: systemPassword
      });

      if (!error && data.session) {
        console.log('✅ Temporary session created for Realtime access');
        this.hasValidSession = true;
        return true;
      }

      console.warn('⚠️ Temporary session creation failed:', error?.message);
      return false;
    } catch (error) {
      console.error('❌ Temporary session creation error:', error);
      return false;
    }
  }

  /**
   * Create a Realtime channel with proper error handling
   */
  async createChannel(
    channelName: string, 
    config: {
      table?: string;
      event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      schema?: string;
      filter?: string;
    } = {}
  ): Promise<RealtimeChannel | null> {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Failed to initialize Realtime service');
        }
      }

      console.log(`📡 Creating Realtime channel: ${channelName}`);

      // Check if channel already exists
      if (this.channels.has(channelName)) {
        console.log(`ℹ️ Channel ${channelName} already exists, returning existing`);
        return this.channels.get(channelName)!;
      }

      // Create new channel
      const channel = supabase.channel(channelName);

      // Configure postgres changes if specified
      if (config.table) {
        const changeConfig: any = {
          event: config.event || '*',
          schema: config.schema || 'public',
          table: config.table
        };

        if (config.filter) {
          changeConfig.filter = config.filter;
        }

        channel.on('postgres_changes', changeConfig, (payload) => {
          console.log(`📩 Change received on ${channelName}:`, payload);
        });
      }

      // Subscribe with retry logic
      const subscriptionResult = await this.subscribeWithRetry(channel, channelName);
      
      if (subscriptionResult) {
        this.channels.set(channelName, channel);
        return channel;
      }

      return null;
    } catch (error) {
      console.error(`❌ Failed to create channel ${channelName}:`, error);
      return null;
    }
  }

  /**
   * Subscribe to channel with retry logic for 401 errors
   */
  private async subscribeWithRetry(
    channel: RealtimeChannel, 
    channelName: string, 
    attempt: number = 1
  ): Promise<boolean> {
    return new Promise((resolve) => {
      console.log(`🔄 Subscribing to ${channelName} (attempt ${attempt})`);

      channel.subscribe((status, err) => {
        console.log(`📡 Channel ${channelName} status:`, status, err);

        switch (status) {
          case 'SUBSCRIBED':
            console.log(`✅ Successfully subscribed to ${channelName}`);
            resolve(true);
            break;

          case 'CHANNEL_ERROR':
            console.error(`❌ Channel error for ${channelName}:`, err);
            
            // Handle 401 specifically
            if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
              console.log('🔐 401 detected, attempting session refresh...');
              this.handleAuthError(channel, channelName, attempt, resolve);
            } else {
              resolve(false);
            }
            break;

          case 'TIMED_OUT':
            console.warn(`⏰ Subscription timeout for ${channelName}`);
            if (attempt < this.config.maxRetries) {
              setTimeout(() => {
                this.subscribeWithRetry(channel, channelName, attempt + 1)
                  .then(resolve);
              }, this.config.retryDelay);
            } else {
              resolve(false);
            }
            break;

          case 'CLOSED':
            console.log(`🔒 Channel ${channelName} closed`);
            resolve(false);
            break;
        }
      });
    });
  }

  /**
   * Handle authentication errors by refreshing session
   */
  private async handleAuthError(
    channel: RealtimeChannel,
    channelName: string,
    attempt: number,
    resolve: (value: boolean) => void
  ): Promise<void> {
    if (attempt >= this.config.maxRetries) {
      console.error(`❌ Max retries reached for ${channelName}`);
      resolve(false);
      return;
    }

    try {
      // Remove the failed channel
      supabase.removeChannel(channel);
      
      // Wait before retry
      await new Promise(r => setTimeout(r, this.config.retryDelay));

      // Try to refresh/recreate session
      const sessionResult = await this.checkAndEnsureSession();
      
      if (sessionResult) {
        console.log(`🔄 Session refreshed, retrying ${channelName}...`);
        
        // Create new channel and retry
        const newChannel = supabase.channel(`${channelName}_retry_${attempt}`);
        const retryResult = await this.subscribeWithRetry(newChannel, channelName, attempt + 1);
        resolve(retryResult);
      } else {
        console.error(`❌ Failed to refresh session for ${channelName}`);
        resolve(false);
      }
    } catch (error) {
      console.error(`❌ Error handling auth error for ${channelName}:`, error);
      resolve(false);
    }
  }

  /**
   * Remove a channel
   */
  removeChannel(channelName: string): boolean {
    try {
      const channel = this.channels.get(channelName);
      if (channel) {
        supabase.removeChannel(channel);
        this.channels.delete(channelName);
        console.log(`🗑️ Removed channel: ${channelName}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Error removing channel ${channelName}:`, error);
      return false;
    }
  }

  /**
   * Get channel status
   */
  getChannelStatus(channelName: string): string | null {
    const channel = this.channels.get(channelName);
    return channel?.state || null;
  }

  /**
   * Get service status
   */
  getStatus(): {
    initialized: boolean;
    hasValidSession: boolean;
    activeChannels: number;
    channelNames: string[];
  } {
    return {
      initialized: this.isInitialized,
      hasValidSession: this.hasValidSession,
      activeChannels: this.channels.size,
      channelNames: Array.from(this.channels.keys())
    };
  }

  /**
   * Cleanup all channels
   */
  cleanup(): void {
    console.log('🧹 Cleaning up Realtime channels...');
    
    for (const [name, channel] of this.channels) {
      try {
        supabase.removeChannel(channel);
        console.log(`🗑️ Removed channel: ${name}`);
      } catch (error) {
        console.error(`❌ Error removing channel ${name}:`, error);
      }
    }
    
    this.channels.clear();
    this.isInitialized = false;
    this.hasValidSession = false;
    
    console.log('✅ Realtime cleanup completed');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RealtimeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Realtime config updated:', this.config);
  }
}

// Export singleton instance
export const enhancedRealtimeService = EnhancedRealtimeService.getInstance();

// Helper functions
export const createRealtimeChannel = (channelName: string, config?: any) => 
  enhancedRealtimeService.createChannel(channelName, config);

export const getRealtimeStatus = () => enhancedRealtimeService.getStatus();

export default enhancedRealtimeService;
