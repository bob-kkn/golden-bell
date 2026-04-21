import type { CSSProperties } from "react";

function clamp(value: number): number {
  return Math.max(0, Math.min(255, value));
}

function shift(hex: string, amount: number): string {
  const raw = hex.replace("#", "");
  const normalized = raw.length === 6 ? raw : "4472C4";
  const r = clamp(parseInt(normalized.slice(0, 2), 16) + amount);
  const g = clamp(parseInt(normalized.slice(2, 4), 16) + amount);
  const b = clamp(parseInt(normalized.slice(4, 6), 16) + amount);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function buildThemeStyle(themeColor?: string): CSSProperties {
  const accent = themeColor && /^#[0-9A-Fa-f]{6}$/.test(themeColor) ? themeColor : "#4472C4";

  return {
    "--accent": accent,
    "--accent-strong": shift(accent, -28),
    "--accent-soft": shift(accent, 190),
  } as CSSProperties;
}
