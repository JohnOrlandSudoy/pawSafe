import { createClient } from '@supabase/supabase-js';
import { type AuthFlowType } from '@supabase/supabase-js';

// Get environment variables with fallbacks for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://your-supabase-project-url';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

// Log the environment variables during development
if (import.meta.env.DEV) {
  console.log('Supabase URL:', supabaseUrl);
  console.log('Supabase Key length:', supabaseAnonKey ? supabaseAnonKey.length : 0);
}

// Validate the environment variables
if (!supabaseUrl || supabaseUrl === 'http://your-supabase-project-url') {
  console.error('Missing VITE_SUPABASE_URL in .env file');
}

if (!supabaseAnonKey || supabaseAnonKey === 'your-supabase-anon-key') {
  console.error('Missing VITE_SUPABASE_ANON_KEY in .env file');
}

// Create Supabase client with options to disable email confirmation
const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Disable email confirmation flow using correct type
    flowType: 'implicit' as AuthFlowType
  }
};

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions); 