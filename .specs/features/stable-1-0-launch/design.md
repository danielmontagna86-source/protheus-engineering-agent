# Stable 1.0 launch — Design

## Delivery architecture

```text
                    Protheus Engineering Agent 1.0

  VS Code native UX        Runtime / CLI / MCP          GitHub / CI
  Engineering Center  ---> one operation envelope <--- Action + SARIF
          |                        |                         |
          +---------------- evidence ledger ----------------+

  ---------------------------------------------------------------
  Internal QA only; not packaged and not required by the product:
  Tier 0 fixtures | Tier 1 analyzer | Tier 2 Postgres | Tier 3 lab
  Tier Q community research is isolated and never a product dependency.
```

## Competitive feature disposition

| Market pattern | Product decision | Reason |
|---|---|---|
| Native diff/review and editor diagnostics | **Build** changed-files review, Problems and evidence navigation | Central to verified-change value |
| Agent tools, skills, rules and MCP | **Build/integrate** portable specialist primitives | Broad reach without owning a model loop |
| Permissions, visible actions and checkpoints | **Build** in deterministic policy/evidence code | Required for trusted execution |
| Project memory and durable context | **Build** governed Memory/Journal promotion and expiry | Protheus-specific institutional value |
| Background/cloud agents | **Defer** until local read-only value and governance are proven | High operational/privacy cost |
| Generic chat, terminal, browser, Git or model picker | **Reuse host; do not build** | Already supplied by VS Code and horizontal agents |
| Compile/debug/RPO/server management | **Integrate TDS; do not build** | Official product boundary |
| Proprietary full Protheus image | **Reject** | Legal, supply-chain and maintenance exposure |

## Internal QA environment admission

Every container declaration is untrusted test input. The QA admission harness emits:

```json
{
  "schemaVersion": "1",
  "candidate": "registry/name@sha256:...",
  "tier": "1|2|3|Q",
  "decision": "admitted|rejected|needs-human-approval",
  "license": { "status": "verified|unknown|rejected", "evidence": [] },
  "supplyChain": { "sbom": "...", "vulnerabilities": "...", "signature": "..." },
  "runtimePolicy": { "network": [], "ports": [], "readOnly": true, "nonRoot": true },
  "checks": [],
  "decidedAt": "..."
}
```

The test harness accepts Tier 1/2 only by full digest. Tier 3 accepts the official image plus private user-owned mounted artifacts. Tier Q cannot be referenced by product defaults, samples or required user workflows. No admission format is part of the 1.0 public product API.

## Internal QA evidence model

Keep environment evidence in the release/test manifest rather than expanding the public runtime envelope solely for Docker:

- `environmentTier` and `environmentIdentity`;
- image digest and mounted-input digests;
- `proofScope`: fixture, analyzer, database-adapter, AppServer-build or user-UAT;
- `claimLimitations`;
- cleanup/teardown result;
- links to raw logs after redaction.

A probe returning only an open TCP port is `ready: unknown` until a functional check succeeds. A skipped QA lane is `unavailable` or `skipped`, never `completed`.

## Stable channel design

- Internal development continues through `0.4.x` and `0.5.x` milestones.
- Release candidates are packaged and tested as immutable VSIX artifacts; Marketplace pre-release publication is optional, not required.
- Stable `1.0.0` is cut once from the exact approved public commit and is published without the pre-release flag.
- Source archive, VSIX, SBOM, manifest and external evidence are uploaded to a draft release, verified, attested, then made immutable.
- Rollback means reinstalling the last supported VSIX and restoring only versioned config/memory migrations; no destructive downgrade is automatic.

## Supported public API for 1.0

The public compatibility contract consists of:

- `.pea/config.json` schema and migrations;
- CLI commands, exit codes and JSON operation envelope;
- MCP tool names/input/output schemas;
- SARIF rule IDs/fingerprints and evidence schema;
- environment policy semantics;
- documented project memory/journal formats;
- extension command IDs used by keybindings/automation.

Breaking any of these after 1.0 requires the documented deprecation window or a major version.

## Security and release flow

1. pull request gates run deterministic tests, dependency review, secret scanning and CodeQL;
2. protected main produces candidate artifacts from a clean checkout;
3. Windows/Linux and minimum/current VS Code installed-package tests consume the candidate VSIX;
4. internal optional Docker QA lanes consume pinned digests and upload redacted test evidence;
5. human UAT, accessibility, legal and live homologation evidence is attached to the same commit manifest;
6. release workflow generates SBOM/provenance attestations and verifies them;
7. owner approves public GitHub release and Marketplace publication separately.

## Failure policy

- Missing evidence, unknown license/provenance, unpinned image, skipped required check, stale UAT or digest mismatch is a release failure.
- Tier 3 being unavailable keeps AppServer/build support out of stable 1.0; it is not replaced by Tier Q.
- Marketing copy is generated only from the approved claims table in release evidence.
