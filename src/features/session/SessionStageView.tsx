import { useEffect, useMemo, useState } from "react";
import type { Question, QuizSet, SessionPhase, SessionState } from "../../types/quiz";
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

  return "단답형";
}

function getQuestionTypeSignal(type: QuizSet["questions"][number]["type"]): string {
  if (type === "ox") {
    return "OX_QUIZ";
  }

  if (type === "multiple_choice") {
    return "MULTI_CHOICE";
  }

  if (type === "manual") {
    return "ORAL_ORDER";
  }

  return "FILL_IN_BLANK";
}

function getInstruction(question: Question): string {
  if (question.type === "ox") {
    return "O 또는 X를 명확하게 표시해 주세요.";
  }

  if (question.type === "multiple_choice") {
    return "선택지를 보고 정답 번호를 기억해 주세요.";
  }

  if (question.type === "manual") {
    return "손들고 순서대로 답할 준비를 해 주세요.";
  }

  return "정답이 떠오르면 손들고 말할 준비를 해 주세요.";
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

function getPhaseSignal(phase: SessionPhase): string {
  if (phase === "intro") {
    return "BOOT";
  }

  if (phase === "rules") {
    return "RULESET";
  }

  if (phase === "answer") {
    return "ANSWER";
  }

  if (phase === "leaderboard") {
    return "RANKING";
  }

  return "QUERY";
}

function getSubjectSignal(subject: string): string {
  const subjectMap: Record<string, string> = {
    국어: "KOREAN",
    사회: "SOCIAL_STUDIES",
    수학: "MATHEMATICS",
    과학: "SCIENCE",
    영어: "ENGLISH",
  };

  return subjectMap[subject] ?? subject.replace(/\s+/g, "_").toUpperCase();
}

function getContextText(quizSet: QuizSet): string {
  const parts = quizSet.subtitle
    ?.split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts && parts.length > 1) {
    return parts[1];
  }

  if (parts && parts.length === 1) {
    return parts[0];
  }

  return `${quizSet.setName} ${quizSet.subject}`;
}

function formatScoreStars(count: number): string {
  return "★".repeat(Math.max(1, Math.round(count)));
}

function getDifficulty(question: Question): number {
  return question.difficulty ?? Math.min(3, Math.max(1, question.points));
}

function useClockText(): string {
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    [],
  );
  const [clockText, setClockText] = useState(() => formatter.format(new Date()));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockText(formatter.format(new Date()));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [formatter]);

  return clockText;
}

