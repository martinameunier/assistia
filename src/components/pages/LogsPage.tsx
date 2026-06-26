import React from "react";

import type { Translations } from "../../i18n";
import LogConsole from "../LogConsole";

type Props = {
  labels: Translations["logs"];
  logs: string[];
};

export default function LogsPage({
  labels,
  logs
}: Props) {

  return (
    <section className="logs-page" aria-label={labels.ariaLabel}>
      <LogConsole
        logs={logs.length > 0
          ? logs
          : [labels.waiting]}
      />
    </section>
  );
}
