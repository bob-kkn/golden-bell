import type { Question, QuizSet, SessionPhase, SessionState } from "../../types/quiz";
import { getPublicAssetUrl } from "../../routes/routePaths";
import { getAnswerText, getLeaderboard } from "./sessionReducer";

interface SessionStageViewProps {
  quizSet: QuizSet;
  state: SessionState;
  mode: "host" | "screen";
}

function getQuestionTypeLabel(type: QuizSet["questions"][number]["type"]): string {
  if (type === "ox") {
    return "O/X 퀴즈";
  }

  if (type === "multiple_choice") {
    return "객관식";
  }

  if (type === "manual") {
    return "손들기 문제";
  }

  return "빈칸 맞히기";
}

function getInstruction(question: Question): string {
  if (question.type === "ox") {
    return "O 또는 X를 크게 들어 주세요.";
  }

  if (question.type === "multiple_choice") {
    return "정답 번호를 고르고 기억해 주세요.";
  }

  if (question.type === "manual") {
    return "손들고 대답할 친구를 골라 주세요.";
  }

  return "정답칸에 또박또박 적어 주세요.";
}

function getPhaseTitle(phase: SessionPhase): string {
  if (phase === "intro") {
    return "도전 골든벨";
  }

  if (phase === "rules") {
    return "게임 규칙";
  }

  if (phase === "answer") {
    return "정답 공개";
  }

  if (phase === "leaderboard") {
    return "최종 순위";
  }

  return "문제";
}

function renderMultipleChoiceOptions(
  question: Extract<Question, { type: "multiple_choice" }>,
  tone: "host" | "screen",
  revealAnswer: boolean,
) {
  return (
    <div className={`multiple-choice-grid multiple-choice-grid--${tone}`}>
      {question.choices.map((choice, index) => (
        <div
          className={`multiple-choice-card multiple-choice-card--${tone} ${
            revealAnswer && index === question.correctChoiceIndex ? "is-correct" : ""
          }`}
          key={`${question.id}-choice-${index + 1}`}
        >
          <span className="multiple-choice-card__label">{index + 1}</span>
          <span className="multiple-choice-card__text">{choice}</span>
        </div>
      ))}
    </div>
  );
}

