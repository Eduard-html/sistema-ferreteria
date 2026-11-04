import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nelnpjpiitpxnolamqta.supabase.co';
const supabaseAnonKey = 'sb_publishable_t2ZkSAyY1uInnkgMLOI6Ow_t-Dq7ejG';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);