import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types.js";

export function createClient(url: string, key: string) {
  return createSupabaseClient<Database>(url, key);
}
