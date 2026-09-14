# Security model

- Hosted operator identity comes from the Sites dispatch authentication boundary. Every operator database query includes the owner. Local development simulates sign-in on loopback and strips supplied identity headers.
- Do not expose the Worker directly behind an untrusted proxy that lets callers forge `oai-authenticated-user-*` headers. The standalone production build needs a trusted authentication gateway.
- Intake links are bearer capabilities. They permit submissions for one project and cannot execute operator commands. Tokens are indexed by SHA-256 in D1; the original token is retained inside the owner's project aggregate so the owner can recover the link. A database compromise therefore exposes tokens.
- Portal links do not expire or rotate in version 0.1. Keep the hosted demonstration owner-private. Add expiry, rotation, explicit client identity, rate limiting, and access revocation before a customer deployment.
- The portal response excludes the scope, audit trail, token, artifacts, and message drafts. React renders user content as text. Incoming asset URLs are not fetched by the backend.
- Submission checks reject common secret patterns. This is a guardrail, not a comprehensive data-loss-prevention system.
- The system uses prepared SQL statements, schema validation, same-origin write checks, and optimistic concurrency. Review decisions need notes. Changed inputs invalidate readiness.
- There is no external email delivery, payment operation, destructive action, or filesystem deletion endpoint.

Report security problems privately to the repository owner. Do not post credentials or real client data in public issues. No independent penetration test or production security certification has been performed.
