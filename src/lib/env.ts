import { z } from "zod";

function isPublicSupabaseKey(value: string) {
  if (value.startsWith("sb_publishable_") && value.length > 20) return true;
  // Legacy anon JWTs are public, but a service_role JWT must never be accepted here.
  try {
    const payload = value.split(".")[1];
    if (!payload) return false;
    const decoded: unknown = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return z.object({ role: z.literal("anon") }).safeParse(decoded).success;
  } catch { return false; }
}
const publicConfigSchema = z.object({
  url: z.url().refine(value => {
    try {
      const url = new URL(value);
      return !url.username && !url.password && (url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)));
    } catch { return false; }
  }),
  key: z.string().refine(isPublicSupabaseKey),
});

export function parseSupabasePublicConfig(url: string | undefined, key: string | undefined) {
  const result = publicConfigSchema.safeParse({ url, key });
  return result.success ? result.data : null;
}

export function getSupabasePublicConfig() {
  return parseSupabasePublicConfig(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
