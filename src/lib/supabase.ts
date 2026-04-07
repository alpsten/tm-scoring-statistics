import { createClient } from '@supabase/supabase-js'

// ─── Environment variables ─────────────────────────────────────────────────────
// Copy .env.example → .env.local and fill in your Supabase project values.
// These are the Vite-standard VITE_ prefixed env vars (safe to use in frontend).

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Missing environment variables.\n' +
    'Copy .env.example → .env.local and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(
  supabaseUrl ?? '',
  supabaseAnonKey ?? ''
)
