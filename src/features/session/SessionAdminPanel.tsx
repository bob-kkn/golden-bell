import type { Dispatch, SetStateAction } from "react";
import type { SessionAction, SessionSnapshot } from "./sessionReducer";
import type { DraftMarks } from "./sessionHostUtils";
import { markButtonStyle } from "./sessionHostUtils";

interface SessionAdminPanelProps {
  snapshot: SessionSnapshot;
  dispatch: Dispatch<SessionAction>;
  draftMarks: DraftMarks;
  setDraftMarks: Dispatch<SetStateAction<DraftMarks>>;
}

export function SessionAdminPanel({
  snapshot,
  dispatch,
  draftMarks,
  setDraftMarks,
}: SessionAdminPanelProps) {
  const currentQuestion = snapshot.quizSet.questions[snapshot.state.currentQuestionIndex];
  const alreadyScored = currentQuestion
    ? snapshot.state.scoredQuestionIds.includes(currentQuestion.id)
    : false;

  function applyScoring() {
    if (!currentQuestion) {
      return;
    }

    dispatch({
      type: "apply_scoring",
      questionId: currentQuestion.id,
      marks: draftMarks,
    });
  }

  return (
    <>
      <section className="panel stack">
        <div>
          <h2>진행 제어</h2>
          <p className="muted">지금 단계에 맞는 버튼만 활성화됩니다.</p>
        </div>
        <div className="stage-actions">
          {snapshot.state.phase === "intro" ? (
            <button className="action-button" onClick={() => dispatch({ type: "go_to_phase", phase: "rules" })} type="button">
              규칙 보기
            </button>
          ) : null}
          {snapshot.state.phase === "rules" ? (
            <button className="action-button" onClick={() => dispatch({ type: "start_question" })} type="button">
              첫 문제 시작
            </button>
          ) : null}
          {snapshot.state.phase === "question" ? (
            <>
              <button className="action-button" onClick={() => dispatch({ type: "show_answer" })} type="button">
                정답 공개
              </button>
              {snapshot.state.timer.enabled ? (
                <>
                  <button className="ghost-button" onClick={() => dispatch({ type: "toggle_timer" })} type="button">
                    {snapshot.state.timer.running ? "타이머 정지" : "타이머 시작"}
                  </button>
                  <button className="ghost-button" onClick={() => dispatch({ type: "reset_timer" })} type="button">
                    타이머 초기화
                  </button>
                </>
              ) : null}
            </>
          ) : null}
          {snapshot.state.phase === "answer" ? (
            <>
              <button className="action-button" onClick={applyScoring} type="button">
                {alreadyScored ? "이번 문제 점수 다시 반영" : "이번 문제 점수 반영"}
              </button>
              <button
                className="ghost-button"
                onClick={() =>
                  setDraftMarks(
                    snapshot.state.participants.reduce<DraftMarks>((accumulator, participant) => {
                      accumulator[participant.id] = "none";
                      return accumulator;
                    }, {}),
                  )
                }
                type="button"
              >
                채점 선택 초기화
              </button>
              <button className="ghost-button" onClick={() => dispatch({ type: "next_question" })} type="button">
                {snapshot.state.currentQuestionIndex === snapshot.quizSet.questions.length - 1 ? "최종 순위 보기" : "다음 문제"}
              </button>
            </>
          ) : null}
          {snapshot.state.phase !== "intro" &&
          snapshot.state.phase !== "rules" &&
          snapshot.state.currentQuestionIndex > 0 ? (
            <button className="ghost-button" onClick={() => dispatch({ type: "previous_question" })} type="button">
              이전 문제
            </button>
          ) : null}
          {snapshot.state.phase === "leaderboard" ? (
            <button className="ghost-button" onClick={() => dispatch({ type: "go_to_phase", phase: "intro" })} type="button">
              인트로 다시 보기
            </button>
          ) : null}
        </div>
      </section>

      <section className="panel stack">
        <div>
          <h2>학생 채점</h2>
          <p className="muted">
            정답 공개 단계에서 학생별 정답과 오답을 선택한 뒤 반영하세요. 이미 반영한 문항도 다시 수정할 수 있습니다.
          </p>
        </div>
        {snapshot.state.phase !== "answer" || !currentQuestion ? (
          <div className="empty-state">정답 공개 단계가 되면 학생별 채점 버튼이 나타납니다.</div>
        ) : (
          <>
            {alreadyScored ? (
              <div className="help-text">이 문항은 이미 반영되었습니다. 선택을 바꾼 뒤 다시 반영하면 점수가 갱신됩니다.</div>
            ) : null}
            <table className="participants-table">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>현재 점수</th>
                  <th>채점</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.state.participants.map((participant) => (
                  <tr key={participant.id}>
                    <td>{participant.name}</td>
                    <td>{participant.score}점</td>
                    <td>
                      <div className="row-actions">
                        <MarkButton
                          active={draftMarks[participant.id] === "correct"}
                          disabled={false}
                          label="정답"
                          onClick={() =>
                            setDraftMarks((current) => ({
                              ...current,
                              [participant.id]: "correct",
                            }))
                          }
                        />
                        <MarkButton
                          active={draftMarks[participant.id] === "wrong"}
                          disabled={false}
                          label="오답"
                          onClick={() =>
                            setDraftMarks((current) => ({
                              ...current,
                              [participant.id]: "wrong",
                            }))
                          }
                        />
                        <MarkButton
                          active={draftMarks[participant.id] === "none"}
                          disabled={false}
                          label="미채점"
                          onClick={() =>
                            setDraftMarks((current) => ({
                              ...current,
                              [participant.id]: "none",
                            }))
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
    </>
  );
}

function MarkButton({
  active,
  disabled,
  label,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="participant-button"
      disabled={disabled}
      onClick={onClick}
      style={markButtonStyle(active)}
      type="button"
    >
      {label}
    </button>
  );
}
