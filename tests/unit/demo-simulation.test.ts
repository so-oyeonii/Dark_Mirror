import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createDemoSimulationService } from "@/server/demo-simulation";

describe("development simulation service", () => {
  function setup() {
    let now = 1000;
    const service = createDemoSimulationService(() => now);
    const result = service.handle({ action: "start", scenarioId: "LOVE", consent: true }, null);
    if (!result.body.session || !result.body.capability) throw new Error("start failed");
    return { service, id: result.body.session.id, token: result.body.capability, advance: (ms: number) => { now += ms; } };
  }
  it("requires consent and enforces capability ownership", () => {
    const { service, id, token } = setup();
    expect(service.handle({ action: "start", scenarioId: "LOVE", consent: false }, null).status).toBe(400);
    expect(service.handle({ action: "stop", sessionId: id, safety: false }, "wrong").status).toBe(404);
    expect(service.handle({ action: "stop", sessionId: id, safety: false }, token).status).toBe(200);
  });
  it("replays duplicate turns, rejects changed payload, stops after safety", () => {
    const { service, id, token } = setup();
    const request = { requestId: randomUUID(), expectedTurn: 1, text: "내 이야기도 들어줘" };
    const command = { action: "turn", sessionId: id, request };
    expect(service.handle(command, token).status).toBe(200);
    expect(service.handle(command, token).body).toMatchObject({ replayed: true, session: { turns: [expect.anything()] } });
    expect(service.handle({ ...command, request: { ...request, text: "다른 말" } }, token).status).toBe(409);
    expect(service.handle({ ...command, request: { requestId: randomUUID(), expectedTurn: 2, text: "지금 위험해" } }, token).body).toMatchObject({ session: { status: "safety" } });
    expect(service.handle({ ...command, request: { requestId: randomUUID(), expectedTurn: 3, text: "계속" } }, token).status).toBe(409);
  });
  it("rate limits submissions but permits deletion; deletes expire permanently", () => {
    const { service, id, token, advance } = setup();
    const command = { action: "turn", sessionId: id, request: { requestId: randomUUID(), expectedTurn: 1, text: "확인" } };
    for (let i = 0; i < 12; i++) expect(service.handle(command, token).status).toBe(200);
    expect(service.handle(command, token).status).toBe(429);
    expect(service.handle({ action: "delete", sessionId: id }, token).status).toBe(200);
    expect(service.handle(command, token).status).toBe(404);
    const second = setup(); second.advance(3_600_000);
    expect(second.service.handle({ action: "stop", sessionId: second.id, safety: false }, second.token).status).toBe(404);
    advance(60_001);
  });
  it("bounds unauthenticated starts and recovers after the window", () => {
    const { service, advance } = setup();
    for (let i = 0; i < 9; i++) expect(service.handle({ action: "start", scenarioId: "WORK", consent: true }, null).status).toBe(201);
    expect(service.handle({ action: "start", scenarioId: "WORK", consent: true }, null).status).toBe(429);
    advance(60_001);
    expect(service.handle({ action: "start", scenarioId: "WORK", consent: true }, null).status).toBe(201);
  });
});
