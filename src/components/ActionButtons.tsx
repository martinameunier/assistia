import React from "react";
import {
  BookOpenText,
  ExternalLink,
  Power,
  Rocket
} from "lucide-react";

import type { Translations } from "../i18n";

type Props = {
  canOpenInterface: boolean;
  canStart: boolean;
  isApplicationRunning: boolean;
  labels: Translations["actions"];
  pendingAction: "start" | "stop" | null;
  onOpen: () => void;
  onStart: () => void;
  onStop: () => void;
  openDocumentation: () => void;
};

export default function ActionButtons({
  canOpenInterface,
  canStart,
  isApplicationRunning,
  labels,
  pendingAction,
  onOpen,
  onStart,
  onStop,
  openDocumentation
}: Props) {
  const isStarting =
    pendingAction === "start";

  const isStopping =
    pendingAction === "stop";

  const isBusy =
    pendingAction !== null;

  return (
    <div className="action-buttons" aria-label={labels.ariaLabel}>

      {isApplicationRunning ? (
        <button
          type="button"
          onClick={onStop}
          className="action-button action-button--stop"
          disabled={isBusy}
          aria-busy={isBusy}
        >
          <span className="action-button__icon">
            {isBusy ? (
              <span className="action-button__loader" aria-hidden="true" />
            ) : (
              <Power size={26} />
            )}
          </span>
          <span className="action-button__text">
            {isStarting ? labels.starting : labels.stop}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onStart}
          className="action-button action-button--start"
          disabled={isBusy || !canStart}
          aria-busy={isBusy}
        >
          <span className="action-button__icon">
            {isBusy ? (
              <span className="action-button__loader" aria-hidden="true" />
            ) : (
              <Rocket size={26} />
            )}
          </span>
          <span className="action-button__text">
            {isStopping ? labels.stopping : labels.start}
          </span>
        </button>
      )}

      <button
        type="button"
        onClick={onOpen}
        className="action-button action-button--access"
        disabled={!canOpenInterface}
      >
        <span className="action-button__icon">
          <ExternalLink size={26} />
        </span>
        <span className="action-button__text">
          {labels.openInterface}
        </span>
      </button>

      <button
        type="button"
        onClick={openDocumentation}
        className="action-button action-button--docs"
      >
        <span className="action-button__icon">
          <BookOpenText size={26} />
        </span>
        <span className="action-button__text">
          {labels.openDocumentation}
        </span>
      </button>

    </div>
  );
}
