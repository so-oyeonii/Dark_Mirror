import { describe, expect, it } from "vitest";
import { applySimulationTurn, createSimulationSession, detectSimulationExit, endSimulation, getSuggestedReplies, MAX_SIMULATION_TURNS, modelOutputSchema, SCENARIOS, SIMULATION_TTL, simulationFeedback, simulationSessionSchema } from "@/lib/simulation";

const request = (expectedTurn = 1, text = "내 생각을 차분하게 말해볼게요.") => ({ requestId: crypto.randomUUID(), expectedTurn, text });
const session = () => createSimulationSession("LOVE", 1000, crypto.randomUUID());

describe("bounded local simulation", () => {
  it("loads three real versioned seeds but produces no computed personality claims", () => {
    expect(SCENARIOS.map(item => item.id)).toEqual(["LOVE", "FRIEND", "WORK"]);
    expect(MAX_SIMULATION_TURNS).toBe(5);
    expect(getSuggestedReplies()).toHaveLength(3);
    expect(simulationFeedback(session()).observedPattern).toContain("0번 답변");
  });
  it("accepts a single turn with a schema-validated fixture and no mutation", () => {
    const initial = session();
    const result = applySimulationTurn(initial, request(), 1001);
    expect(initial.turns).toHaveLength(0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.turns).toHaveLength(1);
    expect(modelOutputSchema.safeParse(result.output).success).toBe(true);
    expect(result.output.suggestedReplies).toHaveLength(3);
  });
  it("same request ID retries return the same response, different payload conflicts", () => {
    const input = request();
    const first = applySimulationTurn(session(), input, 1001);
    if (!first.ok) throw new Error("first turn failed");
    const next = applySimulationTurn(first.session, request(2), 1002);
    if (!next.ok) throw new Error("second turn failed");
    const retry = applySimulationTurn(next.session, input, 1003);
    expect(retry.ok).toBe(true);
    if (retry.ok) { expect(retry.replayed).toBe(true); expect(retry.output).toEqual(first.output); expect(retry.session.turns).toHaveLength(2); }
    expect(applySimulationTurn(next.session, { ...input, text: "다른 내용" }, 1003)).toMatchObject({ ok: false, code: "conflict" });
  });
  it("rejects skipped/stale turns, invalid request IDs and long or empty replies", () => {
    for (const input of [request(2), request(0), request(6), request(1, " "), request(1, "가".repeat(501)), { ...request(), requestId: "bad" }]) expect(applySimulationTurn(session(), input, 1001).ok).toBe(false);
    expect(applySimulationTurn(session(), request(1, "가".repeat(500)), 1001).ok).toBe(true);
  });
  it("requires choice text to match and counts input method only", () => {
    expect(applySimulationTurn(session(), { ...request(), choiceId: "a" }, 1001).ok).toBe(false);
    const choice = getSuggestedReplies()[0];
    const result = applySimulationTurn(session(), { ...request(1, choice.label), choiceId: choice.id }, 1001);
    if (!result.ok) throw new Error("choice failed");
    expect(simulationFeedback(result.session).observedPattern).toContain("선택지를 1번, 직접 입력을 0번");
  });
  it("completes after exactly five turns and rejects additional new requests", () => {
    let current = session();
    let last = request();
    for (let index = 1; index <= 5; index++) {
      last = request(index);
      const result = applySimulationTurn(current, last, 1000 + index);
      if (!result.ok) throw new Error(result.message);
      current = result.session;
    }
    expect(current.status).toBe("completed");
    expect(current.turns).toHaveLength(5);
    expect(applySimulationTurn(current, request(5), 1010)).toMatchObject({ ok: false, code: "ended" });
    expect(applySimulationTurn(current, last, 1010)).toMatchObject({ ok: true, replayed: true });
  });
  it("stops on an explicit stop request and transitions self-harm/immediate danger to support", () => {
    for (const text of ["그만할래요", "중단해 주세요", "stop"]) {
      const result = applySimulationTurn(session(), request(1, text), 1001);
      expect(result.ok && result.session.status).toBe("stopped");
    }
    for (const text of ["죽고 싶어요", "자해하고 싶어요", "지금 위험해요", "살려주세요"]) {
      const result = applySimulationTurn(session(), request(1, text), 1001);
      expect(result.ok && result.session.status).toBe("safety");
    }
    expect(detectSimulationExit("상황을 확인하고 싶어요")).toBeNull();
  });
  it("manual stop/support needs no turn and cannot reopen a closed scene", () => {
    const stopped = endSimulation(session(), "safety", 1001);
    expect(stopped.turns).toHaveLength(0);
    expect(stopped.status).toBe("safety");
    expect(applySimulationTurn(stopped, request(), 1002)).toMatchObject({ ok: false, code: "ended" });
    expect(endSimulation(stopped, "stopped", 1003)).toEqual(stopped);
  });
  it("enforces creation-based expiry and rejects corrupt state/model JSON", () => {
    const initial = session();
    expect(applySimulationTurn(initial, request(), initial.createdAt + SIMULATION_TTL)).toMatchObject({ ok: false, code: "expired" });
    expect(simulationSessionSchema.safeParse({ ...initial, expiresAt: initial.expiresAt + 1 }).success).toBe(false);
    expect(simulationSessionSchema.safeParse({ ...initial, status: "completed", endedAt: 1000 }).success).toBe(false);
    expect(modelOutputSchema.safeParse({ characterMessage: "가".repeat(181), suggestedReplies: getSuggestedReplies(), sceneStatus: "active" }).success).toBe(false);
    expect(modelOutputSchema.safeParse({ characterMessage: "대사", suggestedReplies: [getSuggestedReplies()[0], getSuggestedReplies()[0], getSuggestedReplies()[0]], sceneStatus: "active" }).success).toBe(false);
  });
});
