import React, {
  type FormEvent
} from "react";

import type {
  Language,
  Translations
}
from "../../i18n";
import {
  type ChatHistorySecurityState,
  type DeveloperAgentSettings,
  type ImageGeneratorSettings,
  type ImageGeneratorModelAvailability,
  type WebSearchSettings
} from "../../services/tauris";
import type {
  ChatModelAction,
  ChatModelActionFeedback,
  ImageGeneratorModelAction,
  ImageGeneratorModelActionFeedback,
  InstallationFeedback,
  PendingInstallationAction,
  SettingsFeedback
} from "../../types/launcher";
import type { ImageGeneratorModel }
from "../../utils/imageGeneratorModels";
import type { ChatModel }
from "../../utils/chatModels";
import InstallationSection
from "../settings/InstallationSection";
import ChatModelsSection
from "../settings/ChatModelsSection";
import ImageModelsSection
from "../settings/ImageModelsSection";
import ImageGeneratorSettingsSection
from "../settings/ImageGeneratorSettingsSection";
import DeveloperAgentSettingsSection
from "../settings/DeveloperAgentSettingsSection";
import WebSearchSettingsSection
from "../settings/WebSearchSettingsSection";
import ChatHistorySecuritySection
from "../settings/ChatHistorySecuritySection";
import LanguageSelector
from "../layout/LanguageSelector";

type Props = {
  chatHistorySecurityState: ChatHistorySecurityState;
  chatModelAction: ChatModelAction;
  chatModelActionFeedback: ChatModelActionFeedback;
  chatImageModelName: string;
  chatModels: ChatModel[];
  developerAgentSettings: DeveloperAgentSettings;
  developerAgentSettingsFeedback: SettingsFeedback;
  imageGeneratorSettings: ImageGeneratorSettings;
  imageGeneratorSettingsFeedback: SettingsFeedback;
  imageModelAction: ImageGeneratorModelAction;
  imageModelActionFeedback: ImageGeneratorModelActionFeedback;
  imageModelAvailability: ImageGeneratorModelAvailability[];
  installationFeedback: InstallationFeedback;
  isComfyUIInstalled: boolean;
  isDeveloperAgentInstalled: boolean;
  isSearXNGInstalled: boolean;
  isChatModelActionBusy: boolean;
  isImageModelActionBusy: boolean;
  isLoadingDeveloperAgentSettings: boolean;
  isLoadingChatModels: boolean;
  isLoadingChatHistorySecurity: boolean;
  isLoadingImageModels: boolean;
  isLoadingImageGeneratorSettings: boolean;
  isOllamaInstalled: boolean;
  isRequiredComponentsInstalled: boolean;
  isSavingDeveloperAgentSettings: boolean;
  isSavingImageGeneratorSettings: boolean;
  isLoadingWebSearchSettings: boolean;
  isSavingWebSearchSettings: boolean;
  labels: Translations;
  language: Language;
  logs: string[];
  pendingInstallationAction: PendingInstallationAction;
  webSearchSettings: WebSearchSettings;
  webSearchSettingsFeedback: SettingsFeedback;
  onDeveloperAgentSettingChange: <Key extends keyof DeveloperAgentSettings>(
    key: Key,
    value: DeveloperAgentSettings[Key]
  ) => void;
  onImageGeneratorSettingChange: <Key extends keyof ImageGeneratorSettings>(
    key: Key,
    value: ImageGeneratorSettings[Key]
  ) => void;
  onWebSearchSettingChange: <Key extends keyof WebSearchSettings>(
    key: Key,
    value: WebSearchSettings[Key]
  ) => void;
  onChatImageModelChange: (modelName: string) => void;
  onDeleteChatModel: (model: ChatModel) => void;
  onDeleteImageModel: (model: ImageGeneratorModel) => void;
  onChangeChatHistoryPassword: (
    currentPassword: string | null,
    newPassword: string
  ) => Promise<void>;
  onDownloadChatModel: (modelName: string) => void;
  onDownloadImageModel: (model: ImageGeneratorModel) => void;
  onInstallAll: () => void;
  onInstallDeveloperAgent: () => void;
  onInstallImageGenerator: () => void;
  onInstallRequiredComponents: () => void;
  onInstallWebSearch: () => void;
  onLanguageChange: (language: Language) => void;
  onSaveDeveloperAgentSettings: (event: FormEvent<HTMLFormElement>) => void;
  onSaveImageGeneratorSettings: (event: FormEvent<HTMLFormElement>) => void;
  onSaveWebSearchSettings: (event: FormEvent<HTMLFormElement>) => void;
};