function renderHostView(quizSet: QuizSet, state: SessionState) {
  const currentQuestion = quizSet.questions[state.currentQuestionIndex];
  const leaderboard = getLeaderboard(state.participants);

  if (state.phase === "intro") {
    return (
      <section className="host-board host-board--intro">
        <div className="host-board__header">
          <span className="badge">{quizSet.subject}</span>
          <span className="badge">{quizSet.setName}</span>
          <span className="badge">{state.participants.length}명 준비 완료</span>
        </div>
        <div className="host-board__body">
          <p className="host-board__eyebrow">오늘의 시작</p>
          <h2 className="host-board__title">{quizSet.title}</h2>
          <p className="host-board__subtitle">
            {quizSet.subtitle || "발표 화면을 띄우고 규칙부터 시작해 주세요."}
          </p>
        </div>
      </section>
    );
  }

  if (state.phase === "rules") {
    return (
      <section className="host-board host-board--rules">
        <div className="host-board__header">
          <span className="badge">규칙</span>
          <span className="badge">{quizSet.rules.length}개 항목</span>
        </div>
        <div className="host-board__body">
          <h2 className="host-board__title">학생들에게 먼저 안내해 주세요.</h2>
          <ol className="host-rules">
            {quizSet.rules.map((rule, index) => (
              <li className="host-rules__item" key={rule}>
                <strong>{index + 1}</strong>
                <span>{rule}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  if (state.phase === "leaderboard") {
    return (
      <section className="host-board host-board--leaderboard">
        <div className="host-board__header">
          <span className="badge">최종 순위</span>
          <span className="badge">{quizSet.questions.length}문항 완료</span>
        </div>
        <div className="host-board__body">
          <h2 className="host-board__title">수업 마무리 순위표</h2>
          <ol className="host-leaderboard">
            {leaderboard.map((participant) => (
              <li className={`host-leaderboard__row ${participant.rank === 1 ? "is-top" : ""}`} key={participant.id}>
                <strong>{participant.rank}위</strong>
                <span>{participant.name}</span>
                <span>{participant.score}점</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  if (!currentQuestion) {
    return (
      <section className="host-board">
        <div className="empty-state">문항을 찾지 못했습니다.</div>
      </section>
    );
  }

  return (
    <section className={`host-board ${state.phase === "answer" ? "host-board--answer" : "host-board--question"}`}>
      <div className="host-board__header">
        <span className="badge">{getQuestionTypeLabel(currentQuestion.type)}</span>
        <span className="badge">{currentQuestion.order}번</span>
        <span className="badge">{currentQuestion.points}점</span>
        {currentQuestion.bonusLabel ? <span className="badge">{currentQuestion.bonusLabel}</span> : null}
      </div>
      <div className="host-board__body">
        <p className="host-board__eyebrow">{getPhaseTitle(state.phase)}</p>
        <h2 className="host-board__prompt">{currentQuestion.prompt}</h2>
        {state.phase === "answer" ? (
          <div className="host-board__answer-wrap">
            <p className="host-board__answer">{getAnswerText(currentQuestion)}</p>
            {currentQuestion.explanation ? <p className="host-board__subtitle">{currentQuestion.explanation}</p> : null}
          </div>
        ) : null}
        {state.phase === "question" && currentQuestion.type === "ox" ? (
          <div className="host-choice-row">
            <span>O</span>
            <span>X</span>
          </div>
        ) : null}
        {currentQuestion.type === "multiple_choice"
          ? renderMultipleChoiceOptions(currentQuestion, "host", state.phase === "answer")
          : null}
      </div>
      <div className="host-board__footer">
        {state.phase === "question" && state.timer.enabled ? (
          <div className="timer timer--host">{state.timer.remaining}</div>
        ) : (
          <span className="host-board__hint">{getInstruction(currentQuestion)}</span>
        )}
      </div>
    </section>
  );
}

function renderScreenView(quizSet: QuizSet, state: SessionState) {
  const currentQuestion = quizSet.questions[state.currentQuestionIndex];
  const leaderboard = getLeaderboard(state.participants);
  const topFive = leaderboard.slice(0, 5);
  const showQuestionMeta = currentQuestion && (state.phase === "question" || state.phase === "answer");

  return (
    <section className={`screen-stage screen-stage--${state.phase}`}>
      <div className="screen-marquee">
        <span className="screen-marquee__chip">{quizSet.subject}</span>
        <strong className="screen-marquee__title">{quizSet.title}</strong>
        <span className="screen-marquee__chip">{getPhaseTitle(state.phase)}</span>
        {showQuestionMeta ? (
          <span className="screen-marquee__chip">
            {currentQuestion.order}/{quizSet.questions.length}
          </span>
        ) : null}
      </div>

      <img
        alt=""
        aria-hidden="true"
        className="screen-stage__mascot screen-stage__mascot--left"
        src={getPublicAssetUrl("assets/ppt/thinking-boy.png")}
      />
      <img
        alt=""
        aria-hidden="true"
        className="screen-stage__mascot screen-stage__mascot--right"
        src={getPublicAssetUrl("assets/ppt/question-boy.png")}
      />

      <div className={`screen-board screen-board--${state.phase}`}>
        <div className="screen-board__header">
          <span className="screen-board__phase">{getPhaseTitle(state.phase)}</span>
          {showQuestionMeta ? (
            <div className="screen-board__meta">
              <span>{getQuestionTypeLabel(currentQuestion.type)}</span>
              <span>{currentQuestion.points}점</span>
              {currentQuestion.bonusLabel ? <span>{currentQuestion.bonusLabel}</span> : null}
            </div>
          ) : (
            <div className="screen-board__meta">
              <span>{quizSet.setName}</span>
              <span>{state.participants.length}명 참가</span>
            </div>
          )}
        </div>

        {state.phase === "intro" ? (
          <div className="screen-board__body screen-board__body--intro">
            <p className="screen-board__eyebrow">READY?</p>
            <h1 className="screen-board__title">{quizSet.title}</h1>
            <p className="screen-board__subtitle">
              {quizSet.subtitle || "준비가 되면 바로 문제판을 시작합니다."}
            </p>
            <div className="screen-stage__status">
              <span>{state.participants.length}명 도전 준비 완료</span>
              <span>{quizSet.questions.length}문항 진행</span>
            </div>
          </div>
        ) : null}

        {state.phase === "rules" ? (
          <div className="screen-board__body">
            <p className="screen-board__eyebrow">GAME RULE</p>
            <h2 className="screen-board__title">다 같이 집중해 주세요.</h2>
            <ol className="screen-rules">
              {quizSet.rules.map((rule, index) => (
                <li className="screen-rules__item" key={rule}>
                  <strong>{index + 1}</strong>
                  <span>{rule}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {state.phase === "question" && currentQuestion ? (
          <div className="screen-board__body">
            <p className="screen-board__eyebrow">QUESTION</p>
            <h2 className="screen-prompt">{currentQuestion.prompt}</h2>
            <div className="screen-stage__status">
              <span>{getInstruction(currentQuestion)}</span>
              <span>
                {currentQuestion.type === "manual"
                  ? "가장 먼저 준비된 친구에게 기회"
                  : currentQuestion.type === "multiple_choice"
                    ? "생각한 정답 번호를 기억해 주세요"
                    : "정답 공개 전까지 조용히 생각하기"}
              </span>
            </div>
            {currentQuestion.type === "ox" ? (
              <div className="screen-choice-row">
                <span>O</span>
                <span>X</span>
              </div>
            ) : null}
            {currentQuestion.type === "multiple_choice"
              ? renderMultipleChoiceOptions(currentQuestion, "screen", false)
              : null}
          </div>
        ) : null}

        {state.phase === "answer" && currentQuestion ? (
          <div className="screen-board__body screen-board__body--answer">
            <p className="screen-board__eyebrow">ANSWER</p>
            <h2 className="screen-prompt">{currentQuestion.prompt}</h2>
            <p className="screen-answer">{getAnswerText(currentQuestion)}</p>
            <div className="screen-stage__status">
              <span>{currentQuestion.points}점 획득 문제</span>
              <span>{currentQuestion.explanation || "다음 Enter로 다음 문제로 넘어갑니다."}</span>
            </div>
            {currentQuestion.type === "multiple_choice"
              ? renderMultipleChoiceOptions(currentQuestion, "screen", true)
              : null}
          </div>
        ) : null}

        {state.phase === "leaderboard" ? (
          <div className="screen-board__body">
            <p className="screen-board__eyebrow">LEADERBOARD</p>
            <h2 className="screen-board__title">오늘의 순위 발표</h2>
            <ol className="screen-leaderboard">
              {topFive.map((participant) => (
                <li className={`screen-leaderboard__row ${participant.rank === 1 ? "is-top" : ""}`} key={participant.id}>
                  <strong>{participant.rank}위</strong>
                  <span>{participant.name}</span>
                  <span>{participant.score}점</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>

      {state.phase === "question" && currentQuestion && state.timer.enabled ? (
        <div className="screen-clock" aria-label="남은 시간">
          <span className="screen-clock__label">TIME</span>
          <strong>{state.timer.remaining}</strong>
        </div>
      ) : null}
    </section>
  );
}

export function SessionStageView({ quizSet, state, mode }: SessionStageViewProps) {
  if (mode === "screen") {
    return renderScreenView(quizSet, state);
  }

  return renderHostView(quizSet, state);
}
