import React, {
  useMemo,
  useState
} from "react";

import {
  CheckCircle2,
  Download,
  ExternalLink,
  Scale,
  ShieldCheck,
  Trash2,
  X,
  XCircle
} from "lucide-react";

import type { Translations }
from "../../i18n";
import type {
  ImageGeneratorModelAvailability
} from "../../services/tauris";
import type {
  ImageGeneratorModelAction,
  ImageGeneratorModelActionFeedback
} from "../../types/launcher";
import {
  imageGeneratorModels,
  type ImageGeneratorModel
} from "../../utils/imageGeneratorModels";
import { parseComfyUIModelDownloadProgress }
from "../../utils/comfyUIModelProgress";

type Props = {
  chatImageModelName: string;
  imageModelAction: ImageGeneratorModelAction;
  imageModelActionFeedback: ImageGeneratorModelActionFeedback;
  imageModelAvailability: ImageGeneratorModelAvailability[];
  isComfyUIInstalled: boolean;
  isImageModelActionBusy: boolean;
  isLoadingImageModels: boolean;
  labels: Translations["settings"];
  logs: string[];
  onChatImageModelChange: (modelName: string) => void;
  onDeleteImageModel: (model: ImageGeneratorModel) => void;
  onDownloadImageModel: (model: ImageGeneratorModel) => void;
};

