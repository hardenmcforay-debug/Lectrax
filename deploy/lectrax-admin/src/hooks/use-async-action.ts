"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AsyncFn<TArgs extends unknown[], TResult> = (...args: TArgs) => Promise<TResult>;

export type AsyncActionRunOptions = {
  /**
   * Keep the lock after a successful run so the user cannot fire the action again
   * while a slow navigation/transition is still opening the next page.
   * Failures must throw to release the lock.
   */
  holdOnSuccess?: boolean;
};

/**
 * Locks an async action so it cannot run concurrently.
 * Sets pending immediately (ref + state), ignores duplicate calls, and clears in `finally`
 * unless `holdOnSuccess` keeps the lock after a successful resolve.
 */
export function useAsyncAction() {
  const [isPending, setIsPending] = useState(false);
  const inFlightRef = useRef(false);

  const run = useCallback(
    async <TResult>(
      action: () => Promise<TResult>,
      options?: AsyncActionRunOptions
    ): Promise<TResult | undefined> => {
      if (inFlightRef.current) return undefined;
      inFlightRef.current = true;
      setIsPending(true);

      let hold = false;
      try {
        const result = await action();
        hold = Boolean(options?.holdOnSuccess);
        return result;
      } catch (error) {
        hold = false;
        throw error;
      } finally {
        if (!hold) {
          inFlightRef.current = false;
          setIsPending(false);
        }
      }
    },
    []
  );

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
    async <TResult>(
      key: TKey,
      action: () => Promise<TResult>,
      options?: AsyncActionRunOptions
    ): Promise<TResult | undefined> => {
      if (inFlightRef.current) return undefined;
      inFlightRef.current = true;
      setPendingKey(key);

      let hold = false;
      try {
        const result = await action();
        hold = Boolean(options?.holdOnSuccess);
        return result;
      } catch (error) {
        hold = false;
        throw error;
      } finally {
        if (!hold) {
          inFlightRef.current = false;
          setPendingKey(null);
        }
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
  action: AsyncFn<TArgs, TResult>,
  options?: AsyncActionRunOptions
) {
  const [isPending, setIsPending] = useState(false);
  const inFlightRef = useRef(false);
  const actionRef = useRef(action);
  const optionsRef = useRef(options);

  useEffect(() => {
    actionRef.current = action;
    optionsRef.current = options;
  });

  const execute = useCallback(async (...args: TArgs): Promise<TResult | undefined> => {
    if (inFlightRef.current) return undefined;
    inFlightRef.current = true;
    setIsPending(true);

    let hold = false;
    try {
      const result = await actionRef.current(...args);
      hold = Boolean(optionsRef.current?.holdOnSuccess);
      return result;
    } catch (error) {
      hold = false;
      throw error;
    } finally {
      if (!hold) {
        inFlightRef.current = false;
        setIsPending(false);
      }
    }
  }, []);

  return { isPending, execute } as const;
}
