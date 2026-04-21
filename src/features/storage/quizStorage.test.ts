import { beforeEach, describe, expect, it, vi } from "vitest";
import { sampleQuizSet } from "../import/sampleQuiz";
import {
  canPersistAppData,
  loadStoredQuizSets,
  loadStoredSessions,
  saveSession,
  SESSION_STORAGE_KEY,
} from "./quizStorage";
import { createInitialSessionState, createParticipants } from "../session/sessionReducer";

describe("quizStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("손상된 문제 세트는 제외하고 정상 데이터만 복원한다", () => {
    window.localStorage.setItem(
      "golden-bell:quiz-sets",
      JSON.stringify([sampleQuizSet, { id: 1, title: "깨짐" }]),
    );

    const quizSets = loadStoredQuizSets();

    expect(quizSets).toHaveLength(1);
    expect(quizSets[0].id).toBe(sampleQuizSet.id);
  });

  it("구버전 세션도 scoringByQuestion 기본값을 채워 복원한다", () => {
    const legacySession = {
      ...createInitialSessionState(sampleQuizSet, createParticipants(["민호"]), "legacy-session"),
    };

    delete (legacySession as { scoringByQuestion?: unknown }).scoringByQuestion;
    delete (legacySession as { scoredQuestionIds?: unknown }).scoredQuestionIds;

    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        [legacySession.sessionId]: legacySession,
      }),
    );

    const sessions = loadStoredSessions();

    expect(sessions["legacy-session"]?.scoringByQuestion).toEqual({});
    expect(sessions["legacy-session"]?.scoredQuestionIds).toEqual([]);
  });

  it("저장 실패 시 false를 반환한다", () => {
    canPersistAppData();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    const result = saveSession(createInitialSessionState(sampleQuizSet, createParticipants(["민호"]), "session-write"));

    expect(result).toBe(false);
  });
});
