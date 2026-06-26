import React, {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Download,
  ExternalLink,
  ImagePlus,
  Save
} from "lucide-react";

import type { Translations }
from "../../i18n";
import {
  type ComfyUIGeneratedImage,
  queueComfyUIImageGeneration,
  saveComfyUIGeneratedImage
} from "../../services/tauris";
import type {
  InstallationFeedback,
  PendingImageGeneratorAction
} from "../../types/launcher";
import {
  buildWorkflowForPrompt,
  type ImageGeneratorModel
} from "../../utils/imageGeneratorModels";
import { parseComfyUIGenerationProgress }
from "../../utils/comfyUIGenerationProgress";

type ImageGeneratorFeedback =
  | "imageGenerated"
  | "imageSaved"
  | "error"
  | null;

type Props = {
  availableModels: ImageGeneratorModel[];
  installationFeedback: InstallationFeedback;
  isComfyUIInstalled: boolean;
  isComfyUIRunning: boolean;
  labels: Translations["pages"]["imageGenerator"];
  logs: string[];
  pendingAction: PendingImageGeneratorAction;
  progressLabels: Translations["progress"];
  runtimeProgress: number;
  translatedRuntimeProgressStatus: string;
  onInstall: () => void;
  onOpen: () => void;
};

export default function ImageGeneratorPage({
  availableModels,
  installationFeedback,
  isComfyUIInstalled,
  isComfyUIRunning,
  labels,
  logs,
  pendingAction,
  onInstall,
  onOpen
}: Props) {

  const initialModelName =
    availableModels[0]?.name ?? "";

  const [selectedModelName, setSelectedModelName] =
    useState(initialModelName);

  const [prompt, setPrompt] =
    useState("");

  const [feedback, setFeedback] =
    useState<ImageGeneratorFeedback>(null);

  const [promptId, setPromptId] =
    useState<string | null>(null);

  const [isGenerating, setIsGenerating] =
    useState(false);

  const [generationLogStartIndex, setGenerationLogStartIndex] =
    useState(0);

  const [isSavingImage, setIsSavingImage] =
    useState(false);

  const [generatedImage, setGeneratedImage] =
    useState<ComfyUIGeneratedImage | null>(null);

  const selectedModel =
    useMemo(
      () => availableModels.find((model) => model.name === selectedModelName),
      [
        availableModels,
        selectedModelName
      ]
    );

  const hasAvailableModels =
    availableModels.length > 0;

  const isModelActionBusy =
    isGenerating || isSavingImage;

  const isBusy =
    pendingAction !== null || isModelActionBusy;

  const trimmedPrompt =
    prompt.trim();

  const canGenerate =
    isComfyUIRunning
    && selectedModel !== undefined
    && trimmedPrompt !== ""
    && !isBusy;

  const generationLogs =
    logs.slice(Math.min(generationLogStartIndex, logs.length));

  const generationProgress =
    isGenerating
      ? Math.round(
        parseComfyUIGenerationProgress(generationLogs.join("\n")) ?? 0
      )
      : 0;

  const statusLabel =
    pendingAction === "install"
      ? labels.installingAction
      : pendingAction === "start"
        ? labels.startingAction
        : pendingAction === "stop"
          ? labels.stoppingAction
          : isComfyUIRunning
            ? labels.statusRunning
            : isComfyUIInstalled
              ? labels.statusInstalled
              : labels.statusMissing;

  const statusClassName =
    isComfyUIRunning
      ? "module-surface__status module-surface__status--ready"
      : isComfyUIInstalled
        ? "module-surface__status module-surface__status--installed"
        : "module-surface__status";

  const feedbackMessage =
    feedback === "imageGenerated"
        ? promptId === null
          ? labels.imageGenerated
          : `${labels.imageGenerated} ${promptId}`
        : feedback === "imageSaved"
          ? labels.imageSaved
        : feedback === "error"
          ? labels.imageActionError
          : null;

  useEffect(() => {

    if (availableModels.length === 0) {
      setSelectedModelName("");
      return;
    }

    if (!availableModels.some((model) => model.name === selectedModelName)) {
      setSelectedModelName(availableModels[0].name);
      setFeedback(null);
      setPromptId(null);
      setGeneratedImage(null);
    }
  }, [
    availableModels,
    selectedModelName
  ]);

  async function generateImage(event: React.FormEvent<HTMLFormElement>) {

    event.preventDefault();

    if (selectedModel === undefined || trimmedPrompt === "") {
      return;
    }

    setFeedback(null);
    setPromptId(null);
    setGeneratedImage(null);
    setGenerationLogStartIndex(logs.length);
    setIsGenerating(true);

    try {
      const workflow =
        buildWorkflowForPrompt(selectedModel, trimmedPrompt);
      const response =
        await queueComfyUIImageGeneration(workflow);

      setPromptId(response.prompt_id);
      setGeneratedImage(response.image);
      setFeedback("imageGenerated");
    } catch {
      setFeedback("error");
    } finally {
      setIsGenerating(false);
    }
  }

  async function saveGeneratedImage() {

    if (generatedImage === null) {
      return;
    }

    setFeedback(null);
    setIsSavingImage(true);

    try {
      const didSave =
        await saveComfyUIGeneratedImage(generatedImage);

      if (didSave) {
        setFeedback("imageSaved");
      }
    } catch {
      setFeedback("error");
    } finally {
      setIsSavingImage(false);
    }
  }

  return (
    <section className="module-surface" aria-labelledby="page-title">
      <div className="module-surface__header">
        <span className={statusClassName}>
          {statusLabel}
        </span>
      </div>

      <form className="module-form" onSubmit={generateImage}>
        {hasAvailableModels ? (
          <label className="module-field">
            <span>{labels.modelLabel}</span>
            <select
              disabled={isBusy}
              value={selectedModelName}
              onChange={(event) => {
                setSelectedModelName(event.target.value);
                setFeedback(null);
                setPromptId(null);
                setGeneratedImage(null);
              }}
            >
              {availableModels.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="module-empty-state" role="status">
            {labels.noModelAvailable}
          </p>
        )}

        <label className="module-field">
          <span>{labels.promptLabel}</span>
          <textarea
            disabled={!hasAvailableModels || isGenerating}
            placeholder={labels.promptPlaceholder}
            rows={4}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
        </label>

        {generatedImage !== null && (
          <section
            className="image-generator-result"
            aria-label={labels.generatedImageLabel}
          >
            <img
              alt={labels.generatedImageAlt}
              src={generatedImage.data_url}
            />

            <div className="image-generator-result__actions">
              <button
                type="button"
                className="settings-save-button"
                disabled={isBusy}
                onClick={saveGeneratedImage}
              >
                <Save size={18} />
                <span>
                  {isSavingImage
                    ? labels.savingImageAction
                    : labels.saveImageAction}
                </span>
              </button>
            </div>
          </section>
        )}

        <div className="module-actions">
          {!isComfyUIInstalled && (
            <button
              type="button"
              className="settings-save-button"
              disabled={isBusy}
              onClick={onInstall}
            >
              <Download size={18} />
              <span>
                {pendingAction === "install"
                  ? labels.installingAction
                  : labels.installAction}
              </span>
            </button>
          )}

          {isComfyUIRunning && (
            <>
              <button
                type="submit"
                className={
                  isGenerating
                    ? "settings-save-button settings-save-button--progress"
                    : "settings-save-button"
                }
                disabled={!canGenerate}
                style={
                  isGenerating
                    ? {
                        "--button-progress": `${generationProgress}%`
                      } as React.CSSProperties
                    : undefined
                }
              >
                {isGenerating ? (
                  <span className="button-loader" aria-hidden="true" />
                ) : (
                  <ImagePlus size={18} />
                )}
                <span>
                  {isGenerating
                    ? `${labels.generatingAction} ${generationProgress}%`
                    : labels.primaryAction}
                </span>
              </button>

              <button
                type="button"
                className="settings-save-button"
                disabled={isBusy}
                onClick={onOpen}
              >
                <ExternalLink size={18} />
                <span>{labels.openAction}</span>
              </button>
            </>
          )}
        </div>

        {installationFeedback !== null && (
          <p
            className={
              installationFeedback === "started"
                ? "settings-feedback settings-feedback--saved"
                : "settings-feedback settings-feedback--error"
            }
          >
            {installationFeedback === "started"
              ? labels.installStarted
              : labels.installError}
          </p>
        )}

        {feedbackMessage !== null && (
          <p
            className={
              feedback === "error"
                ? "settings-feedback settings-feedback--error"
                : "settings-feedback settings-feedback--saved"
            }
          >
            {feedbackMessage}
          </p>
        )}
      </form>

    </section>
  );
}
