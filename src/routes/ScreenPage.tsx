import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { SessionStageView } from "../features/session/SessionStageView";
import { hydrateSnapshotQuiz } from "../features/session/sessionPersistence";
import { useScreenSessionChannel } from "../features/session/useSessionChannel";
import { StorageNoticeBanner } from "../features/storage/StorageNoticeBanner";
import { buildThemeStyle } from "../features/theme/theme";
import { getHomePath } from "./routePaths";

export function ScreenPage() {
  const params = useParams();
  const rawSnapshot = useScreenSessionChannel(params.sessionId ?? "");
  const snapshot = useMemo(() => hydrateSnapshotQuiz(rawSnapshot), [rawSnapshot]);

  if (!params.sessionId || !snapshot) {
    return (
      <main className="screen-shell">
        <div className="page">
          <section className="panel stack">
            <h1>발표 화면 연결을 기다리는 중입니다.</h1>
            <p className="muted">호스트 화면에서 세션을 열고 발표 화면을 다시 띄워 주세요.</p>
            <Link className="action-button" to={getHomePath()}>
              홈으로
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="screen-shell" style={buildThemeStyle(snapshot.quizSet.themeColor)}>
      <StorageNoticeBanner />
      <SessionStageView mode="screen" quizSet={snapshot.quizSet} state={snapshot.state} />
    </main>
  );
}
