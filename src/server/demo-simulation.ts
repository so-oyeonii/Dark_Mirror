import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { applySimulationTurn, createSimulationSession, endSimulation, scenarioIdSchema, simulationTurnRequestSchema, type SimulationSession } from "@/lib/simulation";

export const demoRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), scenarioId: scenarioIdSchema, consent: z.literal(true) }).strict(),
  z.object({ action: z.literal("turn"), sessionId: z.uuid(), request: simulationTurnRequestSchema }).strict(),
  z.object({ action: z.literal("stop"), sessionId: z.uuid(), safety: z.boolean() }).strict(),
  z.object({ action: z.literal("delete"), sessionId: z.uuid() }).strict(),
]);
type Entry = { session: SimulationSession; digest: string; expiresAt: number; requests: number[] };
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

/** Development-only, bounded process memory. Not a distributed production store/rate limiter. */
export function createDemoSimulationService(now = Date.now) {
  const entries = new Map<string, Entry>();
  let starts: number[] = [];
  return {
    handle(input: unknown, capability: string | null) {
      const parsed = demoRequestSchema.safeParse(input);
      if (!parsed.success) return { status: 400, body: { error: "invalid_request" } };
      const time = now();
      for (const [id, item] of entries) if (item.expiresAt <= time) entries.delete(id);
      const command = parsed.data;
      if (command.action === "start") {
        starts = starts.filter(value => value > time - 60_000);
        if (starts.length >= 10 || entries.size >= 100) return { status: 429, body: { error: "demo_capacity", retryAfter: 60 } };
        starts.push(time);
        const token = randomBytes(32).toString("base64url");
        const session = createSimulationSession(command.scenarioId, time, randomUUID());
        entries.set(session.id, { session, digest: digest(token), expiresAt: time + 3_600_000, requests: [] });
        return { status: 201, body: { mode: "scripted-development-demo", capability: token, capabilityExpiresAt: time + 3_600_000, session } };
      }
      const entry = entries.get(command.sessionId);
      if (!entry || !capability || capability.length > 100 || digest(capability) !== entry.digest) return { status: 404, body: { error: "not_found" } };
      // Stopping/deletion must remain available even after the turn rate limit is reached.
      if (command.action === "delete") { entries.delete(command.sessionId); return { status: 200, body: { deleted: true } }; }
      if (command.action === "stop") {
        entry.session = endSimulation(entry.session, command.safety ? "safety" : "stopped", time);
        return { status: 200, body: { session: entry.session } };
      }
      entry.requests = entry.requests.filter(value => value > time - 60_000);
      if (entry.requests.length >= 12) return { status: 429, body: { error: "rate_limit", retryAfter: 60 } };
      entry.requests.push(time);
      // Synchronous state transition makes parallel submissions atomic within this process.
      const result = applySimulationTurn(entry.session, command.request, time);
      if (!result.ok) return { status: result.code === "invalid" ? 400 : 409, body: { error: result.code } };
      entry.session = result.session;
      return { status: 200, body: { session: entry.session, output: result.output, replayed: result.replayed } };
    },
  };
}
