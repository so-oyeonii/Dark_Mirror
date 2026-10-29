import "server-only";
import { createDemoSimulationService } from "@/server/demo-simulation";

const service = createDemoSimulationService();
function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "60" } : {}) } });
}

export async function POST(request: Request) {
  // Browser demo never calls this endpoint. Live AI/auth/distributed storage are not configured.
  const url = new URL(request.url);
  if (process.env.NODE_ENV !== "development" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return json({ error: "development_only", mode: "local-browser-demo" }, 503);
  if (request.headers.get("origin") !== url.origin) return json({ error: "origin_required" }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "json_required" }, 415);
  const reader = request.body?.getReader();
  if (!reader) return json({ error: "invalid_request" }, 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 8192) { await reader.cancel(); return json({ error: "body_too_large" }, 413); }
      chunks.push(chunk.value);
    }
    const input: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const token = request.headers.get("authorization")?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1] ?? null;
    const result = service.handle(input, token);
    return json(result.body, result.status);
  } catch { return json({ error: "invalid_request" }, 400); }
}
