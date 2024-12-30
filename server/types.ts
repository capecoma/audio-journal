import { z } from "zod";

export interface UserPreferences {
  aiJournalingEnabled: boolean;
}

export const userPreferencesSchema = z.object({
  aiJournalingEnabled: z.boolean().default(false)
});
