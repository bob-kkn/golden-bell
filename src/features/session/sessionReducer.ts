import type {
  Participant,
  ParticipantMark,
  Question,
  QuizSet,
  ScoringByQuestion,
  SessionPhase,
  SessionState,
  TimerState,
} from "../../types/quiz";

export interface SessionSnapshot {
  quizSet: QuizSet;
  state: SessionState;
}

export type SessionAction =
  | { type: "go_to_phase"; phase: SessionPhase }
  | { type: "start_question" }
  | { type: "show_answer" }
  | { type: "next_question" }
  | { type: "previous_question" }
  | { type: "advance_stage" }
  | { type: "retreat_stage" }
  | { type: "toggle_timer" }
  | { type: "tick" }
  | { type: "reset_timer" }
  | {
      type: "apply_scoring";
      questionId: string;
      marks: Record<string, ParticipantMark>;
    };

function buildTimer(question?: Question): TimerState {
  const duration = question?.timerSeconds ?? 0;

  return {
    enabled: duration > 0,
    duration,
    remaining: duration,
    running: false,
  };
}

export function createParticipants(names: string[]): Participant[] {
  return names
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name, index) => ({
      id: `participant-${index + 1}-${name}`,
      name,
      score: 0,
      correctCount: 0,
      wrongCount: 0,
    }));
}

export function createInitialSessionState(
  quizSet: QuizSet,
  participants: Participant[],
  sessionId: string = crypto.randomUUID(),
): SessionState {
  return {
    sessionId,
    quizSetId: quizSet.id,
    phase: "intro",
    currentQuestionIndex: 0,
    timer: buildTimer(quizSet.questions[0]),
    participants,
    scoringByQuestion: {},
    scoredQuestionIds: [],
    updatedAt: Date.now(),
  };
}

function withUpdatedTimestamp(state: SessionState): SessionState {
  return {
    ...state,
    updatedAt: Date.now(),
  };
}

function getCurrentQuestion(quizSet: QuizSet, state: SessionState): Question | undefined {
  return quizSet.questions[state.currentQuestionIndex];
}

export function getAnswerText(question: Question): string {
  if (question.type === "ox") {
    return question.correctChoice;
  }

  if (question.type === "multiple_choice") {
    return `${question.correctChoiceIndex + 1}번`;
  }

  return question.answerText ?? "진행자 확인";
}

export function getLeaderboard(participants: Participant[]): Array<Participant & { rank: number }> {
  const sorted = [...participants].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    if (right.correctCount !== left.correctCount) {
      return right.correctCount - left.correctCount;
    }

    return left.name.localeCompare(right.name, "ko");
  });

  let previousScore: number | null = null;
  let previousCorrect: number | null = null;
  let previousRank = 0;

  return sorted.map((participant, index) => {
    let rank = index + 1;

    if (previousScore === participant.score && previousCorrect === participant.correctCount) {
      rank = previousRank;
    }

    previousScore = participant.score;
    previousCorrect = participant.correctCount;
    previousRank = rank;

    return {
      ...participant,
      rank,
    };
  });
}

function createBaseParticipants(participants: Participant[]): Participant[] {
  return participants.map((participant) => ({
    id: participant.id,
    name: participant.name,
    score: 0,
    correctCount: 0,
    wrongCount: 0,
  }));
}

function hasMeaningfulMark(marks: Record<string, ParticipantMark>): boolean {
  return Object.values(marks).some((mark) => mark !== "none");
}

function normalizeMarks(
  participants: Participant[],
  marks: Record<string, ParticipantMark>,
): Record<string, ParticipantMark> {
  return participants.reduce<Record<string, ParticipantMark>>((accumulator, participant) => {
    accumulator[participant.id] = marks[participant.id] ?? "none";
    return accumulator;
  }, {});
}

function rebuildParticipants(
  quizSet: QuizSet,
  participants: Participant[],
  scoringByQuestion: ScoringByQuestion,
): Participant[] {
  const rebuiltParticipants = createBaseParticipants(participants);
  const participantMap = new Map(rebuiltParticipants.map((participant) => [participant.id, participant]));

  for (const question of quizSet.questions) {
    const marks = scoringByQuestion[question.id];

    if (!marks) {
      continue;
    }

    for (const participant of rebuiltParticipants) {
      const currentParticipant = participantMap.get(participant.id);

      if (!currentParticipant) {
        continue;
      }

      const mark = marks[participant.id] ?? "none";

      if (mark === "correct") {
        currentParticipant.score += question.points;
        currentParticipant.correctCount += 1;
      } else if (mark === "wrong") {
        currentParticipant.wrongCount += 1;
      }
    }
  }

  return rebuiltParticipants;
}

function getScoredQuestionIds(quizSet: QuizSet, scoringByQuestion: ScoringByQuestion): string[] {
  return quizSet.questions
    .map((question) => question.id)
    .filter((questionId) => Boolean(scoringByQuestion[questionId]));
}

