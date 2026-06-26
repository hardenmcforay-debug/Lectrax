import "server-only";

import { getVirusTotalApiKey, isAntivirusScanRequired } from "@/lib/env";

const VIRUSTOTAL_API = "https://www.virustotal.com/api/v3";
const ANALYSIS_POLL_INTERVAL_MS = 2000;
const ANALYSIS_POLL_TIMEOUT_MS = 45_000;

export type AntivirusScanResult =
  | { safe: true; provider: "virustotal" | "skipped" }
  | { safe: false; provider: "virustotal"; detail: string };

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", Buffer.from(bytes));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function isFlaggedAnalysis(stats: Record<string, number> | undefined): boolean {
  if (!stats) return false;
  return (stats.malicious ?? 0) > 0 || (stats.suspicious ?? 0) > 0;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchVirusTotal(
  path: string,
  apiKey: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(`${VIRUSTOTAL_API}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "x-apikey": apiKey,
    },
  });
}

async function lookupHash(hash: string, apiKey: string): Promise<AntivirusScanResult | "unknown"> {
  const response = await fetchVirusTotal(`/files/${hash}`, apiKey);

  if (response.status === 404) {
    return "unknown";
  }

  if (!response.ok) {
    if (response.status === 429) {
      return {
        safe: false,
        provider: "virustotal",
        detail: "Antivirus rate limit exceeded",
      };
    }
    return {
      safe: false,
      provider: "virustotal",
      detail: `Lookup failed (${response.status})`,
    };
  }

  const payload = (await response.json()) as {
    data?: { attributes?: { last_analysis_stats?: Record<string, number> } };
  };

  if (isFlaggedAnalysis(payload.data?.attributes?.last_analysis_stats)) {
    return {
      safe: false,
      provider: "virustotal",
      detail: "Positive malware detection",
    };
  }

  return { safe: true, provider: "virustotal" };
}

async function uploadAndAnalyze(bytes: Uint8Array, apiKey: string): Promise<AntivirusScanResult> {
  const form = new FormData();
  form.append(
    "file",
    new Blob([Buffer.from(bytes)], { type: "application/pdf" }),
    "submission.pdf"
  );

  const uploadResponse = await fetchVirusTotal("/files", apiKey, {
    method: "POST",
    body: form,
  });

  if (!uploadResponse.ok) {
    if (uploadResponse.status === 429) {
      return {
        safe: false,
        provider: "virustotal",
        detail: "Antivirus rate limit exceeded",
      };
    }
    return {
      safe: false,
      provider: "virustotal",
      detail: `Upload failed (${uploadResponse.status})`,
    };
  }

  const uploadPayload = (await uploadResponse.json()) as {
    data?: { id?: string };
  };
  const analysisId = uploadPayload.data?.id;
  if (!analysisId) {
    return {
      safe: false,
      provider: "virustotal",
      detail: "Missing analysis id from antivirus provider",
    };
  }

  const deadline = Date.now() + ANALYSIS_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(ANALYSIS_POLL_INTERVAL_MS);

    const analysisResponse = await fetchVirusTotal(`/analyses/${analysisId}`, apiKey);
    if (!analysisResponse.ok) {
      continue;
    }

    const analysisPayload = (await analysisResponse.json()) as {
      data?: {
        attributes?: {
          status?: string;
          stats?: Record<string, number>;
        };
      };
    };

    const status = analysisPayload.data?.attributes?.status;
    if (status !== "completed") {
      continue;
    }

    if (isFlaggedAnalysis(analysisPayload.data?.attributes?.stats)) {
      return {
        safe: false,
        provider: "virustotal",
        detail: "Positive malware detection",
      };
    }

    return { safe: true, provider: "virustotal" };
  }

  return {
    safe: false,
    provider: "virustotal",
    detail: "Antivirus analysis timed out",
  };
}

export function antivirusScanUserMessage(detail: string): string {
  if (detail.includes("timed out")) {
    return "We could not verify this file right now. Please try again in a few minutes.";
  }
  if (detail.includes("rate limit")) {
    return "Upload security scanning is busy. Please try again in a few minutes.";
  }
  if (detail.includes("Positive malware")) {
    return "This file did not pass our security scan and cannot be uploaded.";
  }
  return "We could not verify this file right now. Please try again in a few minutes.";
}

/** Optional VirusTotal scan when VIRUSTOTAL_API_KEY is configured. */
export async function scanWithAntivirus(bytes: Uint8Array): Promise<AntivirusScanResult> {
  const apiKey = getVirusTotalApiKey();
  if (!apiKey) {
    if (isAntivirusScanRequired()) {
      return {
        safe: false,
        provider: "virustotal",
        detail: "Antivirus scanning is required but not configured",
      };
    }
    return { safe: true, provider: "skipped" };
  }

  const hash = await sha256Hex(bytes);
  const lookup = await lookupHash(hash, apiKey);
  if (lookup !== "unknown") {
    return lookup;
  }

  return uploadAndAnalyze(bytes, apiKey);
}
