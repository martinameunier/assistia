const comfyUIModelLogPattern =
  /^\[(?:comfyui-model|comfyui-models)\]\s*(.*)$/gim;

export function parseComfyUIModelDownloadProgress(logs: string) {

  let progress: number | null =
    null;

  for (const lineMatch of logs.matchAll(comfyUIModelLogPattern)) {
    const line =
      lineMatch[1] ?? "";
    const percentMatches =
      [...line.matchAll(/(\d{1,3}(?:[.,]\d+)?)\s*%/g)];
    const lastPercentMatch =
      percentMatches[percentMatches.length - 1];

    if (lastPercentMatch?.[1] === undefined) {
      continue;
    }

    const parsedProgress =
      Number(lastPercentMatch[1].replace(",", "."));

    if (Number.isFinite(parsedProgress)) {
      progress =
        Math.min(Math.max(parsedProgress, 0), 100);
    }
  }

  return progress;
}
