"use client";

import { useEffect } from "react";
import { writeOfflineCache, type OfflineCacheKey } from "@/lib/offline/cache";

export function OfflineCacheWriter<T>({
  cacheKey,
  data,
}: {
  cacheKey: OfflineCacheKey;
  data: T;
}) {
  useEffect(() => {
    writeOfflineCache(cacheKey, data);
  }, [cacheKey, data]);

  return null;
}
