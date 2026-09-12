# Production code review — 2026-09-09

## Scope and method

Review covered the extension, runtime, MCP protocol, policy, AI gateway, subagent supervisor, integration/build boundaries, release scripts, dependency lock, workflows, package artifacts and launch documentation. It combined source inspection, independent focused review, adversarial regression tests, local package validation and the GitHub Windows/Linux CI evidence available for the preceding baseline.

No product AdvPL/TLPP source was changed in this review. The repository's AdvPL fixtures and deterministic parser/reviewer contracts were covered by the Node test suite; a licensed AppServer/RPO remains an external acceptance gate.

## Fixed findings

| Severity | Finding | Resolution | Regression proof |
|---|---|---|---|
| High | Inline credentials in neutral project-text fields could reach an optional AI provider. | The gateway now redacts detected credential assignments, service-URI credentials and Bearer tokens in every string value before provider invocation. | `test/ai-gateway.test.mjs` proves the provider never receives the injected values. |
| High | An approval response could be replayed across request, environment or capability. | The broker requires its exact request ID, environment, capability and a non-pre-request approval timestamp. | `test/policy.test.mjs` rejects mismatched and stale responses. |
| Major | Hermes session MCP descriptor declared `production` regardless of active project profile. | The default descriptor now derives `PEA_ENVIRONMENT` from the active profile. | `test/runtime-cli.test.mjs` covers development, test, homologation and production. |
| Medium | A timed-out, non-cooperative subagent released its concurrency slot early. | A slot remains held until the child invocation settles, even after an abort request. | `test/subagents.test.mjs` proves a second child is denied until release. |
| Medium | MCP cancellation test used a fixed delay. | The test now waits for a subsequent protocol round-trip before asserting no stale result. | `test/mcp.test.mjs`. |
| Medium | Performance budgets allowed orders-of-magnitude regressions. | Thresholds are calibrated from fresh Windows plus GitHub Windows/Linux Node 22/24 1,000-symbol evidence, with explicit headroom. | `benchmark/performance-budgets.json` and `docs/qa/performance-results-2026-09-09.md`. |
| Documentation | The concern ledger retained resolved product-surface and SARIF gaps. | Resolved entries now link to their delivered contracts; remaining external launch gates remain open. | `.specs/codebase/CONCERNS.md`. |

## Review outcome

The confirmed code-level blockers in this review are fixed subject to the exact-commit validation listed below. This is not a claim that Stable 1.0 is approved: live Protheus/Oracle acceptance, accessibility and human UAT, pilot outcome evidence, public-repository security lanes and named release authorization remain external, fail-closed launch gates.

## Exact-commit validation required

1. Full Node suite, structural check, smoke and calibrated performance suite.
2. Dependency audit, publication check and reproducible package/release verification.
3. Mutation gate including the modified security modules.
4. PR CI on Windows/Linux Node 22/24 plus VS Code Extension Host.
5. Reconcile the final release ledger to the commit and artifacts produced by steps 1–4.
