import { z } from "zod";

export const trialStatusSchema = z.object({
  currentTier: z.enum(['free', 'trial', 'basic']),
  isTrialActive: z.boolean(),
  trialUsed: z.boolean(),
  trialEndDate: z.string().nullable(),
  trialStartDate: z.string().nullable()
});

export type TrialStatus = z.infer<typeof trialStatusSchema>;
