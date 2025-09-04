// Supabase client configuration with environment variable support
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use environment variables with fallback to hardcoded values for backwards compatibility
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://wkzjovhlljeaqzoytpeb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrempvdmhsbGplYXF6b3l0cGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNDY2MjIsImV4cCI6MjA2NDYyMjYyMn0.mx8PnQJaMochaPbjYUmwzlVNIULM05LUDBIM7OFFjZ8";

// Validate configuration
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('❌ Supabase configuration missing. Please check your environment variables.');
}

console.log('🔧 Supabase client initialized with:', {
  url: SUPABASE_URL,
  key: SUPABASE_PUBLISHABLE_KEY.substring(0, 20) + '...',
  source: import.meta.env.VITE_SUPABASE_URL ? 'environment' : 'fallback'
});

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
