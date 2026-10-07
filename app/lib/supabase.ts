import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kedujvkldghloueusmmn.supabase.co";
const supabasePublishableKey = "sb_publishable_ub1WUgCcGgTXDkAGdQ1J9A_alcQMFzs";

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  supabaseClient = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return supabaseClient;
}