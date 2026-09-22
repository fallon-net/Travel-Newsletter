# Architecture Decisions

## ADR-001: Reuse before custom development

Status: Accepted

Use existing libraries, platform features, and integrations before custom code. The product value is in capture, orchestration, review, and output—not rebuilding authentication, uploads, recording, storage, validation, or delivery.

Custom code is justified only when it provides product-specific value or existing tools cannot meet a defined requirement.

## ADR-002: No automatic publishing in MVP

Status: Accepted

The application creates drafts and exports. It does not publish automatically. Human review is required for privacy and pastoral sensitivity.

## ADR-003: Shared schema for AI output

Status: Accepted

AI output must conform to the shared Zod schema before it is saved or treated as a completed draft.
