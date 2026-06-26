import type { ServiceStatus }
from "../services/tauris";

export const applicationServiceNames = [
  "ollama"
];

export function isServiceRunning(service?: ServiceStatus) {

  return service?.status.toUpperCase().startsWith("UP") ?? false;
}
