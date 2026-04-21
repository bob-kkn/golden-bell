import type { QuizSet } from "../../types/quiz";
import type { SessionSnapshot } from "./sessionReducer";
import type { PendingSessionSnapshot } from "./useSessionChannel";
import { loadStoredQuizSets } from "../storage/quizStorage";
import { sampleQuizSet } from "../import/sampleQuiz";

export function hydrateSnapshotQuiz(snapshot: PendingSessionSnapshot | null): SessionSnapshot | null {
  if (!snapshot) {
    return null;
  }

  if (snapshot.quizSet) {
    return snapshot as SessionSnapshot;
  }

  const quizSets = [sampleQuizSet, ...loadStoredQuizSets()];
  const quizSet = quizSets.find((item) => item.id === snapshot.state.quizSetId);

  if (!quizSet) {
    return null;
  }

  return {
    quizSet,
    state: snapshot.state,
  };
}

export function resolveQuizSets(): QuizSet[] {
  const stored = loadStoredQuizSets();
  const merged = [sampleQuizSet, ...stored];

  return merged.filter((quizSet, index) => merged.findIndex((item) => item.id === quizSet.id) === index);
}
