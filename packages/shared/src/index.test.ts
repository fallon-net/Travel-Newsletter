import { describe, expect, it } from "vitest";
import { captureEntrySchema, newsletterDraftSchema, processingStateSchema } from "./index";

const words = (count: number) => Array.from({ length: count }, (_, index) => `word${index}`).join(" ");

describe("captureEntrySchema", () => {
  it("requires exactly three photos and a 30-180 second voice note", () => {
    expect(captureEntrySchema.safeParse({ capturedAt: new Date(), contentMode: "general", photoCount: 3, voiceNoteDurationSeconds: 30 }).success).toBe(true);
    expect(captureEntrySchema.safeParse({ capturedAt: new Date(), contentMode: "general", photoCount: 2, voiceNoteDurationSeconds: 30 }).success).toBe(false);
    expect(captureEntrySchema.safeParse({ capturedAt: new Date(), contentMode: "general", photoCount: 3, voiceNoteDurationSeconds: 181 }).success).toBe(false);
  });
});

describe("newsletterDraftSchema", () => {
  const draft = {
    title: "A journey",
    subjectLines: ["One", "Two", "Three"],
    previewText: "A preview",
    openingParagraph: "An opening",
    body: words(250),
    photoCaptions: ["One", "Two", "Three"],
    callToAction: "Keep going",
    prayerRequest: null,
    socialCaption: "A caption",
    hashtags: ["#travel"],
    reviewFlags: []
  };

  it("accepts a valid structured draft", () => {
    expect(newsletterDraftSchema.safeParse(draft).success).toBe(true);
  });

  it("rejects an undersized body and the wrong caption count", () => {
    expect(newsletterDraftSchema.safeParse({ ...draft, body: words(249) }).success).toBe(false);
    expect(newsletterDraftSchema.safeParse({ ...draft, photoCaptions: ["One"] }).success).toBe(false);
  });
});

describe("processingStateSchema", () => {
  it("accepts known lifecycle states and rejects unknown states", () => {
    expect(processingStateSchema.safeParse({ status: "ready" }).success).toBe(true);
    expect(processingStateSchema.safeParse({ status: "published" }).success).toBe(false);
  });
});