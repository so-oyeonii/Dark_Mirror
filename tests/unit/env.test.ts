import { describe, expect, it } from "vitest";
import { parseSupabasePublicConfig } from "@/lib/env";

describe("public configuration boundary", () => {
  const key = "sb_publishable_unit_test_placeholder";
  it("disables clients with missing or invalid configuration", () => {
    expect(parseSupabasePublicConfig(undefined, undefined)).toBeNull();
    expect(parseSupabasePublicConfig("not-url", key)).toBeNull();
    expect(parseSupabasePublicConfig("http://example.com", key)).toBeNull();
  });
  it("allows secure URLs and local development", () => {
    expect(parseSupabasePublicConfig("https://example.supabase.co", key)).not.toBeNull();
    expect(parseSupabasePublicConfig("http://127.0.0.1:54321", key)).not.toBeNull();
  });
  it("rejects server secrets and legacy service_role keys", () => {
    expect(parseSupabasePublicConfig("https://example.supabase.co", "sb_secret_for_unit_test_only")).toBeNull();
    const jwt = (role: string) => `header.${btoa(JSON.stringify({ role }))}.signature`;
    expect(parseSupabasePublicConfig("https://example.supabase.co", jwt("service_role"))).toBeNull();
    expect(parseSupabasePublicConfig("https://example.supabase.co", jwt("anon"))).not.toBeNull();
  });
});
