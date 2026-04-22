import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostPage } from "./HostPage";
import { PlayPage } from "./PlayPage";
import { sampleQuizSet } from "../features/import/sampleQuiz";
import { createInitialSessionState, createParticipants, getAnswerText } from "../features/session/sessionReducer";
import { saveQuizSet, saveSession } from "../features/storage/quizStorage";
import { MockBroadcastChannel } from "../test/mockBroadcastChannel";
import { renderMemoryRoutes } from "../test/renderMemoryRoutes";
import type { QuizSet } from "../types/quiz";

function findParticipantRow(name: string): HTMLTableRowElement {
  const nameCell = screen.getByText(name);
  const row = nameCell.closest("tr");

  if (!(row instanceof HTMLTableRowElement)) {
    throw new Error(`참가자 행을 찾지 못했습니다: ${name}`);
  }

  return row;
}

function getHostTimerText(container: HTMLElement): string {
  const timer = container.querySelector(".timer--host");

  if (!(timer instanceof HTMLElement)) {
    throw new Error("호스트 타이머를 찾지 못했습니다.");
  }

  return timer.textContent?.trim() ?? "";
}

function getStageButtons(container: HTMLElement): HTMLButtonElement[] {
  return [...container.querySelectorAll(".stage-actions button")].filter(
    (button): button is HTMLButtonElement => button instanceof HTMLButtonElement,
  );
}

