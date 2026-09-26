# MVP Todo

## 1. Foundation

- [x] Create the pnpm TypeScript workspace.
- [x] Add the Expo capture app.
- [x] Add the Next.js review dashboard.
- [x] Add shared Zod schemas and workspace configuration.
- [x] Add environment variable documentation without exposing secrets.

## 2. Capture

- [x] Build the home screen with new entry and saved entries.
- [x] Capture exactly three photos.
- [x] Record one voice note limited to the expected 30-second to 3-minute range.
- [x] Capture date/time and allow an optional title.
- [x] Capture location and allow a correction before generation.
- [x] Prevent submission until all required inputs are present.

## 3. Processing

- [x] Upload private media to Supabase Storage.
- [x] Transcribe the voice note server-side.
- [x] Generate structured newsletter output from the transcript, confirmed metadata, and image observations.
- [x] Validate generated output with the shared Zod schema.
- [x] Preserve processing status and actionable failure states.

## 4. Review

- [x] Show photos, transcript, metadata, generated draft, and review flags.
- [x] Support editing the title, subject lines, preview text, body, captions, call to action, prayer request, social caption, and hashtags.
- [ ] Support regenerate, replace, crop, blur, and delete for media or generated content as appropriate.
- [ ] Flag faces, children, license plates, private addresses, and sensitive information.
- [x] Require confirmation of location and human review before export.

## 5. Export

- [ ] Export the reviewed one-page newsletter.
- [ ] Export the social caption and hashtags.
- [ ] Keep automatic publishing out of scope.

## 6. Security and Verification

- [ ] Keep API keys in server-side or Edge Function environments.
- [x] Enforce authenticated access to private media and drafts.
- [ ] Add focused tests for input limits, schema validation, privacy flags, and review gating.
- [ ] Add lint, typecheck, and CI commands.
- [ ] Verify the complete capture-to-review-to-export flow manually.

## 7. Near-Final Security Analysis

- [ ] Review authentication, authorization, and row-level access for entries, drafts, and media.
- [ ] Confirm Storage buckets and signed URLs do not expose private media.
- [ ] Check that client bundles and logs contain no API keys, tokens, transcripts, or sensitive media data.
- [ ] Review upload validation for file type, size, count, and voice-note duration.
- [ ] Review server-side transcription and generation boundaries for prompt injection and untrusted content.
- [ ] Confirm generated output is schema-validated and cannot bypass human review or location confirmation.
- [ ] Test privacy flags and redaction controls for faces, children, license plates, addresses, and sensitive information.
- [ ] Run dependency and secret scans, then document findings and required fixes.
- [ ] Re-run focused tests and the end-to-end manual verification after security fixes.

## Explicitly out of scope

- Automatic social publishing
- Subscriber management
- Analytics
- Translation
- Payments
- Multi-user teams