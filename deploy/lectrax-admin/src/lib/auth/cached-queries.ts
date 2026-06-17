import { cache } from "react";
import { getProfileByUserId } from "@/lib/auth/get-profile";
import type { Profile } from "@/types/database";

export const getCachedProfileByUserId = cache(
  async (userId: string): Promise<Profile | null> => getProfileByUserId(userId)
);
