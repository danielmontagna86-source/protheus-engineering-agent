# Protheus test lab and stable-launch review

**Date:** 2026-09-08  
**Decision status:** architecture and admission decision complete; community images were not executed  
**Scope:** the three community projects supplied by the owner, official TOTVS EngPro development images, VS Code stable distribution and GitHub release assurance

## Executive decision

The Docker material is **internal QA infrastructure only**. It is not a product feature, prerequisite, supported customer deployment or Marketplace deliverable. The VSIX and runtime must remain fully usable without Docker. The legally and technically defensible internal test architecture is layered:

1. deterministic fixtures and service virtualization for most CI;
2. the official TOTVS ADVPL/TLPP analyzer container for static-analysis integration;
3. the official TOTVS EngPro PostgreSQL development image for dictionary/read-only database tests;
4. a bring-your-own-artifacts AppServer lab for licensed homologation;
5. a quarantined, non-gating lane for community images only after provenance, license and security admission.

This does not make Docker proof equivalent to production proof. TOTVS states that its Docker images are strictly for development and are not homologated for production. The engineering team may use them as reproducible internal test fixtures, while production claims still require an authorized Protheus homologation environment. Source: [TOTVS EngPro Protheus Docker](https://docker-protheus.engpro.totvs.com.br/).

## Admission matrix

| Candidate | Observed strengths | Blocking concerns | Decision |
|---|---|---|---|
| `folegini/Protheus_Docker` | Small historical example; SQLite reduces topology; downloads `dumb-init` with a checksum | Two-commit 2019-era project, CentOS 7, no detected license, floating external downloads, root/`chmod 777`, public license endpoint, no health/readiness checks | **REJECT FOR EXECUTION.** Historical architecture reference only |
| `endersonmaia/totvs-protheus-docker` | Separates AppServer/DBAccess/database and expects customer-provided binaries | Archived since 2020, no detected license, PostgreSQL 9.3, incomplete setup, root/default credentials, exposed ports and no readiness semantics | **REJECT FOR EXECUTION.** Historical topology reference only |
| `juliansantosinfo/TOTVS-Protheus-in-Docker` + `totvs_appserver` | Active project, MIT for repository code, version registry, PostgreSQL/MSSQL/Oracle profiles, healthchecks, dependency ordering, documentation and CI scripts | Community/non-official; public image appears to package proprietary runtime/RPO/dictionary inputs; image/base identities are tags rather than full digests; root execution, broad host ports and default credentials; weak secret scanning; CI/tool downloads not fully pinned; TCP-only health; smoke script can miss exited/no-health containers | **QUARANTINE.** Reuse ideas, not artifacts. No CI/release dependency and no execution before legal/provenance admission |
| `totvsengpro/advpl-tlpp-code-analyzer` | Intended for local and CI use; supports includes, JSON output and break-on-error | Still a development tool; digest and supported rule behavior must be recorded per run | **ADMIT AS TIER 1** after digest pinning, resource limits and clean/failing fixture tests |
| `totvsengpro/postgres-dev:12.1.2510_bra` | No additional proprietary input is required; supplies a Protheus-shaped database for development | Development-only, not a complete Protheus/AppServer environment | **ADMIT AS TIER 2** on loopback only, with deterministic seed/query tests and teardown |
| `totvsengpro/appserver-dev` | First-party EngPro development route and smaller documented image; explicit volume model | Requires legitimate local `appserver.ini`, RPO and dictionary/system files; development-only | **ADMIT AS TIER 3** only with user-owned/licensed artifacts and isolated homologation |

Repository evidence: [folegini/Protheus_Docker](https://github.com/folegini/Protheus_Docker), [endersonmaia/totvs-protheus-docker](https://github.com/endersonmaia/totvs-protheus-docker), [juliansantosinfo/TOTVS-Protheus-in-Docker](https://github.com/juliansantosinfo/TOTVS-Protheus-in-Docker) and [juliansantosinfo/totvs_appserver](https://hub.docker.com/r/juliansantosinfo/totvs_appserver).

## Why the community AppServer image is not a shortcut

The current Docker Hub quick start uses `latest`, exposes three host ports and requires DBAccess and LicenseServer on the same network. The published image is approximately 2 GB and Docker Hub exposes only a shortened digest in the page. The associated repository builds images from AppServer/WebApp/RPO/dictionary packages, so an MIT license on build scripts does not grant redistribution rights for those proprietary artifacts.

Before any optional community-image experiment, the admission job must therefore produce all of the following:

- immutable full image digests and a recorded manifest for every architecture;
- license/provenance decision covering scripts, base image and every embedded TOTVS artifact;
- SBOM, vulnerability report, malware/secret scan and signature/provenance verification;
- non-root feasibility, read-only filesystem feasibility, dropped capabilities and explicit resource limits;
- loopback-only port mapping and a dedicated internal network with no unapproved egress;
- functional readiness probes, not TCP-open checks alone;
- clean startup, expected failure, cancellation, timeout and teardown evidence;
- confirmation that no downloaded or generated layer is redistributed by this project.

Failure of any item means `REJECTED`, not “warning accepted”.

## Internal QA environment architecture

None of these tiers appears in onboarding, normal product settings or marketing. They are release-engineering lanes and may live in test-only scripts/workflows.

### Tier 0 — deterministic and always available

- legal ADVPL/TLPP fixtures and golden outputs;
- fake build process adapter;
- contract-tested TDN, dictionary, TDS and database stubs;
- failure injection for unavailable/timeout/denied/malformed/cancelled operations;
- zero external network calls in normal unit/integration CI.

### Tier 1 — official analyzer

- image identity pinned by full digest in configuration/evidence;
- clean and deliberately failing ADVPL/TLPP fixtures;
- includes, config, JSON parse, exit-code mapping, timeout, output-size and cancellation tests;
- CPU/memory/process limits and read-only input mounts;
- parity between CLI, MCP, VS Code and GitHub Action envelopes.

The official image is explicitly described for local and CI analysis and can emit JSON: [TOTVS EngPro ADVPL/TLPP Code Analyzer](https://hub.docker.com/r/totvsengpro/advpl-tlpp-code-analyzer).

### Tier 2 — official Protheus-shaped PostgreSQL

- opt-in developer/CI profile, bound only to `127.0.0.1` on a non-default host port;
- ephemeral credentials generated for each run;
- read-only application account and named-query allowlist;
- SX2/SX3 schema/field lookup fixtures plus unknown/denied/injection cases;
- health/readiness wait, deterministic cleanup and no persistent customer data;
- evidence labels the result as database-adapter proof, not AppServer proof.

The official Docker Hub documentation exposes the `12.1.2510_bra` tag and states that no additional dependency is necessary: [TOTVS EngPro PostgreSQL development image](https://hub.docker.com/r/totvsengpro/postgres-dev).

### Tier 3 — licensed AppServer homologation

- use the official EngPro AppServer development image by digest;
- mount only user-owned, entitlement-verified `appserver.ini`, RPO and required system/dictionary artifacts;
- isolate License Server and DBAccess access to an approved test network;
- compile a legal smoke source, capture source/RPO/environment identities and verify expected result;
- repeat with compilation error, unavailable server, locked RPO, bad include, timeout and cancellation;
- test TDS coexistence and CP1252/LF preservation on Windows;
- destroy the environment and redact secrets from all retained evidence.

The official AppServer image documents the required mounted inputs and is still development-only: [TOTVS EngPro AppServer development image](https://hub.docker.com/r/totvsengpro/appserver-dev).

### Tier Q — community quarantine

Tier Q is research, never a stable-release dependency. It may run only after the admission checklist above is approved. Its result can reveal compatibility bugs, but it cannot replace Tier 3 or justify a supported-Protheus claim.

## What “not preview” must mean

Changing `0.3.0` to `1.0.0` is insufficient. SemVer states that `0.y.z` is initial development and that `1.0.0` defines the public API; a stable release therefore needs an explicit supported API/config/evidence contract and compatibility policy. Source: [Semantic Versioning 1.0.0](https://semver.org/spec/v1.0.0.html).

For the VS Code Marketplace, pre-release is a publication channel flag and version numbers must remain numeric. A regular release must use a distinct version from a pre-release, and VS Code may update users to the highest available version. Source: [VS Code Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

The `1.0.0` promotion must be blocked until:

1. all product-completeness P0/P1 tasks are complete and their limitations are public;
2. the extension passes installed-VSIX tests on minimum/current VS Code and Windows/Linux, plus local/WSL or other supported remote mode;
3. install, upgrade from the last preview, clean uninstall/reinstall and documented rollback are proven;
4. first-value onboarding, pt-BR/en, keyboard, screen reader, high contrast, zoom and visual QA pass;
5. TDS coexistence and a licensed AppServer/RPO/database homologation pass;
6. source, VSIX, SBOM, manifest and evidence are generated from the exact public commit and are hash-linked;
7. dependency review, secret scan, OSV/npm audit, CodeQL, mutation threshold and independent code review are green;
8. release artifacts have provenance attestations and the published/downloaded artifact is verified;
9. supported versions, privacy, permissions, security reporting, support, migration, deprecation and rollback are documented;
10. no blocker/high issue is open, marketing claims match pilot evidence and the owner gives named publication authorization.

GitHub documents that attestations bind an artifact to its workflow, repository, commit and triggering event, and that attestations must be verified to provide value: [GitHub artifact attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations). GitHub also provides dependency review, Dependabot, immutable releases and CodeQL for public-repository supply-chain and code-scanning controls: [GitHub supply-chain security](https://docs.github.com/en/code-security/concepts/supply-chain-security/supply-chain-security) and [GitHub CodeQL](https://docs.github.com/en/code-security/concepts/code-scanning/codeql).

## Owner-supplied inputs still required for stable 1.0

The team can implement and automate almost everything without a local Protheus installation. The owner must ultimately provide or arrange:

- lawful access to a supported Protheus/TDS homologation environment or legitimate Portal TOTVS artifacts;
- a non-customer, redistributable-or-private ADVPL/TLPP smoke project and test RPO;
- approved test License Server/DBAccess connectivity, if required by that environment;
- two or more representative Protheus developers/reviewers for usability and outcome validation;
- Marketplace/Azure publisher identity, brand domain and legal/trademark review;
- final GitHub visibility, tag/release and Marketplace publication authorization.

No community image can legitimately manufacture these permissions or evidence.

## Reusable ideas versus rejected scope

### Reuse or implement independently

- environment profiles and version registries;
- health/readiness sequencing and bounded teardown;
- multi-database adapter contracts;
- container identity and evidence capture;
- native VS Code Engineering Center, changed-files review and stable SARIF;
- permissions, checkpoints/evidence and read/execute/write separation familiar from modern agents;
- portable tools/skills through VS Code and MCP.

### Do not build

- a replacement IDE, Explorer, terminal, Git UI or generic chat/model selector;
- a TDS compiler/debugger/RPO/server replacement;
- a public “full Protheus” image containing proprietary assets;
- a release gate that depends on Hermes or any single model/provider;
- cloud/background autonomy before local governed workflows prove value.
