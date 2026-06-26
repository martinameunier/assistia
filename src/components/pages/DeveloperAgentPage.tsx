import React, {
  useEffect
} from "react";
import {
  Bot,
  Download,
  FolderCode,
  Link,
  Send,
  Settings2,
  User
} from "lucide-react";

import { useDeveloperAgentChat }
from "../../contexts/DeveloperAgentChatContext";
import type { Translations }
from "../../i18n";
import {
  sendDeveloperAgentMessage,
  type DeveloperAgentResponse,
  type DeveloperAgentSettings
} from "../../services/tauris";
import type {
  InstallationFeedback,
  PendingInstallationAction
} from "../../types/launcher";
import LinkifiedText
from "../LinkifiedText";

type Props = {
  installationFeedback: InstallationFeedback;
  isDeveloperAgentInstalled: boolean;
  isLoadingSettings: boolean;
  isOllamaInstalled: boolean;
  labels: Translations["pages"]["developerAgent"];
  pendingInstallationAction: PendingInstallationAction;
  settings: DeveloperAgentSettings;
  onInstallDeveloperAgent: () => void;
  onInstallRequiredComponents: () => void;
  onOpenSettings: () => void;
};

export default function DeveloperAgentPage({
  installationFeedback,
  isDeveloperAgentInstalled,
  isLoadingSettings,
  isOllamaInstalled,
  labels,
  pendingInstallationAction,
  settings,
  onInstallDeveloperAgent,
  onInstallRequiredComponents,
  onOpenSettings
}: Props) {

  const {
    addMessage,
    draftMessage,
    ensureInitialAssistantMessage,
    isSending,
    messages,
    setDraftMessage,
    setIsSending
  } = useDeveloperAgentChat();

  const isConfigured =
    settings.ollamaUrl.trim() !== ""
    && settings.projectPath.trim() !== ""
    && settings.model.trim() !== "";

  const hasMissingComponents =
    !isOllamaInstalled || !isDeveloperAgentInstalled;

  const canSend =
    draftMessage.trim() !== ""
    && !isSending
    && isConfigured
    && !hasMissingComponents;

  const isInstallationBusy =
    pendingInstallationAction !== null;

  const isInstallingRequiredComponents =
    pendingInstallationAction === "required";

  const isInstallingDeveloperAgent =
    pendingInstallationAction === "developer-agent";

  const configurationStatus =
    hasMissingComponents
      ? labels.missingComponentsMessage
      : isConfigured
      ? labels.configured
      : labels.notConfigured;

  useEffect(() => {
    ensureInitialAssistantMessage(labels.welcomeMessage);
  }, [
    ensureInitialAssistantMessage,
    labels.welcomeMessage
  ]);

  function formatAgentResponse(response: DeveloperAgentResponse) {

    const sections = [
      response.message
    ];

    if (response.gitStatus.trim() !== "") {
      sections.push(`${labels.gitStatusTitle}\n${response.gitStatus}`);
    }

    if (response.gitDiff.trim() !== "") {
      sections.push(`${labels.gitDiffTitle}\n${response.gitDiff}`);
    }

    if (response.stdout.trim() !== "" && response.gitDiff.trim() === "") {
      sections.push(`${labels.agentOutputTitle}\n${response.stdout}`);
    }

    if (response.stderr.trim() !== "") {
      sections.push(`${labels.stderrTitle}\n${response.stderr}`);
    }

    return sections.join("\n\n");
  }

  async function sendMessage() {

    const message =
      draftMessage.trim();

    if (message === "" || isSending) {
      return;
    }

    addMessage("user", message);
    setDraftMessage("");

    if (hasMissingComponents) {
      addMessage("assistant", labels.missingComponentsMessage);
      return;
    }

    if (!isConfigured) {
      addMessage("assistant", labels.missingConfigurationMessage);
      return;
    }

    setIsSending(true);

    try {
      const response =
        await sendDeveloperAgentMessage(message, settings);

      addMessage("assistant", formatAgentResponse(response));
    } catch (error) {
      addMessage(
        "assistant",
        `${labels.errorMessage}\n${String(error)}`
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <section className="developer-agent-chat" aria-labelledby="page-title">
        <header className="developer-agent-chat__toolbar">
          <div className="developer-agent-chat__status">
            <span
              className={
                isConfigured && !hasMissingComponents
                  ? "developer-agent-chat__status-dot developer-agent-chat__status-dot--ready"
                  : "developer-agent-chat__status-dot"
              }
              aria-hidden="true"
            />
            <span>
              {isLoadingSettings
                ? labels.loadingSettings
                : configurationStatus}
            </span>
          </div>

          {!isOllamaInstalled && (
            <button
              type="button"
              className="developer-agent-chat__settings-button"
              disabled={isInstallationBusy}
              onClick={onInstallRequiredComponents}
            >
              {isInstallingRequiredComponents ? (
                <span className="button-loader" aria-hidden="true" />
              ) : (
                <Download size={18} />
              )}
              <span>
                {isInstallingRequiredComponents
                  ? labels.installingOllamaAction
                  : labels.installOllamaAction}
              </span>
            </button>
          )}

          {!isDeveloperAgentInstalled && (
            <button
              type="button"
              className="developer-agent-chat__settings-button"
              disabled={isInstallationBusy}
              onClick={onInstallDeveloperAgent}
            >
              {isInstallingDeveloperAgent ? (
                <span className="button-loader" aria-hidden="true" />
              ) : (
                <Download size={18} />
              )}
              <span>
                {isInstallingDeveloperAgent
                  ? labels.installingAgentAction
                  : labels.installAgentAction}
              </span>
            </button>
          )}

          <button
            type="button"
            className="developer-agent-chat__settings-button"
            onClick={onOpenSettings}
          >
            <Settings2 size={18} />
            <span>{labels.settingsButton}</span>
          </button>
        </header>

        <div className="developer-agent-config-summary" aria-label={labels.configSummaryLabel}>
          <span>
            <Link size={16} />
            {settings.ollamaUrl}
          </span>
          <span>
            <FolderCode size={16} />
            {settings.projectPath || labels.projectPathMissing}
          </span>
          <span>
            <Bot size={16} />
            {settings.model}
          </span>

          {installationFeedback !== null && (
            <p
              className={
                installationFeedback === "started"
                  ? "settings-feedback settings-feedback--saved page-install-feedback"
                  : "settings-feedback settings-feedback--error page-install-feedback"
              }
            >
              {installationFeedback === "started"
                ? labels.installStarted
                : labels.installError}
            </p>
          )}
        </div>

        <div className="developer-agent-messages" aria-live="polite">
          {messages.map((message) => (
            <article
              key={message.id}
              className={
                message.role === "user"
                  ? "developer-agent-message developer-agent-message--user"
                  : "developer-agent-message developer-agent-message--assistant"
              }
            >
              <div className="developer-agent-message__avatar" aria-hidden="true">
                {message.role === "user"
                  ? <User size={18} />
                  : <Bot size={18} />}
              </div>
              <p>
                <LinkifiedText text={message.content} />
              </p>
            </article>
          ))}
        </div>

        <form
          className="developer-agent-composer"
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage();
          }}
        >
          <textarea
            value={draftMessage}
            disabled={isSending || hasMissingComponents}
            onChange={(event) => setDraftMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
            }}
            placeholder={labels.messagePlaceholder}
            rows={3}
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label={labels.send}
          >
            {isSending ? (
              <span className="button-loader" aria-hidden="true" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </form>
      </section>
    </>
  );
}