function advanceStage(snapshot: SessionSnapshot): SessionSnapshot {
  const { state } = snapshot;

  switch (state.phase) {
    case "intro":
      return sessionReducer(snapshot, { type: "go_to_phase", phase: "rules" });
    case "rules":
      return sessionReducer(snapshot, { type: "start_question" });
    case "question":
      return sessionReducer(snapshot, { type: "show_answer" });
    case "answer":
      return sessionReducer(snapshot, { type: "next_question" });
    case "leaderboard":
      return sessionReducer(snapshot, { type: "go_to_phase", phase: "intro" });
    default:
      return snapshot;
  }
}

function retreatStage(snapshot: SessionSnapshot): SessionSnapshot {
  const { quizSet, state } = snapshot;

  switch (state.phase) {
    case "intro":
      return snapshot;
    case "rules":
      return sessionReducer(snapshot, { type: "go_to_phase", phase: "intro" });
    case "question":
      if (state.currentQuestionIndex === 0) {
        return sessionReducer(snapshot, { type: "go_to_phase", phase: "rules" });
      }

      return {
        quizSet,
        state: withUpdatedTimestamp({
          ...state,
          currentQuestionIndex: state.currentQuestionIndex - 1,
          phase: "answer",
          timer: {
            ...buildTimer(quizSet.questions[state.currentQuestionIndex - 1]),
            running: false,
          },
        }),
      };
    case "answer":
      return sessionReducer(snapshot, { type: "go_to_phase", phase: "question" });
    case "leaderboard":
      return sessionReducer(snapshot, { type: "go_to_phase", phase: "answer" });
    default:
      return snapshot;
  }
}

export function sessionReducer(snapshot: SessionSnapshot, action: SessionAction): SessionSnapshot {
  const { quizSet, state } = snapshot;
  const currentQuestion = getCurrentQuestion(quizSet, state);

  switch (action.type) {
    case "go_to_phase":
      return {
        quizSet,
        state: withUpdatedTimestamp({
          ...state,
          phase: action.phase,
          timer: action.phase === "question" ? buildTimer(currentQuestion) : state.timer,
        }),
      };

    case "start_question":
      return {
        quizSet,
        state: withUpdatedTimestamp({
          ...state,
          phase: "question",
          timer: buildTimer(currentQuestion),
        }),
      };

    case "show_answer":
      return {
        quizSet,
        state: withUpdatedTimestamp({
          ...state,
          phase: "answer",
          timer: {
            ...state.timer,
            running: false,
          },
        }),
      };

    case "next_question": {
      if (state.currentQuestionIndex >= quizSet.questions.length - 1) {
        return {
          quizSet,
          state: withUpdatedTimestamp({
            ...state,
            phase: "leaderboard",
            timer: buildTimer(undefined),
          }),
        };
      }

      const nextIndex = state.currentQuestionIndex + 1;

      return {
        quizSet,
        state: withUpdatedTimestamp({
          ...state,
          currentQuestionIndex: nextIndex,
          phase: "question",
          timer: buildTimer(quizSet.questions[nextIndex]),
          lastScoredQuestionId: undefined,
        }),
      };
    }

    case "previous_question": {
      const previousIndex = Math.max(0, state.currentQuestionIndex - 1);

      return {
        quizSet,
        state: withUpdatedTimestamp({
          ...state,
          currentQuestionIndex: previousIndex,
          phase: "question",
          timer: buildTimer(quizSet.questions[previousIndex]),
        }),
      };
    }

    case "advance_stage":
      return advanceStage(snapshot);

    case "retreat_stage":
      return retreatStage(snapshot);

    case "toggle_timer":
      if (!state.timer.enabled) {
        return snapshot;
      }

      return {
        quizSet,
        state: withUpdatedTimestamp({
          ...state,
          timer: {
            ...state.timer,
            running: !state.timer.running,
          },
        }),
      };

    case "tick":
      if (!state.timer.enabled || !state.timer.running) {
        return snapshot;
      }

      return {
        quizSet,
        state: withUpdatedTimestamp({
          ...state,
          timer: {
            ...state.timer,
            remaining: Math.max(0, state.timer.remaining - 1),
            running: state.timer.remaining > 1,
          },
        }),
      };

    case "reset_timer":
      return {
        quizSet,
        state: withUpdatedTimestamp({
          ...state,
          timer: buildTimer(currentQuestion),
        }),
      };

    case "apply_scoring":
      if (!currentQuestion) {
        return snapshot;
      }

      const normalizedMarks = normalizeMarks(state.participants, action.marks);
      const nextScoringByQuestion = {
        ...state.scoringByQuestion,
      };

      if (hasMeaningfulMark(normalizedMarks)) {
        nextScoringByQuestion[action.questionId] = normalizedMarks;
      } else {
        delete nextScoringByQuestion[action.questionId];
      }

      const nextParticipants = rebuildParticipants(quizSet, state.participants, nextScoringByQuestion);

      return {
        quizSet,
        state: withUpdatedTimestamp({
          ...state,
          participants: nextParticipants,
          scoringByQuestion: nextScoringByQuestion,
          scoredQuestionIds: getScoredQuestionIds(quizSet, nextScoringByQuestion),
          lastScoredQuestionId: hasMeaningfulMark(normalizedMarks) ? action.questionId : undefined,
        }),
      };

    default:
      return snapshot;
  }
}
