# MCP SDK 2.1 finite-input compatibility

Context: issue #51; dependency PR #55 head `9f0e933ea4a6caebc28a1177d0bc055411159f6d`, based on `88b2f8de4450cb632ebf593b9701fc1d9f3b9969`. Official SDK 2.1 closes/aborts on stdin EOF. PEA deliberately retains its finite-input compatibility in addition to standard MCP clients.

- EOF-1: WHEN stdin ends normally, THEN stop accepting input, drain every accepted non-cancelled request and outstanding output write, and close once drained. SDK framing, schemas and error encoding remain authoritative.
- EOF-2: WHEN draining exceeds 5 seconds, THEN report `MCP_EOF_DRAIN_TIMEOUT`, close/abort and discard blocked output. Disconnect, input/output error and explicit SIGINT/SIGTERM close immediately. No infinite drains or private SDK hooks.
- EOF-3: WHEN cancellation references an in-flight request, THEN preserve SDK cancellation and suppress stale response; notifications alone do not keep the drain alive. IDs `0` and `''` are valid.
- EOF-4: Test standard clients with successful initialize before initialized/operations and keep stdin open until all expected IDs arrive. Preserve a separate real-process finite-input compatibility test, including asynchronous tools/resources, structured errors and progress. Smoke source and bundle through both modes.
- CLOCK-1: CI policy acceptance/expiration fixtures MUST use a fixed child-process clock, proving acceptance before and rejection at the expiry boundary without changing production or the computer clock.
- SEC-1: Resolve only the vulnerable development packages `brace-expansion` to 5.0.12 and `fast-uri` to 3.1.8, preserving other package versions, dependency ranges, runtime dependencies and audit policy. Require a fresh full audit, runtime audit and local validation before the authorized draft PR; qualify the exact remote commit with all applicable CI checks. No merge or deployment.

Non-goals: merge/deploy, live Protheus/Oracle/MCTB interaction, a new MCP framing implementation, production clock injection, unbounded shutdown or claims of full matrix qualification from one local OS. Draft PR publication and CI execution were separately authorized after the local implementation and review.
