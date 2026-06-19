import { useEffect } from "react";

import { listen } from "@tauri-apps/api/event";

import { useLauncherStore }
from "../store/launcherStore";

export function useRuntimeEvents() {

  const {
    addLog,
    setProgress,
    setStatus
  } = useLauncherStore();

  useEffect(() => {

    const unlistenLogs = listen(
      "launcher-log",
      (event) => {

        addLog(
          event.payload as string
        );
      }
    );

    const unlistenStatus = listen(
      "launcher-status",
      (event) => {

        const payload = event.payload as {
          status: string;
          progress: number;
        };

        setStatus(payload.status);
        setProgress(payload.progress);
      }
    );

    return () => {

      unlistenLogs.then(f => f());
      unlistenStatus.then(f => f());
    };

  }, []);
}
