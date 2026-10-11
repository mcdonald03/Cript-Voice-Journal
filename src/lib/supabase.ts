import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://wdjqmpsfglxhqgrhzhpn.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_gnscBmReCCXQu8t_x8hoyg_dc5XYG_p';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { 
    storage: AsyncStorage, 
    persistSession: true, 
    autoRefreshToken: true, 
    detectSessionInUrl: false 
  },
});

export async function ensureUser(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Not signed in');
  return data.session.user.id;
}