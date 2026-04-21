import { loadStoredSession } from "../storage/quizStorage";
import { resolveQuizSets } from "./sessionPersistence";
import type { SessionSnapshot } from "./sessionReducer";
import type { ParticipantMark, SessionState } from "../../types/quiz";

export type DraftMarks = Record<string, "correct" | "wrong" | "none">;

export function buildInitialSnapshot(sessionId: string): SessionSnapshot | null {
  const storedState = loadStoredSession(sessionId);

  if (!storedState) {
    return null;
  }

  const quizSet = resolveQuizSets().find((item) => item.id === storedState.quizSetId);

  if (!quizSet) {
    return null;
  }

  return {
    quizSet,
    state: storedState,
  };
}

export function createEmptyMarks(participantIds: string[]): DraftMarks {
  return participantIds.reduce<DraftMarks>((accumulator, participantId) => {
    accumulator[participantId] = "none";
    return accumulator;
  }, {});
}

export function getDraftMarksForQuestion(
  state: SessionState,
  questionId: string | undefined,
): Record<string, ParticipantMark> {
  const emptyMarks = createEmptyMarks(state.participants.map((participant) => participant.id));

  if (!questionId) {
    return emptyMarks;
  }

  return {
    ...emptyMarks,
    ...(state.scoringByQuestion[questionId] ?? {}),
  };
}

export function markButtonStyle(active: boolean) {
  return active
    ? {
        borderColor: "var(--accent)",
        background: "var(--accent-soft)",
        color: "var(--accent-strong)",
      }
    : undefined;
}

export function getPhaseLabel(phase: SessionSnapshot["state"]["phase"]): string {
  if (phase === "intro") {
    return "인트로";
  }

  if (phase === "rules") {
    return "규칙";
  }

  if (phase === "question") {
    return "문제";
  }

  if (phase === "answer") {
    return "정답 공개";
  }

  return "최종 순위";
}
