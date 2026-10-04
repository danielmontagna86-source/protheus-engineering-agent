# MCP EOF Drain Implementation Plan

**Goal:** Preserve issue #51 finite-input responses under SDK 2.1, retain normal MCP lifecycle coverage and remove wall-clock dependence from the CI waiver fixture.

**Architecture:** Compose `StdioServerTransport` using a Node PassThrough input. Forward all parsing to the SDK and observe its public message/send hooks; suppress forwarding source EOF until request IDs and successful output writes settle. Drain has a 5-second deadline; hard disconnects, stream errors and explicit close abort promptly. Await a Node writable callback after SDK send so buffered writes complete before retiring responses.

**Tech Stack:** Node 22/24 ESM and streams; official MCP server 2.1.0; node:test.

Alternatives: retaining 2.0 fixes immediate compatibility but does not implement the approved upgrade; replacing SDK framing/private listeners introduces unsupported coupling. Public transport composition keeps the official framing and exposes an explicit PEA lifecycle extension.

## Tasks

1. Keep the currently failing finite-process MCP test; add independent standard-client and bounded-drain/cancellation/backpressure/error regressions. Capture RED before runtime edits.
2. Create `packages/mcp/src/draining-stdio.mjs`; integrate only `packages/mcp/src/stdio.mjs`. Public lifecycle only, own listener cleanup only, valid zero/empty IDs, and bounded output/error behavior. Run targeted tests.
3. Add `scripts/mcp-session.mjs` for asynchronous child protocol interaction used by smoke and standard-client tests. Retain finite input as a separate smoke mode for source and bundle. Assert missing IDs explicitly.
4. Fix `test/ci-review.test.mjs` with Date mocking via Node preload only in child tests; verify before expiry and at expiry, preserving the expiry policy unchanged.
5. Build and run focused tests, full `npm run validate`, smoke and benchmark. Verify diff and source status. Run independent review, resolve findings, repeat affected gates. Record exact environment, commands and results; no push/merge/deploy.

Traceability and acceptance: `.specs/features/mcp-sdk-eof-drain/{spec,tasks,validation}.md`. Tests use only synthetic temporary workspaces; source/bundle use the same implementation. Official CI matrix still requires external execution before publication.
