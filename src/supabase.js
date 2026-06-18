import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bipboatssbxxneukqxdk.supabase.co'
const supabaseKey = 'sb_publishable_gPuoCRWnESWuvZ2L154E1w_uyfdPJZp'

export const supabase = createClient(supabaseUrl, supabaseKey)