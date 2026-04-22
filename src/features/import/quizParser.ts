import type { Question, QuizSet } from "../../types/quiz";

const REQUIRED_QUESTION_HEADERS = ["order", "type", "prompt", "answer", "points"] as const;
const CHOICE_HEADER_PATTERN = /^choice(\d+)$/;

export interface WorksheetTableData {
  headers: string[];
  rows: Record<string, unknown>[];
}

export interface QuizWorkbookData {
  meta: WorksheetTableData;
  rules: WorksheetTableData;
  questions: WorksheetTableData;
}

function normalizeString(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeType(value: string): Question["type"] | null {
  const normalized = value.trim().toLowerCase();

  if (normalized === "short_text" || normalized === "shorttext" || normalized === "short") {
    return "short_text";
  }

  if (normalized === "ox" || normalized === "o/x") {
    return "ox";
  }

  if (normalized === "manual") {
    return "manual";
  }

  if (
    normalized === "multiple_choice" ||
    normalized === "multiple-choice" ||
    normalized === "multiplechoice" ||
    normalized === "choice" ||
    normalized === "mcq"
  ) {
    return "multiple_choice";
  }

  return null;
}

function getChoiceHeaders(headers: string[]): string[] {
  return headers
    .map((header) => {
      const match = header.match(CHOICE_HEADER_PATTERN);
      return match ? { header, order: Number(match[1]) } : null;
    })
    .filter((item): item is { header: string; order: number } => item !== null)
    .sort((left, right) => left.order - right.order)
    .map((item) => item.header);
}

function ensureThemeColor(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.startsWith("#") ? value : `#${value}`;
  return /^#[0-9A-Fa-f]{6}$/.test(normalized) ? normalized : undefined;
}

function parseInteger(value: unknown, fieldName: string, rowIndex: number): number {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) {
    throw new Error(`questions 시트 ${rowIndex}행의 ${fieldName} 값은 정수여야 합니다.`);
  }

  return numeric;
}

function buildQuestion(row: Record<string, unknown>, rowIndex: number, headers: string[]): Question {
  const order = parseInteger(row.order, "order", rowIndex);

  if (order < 1) {
    throw new Error(`questions 시트 ${rowIndex}행의 order 값은 1 이상이어야 합니다.`);
  }

  const type = normalizeType(normalizeString(row.type));

  if (!type) {
    throw new Error(
      `questions 시트 ${rowIndex}행의 type 값은 short_text, ox, manual, multiple_choice 중 하나여야 합니다.`,
    );
  }

  const prompt = normalizeString(row.prompt);
  const rawAnswer = normalizeString(row.answer);
  const points = Number(row.points);

  if (!prompt) {
    throw new Error(`questions 시트 ${rowIndex}행의 prompt 값이 비어 있습니다.`);
  }

  if (!Number.isFinite(points) || points < 0) {
    throw new Error(`questions 시트 ${rowIndex}행의 points 값은 0 이상의 숫자여야 합니다.`);
  }

  const timerValue = normalizeString(row.timerSeconds);
  const timerSeconds = timerValue ? parseInteger(timerValue, "timerSeconds", rowIndex) : undefined;

  const difficultyValue = normalizeString(row.difficulty);
  const difficulty = difficultyValue ? parseInteger(difficultyValue, "difficulty", rowIndex) : undefined;

  if (difficulty !== undefined && difficulty < 1) {
    throw new Error(`questions 시트 ${rowIndex}행의 difficulty 값은 1 이상이어야 합니다.`);
  }

  const bonusLabel = normalizeString(row.bonusLabel) || undefined;
  const explanation = normalizeString(row.explanation) || undefined;

  const base = {
    id: `question-${order}`,
    order,
    type,
    prompt,
    points,
    difficulty,
    timerSeconds,
    bonusLabel,
    explanation,
  } as const;

  if (type === "short_text") {
    if (!rawAnswer) {
      throw new Error(`questions 시트 ${rowIndex}행의 answer 값이 비어 있습니다.`);
    }

    return {
      ...base,
      type,
      answerText: rawAnswer,
    };
  }

  if (type === "ox") {
    const upper = rawAnswer.toUpperCase();

    if (upper !== "O" && upper !== "X") {
      throw new Error(`questions 시트 ${rowIndex}행의 ox 문항 answer 값은 O 또는 X여야 합니다.`);
    }

    return {
      ...base,
      type,
      correctChoice: upper,
    };
  }

  if (type === "multiple_choice") {
    const choiceHeaders = getChoiceHeaders(headers);
    const rawChoices = choiceHeaders.map((header) => normalizeString(row[header]));
    const firstBlankIndex = rawChoices.findIndex((choice) => !choice);

    if (firstBlankIndex >= 0 && rawChoices.slice(firstBlankIndex + 1).some(Boolean)) {
      throw new Error(`questions 시트 ${rowIndex}행의 choice 컬럼은 앞에서부터 순서대로 채워야 합니다.`);
    }

    const choices = rawChoices.filter(Boolean);

    if (choices.length < 2) {
      throw new Error(`questions 시트 ${rowIndex}행의 multiple_choice 문항은 최소 2개의 choice 값이 필요합니다.`);
    }

    const answerNumber = parseInteger(rawAnswer, "answer", rowIndex);

    if (answerNumber < 1 || answerNumber > choices.length) {
      throw new Error(
        `questions 시트 ${rowIndex}행의 multiple_choice 문항 answer 값은 1~${choices.length} 사이여야 합니다.`,
      );
    }

    return {
      ...base,
      type,
      choices,
      correctChoiceIndex: answerNumber - 1,
    };
  }

  return {
    ...base,
    type,
    answerText: rawAnswer || undefined,
  };
}

