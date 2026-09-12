# Bug-review evidence sheet

`createBugReview()` produces a versioned report that keeps diagnosis separate from proof.
The runtime and `pea_bug_review` MCP tool assemble the deterministic source review and the
workspace CodeGraph; callers may add changed files, validation, build and cited external
evidence as those steps occur.

The v2 report contains:

- target and resolved callers;
- deterministic findings;
- deduplicated workspace-relative changed files;
- validation checks and passed/failed/not-run summary;
- build status, compiler identity and artifact digest;
- explicit uncertainty and residual-risk codes;
- one evidence ledger suitable for review or CI output.

A build is `verified` only when its status is `completed`, compiler evidence has exit code
zero plus an identity, and the artifact has a SHA-256 digest and path. A claimed completion
without that proof is downgraded to `unverified`. Missing tests, target, build or open
uncertainty remain visible as residual risks; they are never silently inferred as passes.
