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

function parsePositiveInteger(value: unknown, fieldName: string, rowIndex: number): number {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || !Number.isInteger(numeric)) {
    throw new Error(`questions \uc2dc\ud2b8 ${rowIndex}\ud589\uc758 ${fieldName} \uac12\uc740 \uc815\uc218\uc5ec\uc57c \ud569\ub2c8\ub2e4.`);
  }

  return numeric;
}

function buildQuestion(row: Record<string, unknown>, rowIndex: number, headers: string[]): Question {
  const order = parsePositiveInteger(row.order, "order", rowIndex);

  if (order < 1) {
    throw new Error(`questions \uc2dc\ud2b8 ${rowIndex}\ud589\uc758 order \uac12\uc740 1 \uc774\uc0c1\uc774\uc5b4\uc57c \ud569\ub2c8\ub2e4.`);
  }

  const type = normalizeType(normalizeString(row.type));

  if (!type) {
    throw new Error(
      `questions \uc2dc\ud2b8 ${rowIndex}\ud589\uc758 type \uac12\uc740 short_text, ox, manual, multiple_choice \uc911 \ud558\ub098\uc5ec\uc57c \ud569\ub2c8\ub2e4.`,
    );
  }

  const prompt = normalizeString(row.prompt);
  const rawAnswer = normalizeString(row.answer);
  const points = Number(row.points);

  if (!prompt) {
    throw new Error(`questions \uc2dc\ud2b8 ${rowIndex}\ud589\uc758 prompt \uac12\uc774 \ube44\uc5b4 \uc788\uc2b5\ub2c8\ub2e4.`);
  }

  if (!Number.isFinite(points) || points < 0) {
    throw new Error(`questions \uc2dc\ud2b8 ${rowIndex}\ud589\uc758 points \uac12\uc740 0 \uc774\uc0c1\uc758 \uc22b\uc790\uc5ec\uc57c \ud569\ub2c8\ub2e4.`);
  }

  const timerValue = normalizeString(row.timerSeconds);
  const timerSeconds = timerValue ? parsePositiveInteger(timerValue, "timerSeconds", rowIndex) : undefined;
  const bonusLabel = normalizeString(row.bonusLabel) || undefined;
  const explanation = normalizeString(row.explanation) || undefined;
  const base = {
    id: `question-${order}`,
    order,
    type,
    prompt,
    points,
    timerSeconds,
    bonusLabel,
    explanation,
  } as const;

  if (type === "short_text") {
    if (!rawAnswer) {
      throw new Error(`questions \uc2dc\ud2b8 ${rowIndex}\ud589\uc758 answer \uac12\uc774 \ube44\uc5b4 \uc788\uc2b5\ub2c8\ub2e4.`);
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
      throw new Error(`questions \uc2dc\ud2b8 ${rowIndex}\ud589\uc758 ox \ubb38\ud56d answer \uac12\uc740 O \ub610\ub294 X\uc5ec\uc57c \ud569\ub2c8\ub2e4.`);
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
      throw new Error(
        `questions \uc2dc\ud2b8 ${rowIndex}\ud589\uc758 choice \uceec\ub7fc\uc740 \uc55e\uc5d0\uc11c\ubd80\ud130 \uc21c\uc11c\ub300\ub85c \ucc44\uc6cc\uc57c \ud569\ub2c8\ub2e4.`,
      );
    }

    const choices = rawChoices.filter(Boolean);

    if (choices.length < 2) {
      throw new Error(
        `questions \uc2dc\ud2b8 ${rowIndex}\ud589\uc758 multiple_choice \ubb38\ud56d\uc740 \ucd5c\uc18c 2\uac1c \uc774\uc0c1\uc758 choice \uac12\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.`,
      );
    }

    const answerNumber = parsePositiveInteger(rawAnswer, "answer", rowIndex);

    if (answerNumber < 1 || answerNumber > choices.length) {
      throw new Error(
        `questions \uc2dc\ud2b8 ${rowIndex}\ud589\uc758 multiple_choice \ubb38\ud56d answer \uac12\uc740 1~${choices.length} \uc0ac\uc774\uc5ec\uc57c \ud569\ub2c8\ub2e4.`,
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
    throw new Error("meta \uc2dc\ud2b8\uc5d0\ub294 \ucd5c\uc18c 1\ud589\uc758 \uc815\ubcf4\uac00 \ud544\uc694\ud569\ub2c8\ub2e4.");
  }

  const meta = metaTable.rows[0];
  const subject = normalizeString(meta.subject);
  const setName = normalizeString(meta.setName);
  const title = normalizeString(meta.title);
  const subtitle = normalizeString(meta.subtitle) || undefined;
  const themeColor = ensureThemeColor(normalizeString(meta.themeColor));

  if (!subject || !setName || !title) {
    throw new Error("meta \uc2dc\ud2b8\uc5d0\ub294 subject, setName, title \uac12\uc774 \ubaa8\ub450 \ud544\uc694\ud569\ub2c8\ub2e4.");
  }

  if (questionTable.rows.length === 0) {
    throw new Error("questions \uc2dc\ud2b8\uc5d0\ub294 \ucd5c\uc18c 1\uac1c\uc758 \ubb38\ud56d\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.");
  }

  for (const header of REQUIRED_QUESTION_HEADERS) {
    if (!questionTable.headers.includes(header)) {
      throw new Error(`questions \uc2dc\ud2b8\uc5d0 ${header} \uceec\ub7fc\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.`);
    }
  }

  const rules = ruleTable.rows.map((row) => normalizeString(row.rule)).filter(Boolean);

  if (rules.length === 0) {
    throw new Error("rules \uc2dc\ud2b8\uc5d0\ub294 \ucd5c\uc18c 1\uac1c\uc758 rule \uac12\uc774 \ud544\uc694\ud569\ub2c8\ub2e4.");
  }

  const questions = questionTable.rows.map((row, index) => buildQuestion(row, index + 2, questionTable.headers));
  const orderSet = new Set<number>();

  for (const question of questions) {
    if (orderSet.has(question.order)) {
      throw new Error(`questions \uc2dc\ud2b8\uc5d0 \uc911\ubcf5\ub41c order \uac12(${question.order})\uc774 \uc788\uc2b5\ub2c8\ub2e4.`);
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
