import { createClient } from '@supabase/supabase-js';

function normalizeSupabaseUrl(url: string | undefined): string {
  const cleanUrl = (url || '').trim().replace(/\/$/, '');
  return cleanUrl.replace(/\/rest\/v1$/, '');
}

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
