import type { Profile } from "./profile";
import type { FiveElement } from "./saju-contract";

export const ELEMENTS: { id: FiveElement; label: string; color: string }[] = [
  { id: "wood", label: "목(木)", color: "#b5dfcc" },
  { id: "fire", label: "화(火)", color: "#efb4a6" },
  { id: "earth", label: "토(土)", color: "#e2c991" },
  { id: "metal", label: "금(金)", color: "#d4e4ef" },
  { id: "water", label: "수(水)", color: "#a6cae8" },
];

// Authored prompts, not a psychological assessment or generated AI response.
export const MBTI_REFLECTIONS: Record<Exclude<Profile["mbti"], "">, string> = {
  ISTJ: "익숙한 약속을 지키는 것과 지금의 필요를 듣는 것 사이에서, 오늘 조정할 수 있는 한 가지는 무엇인가요?",
  ISFJ: "누군가를 챙기기 전에 내 여유도 살펴본다면, 어떤 부탁에 잠시 시간을 달라고 말하고 싶나요?",
  INFJ: "상대의 마음을 짐작한 순간, 내 해석과 실제로 들은 말을 어떻게 구분할 수 있을까요?",
  INTJ: "함께 세운 계획이 달라졌을 때, 해결책을 제안하기 전에 어떤 마음부터 물어보고 싶나요?",
  ISTP: "혼자 정리할 시간이 필요하다면, 상대가 기다릴 수 있도록 어떤 말로 알려줄 수 있을까요?",
  ISFP: "분위기를 편안하게 지키면서도 내 취향을 드러낼 수 있는 작은 표현은 무엇인가요?",
  INFP: "내가 소중히 여기는 가치가 다르게 받아들여졌을 때, 어떤 경험을 예로 들어 설명하고 싶나요?",
  INTP: "생각을 더 정리하고 싶은 순간, 결론을 기다리는 상대에게 지금의 마음을 어떻게 전할까요?",
  ESTP: "바로 행동하고 싶은 상황에서, 함께하는 사람의 속도를 확인할 질문은 무엇인가요?",
  ESFP: "함께 즐거운 시간을 보낸 뒤, 미처 말하지 못한 내 필요가 있다면 어떻게 꺼내고 싶나요?",
  ENFP: "새로운 가능성을 나눌 때, 지금 함께할 수 있는 일 한 가지를 어떻게 정하면 좋을까요?",
  ENTP: "서로 다른 생각을 나누는 대화에서, 상대가 토론보다 공감을 원한다는 신호는 무엇일까요?",
  ESTJ: "역할을 나누기 전에, 각자가 편하게 맡을 수 있는 범위를 어떤 말로 물어볼까요?",
  ESFJ: "모두의 기대를 확인하는 동안, 내가 정말 원하는 선택도 말할 자리가 있었나요?",
  ENFJ: "상대에게 도움이 되고 싶은 순간, 조언이 필요한지 먼저 어떻게 확인할 수 있을까요?",
  ENTJ: "함께 목표를 향해 갈 때, 속도뿐 아니라 서로의 부담을 확인하는 방법은 무엇일까요?",
};

export const ELEMENT_NOTE = "천간과 지지의 대표 오행 개수예요. 지장간·강약·길흉·운세 확률을 뜻하지 않아요.";
export const NARRATIVE_NOTE = "계산값과 선택한 MBTI에 맞춰 보여주는 제한된 고정 문구예요. AI가 생성한 해석이 아니며, 진단이나 미래 예측이 아닙니다.";

export function elementSummary(elements: Record<FiveElement, number>): string {
  const highest = Math.max(...ELEMENTS.map(({ id }) => elements[id]));
  const names = ELEMENTS.filter(({ id }) => elements[id] === highest).map(({ label }) => label).join(", ");
  return `표시한 글자에서는 ${names}이(가) ${highest}개로 가장 많이 나타나요. 개수만으로 성격이나 관계를 판단할 수 없어요.`;
}