export default function ImageModelsSection({
  chatImageModelName,
  imageModelAction,
  imageModelActionFeedback,
  imageModelAvailability,
  isComfyUIInstalled,
  isImageModelActionBusy,
  isLoadingImageModels,
  labels,
  logs,
  onChatImageModelChange,
  onDeleteImageModel,
  onDownloadImageModel
}: Props) {

  const [pendingLicenseModel, setPendingLicenseModel] =
    useState<ImageGeneratorModel | null>(null);

  const modelAvailabilityByName =
    useMemo(
      () => new Map(
        imageModelAvailability.map((model) => [
          model.name,
          model.isDownloaded
        ])
      ),
      [imageModelAvailability]
    );

  const parsedModelDownloadProgress =
    useMemo(
      () => parseComfyUIModelDownloadProgress(logs.join("\n")),
      [logs]
    );

  const downloadedImageModels =
    useMemo(
      () => imageGeneratorModels.filter((model) =>
        modelAvailabilityByName.get(model.name) === true
      ),
      [modelAvailabilityByName]
    );

  const selectedChatImageModelName =
    downloadedImageModels.some((model) => model.name === chatImageModelName)
      ? chatImageModelName
      : "";

  const modelDownloadProgress =
    parsedModelDownloadProgress === null
      ? 0
      : Math.round(parsedModelDownloadProgress);

  function confirmModelDownload() {

    if (pendingLicenseModel === null) {
      return;
    }

    const model =
      pendingLicenseModel;

    setPendingLicenseModel(null);
    onDownloadImageModel(model);
  }

  return (
    <section className="settings-section" aria-labelledby="settings-image-models-title">
      <div className="settings-section__header">
        <div>
          <h2 id="settings-image-models-title">{labels.imageModelsTitle}</h2>
          <p>{labels.imageModelsHelp}</p>
        </div>
      </div>

      <div className="settings-choice-panel">
        <label className="settings-field">
          <span>{labels.chatImageModelLabel}</span>
          <select
            value={selectedChatImageModelName}
            disabled={
              !isComfyUIInstalled
              || isLoadingImageModels
              || downloadedImageModels.length === 0
            }
            onChange={(event) => {
              onChatImageModelChange(event.target.value);
            }}
          >
            <option value="">
              {downloadedImageModels.length === 0
                ? labels.chatImageModelEmpty
                : labels.chatImageModelPlaceholder}
            </option>
            {downloadedImageModels.map((model) => (
              <option key={model.name} value={model.name}>
                {model.name}
              </option>
            ))}
          </select>
          <span className="settings-field__hint">
            {labels.chatImageModelHelp}
          </span>
        </label>
      </div>

      {isLoadingImageModels && (
        <p className="settings-progress" role="status">
          <span className="settings-progress__spinner" aria-hidden="true" />
          <span>{labels.imageModelsLoading}</span>
        </p>
      )}

      {!isComfyUIInstalled && (
        <p className="settings-feedback settings-feedback--error">
          {labels.imageModelsComfyUIMissing}
        </p>
      )}

      {imageGeneratorModels.length === 0 ? (
        <p className="settings-empty-state">
          {labels.imageModelsEmpty}
        </p>
      ) : (
        <div className="settings-model-list">
          {imageGeneratorModels.map((model) => {
            const isDownloaded =
              modelAvailabilityByName.get(model.name) ?? false;
            const isDownloading =
              imageModelAction?.type === "download"
              && imageModelAction.modelName === model.name;
            const isDeleting =
              imageModelAction?.type === "delete"
              && imageModelAction.modelName === model.name;

            return (
              <div className="settings-model-row" key={model.name}>
                <div className="settings-model-row__main">
                  <div className="settings-model-row__identity">
                    <strong>{model.name}</strong>
                    <span className="settings-model-row__description">
                      {model.description}
                    </span>
                    <span className="settings-model-row__license">
                      <Scale size={14} />
                      {model.license.name}
                    </span>
                    {(model.architecture !== undefined || model.recommendedMemory !== undefined) && (
                      <span className="settings-model-row__detail">
                        {[model.architecture, model.recommendedMemory]
                          .filter((value): value is string => value !== undefined)
                          .join(" · ")}
                      </span>
                    )}
                    {model.tags !== undefined && model.tags.length > 0 && (
                      <span className="settings-model-row__tags">
                        {model.tags.map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </span>
                    )}
                  </div>
                  <span
                    className={
                      isDownloaded
                        ? "settings-model-row__status settings-model-row__status--ready"
                        : "settings-model-row__status"
                    }
                  >
                    {isDownloaded ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <XCircle size={16} />
                    )}
                    {isDownloaded
                      ? labels.imageModelReady
                      : labels.imageModelMissing}
                  </span>
                </div>

                <div className="settings-model-row__actions">
                  {isDownloading ? (
                    <button
                      type="button"
                      className="settings-save-button settings-save-button--progress"
                      disabled
                      style={{
                        "--button-progress": `${modelDownloadProgress}%`
                      } as React.CSSProperties}
                    >
                      <span className="button-loader" aria-hidden="true" />
                      <span>
                        {labels.imageModelDownloading} {modelDownloadProgress}%
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="settings-save-button"
                      disabled={
                        !isComfyUIInstalled
                        || isDownloaded
                        || isLoadingImageModels
                        || isImageModelActionBusy
                      }
                      onClick={() => {
                        setPendingLicenseModel(model);
                      }}
                    >
                      <Download size={18} />
                      <span>{labels.imageModelDownload}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="settings-save-button settings-save-button--danger"
                    disabled={
                      !isComfyUIInstalled
                      || !isDownloaded
                      || isLoadingImageModels
                      || isImageModelActionBusy
                    }
                    onClick={() => {
                      onDeleteImageModel(model);
                    }}
                  >
                    <Trash2 size={18} />
                    <span>
                      {isDeleting
                        ? labels.imageModelDeleting
                        : labels.imageModelDelete}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pendingLicenseModel !== null && (
        <div className="settings-overlay" role="presentation">
          <section
            className="settings-panel model-license-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="model-license-title"
          >
            <div className="settings-panel__header">
              <div>
                <h2 id="model-license-title">
                  {labels.imageModelLicenseTitle}
                </h2>
                <p>{pendingLicenseModel.name}</p>
              </div>
              <button
                type="button"
                className="settings-icon-button"
                aria-label={labels.imageModelLicenseCancel}
                onClick={() => {
                  setPendingLicenseModel(null);
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="model-license-dialog__body">
              <p>{labels.imageModelLicenseIntro}</p>

              <div className="model-license-dialog__summary">
                <ShieldCheck size={18} />
                <div>
                  <strong>{pendingLicenseModel.license.summary}</strong>
                  <span>{pendingLicenseModel.description}</span>
                </div>
              </div>

              <dl className="model-license-dialog__meta">
                <div>
                  <dt>{labels.imageModelLicenseName}</dt>
                  <dd>{pendingLicenseModel.license.name}</dd>
                </div>
                {pendingLicenseModel.architecture !== undefined && (
                  <div>
                    <dt>{labels.imageModelLicenseArchitecture}</dt>
                    <dd>{pendingLicenseModel.architecture}</dd>
                  </div>
                )}
                {pendingLicenseModel.recommendedMemory !== undefined && (
                  <div>
                    <dt>{labels.imageModelLicenseRecommendedMemory}</dt>
                    <dd>{pendingLicenseModel.recommendedMemory}</dd>
                  </div>
                )}
                <div>
                  <dt>{labels.imageModelLicenseUsage}</dt>
                  <dd>{pendingLicenseModel.license.usage}</dd>
                </div>
                <div>
                  <dt>{labels.imageModelLicenseFiles}</dt>
                  <dd>
                    {pendingLicenseModel.downloads
                      .map((download) => download.fileName ?? download.url)
                      .join(", ")}
                  </dd>
                </div>
              </dl>

              {pendingLicenseModel.notes !== undefined && pendingLicenseModel.notes.length > 0 && (
                <div className="model-license-dialog__restrictions">
                  <strong>{labels.imageModelLicenseNotes}</strong>
                  <ul>
                    {pendingLicenseModel.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="model-license-dialog__restrictions">
                <strong>{labels.imageModelLicenseRestrictions}</strong>
                <ul>
                  {pendingLicenseModel.license.restrictions.map((restriction) => (
                    <li key={restriction}>{restriction}</li>
                  ))}
                </ul>
              </div>

              <a
                className="secondary-button model-license-dialog__link"
                href={pendingLicenseModel.license.url}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={16} />
                <span>{labels.imageModelLicenseOpen}</span>
              </a>

              <div className="model-license-dialog__actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setPendingLicenseModel(null);
                  }}
                >
                  {labels.imageModelLicenseCancel}
                </button>
                <button
                  type="button"
                  className="settings-save-button"
                  disabled={isImageModelActionBusy}
                  onClick={confirmModelDownload}
                >
                  <Download size={18} />
                  <span>{labels.imageModelLicenseAccept}</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {imageModelActionFeedback !== null && (
        <p
          className={
            imageModelActionFeedback === "downloaded"
              || imageModelActionFeedback === "deleted"
              ? "settings-feedback settings-feedback--saved"
              : "settings-feedback settings-feedback--error"
          }
        >
          {imageModelActionFeedback === "downloaded"
            ? labels.imageModelDownloadDone
            : imageModelActionFeedback === "deleted"
              ? labels.imageModelDeleteDone
              : imageModelActionFeedback === "downloadError"
                ? labels.imageModelDownloadError
                : labels.imageModelDeleteError}
        </p>
      )}
    </section>
  );
}
