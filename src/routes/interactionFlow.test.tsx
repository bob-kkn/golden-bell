import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HostPage } from "./HostPage";
import { PlayPage } from "./PlayPage";
import { sampleQuizSet } from "../features/import/sampleQuiz";
import { createInitialSessionState, createParticipants } from "../features/session/sessionReducer";
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
    expect(await playRoot.findByText("다 같이 집중해 주세요")).toBeTruthy();

    fireEvent.keyDown(window, { key: " ", code: "Space" });
    expect(await playRoot.findByText(sampleQuizSet.questions[0].prompt)).toBeTruthy();

    const stage = playView.container.querySelector("main.screen-shell");
    if (!(stage instanceof HTMLElement)) {
      throw new Error("단일 화면 루트를 찾지 못했습니다.");
    }

    fireEvent.click(stage);
    expect(await playRoot.findByText("자신의 삶")).toBeTruthy();

    fireEvent.keyDown(window, { key: "ArrowDown", code: "ArrowDown" });
    expect(await playRoot.findByText(sampleQuizSet.questions[1].prompt)).toBeTruthy();

    fireEvent.keyDown(window, { key: "ArrowUp", code: "ArrowUp" });
    expect(await playRoot.findByText("자신의 삶")).toBeTruthy();
  });

  it("호스트는 이미 반영한 점수도 다시 수정할 수 있다", async () => {
    const session = createInitialSessionState(sampleQuizSet, createParticipants(["민호", "수아"]), "session-host-rescore");
    saveSession(session);

    renderMemoryRoutes([{ path: "/host/:sessionId", element: <HostPage /> }], ["/host/session-host-rescore"]);

    fireEvent.click(await screen.findByRole("button", { name: "규칙 보기" }));
    fireEvent.click(await screen.findByRole("button", { name: "첫 문제 시작" }));
    fireEvent.click(await screen.findByRole("button", { name: "정답 공개" }));

    const minhoRow = findParticipantRow("민호");
    const suaRow = findParticipantRow("수아");

    fireEvent.click(within(minhoRow).getByRole("button", { name: "정답" }));
    fireEvent.click(within(suaRow).getByRole("button", { name: "오답" }));
    fireEvent.click(screen.getByRole("button", { name: "이번 문제 점수 반영" }));

    await waitFor(() => {
      expect(within(minhoRow).getByText("1점")).toBeTruthy();
      expect(within(suaRow).getByText("0점")).toBeTruthy();
      expect(screen.getByRole("button", { name: "이번 문제 점수 다시 반영" })).toBeTruthy();
    });

    fireEvent.click(within(minhoRow).getByRole("button", { name: "오답" }));
    fireEvent.click(within(suaRow).getByRole("button", { name: "정답" }));
    fireEvent.click(screen.getByRole("button", { name: "이번 문제 점수 다시 반영" }));

    await waitFor(() => {
      expect(within(minhoRow).getByText("0점")).toBeTruthy();
      expect(within(suaRow).getByText("1점")).toBeTruthy();
      expect(screen.getByText("이 문항은 이미 반영되었습니다. 선택을 바꾼 뒤 다시 반영하면 점수가 갱신됩니다.")).toBeTruthy();
    });
  });

  it("호스트 타이머는 시작, 정지, 초기화가 동작한다", async () => {
    const session = createInitialSessionState(sampleQuizSet, createParticipants(["민호"]), "session-host-timer");
    saveSession(session);

    const hostView = renderMemoryRoutes([{ path: "/host/:sessionId", element: <HostPage /> }], ["/host/session-host-timer"]);
    const hostRoot = within(hostView.container);

    fireEvent.click(await hostRoot.findByRole("button", { name: "규칙 보기" }));
    fireEvent.click(await hostRoot.findByRole("button", { name: "첫 문제 시작" }));

    expect(getHostTimerText(hostView.container)).toBe("20");

    vi.useFakeTimers();

    fireEvent.click(hostRoot.getByRole("button", { name: "타이머 시작" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(getHostTimerText(hostView.container)).toBe("19");

    fireEvent.click(hostRoot.getByRole("button", { name: "타이머 정지" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(getHostTimerText(hostView.container)).toBe("19");

    fireEvent.click(hostRoot.getByRole("button", { name: "타이머 초기화" }));
    expect(getHostTimerText(hostView.container)).toBe("20");
  });

  it("마지막 문제 채점 후 최종 순위표로 이동한다", async () => {
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

    renderMemoryRoutes([{ path: "/host/:sessionId", element: <HostPage /> }], ["/host/session-host-leaderboard"]);

    fireEvent.click(await screen.findByRole("button", { name: "규칙 보기" }));
    fireEvent.click(await screen.findByRole("button", { name: "첫 문제 시작" }));
    fireEvent.click(await screen.findByRole("button", { name: "정답 공개" }));

    fireEvent.click(within(findParticipantRow("민호")).getByRole("button", { name: "정답" }));
    fireEvent.click(within(findParticipantRow("수아")).getByRole("button", { name: "오답" }));
    fireEvent.click(screen.getByRole("button", { name: "이번 문제 점수 반영" }));
    fireEvent.click(screen.getByRole("button", { name: "최종 순위 보기" }));

    await waitFor(() => {
      expect(screen.getByText("수업 마무리 순위표")).toBeTruthy();
      expect(screen.getByText("민호")).toBeTruthy();
      expect(screen.getByText("1점")).toBeTruthy();
    });
  });
});
