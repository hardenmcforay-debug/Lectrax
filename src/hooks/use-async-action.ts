"use client";

import { useCallback, useRef, useState } from "react";

type AsyncFn<TArgs extends unknown[], TResult> = (...args: TArgs) => Promise<TResult>;

/**
 * Locks an async action so it cannot run concurrently.
 * Sets pending immediately (ref + state), ignores duplicate calls, and always clears in `finally`.
 */
export function useAsyncAction() {
  const [isPending, setIsPending] = useState(false);
  const inFlightRef = useRef(false);

  const run = useCallback(async <TResult>(action: () => Promise<TResult>): Promise<TResult | undefined> => {
    if (inFlightRef.current) return undefined;
    inFlightRef.current = true;
    setIsPending(true);
    try {
      return await action();
    } finally {
      inFlightRef.current = false;
      setIsPending(false);
    }
  }, []);

  return { isPending, run } as const;
}

/**
 * Same lock as `useAsyncAction`, but tracks which keyed action is in flight
 * (e.g. "activate" | "extend" | "revoke") for multi-button toolbars.
 */
export function useKeyedAsyncAction<TKey extends string = string>() {
  const [pendingKey, setPendingKey] = useState<TKey | null>(null);
  const inFlightRef = useRef(false);

  const run = useCallback(
    async <TResult>(key: TKey, action: () => Promise<TResult>): Promise<TResult | undefined> => {
      if (inFlightRef.current) return undefined;
      inFlightRef.current = true;
      setPendingKey(key);
      try {
        return await action();
      } finally {
        inFlightRef.current = false;
        setPendingKey(null);
      }
    },
    []
  );

  return {
    pendingKey,
    isPending: pendingKey !== null,
    run,
  } as const;
}

/**
 * Wraps an async handler with the same in-flight lock.
 * Useful when the handler signature is fixed (e.g. form submit, click with args).
 */
export function useLockedAsyncHandler<TArgs extends unknown[], TResult>(
  action: AsyncFn<TArgs, TResult>
) {
  const [isPending, setIsPending] = useState(false);
  const inFlightRef = useRef(false);
  const actionRef = useRef(action);
  actionRef.current = action;

  const execute = useCallback(async (...args: TArgs): Promise<TResult | undefined> => {
    if (inFlightRef.current) return undefined;
    inFlightRef.current = true;
    setIsPending(true);
    try {
      return await actionRef.current(...args);
    } finally {
      inFlightRef.current = false;
      setIsPending(false);
    }
  }, []);

  return { isPending, execute } as const;
}
