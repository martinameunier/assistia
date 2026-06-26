import React, {
  type FormEvent,
  useState
} from "react";

import {
  KeyRound,
  Save
} from "lucide-react";

import type { Translations }
from "../../i18n";
import type {
  ChatHistorySecurityState
} from "../../services/tauris";

type Props = {
  isLoadingSecurity: boolean;
  labels: Translations["settings"];
  securityState: ChatHistorySecurityState;
  onChangePassword: (
    currentPassword: string | null,
    newPassword: string
  ) => Promise<void>;
};

export default function ChatHistorySecuritySection({
  isLoadingSecurity,
  labels,
  securityState,
  onChangePassword
}: Props) {

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmation, setConfirmation] =
    useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const isBusy =
    isSaving || isLoadingSecurity;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (securityState.isEncrypted && currentPassword.length === 0) {
      setSaved(false);
      setError(labels.chatHistoryCurrentPasswordRequired);
      return;
    }

    if (newPassword.length === 0) {
      setSaved(false);
      setError(labels.chatHistoryPasswordRequired);
      return;
    }

    if (newPassword !== confirmation) {
      setSaved(false);
      setError(labels.chatHistoryPasswordMismatch);
      return;
    }

    setIsSaving(true);
    setSaved(false);
    setError(null);

    try {
      await onChangePassword(
        securityState.isEncrypted
          ? currentPassword
          : null,
        newPassword
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setSaved(true);
    } catch (saveError) {
      setError(String(saveError || labels.chatHistoryPasswordError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="settings-section" aria-labelledby="settings-chat-history-title">
      <div className="settings-section__header">
        <div>
          <h2 id="settings-chat-history-title">
            {labels.chatHistorySecurityTitle}
          </h2>
          <p>{labels.chatHistorySecurityHelp}</p>
        </div>
      </div>

      <form
        className="settings-form settings-form--page"
        onSubmit={handleSubmit}
      >
        <p className="settings-help settings-help--status">
          <KeyRound size={18} />
          <span>
            {securityState.isEncrypted
              ? labels.chatHistoryEncryptedStatus
              : labels.chatHistoryPlainStatus}
          </span>
        </p>

        {securityState.isEncrypted && (
          <label className="settings-field">
            <span>{labels.chatHistoryCurrentPasswordLabel}</span>
            <input
              type="password"
              value={currentPassword}
              disabled={isBusy}
              autoComplete="current-password"
              onChange={(event) => {
                setCurrentPassword(event.target.value);
              }}
            />
          </label>
        )}

        <label className="settings-field">
          <span>{labels.chatHistoryNewPasswordLabel}</span>
          <input
            type="password"
            value={newPassword}
            disabled={isBusy}
            autoComplete="new-password"
            onChange={(event) => {
              setNewPassword(event.target.value);
            }}
          />
        </label>

        <label className="settings-field">
          <span>{labels.chatHistoryConfirmPasswordLabel}</span>
          <input
            type="password"
            value={confirmation}
            disabled={isBusy}
            autoComplete="new-password"
            onChange={(event) => {
              setConfirmation(event.target.value);
            }}
          />
        </label>

        <div className="settings-section__actions">
          <button
            type="submit"
            className="settings-save-button"
            disabled={isBusy}
          >
            <Save size={18} />
            <span>
              {isSaving
                ? labels.chatHistoryPasswordSaving
                : labels.chatHistoryPasswordSave}
            </span>
          </button>
        </div>

        {saved && (
          <p className="settings-feedback settings-feedback--saved">
            {labels.chatHistoryPasswordSaved}
          </p>
        )}

        {error !== null && (
          <p className="settings-feedback settings-feedback--error">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
