import type {
  Participant,
  ParticipantMark,
  Question,
  QuizSet,
  SessionState,
  ScoringByQuestion,
} from "../../types/quiz";
import { emitStorageNotice, rememberStorageNotice } from "./storageNotice";

const QUIZ_STORAGE_KEY = "golden-bell:quiz-sets";
export const SESSION_STORAGE_KEY = "golden-bell:sessions";
const STORAGE_PROBE_KEY = "golden-bell:storage-probe";

let storageCapability: boolean | null = null;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function canPersistAppData(): boolean {
  if (!canUseStorage()) {
    rememberStorageNotice("브라우저 저장소를 사용할 수 없어 세트와 진행 상태를 보관할 수 없습니다.", "storage-unavailable");
    storageCapability = false;
    return false;
  }

  if (storageCapability !== null) {
    return storageCapability;
  }

  try {
    window.localStorage.setItem(STORAGE_PROBE_KEY, "ok");
    window.localStorage.removeItem(STORAGE_PROBE_KEY);
    storageCapability = true;
    return true;
  } catch {
    rememberStorageNotice("브라우저 저장소 접근이 차단되어 세션을 시작할 수 없습니다.", "storage-blocked");
    storageCapability = false;
    return false;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isQuestion(value: unknown): value is Question {
  if (!isObject(value)) {
    return false;
  }

  if (
    typeof value.id !== "string" ||
    typeof value.order !== "number" ||
    typeof value.prompt !== "string" ||
    typeof value.points !== "number"
  ) {
    return false;
  }

  if (
    value.type !== "short_text" &&
    value.type !== "ox" &&
    value.type !== "manual" &&
    value.type !== "multiple_choice"
  ) {
    return false;
  }

  if (value.timerSeconds !== undefined && typeof value.timerSeconds !== "number") {
    return false;
  }

  if (
    value.difficulty !== undefined &&
    (typeof value.difficulty !== "number" || !Number.isInteger(value.difficulty) || value.difficulty < 1)
  ) {
    return false;
  }

  if (value.bonusLabel !== undefined && typeof value.bonusLabel !== "string") {
    return false;
  }

  if (value.explanation !== undefined && typeof value.explanation !== "string") {
    return false;
  }

  if (value.type === "short_text") {
    return typeof value.answerText === "string";
  }

  if (value.type === "ox") {
    return value.correctChoice === "O" || value.correctChoice === "X";
  }

  if (value.type === "multiple_choice") {
    return (
      Array.isArray(value.choices) &&
      value.choices.length >= 2 &&
      value.choices.every((choice) => typeof choice === "string") &&
      typeof value.correctChoiceIndex === "number" &&
      Number.isInteger(value.correctChoiceIndex) &&
      value.correctChoiceIndex >= 0 &&
      value.correctChoiceIndex < value.choices.length
    );
  }

  return value.answerText === undefined || typeof value.answerText === "string";
}

function isQuizSet(value: unknown): value is QuizSet {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.subject === "string" &&
    typeof value.setName === "string" &&
    typeof value.title === "string" &&
    (value.subtitle === undefined || typeof value.subtitle === "string") &&
    (value.themeColor === undefined || typeof value.themeColor === "string") &&
    Array.isArray(value.rules) &&
    value.rules.every((rule) => typeof rule === "string") &&
    Array.isArray(value.questions) &&
    value.questions.every((question) => isQuestion(question))
  );
}

function isParticipant(value: unknown): value is Participant {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.score === "number" &&
    typeof value.correctCount === "number" &&
    typeof value.wrongCount === "number"
  );
}

function isParticipantMark(value: unknown): value is ParticipantMark {
  return value === "correct" || value === "wrong" || value === "none";
}

function normalizeScoringByQuestion(value: unknown): ScoringByQuestion {
  if (!isObject(value)) {
    return {};
  }

  return Object.entries(value).reduce<ScoringByQuestion>((accumulator, [questionId, marks]) => {
    if (!isObject(marks)) {
      return accumulator;
    }

    const normalizedMarks = Object.entries(marks).reduce<Record<string, ParticipantMark>>(
      (marksAccumulator, [participantId, mark]) => {
        if (isParticipantMark(mark)) {
          marksAccumulator[participantId] = mark;
        }

        return marksAccumulator;
      },
      {},
    );

    if (Object.keys(normalizedMarks).length > 0) {
      accumulator[questionId] = normalizedMarks;
    }

    return accumulator;
  }, {});
}

function isSessionState(value: unknown): value is SessionState {
  return (
    isObject(value) &&
    typeof value.sessionId === "string" &&
    typeof value.quizSetId === "string" &&
    (value.phase === "intro" ||
      value.phase === "rules" ||
      value.phase === "question" ||
      value.phase === "answer" ||
      value.phase === "leaderboard") &&
    typeof value.currentQuestionIndex === "number" &&
    typeof value.timerModeEnabled === "boolean" &&
    isObject(value.timer) &&
    typeof value.timer.available === "boolean" &&
    typeof value.timer.enabled === "boolean" &&
    typeof value.timer.duration === "number" &&
    typeof value.timer.remaining === "number" &&
    typeof value.timer.running === "boolean" &&
    Array.isArray(value.participants) &&
    value.participants.every((participant) => isParticipant(participant)) &&
    isObject(value.scoringByQuestion) &&
    Array.isArray(value.scoredQuestionIds) &&
    value.scoredQuestionIds.every((item) => typeof item === "string") &&
    (value.lastScoredQuestionId === undefined || typeof value.lastScoredQuestionId === "string") &&
    typeof value.updatedAt === "number"
  );
}

