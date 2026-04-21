import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomePage } from "./HomePage";
import { HostPage } from "./HostPage";
import { ScreenPage } from "./ScreenPage";
import { sampleQuizSet } from "../features/import/sampleQuiz";
import { createInitialSessionState, createParticipants } from "../features/session/sessionReducer";
import { saveQuizSet, saveSession, SESSION_STORAGE_KEY } from "../features/storage/quizStorage";
import { MockBroadcastChannel } from "../test/mockBroadcastChannel";
import { renderMemoryRoutes } from "../test/renderMemoryRoutes";
import type { QuizSet, SessionState } from "../types/quiz";

function writeSessionToStorage(session: SessionState) {
  window.localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      [session.sessionId]: session,
    }),
  );
}

describe("app flow", () => {
  beforeEach(() => {
    window.localStorage.clear();
    MockBroadcastChannel.reset();
    vi.restoreAllMocks();
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel as unknown as typeof BroadcastChannel);
  });

  afterEach(() => {
    cleanup();
    MockBroadcastChannel.reset();
    vi.unstubAllGlobals();
  });

  it("홈에서 분리 화면 세션을 시작하면 호스트 화면으로 이동한다", async () => {
    vi.spyOn(window.crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000000");

    renderMemoryRoutes(
      [
        { path: "/", element: <HomePage /> },
        { path: "/host/:sessionId", element: <div>호스트 도착</div> },
      ],
      ["/"],
    );

    fireEvent.click(screen.getByRole("button", { name: "분리 화면으로 시작" }));

    expect(await screen.findByText("호스트 도착")).toBeTruthy();
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toContain("00000000-0000-4000-8000-000000000000");
  });

  it("발표 화면은 저장된 세트가 없어도 호스트에게 스냅샷을 다시 받아 복원한다", async () => {
    const customQuizSet: QuizSet = {
      ...sampleQuizSet,
      id: "custom-social-april",
      subject: "사회",
      setName: "4월 사회 골든벨",
      title: "6학년 1반 4월 사회 골든벨",
      subtitle: "호스트 스냅샷 재요청 테스트",
    };
    const session = createInitialSessionState(customQuizSet, createParticipants(["민호", "수아"]), "session-sync");

    saveQuizSet(customQuizSet);
    saveSession(session);

    renderMemoryRoutes([{ path: "/host/:sessionId", element: <HostPage /> }], ["/host/session-sync"]);

    window.localStorage.setItem("golden-bell:quiz-sets", JSON.stringify([]));

    const screenView = renderMemoryRoutes(
      [{ path: "/screen/:sessionId", element: <ScreenPage /> }],
      ["/screen/session-sync"],
    );

    const screenRoot = within(screenView.container);
    expect((await screenRoot.findAllByText(customQuizSet.title)).length).toBeGreaterThan(0);
    expect(screenRoot.getByText("사회")).toBeTruthy();
  });

  it("BroadcastChannel이 없어도 storage 이벤트로 발표 화면이 갱신된다", async () => {
    vi.stubGlobal("BroadcastChannel", undefined);

    const session = createInitialSessionState(sampleQuizSet, createParticipants(["민호"]), "session-storage-sync");
    writeSessionToStorage(session);

    const screenView = renderMemoryRoutes(
      [{ path: "/screen/:sessionId", element: <ScreenPage /> }],
      ["/screen/session-storage-sync"],
    );
    const screenRoot = within(screenView.container);

    expect((await screenRoot.findAllByText(sampleQuizSet.title)).length).toBeGreaterThan(0);

    const answerState: SessionState = {
      ...session,
      phase: "answer",
      timer: {
        ...session.timer,
        running: false,
      },
      updatedAt: session.updatedAt + 1,
    };

    writeSessionToStorage(answerState);

    await act(async () => {
      const storageEvent = new Event("storage");
      Object.defineProperty(storageEvent, "key", { value: SESSION_STORAGE_KEY });
      Object.defineProperty(storageEvent, "storageArea", { value: window.localStorage });
      window.dispatchEvent(storageEvent);
    });

    await waitFor(() => {
      expect(screenRoot.getByText("자신의 삶")).toBeTruthy();
    });
  });
});
