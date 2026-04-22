import { useMemo, useState, type CSSProperties, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { resolveQuizSets } from "../features/session/sessionPersistence";
import { createInitialSessionState, createParticipants } from "../features/session/sessionReducer";
import { StorageNoticeBanner } from "../features/storage/StorageNoticeBanner";
import { canPersistAppData, saveQuizSet, saveSession } from "../features/storage/quizStorage";
import { buildThemeStyle } from "../features/theme/theme";
import type { QuizSet } from "../types/quiz";
import { getHostPath, getPlayPath } from "./routePaths";

const MAX_UPLOAD_FILE_BYTES = 5 * 1024 * 1024;
let quizImportModulePromise: Promise<typeof import("../features/import/quizImport")> | null = null;

function loadQuizImportModule() {
  quizImportModulePromise ??= import("../features/import/quizImport");
  return quizImportModulePromise;
}

function groupBySubject(quizSets: QuizSet[]): Array<[string, QuizSet[]]> {
  const grouped = new Map<string, QuizSet[]>();

  for (const quizSet of quizSets) {
    grouped.set(quizSet.subject, [...(grouped.get(quizSet.subject) ?? []), quizSet]);
  }

  return [...grouped.entries()];
}

export function HomePage() {
  const navigate = useNavigate();
  const [quizSets, setQuizSets] = useState<QuizSet[]>(() => resolveQuizSets());
  const [selectedQuizId, setSelectedQuizId] = useState<string>(() => resolveQuizSets()[0]?.id ?? "");
  const [participantText, setParticipantText] = useState("김민호\n이수아\n박지우\n최서윤");
  const [timerModeEnabled, setTimerModeEnabled] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [excelAction, setExcelAction] = useState<"idle" | "prefetch" | "upload" | "download">("idle");
  const groupedQuizSets = useMemo(() => groupBySubject(quizSets), [quizSets]);
  const selectedQuiz = quizSets.find((quizSet) => quizSet.id === selectedQuizId) ?? quizSets[0];
  const storageReady = canPersistAppData();
  const isExcelBusy = excelAction !== "idle";

  function handleExcelControlFocus() {
    if (quizImportModulePromise || excelAction === "upload" || excelAction === "download") {
      return;
    }

    setExcelAction("prefetch");
    loadQuizImportModule().finally(() => {
      setExcelAction((current) => (current === "prefetch" ? "idle" : current));
    });
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setUploadSuccess("");
      setUploadError("엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_UPLOAD_FILE_BYTES) {
      setUploadSuccess("");
      setUploadError("엑셀 파일은 5MB 이하만 업로드할 수 있습니다.");
      event.target.value = "";
      return;
    }

    try {
      setExcelAction("upload");
      const { parseQuizFile } = await loadQuizImportModule();
      const quizSet = await parseQuizFile(file);

      if (!saveQuizSet(quizSet)) {
        throw new Error("문제 세트를 저장하지 못했습니다. 브라우저 저장소를 확인해 주세요.");
      }

      const resolved = resolveQuizSets();
      setQuizSets(resolved);
      setSelectedQuizId(quizSet.id);
      setUploadError("");
      setUploadSuccess(`"${quizSet.title}" 세트를 불러왔습니다.`);
    } catch (error) {
      setUploadSuccess("");
      setUploadError(error instanceof Error ? error.message : "엑셀 파일을 읽는 중 문제가 발생했습니다.");
    } finally {
      setExcelAction("idle");
      event.target.value = "";
    }
  }

  async function handleDownloadTemplate() {
    try {
      setExcelAction("download");
      const { downloadTemplateWorkbook } = await loadQuizImportModule();
      await downloadTemplateWorkbook("golden-bell-template.xlsx");
    } finally {
      setExcelAction("idle");
    }
  }

  function handleStartSession(mode: "host" | "play") {
    if (!storageReady) {
      setUploadError("브라우저 저장소를 사용할 수 없어 세션을 시작할 수 없습니다. 브라우저 설정을 확인해 주세요.");
      return;
    }

    if (!selectedQuiz) {
      setUploadError("먼저 진행할 세트를 선택해 주세요.");
      return;
    }

    const participants = createParticipants(participantText.split(/\r?\n|,/));

    if (participants.length === 0) {
      setUploadError("학생 이름을 한 명 이상 입력해 주세요.");
      return;
    }

    const sessionId = crypto.randomUUID();
    const initialState = createInitialSessionState(selectedQuiz, participants, sessionId, timerModeEnabled);

    if (!saveSession(initialState)) {
      setUploadError("세션을 저장하지 못했습니다. 브라우저 저장 공간을 확인한 뒤 다시 시도해 주세요.");
      return;
    }

    navigate(mode === "play" ? getPlayPath(sessionId) : getHostPath(sessionId));
  }

  return (
    <main className="app-shell" style={buildThemeStyle(selectedQuiz?.themeColor)}>
      <div className="page stack">
        <StorageNoticeBanner />
        <section className="hero">
          <span className="hero__eyebrow">교실용 골든벨 웹앱</span>
          <h1>엑셀 세트를 불러오고 발표 화면과 진행 화면을 바로 시작합니다.</h1>
          <p>
            같은 브라우저에서 분리 화면 또는 단일 화면으로 진행할 수 있습니다. 점수 집계는 교사 수동 채점,
            발표 화면은 전광판용 전체 화면 기준으로 맞춰져 있습니다.
          </p>
          <div className="controls-row">
            <button
              className="action-button"
              disabled={isExcelBusy}
              onClick={handleDownloadTemplate}
              onFocus={handleExcelControlFocus}
              onMouseEnter={handleExcelControlFocus}
              type="button"
            >
              {excelAction === "download" ? "엑셀 템플릿 준비 중..." : "엑셀 템플릿 다운로드"}
            </button>
            <label
              className="ghost-button"
              onFocus={handleExcelControlFocus}
              onMouseEnter={handleExcelControlFocus}
              style={{
                display: "inline-flex",
                alignItems: "center",
                opacity: storageReady && !isExcelBusy ? 1 : 0.55,
              }}
            >
              {excelAction === "upload" ? "엑셀 업로드 중..." : "엑셀 업로드"}
              <input
                accept=".xlsx,.xls"
                disabled={!storageReady || isExcelBusy}
                hidden
                onChange={handleFileChange}
                onFocus={handleExcelControlFocus}
                onMouseEnter={handleExcelControlFocus}
                type="file"
              />
            </label>
          </div>
          {excelAction === "prefetch" ? <div className="help-text">엑셀 기능을 준비하고 있습니다.</div> : null}
          {uploadSuccess ? <div className="help-text">{uploadSuccess}</div> : null}
          {uploadError ? <div className="error-text">{uploadError}</div> : null}
        </section>

        <div className="grid grid--two">
          <section className="panel stack">
            <div>
              <h2>세트 선택</h2>
              <p className="muted">기본 세트와 업로드한 세트가 함께 표시됩니다.</p>
            </div>
            <div className="stack">
              {groupedQuizSets.map(([subject, items]) => (
                <section className="stack" key={subject}>
                  <span className="badge">{subject}</span>
                  {items.map((quizSet) => (
                    <button
                      className="set-card"
                      key={quizSet.id}
                      onClick={() => setSelectedQuizId(quizSet.id)}
                      style={{
                        ...(buildThemeStyle(quizSet.themeColor) as CSSProperties),
                        borderColor: selectedQuizId === quizSet.id ? "var(--accent)" : undefined,
                      }}
                      type="button"
                    >
                      <strong>{quizSet.title}</strong>
                      <span className="muted">{quizSet.subtitle || `${quizSet.questions.length}문항`}</span>
                      <div className="meta-row">
                        <span className="badge">{quizSet.setName}</span>
                        <span className="badge">{quizSet.questions.length}문항</span>
                      </div>
                    </button>
                  ))}
                </section>
              ))}
            </div>
          </section>

          <section className="panel stack">
            <div>
              <h2>진행 준비</h2>
              <p className="muted">학생 이름은 줄바꿈 또는 쉼표로 구분해 입력합니다.</p>
            </div>
            <div className="field">
              <label htmlFor="participantText">학생 명단</label>
              <textarea
                id="participantText"
                onChange={(event) => setParticipantText(event.target.value)}
                value={participantText}
              />
            </div>
            <div className="field">
              <label>문항 타이머</label>
              <div className="controls-row">
                <button
                  className={timerModeEnabled ? "action-button" : "ghost-button"}
                  onClick={() => setTimerModeEnabled((current) => !current)}
                  type="button"
                >
                  {timerModeEnabled ? "타이머 사용 중" : "타이머 기본 끔"}
                </button>
                <span className="muted">기본은 꺼져 있습니다. 필요하면 진행 중에도 다시 켤 수 있습니다.</span>
              </div>
            </div>
            {selectedQuiz ? (
              <div className="panel panel--accent" style={buildThemeStyle(selectedQuiz.themeColor)}>
                <h3>{selectedQuiz.title}</h3>
                <p className="muted">{selectedQuiz.subtitle}</p>
                <div className="meta-row">
                  <span className="badge">{selectedQuiz.subject}</span>
                  <span className="badge">{selectedQuiz.questions.length}문항</span>
                  <span className="badge">{selectedQuiz.rules.length}개 규칙</span>
                </div>
              </div>
            ) : (
              <div className="empty-state">진행할 세트를 선택해 주세요.</div>
            )}
            <div className="controls-row start-mode-actions">
              <button
                className="action-button"
                disabled={!storageReady}
                onClick={() => handleStartSession("host")}
                type="button"
              >
                분리 화면으로 시작
              </button>
              <button
                className="ghost-button"
                disabled={!storageReady}
                onClick={() => handleStartSession("play")}
                type="button"
              >
                단일 화면으로 시작
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
