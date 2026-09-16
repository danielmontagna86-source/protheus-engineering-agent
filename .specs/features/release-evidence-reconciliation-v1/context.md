# Context — Release evidence reconciliation v1

## Confirmed facts

- GitHub Preview `v0.3.9` was published on 2026-09-15 for commit
  `29993a84c4a30896bfa9e48556ffdd6db040fc45`.
- Its source ZIP, VSIX, SBOM, manifest and checksum file were downloaded and
  reconciled by SHA-256. GitHub attestations were verified for the distributable
  assets.
- Commit `877b87bf768067c1858fdfbb787696e2a4d1a2c5` subsequently updated the
  CodeQL actions atomically. Its remote CI, CodeQL, secret, dependency and
  mutation gates passed. It is not a new release artifact.
- Stable and Marketplace remain `NO-GO`: publisher, assistive UAT, representative
  pilot and final named authorization are not substitutable by local or CI tests.

## Source hierarchy

1. GitHub Release API and Actions run records for immutable public facts.
2. The Stable 1.0 validation ledger for promotion policy.
3. Existing tracked release and operations documentation for historical context.

## Non-goals

- Do not tag, create a release, upload a VSIX, change Marketplace visibility or
  accept Marketplace terms.
- Do not convert Preview evidence into Stable or Marketplace approval.
