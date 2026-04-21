import type { QuizSet } from "../../types/quiz";
import { getPublicAssetUrl } from "../../routes/routePaths";
import type { ParseQuizRequestMessage, ParseQuizWorkerMessage } from "./quizImport.shared";

export const MAX_QUIZ_FILE_BYTES = 5 * 1024 * 1024;

const TEMPLATE_WORKBOOK_URL = getPublicAssetUrl("templates/golden-bell-template.xlsx");

function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `quiz-import-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createQuizImportWorker() {
  return new Worker(new URL("./quizImport.worker.ts", import.meta.url), {
    type: "classic",
  });
}

export async function parseQuizFile(file: File): Promise<QuizSet> {
  if (file.size > MAX_QUIZ_FILE_BYTES) {
    throw new Error("\uc5d1\uc140 \ud30c\uc77c\uc740 5MB \uc774\ud558\ub9cc \uc5c5\ub85c\ub4dc\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.");
  }

  const buffer = await file.arrayBuffer();
  const worker = createQuizImportWorker();
  const requestId = createRequestId();

  return new Promise<QuizSet>((resolve, reject) => {
    const cleanup = () => {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      worker.removeEventListener("messageerror", handleMessageError);
      worker.terminate();
    };

    const handleMessage = (event: MessageEvent<ParseQuizWorkerMessage>) => {
      if (event.data.requestId !== requestId) {
        return;
      }

      cleanup();

      if (event.data.type === "parse-quiz-success") {
        resolve(event.data.quizSet);
        return;
      }

      reject(new Error(event.data.message));
    };

    const handleError = () => {
      cleanup();
      reject(new Error("\uc5d1\uc140 \ud30c\uc77c\uc744 \ubd88\ub7ec\uc624\ub294 \uc791\uc5c5\uc744 \uc2dc\uc791\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4."));
    };

    const handleMessageError = () => {
      cleanup();
      reject(new Error("\uc5d1\uc140 \ud30c\uc77c \ub370\uc774\ud130\ub97c \ucc98\ub9ac\ud558\ub294 \uc911 \uba54\uc2dc\uc9c0 \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4."));
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);
    worker.addEventListener("messageerror", handleMessageError);

    const request: ParseQuizRequestMessage = {
      type: "parse-quiz",
      requestId,
      buffer,
    };

    worker.postMessage(request, [buffer]);
  });
}

export async function downloadTemplateWorkbook(fileName: string): Promise<void> {
  const anchor = document.createElement("a");

  anchor.href = TEMPLATE_WORKBOOK_URL;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.click();
}
