import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mbuiluhrtlgyawlqchaq.supabase.co'
// TODO: Replace with your actual service role key
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1idWlsdWhydGxneWF3bHFjaGFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ0ODYzNiwiZXhwIjoyMDY4MDI0NjM2fQ.z2gfLDKUtl30O2oHjZOzMWXvBtfMI-9v9goCh9UdOZ0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 