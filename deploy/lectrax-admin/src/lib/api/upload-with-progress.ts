import {
  getAdaptiveFetchTimeoutMs,
  readConnectionQuality,
  reportNetworkSample,
} from "@/lib/network/connection-quality";
import { getCsrfRequestHeaders } from "@/lib/security/csrf";

const ASSIGNMENT_UPLOAD_TIMEOUT_MS = 120_000;

export type UploadWithProgressResult = {
  ok: boolean;
  status: number;
  body: unknown;
};

export type UploadWithProgressOptions = {
  onProgress?: (percent: number) => void;
  timeoutMs?: number;
  signal?: AbortSignal;
};

function resolveUploadTimeoutMs(): number {
  const quality =
    typeof navigator !== "undefined"
      ? readConnectionQuality(navigator.onLine)
      : "online";
  return Math.max(getAdaptiveFetchTimeoutMs(quality), ASSIGNMENT_UPLOAD_TIMEOUT_MS);
}

/** POST multipart form data with upload progress (XHR). */
export function uploadFormDataWithProgress(
  url: string,
  formData: FormData,
  options: UploadWithProgressOptions = {}
): Promise<UploadWithProgressResult> {
  const timeoutMs = options.timeoutMs ?? resolveUploadTimeoutMs();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const startedAt = performance.now();
    const elapsedMs = () => Math.round(performance.now() - startedAt);

    xhr.open("POST", url);
    xhr.withCredentials = true;
    xhr.timeout = timeoutMs;

    for (const [key, value] of Object.entries(getCsrfRequestHeaders())) {
      xhr.setRequestHeader(key, value);
    }

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable || !options.onProgress) return;
      const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
      options.onProgress(percent);
    });

    xhr.addEventListener("load", () => {
      let body: unknown = null;
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        body = null;
      }

      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        body,
      });
    });

    xhr.addEventListener("error", () => {
      reportNetworkSample({
        durationMs: elapsedMs(),
        ok: false,
        networkError: true,
        ignoreDuration: true,
      });
      reject(new Error("UPLOAD_NETWORK_ERROR"));
    });

    xhr.addEventListener("timeout", () => {
      reportNetworkSample({
        durationMs: elapsedMs(),
        ok: false,
        timedOut: true,
        ignoreDuration: true,
      });
      reject(new Error("UPLOAD_TIMEOUT"));
    });

    xhr.addEventListener("abort", () => {
      reject(new DOMException("Upload aborted", "AbortError"));
    });

    if (options.signal) {
      if (options.signal.aborted) {
        xhr.abort();
        return;
      }

      options.signal.addEventListener(
        "abort",
        () => {
          xhr.abort();
        },
        { once: true }
      );
    }

    xhr.send(formData);
  });
}
