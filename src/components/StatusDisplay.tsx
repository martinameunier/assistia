import React from "react";

import type { ServiceStatus } from "../services/tauris";
import type { Translations } from "../i18n";

type Props = {
  services: ServiceStatus[];
  labels: Translations["status"];
};

type DisplayedService = {
  labelKey: keyof Translations["status"]["services"];
  serviceName: string;
};

const displayedServices: DisplayedService[] = [
  {
    labelKey: "ollama",
    serviceName: "ollama"
  },
  {
    labelKey: "comfyUI",
    serviceName: "comfyui"
  },
  {
    labelKey: "developerAgent",
    serviceName: "developer-agent"
  }
];

function isRunning(service?: ServiceStatus) {

  return service?.status.toUpperCase().startsWith("UP") ?? false;
}

export default function StatusDisplay({
  services,
  labels
}: Props) {

  return (
    <><h2 className="titre-statut">{labels.title}</h2>
    
    <section className="status-grid" aria-label={labels.ariaLabel}>
      {displayedServices.map((displayedService) => {
        const service = services.find((item) => item.name === displayedService.serviceName
        );

        const running = isRunning(service);

        return (
          <article
            key={displayedService.serviceName}
            className={running
              ? "status-card status-card--running"
              : "status-card status-card--stopped"}
          >
            <div className="status-card__header">
              <h2>{labels.services[displayedService.labelKey]}</h2>
              <span className="status-card__badge">
                {running ? labels.running : labels.stopped}
              </span>
            </div>
          </article>
        );
      })}
    </section></>
  );
}
