import { describe, expect, it } from "vitest";
import { sampleQuizSet } from "../import/sampleQuiz";
import { createInitialSessionState, createParticipants, getAnswerText, getLeaderboard, sessionReducer } from "./sessionReducer";

describe("sessionReducer", () => {
  it("타이머는 기본적으로 꺼진 상태로 시작한다", () => {
    const participants = createParticipants(["민호"]);
    const snapshot = {
      quizSet: sampleQuizSet,
      state: createInitialSessionState(sampleQuizSet, participants, "session-timer-default"),
    };

    expect(snapshot.state.timerModeEnabled).toBe(false);
    expect(snapshot.state.timer.available).toBe(true);
    expect(snapshot.state.timer.enabled).toBe(false);
  });

  it("타이머 옵션을 켜면 문항 타이머를 사용할 수 있다", () => {
    const participants = createParticipants(["민호", "수아"]);
    let snapshot = {
      quizSet: sampleQuizSet,
      state: createInitialSessionState(sampleQuizSet, participants, "session-1"),
    };

    snapshot = sessionReducer(snapshot, { type: "go_to_phase", phase: "rules" });
    expect(snapshot.state.phase).toBe("rules");

    snapshot = sessionReducer(snapshot, { type: "start_question" });
    expect(snapshot.state.phase).toBe("question");
    expect(snapshot.state.timer.enabled).toBe(false);

    snapshot = sessionReducer(snapshot, { type: "toggle_timer_mode" });
    expect(snapshot.state.timerModeEnabled).toBe(true);
    expect(snapshot.state.timer.enabled).toBe(true);

    snapshot = sessionReducer(snapshot, { type: "toggle_timer" });
    snapshot = sessionReducer(snapshot, { type: "tick" });
    expect(snapshot.state.timer.remaining).toBe(sampleQuizSet.questions[0].timerSeconds! - 1);

    snapshot = sessionReducer(snapshot, { type: "show_answer" });
    expect(snapshot.state.phase).toBe("answer");
  });

  it("이미 채점한 문항을 다시 반영하면 점수가 재계산된다", () => {
    const participants = createParticipants(["민호", "수아"]);
    let snapshot = {
      quizSet: sampleQuizSet,
      state: createInitialSessionState(sampleQuizSet, participants, "session-2"),
    };

    snapshot = sessionReducer(snapshot, { type: "start_question" });
    snapshot = sessionReducer(snapshot, { type: "show_answer" });
    snapshot = sessionReducer(snapshot, {
      type: "apply_scoring",
      questionId: sampleQuizSet.questions[0].id,
      marks: {
        [participants[0].id]: "correct",
        [participants[1].id]: "wrong",
      },
    });

    expect(snapshot.state.participants[0].score).toBe(sampleQuizSet.questions[0].points);
    expect(snapshot.state.participants[1].wrongCount).toBe(1);

    snapshot = sessionReducer(snapshot, {
      type: "apply_scoring",
      questionId: sampleQuizSet.questions[0].id,
      marks: {
        [participants[0].id]: "wrong",
        [participants[1].id]: "correct",
      },
    });

    expect(snapshot.state.participants[0].score).toBe(0);
    expect(snapshot.state.participants[0].wrongCount).toBe(1);
    expect(snapshot.state.participants[1].score).toBe(sampleQuizSet.questions[0].points);
    expect(snapshot.state.participants[1].wrongCount).toBe(0);
    expect(snapshot.state.scoredQuestionIds).toEqual([sampleQuizSet.questions[0].id]);
  });

  it("단일 화면 이전 이동은 이전 문항의 정답 공개로 돌아간다", () => {
    const participants = createParticipants(["민호"]);
    let snapshot = {
      quizSet: sampleQuizSet,
      state: createInitialSessionState(sampleQuizSet, participants, "session-3"),
    };

    snapshot = sessionReducer(snapshot, { type: "start_question" });
    snapshot = sessionReducer(snapshot, { type: "show_answer" });
    snapshot = sessionReducer(snapshot, { type: "next_question" });
    snapshot = sessionReducer(snapshot, { type: "retreat_stage" });

    expect(snapshot.state.currentQuestionIndex).toBe(0);
    expect(snapshot.state.phase).toBe("answer");
  });

  it("동점은 공동 순위로 계산된다", () => {
    const leaderboard = getLeaderboard([
      { id: "1", name: "민호", score: 5, correctCount: 2, wrongCount: 0 },
      { id: "2", name: "수아", score: 5, correctCount: 2, wrongCount: 1 },
      { id: "3", name: "지우", score: 3, correctCount: 1, wrongCount: 0 },
    ]);

    expect(leaderboard[0].rank).toBe(1);
    expect(leaderboard[1].rank).toBe(1);
    expect(leaderboard[2].rank).toBe(3);
  });

  it("객관식 정답은 보기 번호로 표시된다", () => {
    const question = sampleQuizSet.questions.find((item) => item.type === "multiple_choice");

    if (!question || question.type !== "multiple_choice") {
      throw new Error("객관식 샘플 문항을 찾지 못했습니다.");
    }

    expect(getAnswerText(question)).toBe(`${question.correctChoiceIndex + 1}번`);
  });
});
