import React from "react";

import type { Translations } from "../i18n";

type Props = {
  labels: Translations["progress"];
  progress: number;
  speed: string | null;
  eta: string | null;
  status?: string;
  showDetails?: boolean;
};

export default function ProgressBar({
  labels,
  progress,
  speed,
  eta,
  status,
  showDetails = true
}: Props) {

  return (
    <section
      className="model-progress"
      aria-label={labels.ariaLabel}
    >
      <div className="model-progress__header">
        <span>{status ?? labels.title}</span>
        <strong>{progress}%</strong>
      </div>

      {showDetails && (
        <div className="model-progress__details">
          <span>
            {labels.speed} : {speed ?? labels.calculating}
          </span>
          <span>
            {labels.eta} : {eta ?? labels.calculating}
          </span>
        </div>
      )}

      <div className="model-progress__track">
        <div
          className="model-progress__bar"
          style={{ width: `${progress}%` }}
        />
      </div>
    </section>
  );
}
