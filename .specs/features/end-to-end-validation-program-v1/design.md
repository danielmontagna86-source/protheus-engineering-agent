# Design — End-to-end validation program v1

## Validation architecture

```text
source + lockfile
       | clean checkout
       v
deterministic gates ----> VSIX/SBOM/source ZIP/hashes ----> installed hosts
       |                         |                                |
       |                         +--> provenance/public CI          +--> local + Linux + remote
       v
optional adapters ----> admitted QA environments ----> licensed homologation
       |                         |                                |
       +--> fixtures/contracts    +--> analyzer/Postgres only       +--> AppServer/RPO/DBAccess

manual acceptance ----> accessibility/UAT/pilot ----> release owner decision
```

## Boundaries

| Layer | What it can prove | What it cannot prove |
|---|---|---|
| Deterministic Node suite and mutation | Runtime, policy, graph, adapter contracts and regression resistance. | A real AppServer, human usability or marketplace download. |
| Installed VSIX lifecycle | Package installation and command activation on named VS Code versions. | Remote host behavior unless run in a remote extension host. |
| Official analyzer/Postgres QA lanes | Independent static output and read-only dialect adapter behavior. | Compiler/RPO/database support in a customer or licensed Protheus system. |
| Licensed AppServer lab | Build adapter behavior with named lawful artifacts. | Broad compatibility outside the tested matrix. |
| Accessibility/UAT/pilot | Human task outcomes in the recorded sample. | Universal accessibility or productivity uplift. |
| Public GitHub/Marketplace | Distribution, security and publisher evidence for exact artifacts. | Future service uptime or adoption. |

## Remote test design

The extension manifest declares `extensionKind: ["workspace"]`; this is the
right location for workspace files and child processes. VS Code remote guidance
requires testing the package in the remote extension host. The mandatory remote
record therefore includes: host type and OS, VS Code client/server versions,
VSIX SHA-256, install command, `Developer: Show Running Extensions` evidence,
and command results for Doctor, index and review. A container that only runs
Node tests is useful environment evidence, but is explicitly not a substitute.

## Release evidence model

`release-artifacts/` is intentionally generated outside the commit it attests.
The evidence validator binds the exact commit and artifact hashes. Public
attestations and GitHub security results are additive only when the repository
plan/visibility makes them available; skipped checks fail the Stable release
ledger rather than being counted as success.

## Alternatives rejected

| Alternative | Decision | Reason |
|---|---|---|
| Make Hermes mandatory | Reject | Narrows adoption and violates the standalone VS Code/runtime contract. |
| Ship a Docker/AppServer stack | Reject | Adds entitlement, provenance and security risk; users do not need Docker for first value. |
| Treat community images as compile proof | Reject | Build-script licenses do not establish redistribution rights or provide a supported AppServer/RPO matrix. |
| Declare green CI as production GO | Reject | It cannot prove external/human/release-owner gates. |
