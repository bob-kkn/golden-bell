import type { QuizSet } from "../../types/quiz";

export interface ParseQuizRequestMessage {
  type: "parse-quiz";
  requestId: string;
  buffer: ArrayBuffer;
}

export interface ParseQuizSuccessMessage {
  type: "parse-quiz-success";
  requestId: string;
  quizSet: QuizSet;
}

export interface ParseQuizErrorMessage {
  type: "parse-quiz-error";
  requestId: string;
  message: string;
}

export type ParseQuizWorkerMessage = ParseQuizSuccessMessage | ParseQuizErrorMessage;
