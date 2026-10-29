import { z } from "zod";
import source from "../../product/SCENARIOS.json";

export const scenarioIdSchema = z.enum(["LOVE", "FRIEND", "WORK"]);
export type ScenarioId = z.infer<typeof scenarioIdSchema>;
const sourceSchema = z.object({ version: z.string(), maxUserTurns: z.literal(5), scenarios: z.array(z.object({ id: scenarioIdSchema, title: z.string(), opening: z.string().max(180), learningObjective: z.string() })).length(3) });
const scenarios = sourceSchema.parse(source);
export const SCENARIOS = scenarios.scenarios;
export const SCENARIO_VERSION = scenarios.version;
export const PROMPT_VERSION = "bounded-local-fixture-v1";
export const MAX_SIMULATION_TURNS = scenarios.maxUserTurns;
export const SIMULATION_TTL = 24 * 60 * 60 * 1000;
export const suggestedReplySchema = z.object({ id: z.enum(["a", "b", "c"]), label: z.string().trim().min(1).max(100) });
export const modelOutputSchema = z.object({
  characterMessage: z.string().trim().min(1).max(180),
  suggestedReplies: z.array(suggestedReplySchema).length(3).refine(items => new Set(items.map(item => item.id)).size === 3, "선택지 ID는 서로 달라야 합니다."),
  sceneStatus: z.enum(["active", "completed", "stopped"]),
}).strict();
export const feedbackSchema = z.object({ observedPattern: z.string(), responseReflection: z.string(), alternativeResponse: z.string(), reflectionQuestions: z.array(z.string()).length(2), disclaimer: z.literal("이 체험은 연습용이며 실제 관계나 성격을 진단하지 않습니다.") });
export const simulationTurnRequestSchema = z.object({ requestId: z.uuid(), expectedTurn: z.number().int().min(1).max(MAX_SIMULATION_TURNS), text: z.string().trim().min(1).max(500), choiceId: z.enum(["a", "b", "c"]).optional() }).strict();
export type SimulationTurnRequest = z.infer<typeof simulationTurnRequestSchema>;
const turnSchema = simulationTurnRequestSchema.extend({ output: modelOutputSchema });
export const simulationSessionSchema = z.object({
  id: z.uuid(), scenarioId: scenarioIdSchema, scenarioVersion: z.literal(SCENARIO_VERSION), promptVersion: z.literal(PROMPT_VERSION),
  status: z.enum(["active", "completed", "stopped", "safety"]), turns: z.array(turnSchema).max(MAX_SIMULATION_TURNS),
  createdAt: z.number().int().nonnegative(), updatedAt: z.number().int().nonnegative(), expiresAt: z.number().int().nonnegative(), endedAt: z.number().int().nonnegative().nullable(),
}).superRefine((session, ctx) => {
  const invalidTime = session.expiresAt !== session.createdAt + SIMULATION_TTL || session.updatedAt < session.createdAt || session.updatedAt >= session.expiresAt;
  const invalidEnd = session.status === "active" ? session.endedAt !== null || session.turns.length >= MAX_SIMULATION_TURNS : session.endedAt === null || session.endedAt < session.createdAt || session.endedAt > session.updatedAt;
  const invalidCompletion = session.status === "completed" && (session.turns.length !== MAX_SIMULATION_TURNS || session.turns.at(-1)?.output.sceneStatus !== "completed");
  const invalidTurns = new Set(session.turns.map(turn => turn.requestId)).size !== session.turns.length || session.turns.some((turn, index) => turn.expectedTurn !== index + 1 || (index < session.turns.length - 1 && turn.output.sceneStatus !== "active") || (turn.choiceId && getSuggestedReplies().find(item => item.id === turn.choiceId)?.label !== turn.text));
  const invalidLast = session.status === "active" && session.turns.some(turn => turn.output.sceneStatus !== "active");
  const invalidStopped = (session.status === "stopped" || session.status === "safety") && session.turns.at(-1)?.output.sceneStatus === "completed";
  const invalidExit = session.turns.some((turn, index) => { const exit = detectSimulationExit(turn.text); return exit !== null && (index !== session.turns.length - 1 || session.status !== exit || turn.output.sceneStatus !== "stopped"); });
  if (invalidTime || invalidEnd || invalidCompletion || invalidTurns || invalidLast || invalidStopped || invalidExit) ctx.addIssue({ code: "custom", message: "대화 기록 상태가 올바르지 않아요." });
});
export type SimulationSession = z.infer<typeof simulationSessionSchema>;
export type SimulationTurnResult = { ok: true; session: SimulationSession; replayed: boolean; output: z.infer<typeof modelOutputSchema> } | { ok: false; code: "invalid" | "missing" | "expired" | "conflict" | "ended" | "turn"; message: string };

export function getSuggestedReplies() {
  return [
    { id: "a" as const, label: "내가 느낀 점부터 차분히 말하고 싶어요." },
    { id: "b" as const, label: "서로 알고 있는 상황을 먼저 확인해 볼까요?" },
    { id: "c" as const, label: "잠시 쉬었다가 다시 이야기하고 싶어요." },
  ];
}

