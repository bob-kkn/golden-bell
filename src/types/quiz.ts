export type QuestionType = "short_text" | "ox" | "manual" | "multiple_choice";
export type SessionPhase = "intro" | "rules" | "question" | "answer" | "leaderboard";

export interface QuizQuestionBase {
  id: string;
  order: number;
  type: QuestionType;
  prompt: string;
  points: number;
  difficulty?: number;
  timerSeconds?: number;
  bonusLabel?: string;
  explanation?: string;
}

export interface ShortTextQuestion extends QuizQuestionBase {
  type: "short_text";
  answerText: string;
}

export interface OxQuestion extends QuizQuestionBase {
  type: "ox";
  correctChoice: "O" | "X";
}

export interface ManualQuestion extends QuizQuestionBase {
  type: "manual";
  answerText?: string;
}

export interface MultipleChoiceQuestion extends QuizQuestionBase {
  type: "multiple_choice";
  choices: string[];
  correctChoiceIndex: number;
}

export type Question = ShortTextQuestion | OxQuestion | ManualQuestion | MultipleChoiceQuestion;

export interface QuizSet {
  id: string;
  subject: string;
  setName: string;
  title: string;
  subtitle?: string;
  themeColor?: string;
  rules: string[];
  questions: Question[];
}

export interface Participant {
  id: string;
  name: string;
  score: number;
  correctCount: number;
  wrongCount: number;
}

export type ParticipantMark = "correct" | "wrong" | "none";
export type ScoringByQuestion = Record<string, Record<string, ParticipantMark>>;

export interface TimerState {
  enabled: boolean;
  duration: number;
  remaining: number;
  running: boolean;
}

export interface SessionState {
  sessionId: string;
  quizSetId: string;
  phase: SessionPhase;
  currentQuestionIndex: number;
  timer: TimerState;
  participants: Participant[];
  scoringByQuestion: ScoringByQuestion;
  scoredQuestionIds: string[];
  lastScoredQuestionId?: string;
  updatedAt: number;
}
