# Governed review policy v1 — Design

**Spec:** `spec.md`
**Status:** Implemented locally

## Decision

The policy is a small declarative capability layered over the existing deterministic review exporter. It follows the useful part of the DeepSeek Harness architecture — explicit composition of independent capabilities — without importing its runtime, plugin framework or security assumptions.

```text
Git changed-file scope
        |
        v
deterministic review -> review.json + SARIF (immutable raw evidence)
        |
        +--> optional .pea/review-policy.json
                       |
                       v
              pure review-gate evaluator
                       |
                       +--> review-gate.json + Action outputs + exit code
```

## Components and reuse

| Component | Location | Responsibility | Reuse |
| --- | --- | --- | --- |
| Stable finding identity | `packages/evidence/src/index.mjs` | SHA-256 based on normalized rule/path/symbol/title | Existing `findingFingerprint` |
| Policy parser | `packages/evidence/src/index.mjs` | Strict schema, canonical timestamps, duplicate rejection | Existing bounded object/string validators |
| Gate evaluator | `packages/evidence/src/index.mjs` | Classifies threshold findings as blocked or waived | Existing `exportChangeReview` guarantees redaction/path bounds |
| Action adapter | `scripts/ci-review.mjs` | Loads safe optional policy, writes all evidence before exit | Existing contained atomic writes and link defense |
| Action surface | `action.yml` | Adds `policy-path` and audited outputs | Existing offline composite Action |

## Data contracts

`review-policy.schema.json` defines a strict, non-secret policy. Every waiver has exactly `fingerprint`, `reason`, `approvedBy` and canonical UTC `expiresAt`. The evaluator emits `review-gate.schema.json` with `blocked`, `waived`, `expiredWaivers` and `unusedWaivers`.

The raw report is deliberately not mutated. This prevents a waiver from hiding evidence in SARIF, downstream reports or a later re-evaluation. The gate only changes the Action decision for the selected threshold.

## Security design

- Policy paths must remain inside the GitHub workspace and have no symbolic-link/junction component.
- Policy is limited to 128 KiB and must be a regular UTF-8 JSON file.
- Unknown fields and unsupported versions fail closed.
- Gate output contains metadata needed for audit but never source excerpts; policy documentation prohibits passwords, tokens and customer data.
- The action requests no token and writes evidence atomically before returning a failing exit code.

## Rejected alternatives

- A remote waiver database: adds identity, availability, privacy and lock-in cost without improving deterministic local review.
- Rule-name suppression: too broad; it masks future instances of a defect.
- Permanent waivers: create silent policy debt; expiry forces re-evaluation.
- Adopting DeepSeek Harness as the runtime: upstream marks it developer-preview and unaudited; its broad process/network/plugin capabilities are outside this product boundary.

