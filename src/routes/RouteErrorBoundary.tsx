import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { getHomePath } from "./routePaths";

function getErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "알 수 없는 오류가 발생했습니다.";
}

export function RouteErrorBoundary() {
  const error = useRouteError();

  return (
    <main className="app-shell">
      <div className="page">
        <section className="panel stack">
          <span className="hero__eyebrow">오류</span>
          <h1>화면을 불러오지 못했습니다.</h1>
          <p className="muted">{getErrorMessage(error)}</p>
          <div className="controls-row">
            <Link className="action-button" to={getHomePath()}>
              홈으로 이동
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