export function detectSimulationExit(text: string): "stopped" | "safety" | null {
  const compact = text.replace(/\s/g, "");
  if (/(자해|자살|죽고싶|목숨을끊|스스로를해치|나를해치|지금.{0,15}(위험|폭행|때리고|칼을|죽이)|당장.{0,15}(위험|도움|해치)|살려줘|살려주세요)/i.test(compact)) return "safety";
  if (/(그만|중단|멈춰|멈추|끝내|종료|stop)/i.test(compact)) return "stopped";
  return null;
}

const FIXTURE_MESSAGES = [
  "서로 기억하는 내용을 하나씩 확인해 보자. 지금 바로 결론을 내리지 않아도 괜찮아.",
  "이번에는 서로 바라는 점을 한 가지씩 말해 보자. 의견이 달라도 서두르지 않을게.",
  "가능한 부분과 어려운 부분을 나눠 이야기해 보자. 쉬는 시간이 필요하면 멈춰도 괜찮아.",
  "지금 합의할 수 있는 작은 부분부터 확인해 보자. 나머지는 다음에 이야기해도 돼.",
  "오늘의 연습은 여기까지 할게. 어떤 표현을 써보고 싶었는지 천천히 돌아봐도 좋아.",
];

export function createSimulationSession(scenarioId: ScenarioId, now: number, id: string): SimulationSession {
  return simulationSessionSchema.parse({ id, scenarioId, scenarioVersion: SCENARIO_VERSION, promptVersion: PROMPT_VERSION, status: "active", turns: [], createdAt: now, updatedAt: now, expiresAt: now + SIMULATION_TTL, endedAt: null });
}

export function applySimulationTurn(session: SimulationSession, input: unknown, now: number): SimulationTurnResult {
  const parsed = simulationTurnRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid", message: "답변은 1~500자이며 올바른 요청 정보가 필요해요." };
  const request = parsed.data;
  if (session.expiresAt <= now || now < session.updatedAt) return { ok: false, code: "expired", message: "대화 기록이 만료되었어요. 새 체험을 시작해 주세요." };
  const previous = session.turns.find(turn => turn.requestId === request.requestId);
  if (previous) {
    const same = previous.expectedTurn === request.expectedTurn && previous.text === request.text && previous.choiceId === request.choiceId;
    return same ? { ok: true, session, replayed: true, output: previous.output } : { ok: false, code: "conflict", message: "같은 요청 번호로 다른 답변을 보낼 수 없어요." };
  }
  if (session.status !== "active") return { ok: false, code: "ended", message: "이미 끝난 체험에는 답변을 추가할 수 없어요." };
  if (request.expectedTurn !== session.turns.length + 1) return { ok: false, code: "turn", message: "답변 순서가 맞지 않아요. 현재 대화를 확인해 주세요." };
  if (request.choiceId && getSuggestedReplies().find(reply => reply.id === request.choiceId)?.label !== request.text) return { ok: false, code: "invalid", message: "선택지와 답변이 일치하지 않아요." };
  const exit = detectSimulationExit(request.text);
  const status = exit ?? (request.expectedTurn === MAX_SIMULATION_TURNS ? "completed" : "active");
  const output = modelOutputSchema.parse({ characterMessage: exit ? "역할극을 끝냈어요. 지금은 답변을 이어가지 않아도 괜찮아요." : FIXTURE_MESSAGES[request.expectedTurn - 1], suggestedReplies: getSuggestedReplies(), sceneStatus: status === "safety" ? "stopped" : status });
  const next = simulationSessionSchema.parse({ ...session, status, turns: [...session.turns, { ...request, output }], updatedAt: now, endedAt: status === "active" ? null : now });
  return { ok: true, session: next, replayed: false, output };
}

export function endSimulation(session: SimulationSession, status: "stopped" | "safety", now: number): SimulationSession {
  if (session.status !== "active" || session.expiresAt <= now || now < session.updatedAt) return session;
  return simulationSessionSchema.parse({ ...session, status, updatedAt: now, endedAt: now });
}

export function simulationFeedback(session: SimulationSession) {
  const choices = session.turns.filter(turn => turn.choiceId !== undefined).length;
  return feedbackSchema.parse({
    observedPattern: `이번 로컬 체험에서 ${session.turns.length}번 답변했어요. 선택지를 ${choices}번, 직접 입력을 ${session.turns.length - choices}번 사용했어요.`,
    responseReflection: "자유 입력의 감정이나 의미를 AI로 분석하지 않았어요. 이 안내는 답변 횟수와 입력 방식만 확인한 고정 문구예요.",
    alternativeResponse: "나는 지금 이렇게 느끼고 있어요. 서로 확인할 수 있는 사실부터 이야기해 볼까요?",
    reflectionQuestions: ["다음에 비슷한 대화를 한다면 어떤 말을 먼저 꺼내고 싶나요?", "내가 편안하게 대화하기 위해 필요한 경계나 쉬는 시간은 무엇인가요?"],
    disclaimer: "이 체험은 연습용이며 실제 관계나 성격을 진단하지 않습니다.",
  });
}
