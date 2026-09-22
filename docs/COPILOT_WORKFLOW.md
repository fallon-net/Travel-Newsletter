# Copilot Workflow

## Start-of-task prompt

Before writing code:

1. Inspect the existing repository.
2. Identify existing libraries, APIs, components, and platform capabilities.
3. Prefer reuse over custom development.
4. Propose the smallest implementation.
5. Identify files to change and files not to change.
6. State verification commands.

Do not write code until this plan is approved.

## Reduce-code prompt

Reduce this implementation. First identify existing capabilities that can replace custom code. Remove speculative abstractions, duplicate helpers, unused configuration, and out-of-scope features. Return the minimal implementation, avoided dependencies, and verification commands.

## Dependency prompt

Before adding a dependency, compare the current Expo, Next.js, Supabase, React, browser, and workspace capabilities against the proposed package. Recommend the smallest reliable option and do not install until justified.
