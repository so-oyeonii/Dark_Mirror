import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { POST } from "@/app/api/demo/simulation/route";

afterEach(() => vi.unstubAllEnvs());
describe("demo API boundary", () => {
  const request = (body: string, origin = "http://localhost:3000", type = "application/json") => new Request("http://localhost:3000/api/demo/simulation", { method: "POST", headers: { origin, "content-type": type }, body });
  const start = JSON.stringify({ action: "start", scenarioId: "LOVE", consent: true });
  it("stays closed in production irrespective of any keys", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await POST(request(start))).status).toBe(503);
  });
  it("requires a matching origin and bounded valid JSON in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    expect((await POST(request(start, "https://other.example"))).status).toBe(403);
    expect((await POST(request(start, ""))).status).toBe(403);
    expect((await POST(request(start, undefined, "text/plain"))).status).toBe(415);
    expect((await POST(request("x".repeat(8193)))).status).toBe(413);
    expect((await POST(request("{"))).status).toBe(400);
    expect((await POST(request("{}"))).status).toBe(400);
    const response = await POST(request(start));
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ capability: expect.any(String), capabilityExpiresAt: expect.any(Number), mode: "scripted-development-demo" });
  });
});
