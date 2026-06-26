/** Run work after first paint / when the browser is idle to keep initial render fast. */
export function deferNonCriticalTask(task: () => void | Promise<void>): void {
  if (typeof window === "undefined") {
    return;
  }

  const run = () => {
    void task();
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 3_000 });
    return;
  }

  window.setTimeout(run, 1);
}
