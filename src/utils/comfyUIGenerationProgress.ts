const comfyUILogPattern =
  /^(?:\[comfyui\]\s*)?(.*)$/gim;

export function parseComfyUIGenerationProgress(logs: string) {

  let progress: number | null =
    null;

  for (const lineMatch of logs.matchAll(comfyUILogPattern)) {
    const line =
      lineMatch[1] ?? "";

    const percentMatches =
      [...line.matchAll(/(\d{1,3}(?:[.,]\d+)?)\s*%/g)];
    const lastPercentMatch =
      percentMatches[percentMatches.length - 1];

    if (lastPercentMatch?.[1] !== undefined) {
      const parsedProgress =
        Number(lastPercentMatch[1].replace(",", "."));

      if (Number.isFinite(parsedProgress)) {
        progress =
          Math.min(Math.max(parsedProgress, 0), 100);
        continue;
      }
    }

    const stepMatches =
      [...line.matchAll(/(\d+)\s*\/\s*(\d+)/g)];
    const lastStepMatch =
      stepMatches[stepMatches.length - 1];

    if (lastStepMatch?.[1] === undefined
      || lastStepMatch[2] === undefined) {
      continue;
    }

    const currentStep =
      Number(lastStepMatch[1]);
    const totalSteps =
      Number(lastStepMatch[2]);

    if (Number.isFinite(currentStep)
      && Number.isFinite(totalSteps)
      && totalSteps > 0) {
      progress =
        Math.min(Math.max((currentStep / totalSteps) * 100, 0), 100);
    }
  }

  return progress;
}
