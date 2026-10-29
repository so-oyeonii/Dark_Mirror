import { z } from "zod";
import source from "../../product/QUESTIONS.json";

const dimensionSchema = z.enum(["boundary", "approval", "conflict", "perspective", "uncertainty"]);
export type Dimension = z.infer<typeof dimensionSchema>;
const questionnaireSchema = z.object({
  version: z.string().min(1),
  validation: z.string(),
  responseScale: z.object({ min: z.literal(1), max: z.literal(5) }),
  dimensions: z.record(dimensionSchema, z.string()),
  items: z.array(z.object({ id: z.string(), dimension: dimensionSchema, text: z.string().min(1), reverse: z.boolean() })).length(15),
}).superRefine((data, ctx) => {
  if (new Set(data.items.map(item => item.id)).size !== 15) ctx.addIssue({ code: "custom", message: "Question IDs must be unique" });
  for (const dimension of dimensionSchema.options) {
    if (data.items.filter(item => item.dimension === dimension).length !== 3) ctx.addIssue({ code: "custom", message: `Expected 3 items for ${dimension}` });
  }
});

const questionnaire = questionnaireSchema.parse(source);
export const QUESTIONS = questionnaire.items;
export const QUESTION_VERSION = questionnaire.version;
export const SCORING_VERSION = "mean-reverse-v1";
const questionIds = new Set(QUESTIONS.map(item => item.id));

// Interface wording does not alter the versioned question texts or scoring keys.
export const RESPONSE_OPTIONS = [
  { value: 1, label: "전혀 그렇지 않다" },
  { value: 2, label: "그렇지 않은 편이다" },
  { value: 3, label: "보통이다" },
  { value: 4, label: "그런 편이다" },
  { value: 5, label: "매우 그렇다" },
];

const dimensionCopy: Record<Dimension, { meaning: string; reflection: string }> = {
  boundary: { meaning: "높을수록 나의 의견과 한계를 표현한다고 답한 경향이에요.", reflection: "최근 편하게 표현할 수 있었던 경계와 말하기 어려웠던 경계는 무엇인가요?" },
  approval: { meaning: "높을수록 선택할 때 다른 사람의 인정과 평가를 중요하게 여긴다고 답한 경향이에요.", reflection: "누군가의 평가와 나의 바람이 달랐을 때 무엇을 기준으로 선택했나요?" },
  conflict: { meaning: "높을수록 불편한 대화나 의견 충돌을 피하거나 미룬다고 답한 경향이에요.", reflection: "미뤄둔 대화가 있다면 어떤 조건에서 더 편하게 시작할 수 있을까요?" },
  perspective: { meaning: "높을수록 다른 사람의 상황과 관점을 고려한다고 답한 경향이에요.", reflection: "상대의 입장을 이해하면서도 내 생각을 함께 표현할 수 있었던 순간은 언제인가요?" },
  uncertainty: { meaning: "높을수록 뜻이 분명하지 않은 상황에서 여러 가능성을 열어둔다고 답한 경향이에요.", reflection: "관계가 모호하게 느껴질 때 나에게 필요한 정보와 기다릴 수 있는 부분은 무엇인가요?" },
};
export const DIMENSIONS = dimensionSchema.options.map(id => ({ id, label: questionnaire.dimensions[id].split(" (")[0], ...dimensionCopy[id] }));
export const answerValueSchema = z.number().int().min(1).max(5);
export const answersSchema = z.record(z.string(), answerValueSchema).superRefine((answers, ctx) => {
  if (Object.keys(answers).some(id => !questionIds.has(id))) ctx.addIssue({ code: "custom", message: "알 수 없는 문항이 포함되어 있어요." });
});
export const completeAnswersSchema = answersSchema.refine(answers => QUESTIONS.every(item => answers[item.id] !== undefined), "15개 문항에 모두 답해 주세요.");

export function scoreAnswers(input: Record<string, number>): Record<Dimension, number> {
  const answers = completeAnswersSchema.parse(input);
  const scores = {} as Record<Dimension, number>;
  for (const { id } of DIMENSIONS) {
    const sum = QUESTIONS.filter(question => question.dimension === id).reduce((total, question) => {
      const value = answers[question.id];
      return total + (question.reverse ? 6 - value : value);
    }, 0);
    scores[id] = Math.round(((sum / 3 - 1) / 4) * 1000) / 10;
  }
  return scores;
}
