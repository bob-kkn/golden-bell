import { describe, expect, it } from "vitest";
import { getSingleScreenAdvanceActions, getSingleScreenRetreatActions } from "./singleScreenProgress";
import type { SessionState } from "../../types/quiz";

function createState(
  phase: SessionState["phase"],
  currentQuestionIndex: number = 0,
): SessionState {
  return {
    sessionId: "session-1",
    quizSetId: "quiz-1",
    phase,
    currentQuestionIndex,
    timerModeEnabled: false,
    timer: {
      available: false,
      enabled: false,
      duration: 0,
      remaining: 0,
      running: false,
    },
    participants: [],
    scoringByQuestion: {},
    scoredQuestionIds: [],
    updatedAt: Date.now(),
  };
}

describe("single-screen progress", () => {
  it("인트로에서 다음으로 가면 규칙으로 이동한다", () => {
    expect(getSingleScreenAdvanceActions(createState("intro"))).toEqual([{ type: "advance_stage" }]);
  });

  it("문제에서 다음으로 가면 정답 공개로 이동한다", () => {
    expect(getSingleScreenAdvanceActions(createState("question"))).toEqual([{ type: "advance_stage" }]);
  });

  it("정답 공개에서 다음으로 가면 다음 문제로 이동한다", () => {
    expect(getSingleScreenAdvanceActions(createState("answer"))).toEqual([{ type: "advance_stage" }]);
  });

  it("규칙에서 이전으로 가면 인트로로 이동한다", () => {
    expect(getSingleScreenRetreatActions(createState("rules"))).toEqual([{ type: "retreat_stage" }]);
  });

  it("두 번째 문제에서 이전으로 가면 이전 문제의 정답 화면으로 이동한다", () => {
    expect(getSingleScreenRetreatActions(createState("question", 1))).toEqual([{ type: "retreat_stage" }]);
  });

  it("정답 공개에서 이전으로 가면 같은 문제의 문제 화면으로 이동한다", () => {
    expect(getSingleScreenRetreatActions(createState("answer", 2))).toEqual([{ type: "retreat_stage" }]);
  });
});
