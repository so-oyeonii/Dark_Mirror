"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAssessment } from "@/components/assessment-provider";
import { Button, ButtonLink, Card, Notice, PageIntro } from "@/components/ui";
import { QUESTIONS, QUESTION_VERSION, RESPONSE_OPTIONS } from "@/lib/assessment";

export function TestExperience() {
  const assessment = useAssessment();
  const router = useRouter();
  const [restartRequested, setRestartRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const questionRef = useRef<HTMLLegendElement>(null);
  const active = assessment.active;
  const activeId = active?.id;
  const currentIndex = active?.currentIndex;

  useEffect(() => {
    if (assessment.ready && activeId) questionRef.current?.focus();
  }, [assessment.ready, activeId, currentIndex]);

  if (!assessment.ready) return <p role="status">진행 중인 답변을 확인하고 있어요.</p>;

  const question = active ? QUESTIONS[active.currentIndex] : undefined;
  const selected = question && active ? active.answers[question.id] : undefined;
  const answeredCount = active ? QUESTIONS.filter((item) => active.answers[item.id] !== undefined).length : 0;
  const isLast = active?.currentIndex === QUESTIONS.length - 1;

  function move(offset: number) {
    if (!active) return;
    const success = assessment.goTo(active.id, active.currentIndex + offset);
    setError(success ? null : "현재 문항에 답한 뒤 다음으로 이동해 주세요.");
  }

  function finish() {
    if (!active) return;
    const id = assessment.complete(active.id);
    if (id) router.push(`/result/${encodeURIComponent(id)}`);
    else setError("모든 문항에 답했는지 확인해 주세요. 답변은 그대로 유지됩니다.");
  }

  return (
    <div className={`page-stack narrow-page${active && question ? " test-page--active" : ""}`}>
      {active && question ? (
        <header className="test-compact-intro">
          <h1>관계 성향 테스트</h1>
          <p>나를 돌아보는 참고용 질문이에요.<br />검증된 심리검사나 진단 도구가 아니에요.</p>
        </header>
      ) : (
        <>
          <PageIntro eyebrow="관계 성향 테스트" title="관계 속 나를 돌아보는 질문" description="정답은 없어요. 요즘의 나와 가장 가까운 답을 골라 주세요." />
          <Notice title="나를 알아가는 참고 자료예요">
            이 테스트는 임상적으로 검증된 심리검사나 진단 도구가 아니에요. 5가지 성향을 따로 살펴보며, 점수의 높고 낮음이 좋고 나쁨을 뜻하지 않아요.
          </Notice>
        </>
      )}
      {assessment.notice && <Notice role="status">{assessment.notice}</Notice>}

      {!active || !question ? (
        <Card className="section-stack">
          <h2>15개의 질문, 나의 속도로</h2>
          <p className="muted">이름이나 출생정보를 입력하지 않아도 시작할 수 있어요. 한 문항씩 답하고, 이전 질문으로 돌아가 답을 바꿀 수도 있어요.</p>
          <p className="test-local-note">답변과 결과는 이 탭에 임시 보관됩니다. 저장이 제한된 환경에서는 현재 화면에서만 유지돼요. 계정에 저장되거나 다른 사람에게 공개되지 않아요.</p>
          <div className="actions"><Button onClick={() => { assessment.start(); setError(null); }}>15문항 시작하기</Button><ButtonLink href="/me" variant="secondary">내 검사 기록</ButtonLink></div>
        </Card>
      ) : (
        <>
          <div className="test-progress">
            <div className="test-progress-caption"><span>문항 {active.currentIndex + 1} / {QUESTIONS.length}</span><span className="muted">{answeredCount}개 답변 완료</span></div>
            <progress aria-label="답변 완료 진행률" value={answeredCount} max={QUESTIONS.length} />
          </div>
          <Card className="question-card">
            <fieldset className="question-fieldset" aria-describedby="answer-instruction">
              <legend ref={questionRef} tabIndex={-1}>{question.text}</legend>
              <div className="answer-options">
                {RESPONSE_OPTIONS.map((option) => (
                  <label className="answer-option" key={option.value}>
                    <input type="radio" name={question.id} value={option.value} checked={selected === option.value} onChange={() => {
                      const success = assessment.answer(active.id, question.id, option.value);
                      setError(success ? null : "답변을 반영하지 못했어요. 다시 선택해 주세요.");
                    }} />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <p id="answer-instruction" className="field-hint">선택한 답은 임시 저장돼요.</p>
            {error && <p className="field-error" role="alert">{error}</p>}
            <div className="test-controls">
              <Button variant="secondary" disabled={active.currentIndex === 0} onClick={() => move(-1)}>이전 문항</Button>
              {isLast ? <Button disabled={answeredCount !== QUESTIONS.length} onClick={finish}>결과 보기</Button> : <Button disabled={selected === undefined} onClick={() => move(1)}>다음 문항</Button>}
            </div>
          </Card>
          <p className="test-local-note">{assessment.mode === "memory" ? "현재 화면에서만 유지 중 · 새로고침하거나 나가면 답변이 사라질 수 있어요." : "이 탭에 임시 저장 중 · 같은 탭에서 다시 방문하면 이어서 답할 수 있어요. 검사 시작 후 24시간이 지나면 만료돼요."}</p>
          {restartRequested ? (
            <div className="inline-confirmation" role="group" aria-labelledby="restart-title">
              <h2 id="restart-title">진행 중인 답변을 지우고 다시 시작할까요?</h2>
              <p>지금 답한 내용은 삭제됩니다. 이전에 완료한 검사 기록은 유지돼요.</p>
              <div className="actions"><Button variant="secondary" onClick={() => setRestartRequested(false)}>계속 이어서 답하기</Button><Button variant="danger" onClick={() => { assessment.restart(); setRestartRequested(false); setError(null); }}>답변 지우고 다시 시작</Button></div>
            </div>
          ) : (
            <div className="test-secondary-actions"><ButtonLink href="/me" variant="ghost">나중에 이어서 하기</ButtonLink><Button variant="ghost" onClick={() => setRestartRequested(true)}>처음부터 다시 시작</Button></div>
          )}
        </>
      )}
      <p className="test-local-note">탭 복원·복제 시 기록이 남을 수 있어 공용 기기에서는 마이 화면에서 검사 기록을 삭제해 주세요.</p>
      <p className="field-hint">문항 버전 {QUESTION_VERSION} · 사주와 MBTI는 이 테스트의 점수에 반영되지 않아요.</p>
    </div>
  );
}
