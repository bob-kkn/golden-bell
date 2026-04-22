import { describe, expect, it } from "vitest";
import { parseQuizData, type QuizWorkbookData } from "./quizParser";

function createWorkbookData(): QuizWorkbookData {
  return {
    meta: {
      headers: ["subject", "setName", "title", "subtitle", "themeColor"],
      rows: [
        {
          subject: "\uad6d\uc5b4",
          setName: "3\uc6d4",
          title: "\uad6d\uc5b4 3\uc6d4 \uace8\ub4e0\ubca8",
          subtitle: "\ub370\ubaa8",
          themeColor: "#4472C4",
        },
      ],
    },
    rules: {
      headers: ["rule"],
      rows: [{ rule: "\ubb38\uc81c\ub97c \ubcf4\uace0 \ub2f5\uc744 \uc801\uc5b4\uc694." }],
    },
    questions: {
      headers: [
        "order",
        "type",
        "prompt",
        "answer",
        "points",
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
          prompt: "\uc815\ub2f5\uc740 O\uc77c\uae4c\uc694?",
          answer: "O",
          points: 2,
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
          prompt: "\ube48\uce78\uc744 \ucc44\uc6cc \ubcf4\uc138\uc694.",
          answer: "\uac00\uce58",
          points: 1,
          timerSeconds: 20,
          bonusLabel: "",
          explanation: "\ub2f5\uc548 \uac1c\ub150\uc785\ub2c8\ub2e4.",
          choice1: "",
          choice2: "",
          choice3: "",
          choice4: "",
        },
        {
          order: 3,
          type: "multiple_choice",
          prompt: "\uac1d\uad00\uc2dd \ubb38\ud56d\uc785\ub2c8\ub2e4.",
          answer: 2,
          points: 3,
          timerSeconds: 25,
          bonusLabel: "",
          explanation: "",
          choice1: "\uc120\ud0dd\uc9c0 1",
          choice2: "\uc120\ud0dd\uc9c0 2",
          choice3: "\uc120\ud0dd\uc9c0 3",
          choice4: "\uc120\ud0dd\uc9c0 4",
        },
      ],
    },
  };
}

describe("parseQuizData", () => {
  it("\uc5d1\uc140 \ub370\uc774\ud130\ub97c QuizSet\uc73c\ub85c \ubcc0\ud658\ud55c\ub2e4", () => {
    const parsed = parseQuizData(createWorkbookData());

    expect(parsed.title).toBe("\uad6d\uc5b4 3\uc6d4 \uace8\ub4e0\ubca8");
    expect(parsed.questions).toHaveLength(3);
    expect(parsed.questions[0].order).toBe(1);
    expect(parsed.questions[0].type).toBe("short_text");
    expect(parsed.questions[1].type).toBe("ox");
    expect(parsed.questions[2]).toMatchObject({
      type: "multiple_choice",
      choices: ["\uc120\ud0dd\uc9c0 1", "\uc120\ud0dd\uc9c0 2", "\uc120\ud0dd\uc9c0 3", "\uc120\ud0dd\uc9c0 4"],
      correctChoiceIndex: 1,
    });
  });

  it("\ud544\uc218 \uceec\ub7fc\uc774 \uc5c6\uc73c\uba74 \uc989\uc2dc \uc5d0\ub7ec\ub97c \ubc18\ud658\ud55c\ub2e4", () => {
    const workbookData = createWorkbookData();
    workbookData.questions.headers = ["order", "type", "prompt", "answer"];
    workbookData.questions.rows = [{ order: 1, type: "short_text", prompt: "\ubb38\uc81c", answer: "\uc815\ub2f5" }];

    expect(() => parseQuizData(workbookData)).toThrowError(/points \uceec\ub7fc/);
  });
});
