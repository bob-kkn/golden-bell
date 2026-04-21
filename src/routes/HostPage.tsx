import { useEffect, useMemo, useReducer, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SessionAdminPanel } from "../features/session/SessionAdminPanel";
import { SessionStageView } from "../features/session/SessionStageView";
import { hydrateSnapshotQuiz } from "../features/session/sessionPersistence";
import { sessionReducer, type SessionSnapshot } from "../features/session/sessionReducer";
import {
  buildInitialSnapshot,
  createEmptyMarks,
  getDraftMarksForQuestion,
  getPhaseLabel,
  type DraftMarks,
} from "../features/session/sessionHostUtils";
import { useHostSessionChannel } from "../features/session/useSessionChannel";
import { StorageNoticeBanner } from "../features/storage/StorageNoticeBanner";
import { buildThemeStyle } from "../features/theme/theme";
import { getAppUrl, getHomePath, getPlayPath, getScreenPath } from "./routePaths";

function HostSessionView({ initialSnapshot }: { initialSnapshot: SessionSnapshot }) {
  const navigate = useNavigate();
  const [snapshot, dispatch] = useReducer(sessionReducer, initialSnapshot);
  const [draftMarks, setDraftMarks] = useState<DraftMarks>(() =>
    createEmptyMarks(initialSnapshot.state.participants.map((participant) => participant.id)),
  );
  const screenUrl = getAppUrl(getScreenPath(snapshot.state.sessionId));

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
    const currentQuestionId = snapshot.quizSet.questions[snapshot.state.currentQuestionIndex]?.id;
    setDraftMarks(getDraftMarksForQuestion(snapshot.state, currentQuestionId));
  }, [snapshot.quizSet.questions, snapshot.state]);

  function openScreenWindow() {
    window.open(screenUrl, "_blank", "noopener,noreferrer");
  }

  function goBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(getHomePath());
  }

  return (
    <main className="app-shell" style={buildThemeStyle(snapshot.quizSet.themeColor)}>
      <div className="page stack">
        <StorageNoticeBanner />
        <section className="hero">
          <div className="meta-row">
            <span className="hero__eyebrow">{snapshot.quizSet.subject}</span>
            <span className="hero__eyebrow">{snapshot.quizSet.setName}</span>
            <span className="hero__eyebrow">{snapshot.state.participants.length}명 참가</span>
            <span className="hero__eyebrow">{getPhaseLabel(snapshot.state.phase)}</span>
          </div>
          <h1>{snapshot.quizSet.title}</h1>
          <div className="controls-row">
            <button className="action-button" onClick={openScreenWindow} type="button">
              발표 화면 열기
            </button>
            <Link className="ghost-button" to={getPlayPath(snapshot.state.sessionId)}>
              단일 화면 모드
            </Link>
            <a className="ghost-button" href={screenUrl} rel="noreferrer" target="_blank">
              발표 화면 새 탭
            </a>
            <button className="ghost-button" onClick={goBack} type="button">
              이전 화면
            </button>
          </div>
          <div className="split-note">
            <strong>발표 화면 주소</strong>
            <span>{screenUrl}</span>
          </div>
        </section>

        <div className="host-layout">
          <SessionStageView mode="host" quizSet={snapshot.quizSet} state={snapshot.state} />

          <aside className="stack">
            <SessionAdminPanel
              dispatch={dispatch}
              draftMarks={draftMarks}
              setDraftMarks={setDraftMarks}
              snapshot={snapshot}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

export function HostPage() {
  const params = useParams();
  const initialSnapshot = useMemo(() => {
    if (!params.sessionId) {
      return null;
    }

    return hydrateSnapshotQuiz(buildInitialSnapshot(params.sessionId));
  }, [params.sessionId]);

  if (!initialSnapshot) {
    return (
      <main className="app-shell">
        <div className="page">
          <section className="panel stack">
            <h1>세션을 찾지 못했습니다.</h1>
            <p className="muted">홈에서 다시 세트를 선택하고 세션을 시작해 주세요.</p>
            <Link className="action-button" to={getHomePath()}>
              홈으로 이동
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return <HostSessionView initialSnapshot={initialSnapshot} />;
}