export function parseQuizData(workbookData: QuizWorkbookData): QuizSet {
  const metaTable = workbookData.meta;
  const ruleTable = workbookData.rules;
  const questionTable = workbookData.questions;

  if (metaTable.rows.length === 0) {
    throw new Error("meta 시트에는 최소 1행의 정보가 필요합니다.");
  }

  const meta = metaTable.rows[0];
  const subject = normalizeString(meta.subject);
  const setName = normalizeString(meta.setName);
  const title = normalizeString(meta.title);
  const subtitle = normalizeString(meta.subtitle) || undefined;
  const themeColor = ensureThemeColor(normalizeString(meta.themeColor));

  if (!subject || !setName || !title) {
    throw new Error("meta 시트에는 subject, setName, title 값이 모두 필요합니다.");
  }

  if (questionTable.rows.length === 0) {
    throw new Error("questions 시트에는 최소 1개의 문항이 필요합니다.");
  }

  for (const header of REQUIRED_QUESTION_HEADERS) {
    if (!questionTable.headers.includes(header)) {
      throw new Error(`questions 시트에 ${header} 컬럼이 없습니다.`);
    }
  }

  const rules = ruleTable.rows.map((row) => normalizeString(row.rule)).filter(Boolean);

  if (rules.length === 0) {
    throw new Error("rules 시트에는 최소 1개의 rule 값이 필요합니다.");
  }

  const questions = questionTable.rows.map((row, index) => buildQuestion(row, index + 2, questionTable.headers));
  const orderSet = new Set<number>();

  for (const question of questions) {
    if (orderSet.has(question.order)) {
      throw new Error(`questions 시트에 중복된 order 값(${question.order})이 있습니다.`);
    }

    orderSet.add(question.order);
  }

  questions.sort((a, b) => a.order - b.order);

  return {
    id: `${subject}-${setName}`.toLowerCase().replace(/\s+/g, "-"),
    subject,
    setName,
    title,
    subtitle,
    themeColor,
    rules,
    questions,
  };
}
