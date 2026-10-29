"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/env";

// Factory only. Phase 1 does not call this or enable browser DB access.
export function createSupabaseBrowserClient() {
  const config = getSupabasePublicConfig();
  if (!config) return null;
  return createBrowserClient(config.url, config.key);
}
