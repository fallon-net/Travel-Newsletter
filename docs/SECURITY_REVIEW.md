# Security Review

## Completed controls

- Supabase Auth bearer tokens are verified before server mutations.
- Database and Storage mutations use `SUPABASE_SERVICE_ROLE_KEY` only in server route code.
- The service-role key is not exposed in `NEXT_PUBLIC_*` variables or client code.
- Newsletter rows are scoped by authenticated `user_id` in server queries.
- Media is stored in the private `travel-media` bucket and exposed only through expiring signed URLs.
- Uploads require exactly three image files and one audio file with MIME and size checks.
- Shared Zod schemas validate capture metadata, processing states, and generated drafts.
- Review saves require a valid draft and explicit location confirmation.
- Export requires both `location_confirmed` and `human_reviewed`.
- Export text is HTML-escaped before downloadable HTML is generated.
- Generated review flags are displayed to the reviewer.
- Local environment files are ignored and tracked-file secret scanning found no secrets.

## Required Supabase actions

Apply migrations in order:

1. `supabase/migrations/001_private_media.sql`
2. `supabase/migrations/002_review_gating.sql`
3. `supabase/migrations/003_server_mutations.sql`

Add `SUPABASE_SERVICE_ROLE_KEY` to `apps/review/.env.local` only. Never add it to an Expo environment file or commit it.

## Dependency finding

`pnpm audit --prod` reports one moderate transitive `uuid` vulnerability through Expo CLI/config tooling. It is not a direct application dependency. Do not force an override across Expo until the Expo SDK publishes a compatible patched chain; re-run the audit after each Expo SDK upgrade.

## Remaining manual verification

- Sign in with a real Supabase user.
- Upload exactly three photos and one valid voice note from the capture app.
- Confirm the row reaches the expected processing state and private media is accessible only to the owner.
- Configure the server-only AI variables and confirm transcription and structured generation.
- Edit the generated draft, confirm location, save human review, and export.
- Confirm direct client attempts cannot update `human_reviewed` or delete Storage objects after migration `003`.
