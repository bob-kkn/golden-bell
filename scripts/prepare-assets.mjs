import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const publicDir = path.join(rootDir, "public");
const vendorDir = path.join(publicDir, "vendor");
const templateDir = path.join(publicDir, "templates");
const excelJsSourcePath = path.join(rootDir, "node_modules", "exceljs", "dist", "exceljs.min.js");
const excelJsTargetPath = path.join(vendorDir, "exceljs.min.js");
const templateTargetPath = path.join(templateDir, "golden-bell-template.xlsx");

function addSheetFromRecords(workbook, name, rows) {
  const worksheet = workbook.addWorksheet(name);
  const headers = Object.keys(rows[0] ?? {});

  if (headers.length > 0) {
    worksheet.addRow(headers);
  }

  for (const row of rows) {
    worksheet.addRow(headers.map((header) => row[header] ?? ""));
  }
}

async function createTemplateWorkbook() {
  const excelJSImport = await import("exceljs");
  const Workbook = excelJSImport.Workbook ?? excelJSImport.default?.Workbook;

  if (!Workbook) {
    throw new Error("ExcelJS Workbook export is unavailable.");
  }

  const workbook = new Workbook();

  addSheetFromRecords(workbook, "meta", [
    {
      subject: "\uad6d\uc5b4",
      setName: "4\uc6d4 \uace8\ub4e0\ubca8",
      title: "6\ud559\ub144 2\ubc18 4\uc6d4 \uad6d\uc5b4 \uace8\ub4e0\ubca8",
      subtitle: "\uc5d1\uc140 \uc5c5\ub85c\ub4dc\uc6a9 \uc608\uc2dc",
      themeColor: "#4472C4",
    },
  ]);

  addSheetFromRecords(workbook, "rules", [
    { rule: "\ubb38\uc81c\ub97c \ubcf4\uace0 \uc815\ub2f5\uc744 \uc801\uc5b4\uc694." },
    { rule: "\uc9c4\ud589\uc790\uc758 \uc2e0\ud638\uc5d0 \ub9de\ucdb0 \ub3d9\uc2dc\uc5d0 \uacf5\uac1c\ud574\uc694." },
    { rule: "\uad50\uc0ac\uac00 \uc815\ub2f5 \uc5ec\ubd80\ub97c \uccb4\ud06c\ud574 \uc810\uc218\ub97c \ubc18\uc601\ud574\uc694." },
  ]);

  addSheetFromRecords(workbook, "questions", [
    {
      order: 1,
      type: "short_text",
      prompt: "\ube48\uce78\uc744 \ucc44\uc6cc \ubcf4\uc138\uc694.",
      answer: "\uc815\ub2f5",
      points: 1,
      timerSeconds: 20,
      bonusLabel: "",
      explanation: "",
      choice1: "",
      choice2: "",
      choice3: "",
      choice4: "",
    },
    {
      order: 2,
      type: "ox",
      prompt: "\ub9de\uc73c\uba74 O, \ud2c0\ub9ac\uba74 X\ub97c \uc801\uc5b4 \ubcf4\uc138\uc694.",
      answer: "O",
      points: 2,
      timerSeconds: 15,
      bonusLabel: "",
      explanation: "",
      choice1: "",
      choice2: "",
      choice3: "",
      choice4: "",
    },
    {
      order: 3,
      type: "multiple_choice",
      prompt: "\uac1d\uad00\uc2dd \ubb38\ud56d\uc785\ub2c8\ub2e4. answer\uc5d0 \uc815\ub2f5 \ubc88\ud638\ub97c \uc801\uc5b4\uc8fc\uc138\uc694.",
      answer: 2,
      points: 3,
      timerSeconds: 20,
      bonusLabel: "",
      explanation: "\uc608\uc2dc\ub294 2\ubc88 \uc120\ud0dd\uc9c0\uac00 \uc815\ub2f5\uc785\ub2c8\ub2e4.",
      choice1: "\uc120\ud0dd\uc9c0 1",
      choice2: "\uc120\ud0dd\uc9c0 2",
      choice3: "\uc120\ud0dd\uc9c0 3",
      choice4: "\uc120\ud0dd\uc9c0 4",
    },
    {
      order: 4,
      type: "manual",
      prompt: "\uc190\ub4e4\uace0 \ub300\ub2f5\ud558\ub294 \ubb38\uc81c\uc785\ub2c8\ub2e4.",
      answer: "\uc608\uc2dc \uc815\ub2f5",
      points: 3,
      timerSeconds: "",
      bonusLabel: "SURPRISE",
      explanation: "\ud544\uc694\ud558\uba74 \uad50\uc0ac\uac00 \uc77c\ubd80 \ud559\uc0dd\ub9cc \uc815\ub2f5 \ucc98\ub9ac\ud560 \uc218 \uc788\uc5b4\uc694.",
      choice1: "",
      choice2: "",
      choice3: "",
      choice4: "",
    },
  ]);

  return workbook;
}

async function main() {
  await mkdir(vendorDir, { recursive: true });
  await mkdir(templateDir, { recursive: true });
  await copyFile(excelJsSourcePath, excelJsTargetPath);

  const workbook = await createTemplateWorkbook();
  const buffer = await workbook.xlsx.writeBuffer();
  await writeFile(templateTargetPath, Buffer.from(buffer));

  process.stdout.write("Prepared Excel worker assets.\n");
}

await main();
