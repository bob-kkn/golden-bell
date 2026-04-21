import { describe, expect, it } from "vitest";
import { sampleQuizSet } from "../import/sampleQuiz";
import { createInitialSessionState, createParticipants, getLeaderboard, sessionReducer } from "./sessionReducer";

describe("sessionReducer", () => {
  it("문제 진행과 점수 반영이 동작한다", () => {
    const participants = createParticipants(["민호", "수아"]);
    let snapshot = {
      quizSet: sampleQuizSet,
      state: createInitialSessionState(sampleQuizSet, participants, "session-1"),
    };

    snapshot = sessionReducer(snapshot, { type: "go_to_phase", phase: "rules" });
    expect(snapshot.state.phase).toBe("rules");

    snapshot = sessionReducer(snapshot, { type: "start_question" });
    expect(snapshot.state.phase).toBe("question");
    expect(snapshot.state.timer.enabled).toBe(true);

    snapshot = sessionReducer(snapshot, { type: "toggle_timer" });
    snapshot = sessionReducer(snapshot, { type: "tick" });
    expect(snapshot.state.timer.remaining).toBe(sampleQuizSet.questions[0].timerSeconds! - 1);

    snapshot = sessionReducer(snapshot, { type: "show_answer" });
    expect(snapshot.state.phase).toBe("answer");

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

    snapshot = sessionReducer(snapshot, { type: "next_question" });
    expect(snapshot.state.currentQuestionIndex).toBe(1);
    expect(snapshot.state.phase).toBe("question");
  });

  it("이미 채점한 문항도 다시 반영하면 점수가 재계산된다", () => {
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

    expect(snapshot.state.participants[0].score).toBe(1);
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
    expect(snapshot.state.participants[1].score).toBe(1);
    expect(snapshot.state.participants[1].wrongCount).toBe(0);
    expect(snapshot.state.scoredQuestionIds).toEqual([sampleQuizSet.questions[0].id]);
  });

  it("단일 화면 이전 이동은 이전 문제의 정답 공개로 돌아간다", () => {
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

  it("동점은 공동 순위로 계산한다", () => {
    const leaderboard = getLeaderboard([
      { id: "1", name: "민호", score: 5, correctCount: 2, wrongCount: 0 },
      { id: "2", name: "수아", score: 5, correctCount: 2, wrongCount: 1 },
      { id: "3", name: "지후", score: 3, correctCount: 1, wrongCount: 0 },
    ]);

    expect(leaderboard[0].rank).toBe(1);
    expect(leaderboard[1].rank).toBe(1);
    expect(leaderboard[2].rank).toBe(3);
  });
});