function renderStarMeter(level: number, max: number = 3) {
  return (
    <span className="screen-stars" aria-label={`${level}점 척도`}>
      {Array.from({ length: max }, (_, index) => (
        <span className={`screen-stars__star ${index < level ? "is-active" : ""}`} key={`${level}-${index}`}>
          ★
        </span>
      ))}
    </span>
  );
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
          <p className="host-board__eyebrow">READY TO START</p>
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
        <span className="badge">점수 {formatScoreStars(currentQuestion.points)}</span>
        <span className="badge">난이도 {formatScoreStars(getDifficulty(currentQuestion))}</span>
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

function renderQuestionChrome(quizSet: QuizSet, question: Question, phase: SessionPhase) {
  return (
    <>
      <div className="screen-status-strip">
        <div className="screen-segment screen-segment--primary">
          {getQuestionTypeSignal(question.type)} / {getQuestionTypeLabel(question.type)}
        </div>
        <div className="screen-segment">// {getContextText(quizSet)}</div>
        <div className="screen-segment screen-segment--compact">
          <span className="screen-segment__label">DIFFICULTY</span>
          {renderStarMeter(getDifficulty(question), 3)}
        </div>
        <div className="screen-segment screen-segment--compact">
          <span className="screen-segment__label">PHASE</span>
          <span>{getPhaseSignal(phase)}</span>
        </div>
      </div>

      <div className="screen-question-meta">
        <div className="screen-question-index">
          <span className="screen-question-index__label">QUESTION</span>
          <strong>{String(question.order).padStart(2, "0")}</strong>
        </div>
        <div className="screen-meta-card">
          <span className="screen-meta-card__label">QUESTION_TYPE</span>
          <strong>{getQuestionTypeLabel(question.type)}</strong>
        </div>
        <div className="screen-meta-card">
          <span className="screen-meta-card__label">CONTEXT</span>
          <strong>{getContextText(quizSet)}</strong>
        </div>
      </div>
    </>
  );
}

function renderScreenView(quizSet: QuizSet, state: SessionState, clockText: string) {
  const currentQuestion = quizSet.questions[state.currentQuestionIndex];
  const leaderboard = getLeaderboard(state.participants);
  const topFive = leaderboard.slice(0, 5);
  const showQuestionMeta = currentQuestion && (state.phase === "question" || state.phase === "answer");

  return (
    <section className={`screen-stage screen-stage--${state.phase}`}>
      <div className="screen-marquee">
        <div className="screen-marquee__group">
          <span className="screen-marquee__chip screen-marquee__chip--live">SYS ONLINE</span>
          <span className="screen-marquee__chip">CLASS 6-1</span>
          <span className="screen-marquee__chip">{getSubjectSignal(quizSet.subject)}</span>
          <span className="screen-marquee__chip">MODE GOLDEN_BELL</span>
        </div>
        <div className="screen-marquee__group screen-marquee__group--right">
          <span className="screen-marquee__chip">T {clockText}</span>
          <span className="screen-marquee__chip">PHASE {getPhaseSignal(state.phase)}</span>
        </div>
      </div>

      {showQuestionMeta && currentQuestion ? renderQuestionChrome(quizSet, currentQuestion, state.phase) : null}

      {!showQuestionMeta ? (
        <div className="screen-status-strip">
          <div className="screen-segment screen-segment--primary">{quizSet.setName}</div>
          <div className="screen-segment">// {getContextText(quizSet)}</div>
          <div className="screen-segment screen-segment--compact">
            <span className="screen-segment__label">PARTICIPANTS</span>
            <span>{state.participants.length}명</span>
          </div>
        </div>
      ) : null}

      <div className={`screen-board screen-board--${state.phase}`}>
        {state.phase === "intro" ? (
          <div className="screen-board__body screen-board__body--intro">
            <p className="screen-board__eyebrow">SYSTEM_READY</p>
            <h1 className="screen-board__title">{quizSet.title}</h1>
            <p className="screen-board__subtitle">
              {quizSet.subtitle || "준비가 되면 바로 문제를 시작합니다."}
            </p>
            <div className="screen-stage__status">
              <span>{state.participants.length}명 접속 완료</span>
              <span>{quizSet.questions.length}문항 로드 완료</span>
              <span>{state.timerModeEnabled ? "타이머 모드 ON" : "타이머 모드 OFF"}</span>
            </div>
          </div>
        ) : null}

        {state.phase === "rules" ? (
          <div className="screen-board__body">
            <p className="screen-board__eyebrow">GAME_RULE</p>
            <h2 className="screen-board__title">진행 규칙을 확인해 주세요.</h2>
            <ol className="screen-rules">
              {quizSet.rules.map((rule, index) => (
                <li className="screen-rules__item" key={rule}>
                  <strong>{String(index + 1).padStart(2, "0")}</strong>
                  <span>{rule}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {state.phase === "question" && currentQuestion ? (
          <div className="screen-board__body">
            <div className="screen-question-panel">
              <p className="screen-board__eyebrow">{getQuestionTypeSignal(currentQuestion.type)}</p>
              <h2 className="screen-prompt">{currentQuestion.prompt}</h2>
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
            <div className="screen-stage__status">
              <span>POINTS {formatScoreStars(currentQuestion.points)}</span>
              <span>DIFFICULTY {formatScoreStars(getDifficulty(currentQuestion))}</span>
              <span>{getInstruction(currentQuestion)}</span>
              <span>{state.timerModeEnabled ? "타이머 옵션 켜짐" : "타이머 옵션 꺼짐"}</span>
            </div>
          </div>
        ) : null}

        {state.phase === "answer" && currentQuestion ? (
          <div className="screen-board__body screen-board__body--answer">
            <div className="screen-question-panel">
              <p className="screen-board__eyebrow">ANSWER_PACKET</p>
              <h2 className="screen-prompt screen-prompt--answer">{currentQuestion.prompt}</h2>
            </div>
            <p className="screen-answer">{getAnswerText(currentQuestion)}</p>
            {currentQuestion.type === "multiple_choice"
              ? renderMultipleChoiceOptions(currentQuestion, "screen", true)
              : null}
            <div className="screen-stage__status">
              <span>획득 점수 {formatScoreStars(currentQuestion.points)}</span>
              <span>{currentQuestion.explanation || "다음 입력으로 다음 문항으로 이동합니다."}</span>
            </div>
          </div>
        ) : null}

        {state.phase === "leaderboard" ? (
          <div className="screen-board__body">
            <p className="screen-board__eyebrow">FINAL_RANKING</p>
            <h2 className="screen-board__title">오늘의 최종 순위</h2>
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
  const clockText = useClockText();

  if (mode === "screen") {
    return renderScreenView(quizSet, state, clockText);
  }

  return renderHostView(quizSet, state);
}
