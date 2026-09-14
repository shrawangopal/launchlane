# Integration boundary

The shipped system creates resources inside Launchlane and exports them. No third-party account is connected and no external messages are sent.

For a first live connector, keep the adapter narrow: `provisionWorkspace`, `readWorkspace`, and `exportHandoff`. An adapter should return the external resource ID and a read-back verification result. Client-provided URLs must never select a connector endpoint or receive credentials.

Before adding network writes:

1. Bind credentials and approved destinations to a workspace on the server.
2. Claim a durable job using compare-and-swap; record a stable idempotency key based on project, action, and input version.
3. Execute with a timeout and bounded retry policy. Never automatically retry an ambiguous non-idempotent write.
4. Read back the created resource or reconcile the provider's receipt.
5. Store success, failure, or needs-reconciliation. A timeout is not proof that the provider did nothing.
6. Show the true outcome in the audit trail. Require operator approval for externally visible or consequential actions.

The current atomic project update covers internal artifacts only. Do not place an external API call inside `transition()` or claim that the local transaction makes distributed writes exactly-once.

The local materializer provides a working, credential-free delivery adapter. It deliberately creates only new directories and files.