function normalizeSessionState(value: unknown): SessionState | null {
  if (!isObject(value)) {
    return null;
  }

  const scoringByQuestion = normalizeScoringByQuestion(value.scoringByQuestion);
  const scoredQuestionIds = Object.keys(scoringByQuestion);
  const rawTimer = isObject(value.timer) ? value.timer : {};
  const duration = typeof rawTimer.duration === "number" ? rawTimer.duration : 0;
  const available = typeof rawTimer.available === "boolean" ? rawTimer.available : duration > 0;
  const timerModeEnabled =
    typeof value.timerModeEnabled === "boolean"
      ? value.timerModeEnabled
      : typeof rawTimer.enabled === "boolean"
        ? rawTimer.enabled
        : false;
  const timerEnabled = timerModeEnabled && available;
  const remaining =
    typeof rawTimer.remaining === "number"
      ? Math.max(0, Math.min(rawTimer.remaining, duration))
      : duration;
  const running = timerEnabled && rawTimer.running === true && remaining > 0;
  const normalizedState = {
    ...value,
    timerModeEnabled,
    timer: {
      available,
      enabled: timerEnabled,
      duration,
      remaining,
      running,
    },
    scoringByQuestion,
    scoredQuestionIds:
      Array.isArray(value.scoredQuestionIds) && value.scoredQuestionIds.every((item) => typeof item === "string")
        ? value.scoredQuestionIds
        : scoredQuestionIds,
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : Date.now(),
  };

  return isSessionState(normalizedState) ? normalizedState : null;
}

function writeStorage(key: string, value: string, message: string, dedupeKey: string): boolean {
  if (!canPersistAppData()) {
    return false;
  }

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    emitStorageNotice(message, dedupeKey);
    return false;
  }
}

export function loadStoredQuizSets(): QuizSet[] {
  if (!canPersistAppData()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(QUIZ_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      rememberStorageNotice("저장된 문제 세트 형식이 올바르지 않아 업로드 목록을 복원하지 못했습니다.", "invalid-quiz-storage");
      return [];
    }

    const validQuizSets = parsed.filter((item) => isQuizSet(item));

    if (validQuizSets.length !== parsed.length) {
      rememberStorageNotice("일부 저장된 문제 세트가 손상되어 제외했습니다.", "partial-quiz-storage");
      writeStorage(
        QUIZ_STORAGE_KEY,
        JSON.stringify(validQuizSets),
        "문제 세트 정리 중 저장에 실패했습니다.",
        "quiz-storage-rewrite-failed",
      );
    }

    return validQuizSets;
  } catch {
    rememberStorageNotice("저장된 문제 세트를 읽지 못해 업로드 목록을 초기화했습니다.", "quiz-storage-read-failed");
    return [];
  }
}

export function saveQuizSet(quizSet: QuizSet): boolean {
  const existing = loadStoredQuizSets().filter((item) => item.id !== quizSet.id);
  return writeStorage(
    QUIZ_STORAGE_KEY,
    JSON.stringify([quizSet, ...existing]),
    "문제 세트를 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.",
    "quiz-storage-write-failed",
  );
}

export function loadStoredSessions(): Record<string, SessionState> {
  if (!canPersistAppData()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);

    if (!isObject(parsed)) {
      rememberStorageNotice("저장된 세션 형식이 올바르지 않아 복원하지 못했습니다.", "invalid-session-storage");
      return {};
    }

    const normalizedSessions = Object.entries(parsed).reduce<Record<string, SessionState>>(
      (accumulator, [sessionId, state]) => {
        const normalizedState = normalizeSessionState(state);

        if (normalizedState) {
          accumulator[sessionId] = normalizedState;
        }

        return accumulator;
      },
      {},
    );

    if (Object.keys(normalizedSessions).length !== Object.keys(parsed).length) {
      rememberStorageNotice("일부 저장된 세션이 손상되어 제외했습니다.", "partial-session-storage");
      writeStorage(
        SESSION_STORAGE_KEY,
        JSON.stringify(normalizedSessions),
        "손상된 세션 정리 중 저장에 실패했습니다.",
        "session-storage-rewrite-failed",
      );
    }

    return normalizedSessions;
  } catch {
    rememberStorageNotice("저장된 세션을 읽지 못해 복원을 건너뛰었습니다.", "session-storage-read-failed");
    return {};
  }
}

export function loadStoredSession(sessionId: string): SessionState | null {
  const sessions = loadStoredSessions();
  return sessions[sessionId] ?? null;
}

export function saveSession(session: SessionState): boolean {
  const sessions = loadStoredSessions();
  sessions[session.sessionId] = session;
  return writeStorage(
    SESSION_STORAGE_KEY,
    JSON.stringify(sessions),
    "진행 상태를 저장하지 못했습니다. 새로고침하면 세션이 복원되지 않을 수 있습니다.",
    "session-storage-write-failed",
  );
}
