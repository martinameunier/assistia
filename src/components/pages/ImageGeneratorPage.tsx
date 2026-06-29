import React, {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Download,
  ExternalLink,
  ImagePlus,
  Save,
  Trash2
} from "lucide-react";

import type { Translations }
from "../../i18n";
import {
  type ComfyUIGeneratedImage,
  queueComfyUIImageGeneration,
  saveComfyUIGeneratedImage
} from "../../services/tauris";
import { useLauncherStore }
from "../../store/launcherStore";
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
  runtimeProgress,
  onInstall,
  onOpen
}: Props) {

  const [feedback, setFeedback] =
    useState<ImageGeneratorFeedback>(null);

  const [isSavingImage, setIsSavingImage] =
    useState(false);

  const failImageGeneration =
    useLauncherStore((state) => state.failImageGeneration);
  const finishImageGeneration =
    useLauncherStore((state) => state.finishImageGeneration);
  const generatedImages =
    useLauncherStore((state) => state.imageGeneratorImages);
  const generationLogStartIndex =
    useLauncherStore((state) => state.imageGeneratorGenerationLogStartIndex);
  const isGenerating =
    useLauncherStore((state) => state.imageGeneratorIsGenerating);
  const prompt =
    useLauncherStore((state) => state.imageGeneratorPrompt);
  const promptId =
    useLauncherStore((state) => state.imageGeneratorPromptId);
  const removeGeneratedImage =
    useLauncherStore((state) => state.removeGeneratedImage);
  const selectedModelName =
    useLauncherStore((state) => state.imageGeneratorSelectedModelName);
  const setPrompt =
    useLauncherStore((state) => state.setImageGeneratorPrompt);
  const setSelectedModelName =
    useLauncherStore((state) => state.setImageGeneratorSelectedModelName);
  const startImageGeneration =
    useLauncherStore((state) => state.startImageGeneration);
  const currentImageId =
    useLauncherStore((state) => state.imageGeneratorCurrentImageId);

  const selectedModel =
    useMemo(
      () => availableModels.find((model) => model.name === selectedModelName),
      [
        availableModels,
        selectedModelName
      ]
    );

  const generatedImage =
    generatedImages.find((item) => item.id === currentImageId)?.image
    ?? null;

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
        parseComfyUIGenerationProgress(generationLogs.join("\n"))
        ?? Math.min(Math.max(runtimeProgress - 94, 0) * 20, 100)
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
    }
  }, [
    availableModels,
    selectedModelName,
    setSelectedModelName
  ]);

  async function generateImage(event: React.FormEvent<HTMLFormElement>) {

    event.preventDefault();

    if (selectedModel === undefined || trimmedPrompt === "") {
      return;
    }

    setFeedback(null);
    startImageGeneration(logs.length);

    try {
      const workflow =
        buildWorkflowForPrompt(selectedModel, trimmedPrompt);
      const response =
        await queueComfyUIImageGeneration(workflow);

      finishImageGeneration({
        createdAt: Date.now(),
        id: createGeneratedImageId(),
        image: response.image,
        modelName: selectedModel.name,
        prompt: trimmedPrompt,
        promptId: response.prompt_id
      });
      setFeedback("imageGenerated");
    } catch {
      failImageGeneration();
      setFeedback("error");
    }
  }

  async function saveGeneratedImage(image: ComfyUIGeneratedImage) {

    setFeedback(null);
    setIsSavingImage(true);

    try {
      const didSave =
        await saveComfyUIGeneratedImage(image);

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
                onClick={() => void saveGeneratedImage(generatedImage)}
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

      {generatedImages.length > 0 && (
        <section
          className="image-generator-history"
          aria-label={labels.generatedImagesHistoryLabel}
        >
          <div className="image-generator-history__header">
            <h2>{labels.generatedImagesHistoryTitle}</h2>
          </div>

          <div className="image-generator-history__list">
            {generatedImages.map((item) => (
              <article
                key={item.id}
                className="image-generator-history__item"
              >
                <img
                  alt={labels.generatedImageAlt}
                  src={item.image.data_url}
                />

                <div className="image-generator-history__meta">
                  <strong>{item.modelName}</strong>
                  <span>{item.prompt}</span>
                </div>

                <div className="image-generator-history__actions">
                  <button
                    type="button"
                    className="settings-icon-button"
                    disabled={isBusy}
                    onClick={() => void saveGeneratedImage(item.image)}
                    aria-label={labels.saveImageAction}
                    title={labels.saveImageAction}
                  >
                    <Save size={18} />
                  </button>

                  <button
                    type="button"
                    className="settings-icon-button settings-icon-button--danger"
                    disabled={isBusy}
                    onClick={() => {
                      removeGeneratedImage(item.id);
                      setFeedback(null);
                    }}
                    aria-label={labels.deleteGeneratedImageAction}
                    title={labels.deleteGeneratedImageAction}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

function createGeneratedImageId() {

  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
