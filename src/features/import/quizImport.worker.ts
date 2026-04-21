/// <reference lib="webworker" />

import { parseQuizData, type QuizWorkbookData, type WorksheetTableData } from "./quizParser";
import type { ParseQuizRequestMessage, ParseQuizWorkerMessage } from "./quizImport.shared";

interface ExcelJsCell {
  value: unknown;
}

interface ExcelJsRow {
  eachCell(
    options: { includeEmpty?: boolean },
    callback: (cell: ExcelJsCell, columnNumber: number) => void,
  ): void;
  getCell(columnNumber: number): ExcelJsCell;
}

interface ExcelJsWorksheet {
  rowCount: number;
  getRow(rowNumber: number): ExcelJsRow;
}

interface ExcelJsWorkbook {
  xlsx: {
    load(data: ArrayBuffer): Promise<void>;
  };
  getWorksheet(name: string): ExcelJsWorksheet | undefined;
}

interface ExcelJsNamespace {
  Workbook: new () => ExcelJsWorkbook;
}

const workerScope = self as DedicatedWorkerGlobalScope & { ExcelJS?: ExcelJsNamespace };
let excelJsPromise: Promise<ExcelJsNamespace> | null = null;
const EXCEL_JS_URL = new URL(`${import.meta.env.BASE_URL}vendor/exceljs.min.js`, workerScope.location.origin).toString();

function normalizeString(value: unknown): string {
  return String(value ?? "").trim();
}

function resolveCellValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText
        .map((item) => (typeof item === "object" && item && "text" in item ? String(item.text ?? "") : ""))
        .join("");
    }

    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }

    if ("result" in value) {
      return resolveCellValue(value.result);
    }

    if ("error" in value && typeof value.error === "string") {
      return value.error;
    }
  }

  return "";
}

function readWorksheetTable(workbook: ExcelJsWorkbook, name: string): WorksheetTableData {
  const worksheet = workbook.getWorksheet(name);

  if (!worksheet) {
    throw new Error(`${name} \uc2dc\ud2b8\ub97c \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.`);
  }

  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];

  headerRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
    headers[columnNumber - 1] = normalizeString(resolveCellValue(cell.value));
  });

  const rows: Record<string, unknown>[] = [];

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const mappedRow = headers.reduce<Record<string, unknown>>((accumulator, header, index) => {
      if (!header) {
        return accumulator;
      }

      accumulator[header] = resolveCellValue(row.getCell(index + 1).value);
      return accumulator;
    }, {});

    if (Object.values(mappedRow).some((value) => normalizeString(value) !== "")) {
      rows.push(mappedRow);
    }
  }

  return {
    headers,
    rows,
  };
}

function readWorkbookData(workbook: ExcelJsWorkbook): QuizWorkbookData {
  return {
    meta: readWorksheetTable(workbook, "meta"),
    rules: readWorksheetTable(workbook, "rules"),
    questions: readWorksheetTable(workbook, "questions"),
  };
}

async function ensureExcelJs(): Promise<ExcelJsNamespace> {
  if (!excelJsPromise) {
    excelJsPromise = new Promise<ExcelJsNamespace>((resolve, reject) => {
      try {
        if (!workerScope.ExcelJS) {
          importScripts(EXCEL_JS_URL);
        }

        if (!workerScope.ExcelJS) {
          throw new Error("ExcelJS failed to load.");
        }

        resolve(workerScope.ExcelJS);
      } catch (error) {
        reject(error);
      }
    });
  }

  return excelJsPromise;
}

function postMessageToHost(message: ParseQuizWorkerMessage) {
  workerScope.postMessage(message);
}

async function handleParseRequest(request: ParseQuizRequestMessage) {
  if (request.type !== "parse-quiz") {
    return;
  }

  try {
    const excelJs = await ensureExcelJs();
    const workbook = new excelJs.Workbook();

    await workbook.xlsx.load(request.buffer);
    const quizSet = parseQuizData(readWorkbookData(workbook));

    postMessageToHost({
      type: "parse-quiz-success",
      requestId: request.requestId,
      quizSet,
    });
  } catch (error) {
    postMessageToHost({
      type: "parse-quiz-error",
      requestId: request.requestId,
      message:
        error instanceof Error
          ? error.message
          : "\uc5d1\uc140 \ud30c\uc77c\uc744 \uc77d\ub294 \uc911 \uc608\uc0c1\ud558\uc9c0 \ubabb\ud55c \uc624\ub958\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4.",
    });
  }
}

workerScope.addEventListener("message", (event: MessageEvent<ParseQuizRequestMessage>) => {
  void handleParseRequest(event.data);
});