export default function SettingsPage({
  chatHistorySecurityState,
  chatModelAction,
  chatModelActionFeedback,
  chatImageModelName,
  chatModels,
  developerAgentSettings,
  developerAgentSettingsFeedback,
  imageGeneratorSettings,
  imageGeneratorSettingsFeedback,
  imageModelAction,
  imageModelActionFeedback,
  imageModelAvailability,
  installationFeedback,
  isComfyUIInstalled,
  isDeveloperAgentInstalled,
  isSearXNGInstalled,
  isChatModelActionBusy,
  isImageModelActionBusy,
  isLoadingDeveloperAgentSettings,
  isLoadingChatModels,
  isLoadingChatHistorySecurity,
  isLoadingImageModels,
  isLoadingImageGeneratorSettings,
  isLoadingWebSearchSettings,
  isOllamaInstalled,
  isRequiredComponentsInstalled,
  isSavingDeveloperAgentSettings,
  isSavingImageGeneratorSettings,
  isSavingWebSearchSettings,
  labels,
  language,
  logs,
  pendingInstallationAction,
  webSearchSettings,
  webSearchSettingsFeedback,
  onChatImageModelChange,
  onDeveloperAgentSettingChange,
  onImageGeneratorSettingChange,
  onWebSearchSettingChange,
  onDeleteChatModel,
  onDeleteImageModel,
  onChangeChatHistoryPassword,
  onDownloadChatModel,
  onDownloadImageModel,
  onInstallAll,
  onInstallDeveloperAgent,
  onInstallImageGenerator,
  onInstallRequiredComponents,
  onInstallWebSearch,
  onLanguageChange,
  onSaveDeveloperAgentSettings,
  onSaveImageGeneratorSettings,
  onSaveWebSearchSettings
}: Props) {

  const settingsLabels =
    labels.settings;

  const developerAgentLabels =
    labels.pages.developerAgent.settingsDialog;

  return (
    <section className="settings-page" aria-labelledby="page-title">
      <section className="settings-section" aria-label={labels.language.label}>
        <LanguageSelector
          className="settings-language-control"
          labels={labels.language}
          language={language}
          onChange={onLanguageChange}
        />
      </section>

      <InstallationSection
        installationFeedback={installationFeedback}
        isComfyUIInstalled={isComfyUIInstalled}
        isDeveloperAgentInstalled={isDeveloperAgentInstalled}
        isRequiredComponentsInstalled={isRequiredComponentsInstalled}
        isSearXNGInstalled={isSearXNGInstalled}
        labels={settingsLabels}
        pendingInstallationAction={pendingInstallationAction}
        onInstallAll={onInstallAll}
        onInstallDeveloperAgent={onInstallDeveloperAgent}
        onInstallImageGenerator={onInstallImageGenerator}
        onInstallRequiredComponents={onInstallRequiredComponents}
        onInstallWebSearch={onInstallWebSearch}
      />

      <ChatModelsSection
        chatModelAction={chatModelAction}
        chatModelActionFeedback={chatModelActionFeedback}
        chatModels={chatModels}
        isChatModelActionBusy={isChatModelActionBusy}
        isLoadingChatModels={isLoadingChatModels}
        isOllamaInstalled={isOllamaInstalled}
        labels={settingsLabels}
        logs={logs}
        onDeleteChatModel={onDeleteChatModel}
        onDownloadChatModel={onDownloadChatModel}
      />

      <ImageModelsSection
        chatImageModelName={chatImageModelName}
        imageModelAction={imageModelAction}
        imageModelActionFeedback={imageModelActionFeedback}
        imageModelAvailability={imageModelAvailability}
        isComfyUIInstalled={isComfyUIInstalled}
        isImageModelActionBusy={isImageModelActionBusy}
        isLoadingImageModels={isLoadingImageModels}
        labels={settingsLabels}
        logs={logs}
        onChatImageModelChange={onChatImageModelChange}
        onDeleteImageModel={onDeleteImageModel}
        onDownloadImageModel={onDownloadImageModel}
      />

      <ImageGeneratorSettingsSection
        feedback={imageGeneratorSettingsFeedback}
        isLoadingSettings={isLoadingImageGeneratorSettings}
        isSavingSettings={isSavingImageGeneratorSettings}
        labels={settingsLabels}
        settings={imageGeneratorSettings}
        onSettingChange={onImageGeneratorSettingChange}
        onSubmit={onSaveImageGeneratorSettings}
      />

      <DeveloperAgentSettingsSection
        developerAgentLabels={developerAgentLabels}
        feedback={developerAgentSettingsFeedback}
        isLoadingSettings={isLoadingDeveloperAgentSettings}
        isSavingSettings={isSavingDeveloperAgentSettings}
        settings={developerAgentSettings}
        settingsLabels={settingsLabels}
        onSettingChange={onDeveloperAgentSettingChange}
        onSubmit={onSaveDeveloperAgentSettings}
      />

      <WebSearchSettingsSection
        feedback={webSearchSettingsFeedback}
        isLoadingSettings={isLoadingWebSearchSettings}
        isSavingSettings={isSavingWebSearchSettings}
        labels={settingsLabels}
        settings={webSearchSettings}
        onSettingChange={onWebSearchSettingChange}
        onSubmit={onSaveWebSearchSettings}
      />

      <ChatHistorySecuritySection
        isLoadingSecurity={isLoadingChatHistorySecurity}
        labels={settingsLabels}
        securityState={chatHistorySecurityState}
        onChangePassword={onChangeChatHistoryPassword}
      />
    </section>
  );
}
