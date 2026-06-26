import {
  useCallback,
  useEffect,
  useState
} from "react";

import {
  getOllamaStatus,
  getServicesStatus,
  type ServiceStatus
} from "../services/tauris";

async function loadServicesStatus(): Promise<ServiceStatus[]> {

  try {
    return await getServicesStatus();
  } catch {
    try {
      const ollamaStatus =
        await getOllamaStatus();

      return [ollamaStatus];
    } catch {
      return [
        {
          name: "ollama",
          status: "not installed"
        }
      ];
    }
  }
}

export function useServiceStatus() {

  const [services, setServices] =
    useState<ServiceStatus[]>([]);

  const [hasLoadedServices, setHasLoadedServices] =
    useState(false);

  const refreshServices =
    useCallback(async () => {
      const nextServices =
        await loadServicesStatus();

      setServices(nextServices);
      setHasLoadedServices(true);
    }, []);

  useEffect(() => {

    let isMounted = true;

    async function refreshMountedServices() {
      const nextServices =
        await loadServicesStatus();

      if (isMounted) {
        setServices(nextServices);
        setHasLoadedServices(true);
      }
    }

    refreshMountedServices();

    const interval =
      window.setInterval(refreshMountedServices, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return {
    hasLoadedServices,
    refreshServices,
    services
  };
}
