export type AppSection =
  | "chat"
  | "image-generator"
  | "developer-agent"
  | "settings"
  | "logs";

export type ModelPullProgress = {
  progress: number;
  speed: string | null;
  eta: string | null;
};

export type PendingRuntimeAction =
  | "start"
  | "stop"
  | null;

export type PendingImageGeneratorAction =
  | "install"
  | "start"
  | "stop"
  | null;

export type InstallableComponent =
  | "required"
  | "image-generator"
  | "developer-agent"
  | "web-search";

export type PendingInstallationAction =
  | "all"
  | InstallableComponent
  | null;

export type InstallationFeedback =
  | "started"
  | "error"
  | null;

export type SettingsFeedback =
  | "saved"
  | "error"
  | null;

export type ImageGeneratorModelAction = {
  modelName: string;
  type: "download" | "delete";
} | null;

export type ImageGeneratorModelActionFeedback =
  | "downloaded"
  | "deleted"
  | "downloadError"
  | "deleteError"
  | null;

export type ChatModelAction = {
  modelName: string;
  type: "download" | "delete";
} | null;

export type ChatModelActionFeedback =
  | "downloaded"
  | "deleted"
  | "downloadError"
  | "deleteError"
  | null;
