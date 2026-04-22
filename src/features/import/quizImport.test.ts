import { describe, expect, it } from "vitest";
import { parseQuizData, type QuizWorkbookData } from "./quizParser";

function createWorkbookData(): QuizWorkbookData {
  return {
    meta: {
      headers: ["subject", "setName", "title", "subtitle", "themeColor"],
      rows: [
        {
          subject: "국어",
          setName: "3월",
          title: "국어 3월 골든벨",
          subtitle: "데모",
          themeColor: "#4472C4",
        },
      ],
    },
    rules: {
      headers: ["rule"],
      rows: [{ rule: "문제를 보고 답을 적어요." }],
    },
    questions: {
      headers: [
        "order",
        "type",
        "prompt",
        "answer",
        "points",
        "difficulty",
        "timerSeconds",
        "bonusLabel",
        "explanation",
        "choice1",
        "choice2",
        "choice3",
        "choice4",
      ],
      rows: [
        {
          order: 2,
          type: "ox",
          prompt: "정답은 O일까요?",
          answer: "O",
          points: 2,
          difficulty: 1,
          timerSeconds: 15,
          bonusLabel: "",
          explanation: "",
          choice1: "",
          choice2: "",
          choice3: "",
          choice4: "",
        },
        {
          order: 1,
          type: "short_text",
          prompt: "빈칸을 채워 보세요.",
          answer: "가치",
          points: 1,
          difficulty: 2,
          timerSeconds: 20,
          bonusLabel: "",
          explanation: "답안 개념입니다.",
          choice1: "",
          choice2: "",
          choice3: "",
          choice4: "",
        },
        {
          order: 3,
          type: "multiple_choice",
          prompt: "객관식 문항입니다.",
          answer: 2,
          points: 3,
          difficulty: 2,
          timerSeconds: 25,
          bonusLabel: "",
          explanation: "",
          choice1: "선택지 1",
          choice2: "선택지 2",
          choice3: "선택지 3",
          choice4: "선택지 4",
        },
      ],
    },
  };
}

describe("parseQuizData", () => {
  it("엑셀 데이터를 QuizSet으로 변환한다", () => {
    const parsed = parseQuizData(createWorkbookData());

    expect(parsed.title).toBe("국어 3월 골든벨");
    expect(parsed.questions).toHaveLength(3);
    expect(parsed.questions[0]).toMatchObject({
      order: 1,
      type: "short_text",
      difficulty: 2,
    });
    expect(parsed.questions[1]).toMatchObject({
      type: "ox",
      difficulty: 1,
    });
    expect(parsed.questions[2]).toMatchObject({
      type: "multiple_choice",
      difficulty: 2,
      choices: ["선택지 1", "선택지 2", "선택지 3", "선택지 4"],
      correctChoiceIndex: 1,
    });
  });

  it("필수 컬럼이 없으면 즉시 에러를 반환한다", () => {
    const workbookData = createWorkbookData();
    workbookData.questions.headers = ["order", "type", "prompt", "answer"];
    workbookData.questions.rows = [{ order: 1, type: "short_text", prompt: "문제", answer: "정답" }];

    expect(() => parseQuizData(workbookData)).toThrowError(/points 컬럼/);
  });
});
