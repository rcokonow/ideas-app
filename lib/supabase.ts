import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client (uses service role key, only for API routes)
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}
