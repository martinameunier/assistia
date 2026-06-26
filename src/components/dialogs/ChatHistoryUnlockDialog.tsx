import React, {
  type FormEvent,
  useState
} from "react";

import {
  KeyRound,
  Trash2
} from "lucide-react";

import type { Translations }
from "../../i18n";

type Props = {
  labels: Translations["chatHistoryUnlockDialog"];
  onResetHistory: () => Promise<void>;
  onUnlock: (password: string) => Promise<void>;
};

export default function ChatHistoryUnlockDialog({
  labels,
  onResetHistory,
  onUnlock
}: Props) {

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState<string | null>(null);

  const [isUnlocking, setIsUnlocking] =
    useState(false);

  const [failedAttempts, setFailedAttempts] =
    useState(0);

  const [isResettingHistory, setIsResettingHistory] =
    useState(false);

  const [isConfirmingReset, setIsConfirmingReset] =
    useState(false);

  const canResetHistory =
    failedAttempts >= 3;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length === 0) {
      setError(labels.passwordRequired);
      return;
    }

    setIsUnlocking(true);
    setError(null);

    try {
      await onUnlock(password);
      setPassword("");
      setFailedAttempts(0);
      setIsConfirmingReset(false);
    } catch (unlockError) {
      setFailedAttempts((attempts) => attempts + 1);
      setError(String(unlockError || labels.error));
    } finally {
      setIsUnlocking(false);
    }
  }

  async function confirmResetHistory() {
    setIsResettingHistory(true);
    setError(null);

    try {
      await onResetHistory();
    } catch (resetError) {
      setError(String(resetError || labels.deleteHistoryError));
    } finally {
      setIsResettingHistory(false);
    }
  }

  return (
    <div
      className="settings-overlay"
      role="presentation"
    >
      <section
        className="settings-panel chat-history-unlock-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-history-unlock-title"
      >
        <div className="settings-panel__header">
          <div>
            <h2 id="chat-history-unlock-title">
              {labels.title}
            </h2>
            <p>{labels.intro}</p>
          </div>
        </div>

        <form
          className="settings-form"
          onSubmit={handleSubmit}
        >
          <label className="settings-field">
            <span>{labels.passwordLabel}</span>
            <input
              type="password"
              value={password}
              disabled={isUnlocking || isResettingHistory}
              autoFocus
              onChange={(event) => {
                setPassword(event.target.value);
                setIsConfirmingReset(false);
              }}
            />
          </label>

          {error !== null && (
            <p className="settings-feedback settings-feedback--error">
              {error}
            </p>
          )}

          {canResetHistory && isConfirmingReset && (
            <div className="settings-feedback settings-feedback--error">
              {labels.deleteHistoryConfirmation}
            </div>
          )}

          <div className="settings-section__actions">
            {canResetHistory && !isConfirmingReset && (
              <button
                type="button"
                className="settings-save-button settings-save-button--danger"
                disabled={isUnlocking || isResettingHistory}
                onClick={() => {
                  setError(null);
                  setIsConfirmingReset(true);
                }}
              >
                <>
                  <Trash2 size={18} />
                  <span>{labels.deleteHistory}</span>
                </>
              </button>
            )}

            {canResetHistory && isConfirmingReset && (
              <>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={isUnlocking || isResettingHistory}
                  onClick={() => {
                    setIsConfirmingReset(false);
                  }}
                >
                  {labels.cancelDeleteHistory}
                </button>

                <button
                  type="button"
                  className="settings-save-button settings-save-button--danger"
                  disabled={isUnlocking || isResettingHistory}
                  onClick={confirmResetHistory}
                >
                  {isResettingHistory ? (
                  <>
                    <span className="button-loader" aria-hidden="true" />
                    <span>{labels.deletingHistory}</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    <span>{labels.confirmDeleteHistory}</span>
                  </>
                )}
                </button>
              </>
            )}

            <button
              type="submit"
              className="settings-save-button"
              disabled={isUnlocking || isResettingHistory}
            >
              {isUnlocking ? (
                <>
                  <span className="button-loader" aria-hidden="true" />
                  <span>{labels.unlocking}</span>
                </>
              ) : (
                <>
                  <KeyRound size={18} />
                  <span>{labels.unlock}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
