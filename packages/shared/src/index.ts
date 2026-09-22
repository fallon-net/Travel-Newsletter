import { z } from "zod";

export const contentModeSchema = z.enum(["general", "ministry", "business", "personal"]);
export const processingStatusSchema = z.enum(["queued", "uploading", "transcribing", "generating", "ready", "failed"]);

export const newsletterDraftSchema = z.object({
  title: z.string(),
  subjectLines: z.array(z.string()).min(3).max(5),
  previewText: z.string(),
  openingParagraph: z.string(),
  body: z.string(),
  photoCaptions: z.array(z.string()).length(3),
  callToAction: z.string(),
  prayerRequest: z.string().nullable(),
  socialCaption: z.string(),
  hashtags: z.array(z.string()),
  reviewFlags: z.array(z.string())
});

export const captureEntrySchema = z.object({
  title: z.string().optional(),
  location: z.string().optional(),
  capturedAt: z.coerce.date(),
  contentMode: contentModeSchema,
  photoCount: z.literal(3),
  voiceNoteDurationSeconds: z.number().int().min(30).max(180)
});

export const processingStateSchema = z.object({
  status: processingStatusSchema,
  errorMessage: z.string().optional()
});

export type CaptureEntry = z.infer<typeof captureEntrySchema>;
export type NewsletterDraft = z.infer<typeof newsletterDraftSchema>;
export type ProcessingState = z.infer<typeof processingStateSchema>;