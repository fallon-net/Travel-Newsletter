# Copilot Instructions

## Project goal

Travel Newsletter Composer accepts exactly three travel photos and one short voice note, then creates a reviewed one-page email newsletter and a social caption.

## Core development rule

Reuse existing libraries, APIs, components, templates, and platform features before writing custom code. Use the smallest reliable implementation that satisfies the requirement.

## Before writing code

1. Inspect the existing repository.
2. Check whether an installed dependency already provides the feature.
3. Check official APIs and platform capabilities.
4. Check Expo, Next.js, Supabase, and existing integrations.
5. State why reuse is not sufficient.
6. Propose the smallest custom implementation.

Do not proceed with unnecessary custom development.

## Dependency rules

- Do not add a package without a clear requirement.
- Prefer packages already installed.
- Prefer official packages over unofficial wrappers.
- Do not duplicate Expo, Next.js, Supabase, Zod, React, or browser features.
- Record the reason for every new production dependency.

## Code-size rules

- Keep functions small and single-purpose.
- Avoid speculative abstractions and premature design systems.
- Avoid custom state management for simple screens.
- Do not build custom upload, authentication, routing, or validation systems.
- Do not generate unused placeholder code.

## Product rules

- MVP requires exactly three photos and one voice note.
- Voice note is the primary source of meaning.
- Do not invent facts, people, locations, conversations, or events.
- Require user review before publication.
- Automatic publishing is out of scope for MVP.
- Protect private media.
- Keep API keys server-side.

## AI rules

- Use structured output and validate it with the shared Zod schema.
- Do not use AI when deterministic code is sufficient.
- Do not delegate file handling, authentication, or access control to AI.

## Verification rules

After every meaningful change, run relevant typecheck, lint, and focused tests. Report changed files and command results.

## Response format

For each task, report Plan, Reuse check, Changes, Verification, and Next step.
