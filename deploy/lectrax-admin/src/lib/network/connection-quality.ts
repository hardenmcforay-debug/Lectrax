export type ConnectionQuality = "online" | "offline" | "slow";

type NetworkInformation = {
  effectiveType?: string;
  downlink?: number;
  saveData?: boolean;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

function getNetworkInformation(): NetworkInformation | null {
  if (typeof navigator === "undefined") return null;
  return (navigator as Navigator & { connection?: NetworkInformation }).connection ?? null;
}

export function readConnectionQuality(isOnline: boolean): ConnectionQuality {
  if (!isOnline) {
    return "offline";
  }

  const connection = getNetworkInformation();
  if (!connection) {
    return "online";
  }

  if (connection.saveData) {
    return "slow";
  }

  const effectiveType = connection.effectiveType?.toLowerCase();
  if (effectiveType === "slow-2g" || effectiveType === "2g") {
    return "slow";
  }

  if (effectiveType === "3g" && typeof connection.downlink === "number" && connection.downlink < 1.5) {
    return "slow";
  }

  return "online";
}

export function subscribeToConnectionQuality(
  onChange: (quality: ConnectionQuality) => void
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const update = () => {
    onChange(readConnectionQuality(navigator.onLine));
  };

  update();
  window.addEventListener("online", update);
  window.addEventListener("offline", update);

  const connection = getNetworkInformation();
  if (connection?.addEventListener && connection.removeEventListener) {
    connection.addEventListener("change", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      connection.removeEventListener?.("change", update);
    };
  }

  return () => {
    window.removeEventListener("online", update);
    window.removeEventListener("offline", update);
  };
}

export function getAdaptiveFetchTimeoutMs(quality: ConnectionQuality): number {
  if (quality === "slow") {
    return 45_000;
  }
  return 30_000;
}
