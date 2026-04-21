import { useEffect, useMemo, useReducer, useRef, type MouseEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SessionStageView } from "../features/session/SessionStageView";
import { hydrateSnapshotQuiz } from "../features/session/sessionPersistence";
import { sessionReducer, type SessionAction, type SessionSnapshot } from "../features/session/sessionReducer";
import { buildInitialSnapshot } from "../features/session/sessionHostUtils";
import {
  getSingleScreenAdvanceActions,
  getSingleScreenRetreatActions,
} from "../features/session/singleScreenProgress";
import { useHostSessionChannel } from "../features/session/useSessionChannel";
import { StorageNoticeBanner } from "../features/storage/StorageNoticeBanner";
import { buildThemeStyle } from "../features/theme/theme";
import { getHomePath } from "./routePaths";

function PlaySessionView({ initialSnapshot }: { initialSnapshot: SessionSnapshot }) {
  const navigate = useNavigate();
  const [snapshot, dispatch] = useReducer(sessionReducer, initialSnapshot);
  const autoStartedQuestionRef = useRef<string | null>(null);

  useHostSessionChannel(snapshot.state.sessionId, snapshot);

  useEffect(() => {
    if (!snapshot.state.timer.running) {
      return;
    }

    const timer = window.setInterval(() => {
      dispatch({ type: "tick" });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [snapshot.state.timer.running]);

  useEffect(() => {
    const currentQuestion = snapshot.quizSet.questions[snapshot.state.currentQuestionIndex];

    if (snapshot.state.phase !== "question" || !currentQuestion || !snapshot.state.timer.enabled) {
      autoStartedQuestionRef.current = null;
      return;
    }

    if (snapshot.state.timer.running || snapshot.state.timer.remaining !== snapshot.state.timer.duration) {
      return;
    }

    if (autoStartedQuestionRef.current === currentQuestion.id) {
      return;
    }

    autoStartedQuestionRef.current = currentQuestion.id;
    dispatch({ type: "toggle_timer" });
  }, [
    snapshot.quizSet.questions,
    snapshot.state.currentQuestionIndex,
    snapshot.state.phase,
    snapshot.state.timer.duration,
    snapshot.state.timer.enabled,
    snapshot.state.timer.remaining,
    snapshot.state.timer.running,
  ]);

  function runActions(actions: SessionAction[]) {
    for (const action of actions) {
      dispatch(action);
    }
  }

  function advance() {
    runActions(getSingleScreenAdvanceActions(snapshot.state));
  }

  function retreat() {
    runActions(getSingleScreenRetreatActions(snapshot.state));
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isAdvanceKey =
        event.key === "Enter" ||
        event.key === " " ||
        event.code === "Space" ||
        event.key === "ArrowRight" ||
        event.key === "ArrowDown";
      const isRetreatKey = event.key === "ArrowLeft" || event.key === "ArrowUp";

      if (
        (!isAdvanceKey && !isRetreatKey) ||
        event.repeat ||
        event.isComposing ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.shiftKey
      ) {
        return;
      }

      const target = event.target;
      if (target instanceof HTMLElement && target.closest("button, a, input, textarea, select")) {
        return;
      }

      event.preventDefault();

      if (isRetreatKey) {
        retreat();
        return;
      }

      advance();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [snapshot.state]);

  function goBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(getHomePath());
  }

  function handleStageClick(event: MouseEvent<HTMLElement>) {
    const target = event.target;

    if (target instanceof HTMLElement && target.closest(".single-screen-toolbar")) {
      return;
    }

    advance();
  }

  return (
    <main className="screen-shell" onClick={handleStageClick} style={buildThemeStyle(snapshot.quizSet.themeColor)}>
      <StorageNoticeBanner />
      <div className="single-screen-toolbar">
        <button className="single-screen-toolbar__button" onClick={goBack} type="button">
          이전 화면
        </button>
        <span className="single-screen-toolbar__hint">
          Enter · Space · 클릭 다음 / ←↑ 이전 / →↓ 다음
        </span>
      </div>
      <SessionStageView mode="screen" quizSet={snapshot.quizSet} state={snapshot.state} />
    </main>
  );
}

export function PlayPage() {
  const params = useParams();
  const initialSnapshot = useMemo(() => {
    if (!params.sessionId) {
      return null;
    }

    return hydrateSnapshotQuiz(buildInitialSnapshot(params.sessionId));
  }, [params.sessionId]);

  if (!initialSnapshot) {
    return (
      <main className="screen-shell">
        <div className="page">
          <section className="panel stack">
            <h1>세션을 찾지 못했습니다.</h1>
            <p className="muted">홈에서 다시 세트를 선택하고 세션을 시작해 주세요.</p>
          </section>
        </div>
      </main>
    );
  }

  return <PlaySessionView initialSnapshot={initialSnapshot} />;
}
