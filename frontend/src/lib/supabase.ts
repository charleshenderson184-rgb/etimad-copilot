"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Singleton Supabase client. Configure via env vars:
 *
 *   NEXT_PUBLIC_SUPABASE_URL        https://xxxxx.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY   eyJhbGc...
 *
 * When env vars are missing, returns null. Callers MUST handle this case —
 * the auth context falls back to a localStorage-only "demo" mode in dev.
 */

let _client: SupabaseClient | null = null;
let _attemptedInit = false;

export function getSupabase(): SupabaseClient | null {
  if (_attemptedInit) return _client;
  _attemptedInit = true;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.warn(
        "[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set. " +
          "Auth will run in demo-only mode."
      );
    }
    return null;
  }

  _client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return _client;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
