# Travel Newsletter Composer

## Goal
Build a mobile-first app that accepts exactly three travel photos and one short voice note, then creates a reviewed one-page email newsletter and a social-media caption.

## MVP rule
No automatic publishing. Always require human review.

## Stack
- TypeScript monorepo with pnpm
- Expo React Native for capture
- Next.js for review dashboard
- Supabase Auth, Postgres, Storage, and Edge Functions
- OpenAI-compatible transcription and multimodal generation
- Zod validation
- GitHub Actions CI

## Engineering principle
Prefer existing libraries, platform capabilities, templates, and integrations before writing custom code. Use the smallest implementation that meets the requirement. Do not create custom abstractions when an established library already provides the required behavior.

See `.github/copilot-instructions.md`, `docs/DECISIONS.md`, and `docs/COPILOT_WORKFLOW.md`.

## Copilot instructions
Read `docs/PRODUCT_SPEC.md` before changing code. Work in small, testable increments. Do not add publishing integrations until the capture-to-draft flow works. Do not expose API keys in client code. Preserve the human-review requirement.
