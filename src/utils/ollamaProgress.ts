import type { ModelPullProgress }
from "../types/launcher";

export function parseOllamaPullProgress(logs: string): ModelPullProgress | null {

  const matches =
    [...logs.matchAll(/pulling\s+[a-z0-9_-]+:\s*(\d{1,3})%([^\r\n]*)/gi)];

  const lastMatch =
    matches[matches.length - 1];

  if (!lastMatch?.[1]) {
    return null;
  }

  const trailingLogs =
    logs.slice(lastMatch.index ?? 0);

  if (/success/i.test(trailingLogs)) {
    return null;
  }

  const progress =
    Number(lastMatch[1]);

  const details =
    lastMatch[2] ?? "";

  const speedMatch =
    details.match(/(\d+(?:\.\d+)?\s+(?:[KMGT]i?B|B)\/s)/i);

  const etaMatch =
    details.match(/\b(?=\d)(?:(?:\d+h)?(?:\d+m)?(?:\d+s))\b/i);

  return {
    progress: Math.min(Math.max(progress, 0), 100),
    speed: speedMatch?.[1] ?? null,
    eta: etaMatch?.[0] ?? null
  };
}