describe("interaction flow", () => {
  beforeEach(() => {
    window.localStorage.clear();
    MockBroadcastChannel.reset();
    vi.restoreAllMocks();
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel as unknown as typeof BroadcastChannel);
  });

  afterEach(() => {
    cleanup();
    MockBroadcastChannel.reset();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("단일 화면은 Enter, Space, 클릭, 방향키로 앞뒤 진행된다", async () => {
    const session = createInitialSessionState(sampleQuizSet, createParticipants(["민호"]), "session-play-controls");
    saveSession(session);

    const playView = renderMemoryRoutes(
      [{ path: "/play/:sessionId", element: <PlayPage /> }],
      ["/play/session-play-controls"],
    );
    const playRoot = within(playView.container);

    expect((await playRoot.findAllByText(sampleQuizSet.title)).length).toBeGreaterThan(0);

    fireEvent.keyDown(window, { key: "Enter", code: "Enter" });
    expect(await playRoot.findByText("다 같이 집중해 주세요.")).toBeTruthy();

    fireEvent.keyDown(window, { key: " ", code: "Space" });
    expect(await playRoot.findByText(/단원 제목:/)).toBeTruthy();

    const stage = playView.container.querySelector("main.screen-shell");
    if (!(stage instanceof HTMLElement)) {
      throw new Error("단일 화면 루트를 찾지 못했습니다.");
    }

    fireEvent.click(stage);
    expect(await playRoot.findByText(getAnswerText(sampleQuizSet.questions[0]))).toBeTruthy();

    fireEvent.keyDown(window, { key: "ArrowDown", code: "ArrowDown" });
    expect(await playRoot.findByText(/분단으로 고향을 잃은/)).toBeTruthy();

    fireEvent.keyDown(window, { key: "ArrowUp", code: "ArrowUp" });
    expect(await playRoot.findByText(getAnswerText(sampleQuizSet.questions[0]))).toBeTruthy();
  });

  it("호스트는 이미 반영한 점수를 다시 수정할 수 있다", async () => {
    const session = createInitialSessionState(sampleQuizSet, createParticipants(["민호", "수아"]), "session-host-rescore");
    saveSession(session);

    const hostView = renderMemoryRoutes([{ path: "/host/:sessionId", element: <HostPage /> }], ["/host/session-host-rescore"]);

    fireEvent.click(getStageButtons(hostView.container)[0]);
    fireEvent.click(getStageButtons(hostView.container)[0]);
    fireEvent.click(getStageButtons(hostView.container)[0]);

    const minhoRow = findParticipantRow("민호");
    const suaRow = findParticipantRow("수아");

    fireEvent.click(within(minhoRow).getByRole("button", { name: "정답" }));
    fireEvent.click(within(suaRow).getByRole("button", { name: "오답" }));
    fireEvent.click(getStageButtons(hostView.container)[0]);

    await waitFor(() => {
      expect(within(minhoRow).getByText(`${sampleQuizSet.questions[0].points}점`)).toBeTruthy();
      expect(within(suaRow).getByText("0점")).toBeTruthy();
    });

    fireEvent.click(within(minhoRow).getByRole("button", { name: "오답" }));
    fireEvent.click(within(suaRow).getByRole("button", { name: "정답" }));
    fireEvent.click(getStageButtons(hostView.container)[0]);

    await waitFor(() => {
      expect(within(minhoRow).getByText("0점")).toBeTruthy();
      expect(within(suaRow).getByText(`${sampleQuizSet.questions[0].points}점`)).toBeTruthy();
    });
  });

  it("호스트 타이머는 시작, 정지, 초기화가 동작한다", async () => {
    const session = createInitialSessionState(sampleQuizSet, createParticipants(["민호"]), "session-host-timer");
    saveSession(session);

    const hostView = renderMemoryRoutes([{ path: "/host/:sessionId", element: <HostPage /> }], ["/host/session-host-timer"]);

    fireEvent.click(getStageButtons(hostView.container)[0]);
    fireEvent.click(getStageButtons(hostView.container)[0]);

    expect(getHostTimerText(hostView.container)).toBe(String(sampleQuizSet.questions[0].timerSeconds));

    vi.useFakeTimers();

    let stageButtons = getStageButtons(hostView.container);
    fireEvent.click(stageButtons[1]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(getHostTimerText(hostView.container)).toBe(String((sampleQuizSet.questions[0].timerSeconds ?? 0) - 1));

    stageButtons = getStageButtons(hostView.container);
    fireEvent.click(stageButtons[1]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(getHostTimerText(hostView.container)).toBe(String((sampleQuizSet.questions[0].timerSeconds ?? 0) - 1));

    stageButtons = getStageButtons(hostView.container);
    fireEvent.click(stageButtons[2]);
    expect(getHostTimerText(hostView.container)).toBe(String(sampleQuizSet.questions[0].timerSeconds));
  });

  it("마지막 문항 채점 뒤 최종 순위표로 이동한다", async () => {
    const oneQuestionQuizSet: QuizSet = {
      ...sampleQuizSet,
      id: "single-question-finale",
      setName: "1문항 결승전",
      title: "6학년 1반 결승 문제",
      questions: [sampleQuizSet.questions[0]],
    };
    const session = createInitialSessionState(
      oneQuestionQuizSet,
      createParticipants(["민호", "수아"]),
      "session-host-leaderboard",
    );

    saveQuizSet(oneQuestionQuizSet);
    saveSession(session);

    const hostView = renderMemoryRoutes(
      [{ path: "/host/:sessionId", element: <HostPage /> }],
      ["/host/session-host-leaderboard"],
    );

    fireEvent.click(getStageButtons(hostView.container)[0]);
    fireEvent.click(getStageButtons(hostView.container)[0]);
    fireEvent.click(getStageButtons(hostView.container)[0]);

    fireEvent.click(within(findParticipantRow("민호")).getByRole("button", { name: "정답" }));
    fireEvent.click(within(findParticipantRow("수아")).getByRole("button", { name: "오답" }));
    fireEvent.click(getStageButtons(hostView.container)[0]);
    fireEvent.click(getStageButtons(hostView.container)[2]);

    await waitFor(() => {
      expect(screen.getByText("수업 마무리 순위표")).toBeTruthy();
      expect(screen.getByText("민호")).toBeTruthy();
      expect(screen.getByText(`${sampleQuizSet.questions[0].points}점`)).toBeTruthy();
    });
  });

  it("객관식 문항은 보기와 정답 번호를 함께 보여준다", async () => {
    const multipleChoiceQuestion = sampleQuizSet.questions.find((item) => item.type === "multiple_choice");

    if (!multipleChoiceQuestion || multipleChoiceQuestion.type !== "multiple_choice") {
      throw new Error("객관식 샘플 문항을 찾지 못했습니다.");
    }

    const multipleChoiceQuizSet: QuizSet = {
      ...sampleQuizSet,
      id: "multiple-choice-preview",
      title: "객관식 미리보기",
      questions: [multipleChoiceQuestion],
    };
    const session = createInitialSessionState(
      multipleChoiceQuizSet,
      createParticipants(["민호"]),
      "session-play-multiple-choice",
    );

    saveQuizSet(multipleChoiceQuizSet);
    saveSession(session);

    const playView = renderMemoryRoutes(
      [{ path: "/play/:sessionId", element: <PlayPage /> }],
      ["/play/session-play-multiple-choice"],
    );
    const playRoot = within(playView.container);

    fireEvent.keyDown(window, { key: "Enter", code: "Enter" });
    fireEvent.keyDown(window, { key: " ", code: "Space" });

    expect(await playRoot.findByText(/남북 공동 편찬 사업/)).toBeTruthy();
    expect(playRoot.getByText(multipleChoiceQuestion.choices[0])).toBeTruthy();
    expect(playRoot.getByText(multipleChoiceQuestion.choices[multipleChoiceQuestion.choices.length - 1])).toBeTruthy();

    const stage = playView.container.querySelector("main.screen-shell");
    if (!(stage instanceof HTMLElement)) {
      throw new Error("단일 화면 루트를 찾지 못했습니다.");
    }

    fireEvent.click(stage);

    expect(await playRoot.findByText(getAnswerText(multipleChoiceQuestion))).toBeTruthy();
    expect(playRoot.getByText(multipleChoiceQuestion.choices[multipleChoiceQuestion.correctChoiceIndex])).toBeTruthy();
  });
});
