# MVP Todo

## 1. Foundation

- [ ] Create the pnpm TypeScript workspace.
- [ ] Add the Expo capture app.
- [ ] Add the Next.js review dashboard.
- [ ] Add shared Zod schemas and workspace configuration.
- [ ] Add environment variable documentation without exposing secrets.

## 2. Capture

- [ ] Build the home screen with new entry and saved entries.
- [ ] Capture exactly three photos.
- [ ] Record one voice note limited to the expected 30-second to 3-minute range.
- [ ] Capture date/time and allow an optional title.
- [ ] Capture location and allow a correction before generation.
- [ ] Prevent submission until all required inputs are present.

## 3. Processing

- [ ] Upload private media to Supabase Storage.
- [ ] Transcribe the voice note server-side.
- [ ] Generate structured newsletter output from the transcript, confirmed metadata, and image observations.
- [ ] Validate generated output with the shared Zod schema.
- [ ] Preserve processing status and actionable failure states.

## 4. Review

- [ ] Show photos, transcript, metadata, generated draft, and review flags.
- [ ] Support editing the title, subject lines, preview text, body, captions, call to action, prayer request, social caption, and hashtags.
- [ ] Support regenerate, replace, crop, blur, and delete for media or generated content as appropriate.
- [ ] Flag faces, children, license plates, private addresses, and sensitive information.
- [ ] Require confirmation of location and human review before export.

## 5. Export

- [ ] Export the reviewed one-page newsletter.
- [ ] Export the social caption and hashtags.
- [ ] Keep automatic publishing out of scope.

## 6. Security and Verification

- [ ] Keep API keys in server-side or Edge Function environments.
- [ ] Enforce authenticated access to private media and drafts.
- [ ] Add focused tests for input limits, schema validation, privacy flags, and review gating.
- [ ] Add lint, typecheck, and CI commands.
- [ ] Verify the complete capture-to-review-to-export flow manually.

## Explicitly out of scope

- Automatic social publishing
- Subscriber management
- Analytics
- Translation
- Payments
- Multi-user teams