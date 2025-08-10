import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_API_KEY } from '../config';
import { token } from '../../auth.json';

export const readToken = async() => {
  return token;
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_API_KEY, {accessToken: readToken});
