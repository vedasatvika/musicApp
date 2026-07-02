import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * The Supabase client, or null if the app hasn't been configured yet. The anon
 * key is safe to ship in the frontend — access is governed by Row Level
 * Security policies in the database, not by hiding the key.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null

export const isConfigured = Boolean(url && anonKey)
