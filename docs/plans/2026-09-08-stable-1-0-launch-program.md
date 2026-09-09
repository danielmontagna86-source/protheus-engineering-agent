# Protheus Engineering Agent — Stable 1.0 launch program

**Status:** repository implementation substantially complete; stable promotion remains evidence-gated  
**Product target:** first public stable release, not a relabeled preview  
**Canonical Specs:** `.specs/features/product-completeness-v1/` and `.specs/features/stable-1-0-launch/`

## Outcome

Ship a premium, Docker-free VS Code product that helps Protheus developers understand change impact, review risk, preserve project knowledge and carry auditable evidence from local work to CI. Docker is used only by maintainers in internal QA.

## The three workstreams

### 1. Premium product improvements

| Priority | Deliverable | Competitive reason | Stable evidence |
|---|---|---|---|
| P0 | Native Engineering Center | Discoverability and workflow coherence without rebuilding an IDE | clean-profile journey and native UX tests |
| P0 | Review Changed Files | Selective diff review is table stakes; Protheus impact/evidence is the differentiator | Git scope, CodeGraph impact, Problems, JSON/SARIF parity |
| P0 | GitHub Action + stable SARIF | Local-only analysis cannot govern team delivery | same config/rules/fingerprints locally and in CI |
| P0 | Portable tools, skills and official MCP SDK | Reach VS Code agents and other hosts without requiring Hermes | conformance, permission-denial and host matrix |
| P0 | Typed config, SecretStorage, pt-BR/en and legal sample | Fast first value and public-safe onboarding | five-minute walkthrough, secret and localization tests |
| P0 | Complete build supervisor surfaces | Consistent governed prepare/run/status/cancel/evidence | CLI/MCP/VS Code contract parity; no Docker requirement |
| P1 | Conformance corpus and tolerant incremental parser | Higher trust than regex-only graphs while staying honest | per-construct accuracy, unresolved-edge and performance reports |
| P1 | Memory/Journal UX | Durable team context with provenance instead of opaque chat memory | append, promotion, expiry, concurrency and redaction tests |
| P1 | TDN/dictionary onboarding and generic DB port | Protheus-specific knowledge at the point of change | snapshot provenance and named read-only query tests |
| P1 | Compatibility/support lifecycle | Stable means predictable upgrades and supported combinations | published matrix, migrations, deprecation and rollback drill |

Deliberately excluded: custom chat, generic model picker, terminal, Explorer, Git UI, Electron shell, TDS compiler/debugger replacement and mandatory Hermes.

### 2. Internal QA laboratory

| Lane | Purpose | Release role | Decision |
|---|---|---|---|
| Tier 0 fixtures/stubs | fast deterministic success/error/permission coverage | required on every PR | build now |
| Official TOTVS analyzer container | independent static-analysis cross-check | internal release evidence | use by full digest after admission |
| Official TOTVS Postgres development image | SX2/SX3 and read-only adapter validation | internal release evidence | use isolated/ephemeral |
| Official AppServer development image + lawful private artifacts | real compile/RPO/TDS compatibility | stable blocking live gate | owner/environment required |
| `juliansantosinfo/*` | exploratory compatibility only | never a release substitute | quarantine pending legal/security admission |
| `folegini/*`, `endersonmaia/*` | historical reference | none | do not run |

The VSIX, runtime, sample, user documentation and standard CI workflow must pass without a Docker daemon.

### 3. Exit preview and promote stable 1.0

| Stage | Required exit condition |
|---|---|
| Internal 0.4 | complete P0 product journeys and expanded QA, but no public stable claim |
| Internal 0.5 | semantic/memory/knowledge depth plus published accuracy/performance limits |
| 1.0 RC | public API frozen; actual VSIX passes install/upgrade/rollback, UAT, accessibility and live homologation |
| Stable 1.0 | exact public commit passes security/release gates, artifacts are attested and verified, no blocker/high finding, claims approved, owner authorizes publication |

The Marketplace package must be published as a regular release without the pre-release flag and use a distinct version from any uploaded pre-release. The GitHub release should be drafted with all assets, verified and then made immutable.

## Execution order

1. Implement P0 product surface: `PC-010..PC-019` / `SL-100`.
2. In parallel, harden Tier 0 and internal official analyzer/Postgres QA: `SL-200..SL-220`.
3. Implement semantic/knowledge P1: `PC-020..PC-026` / `SL-110`.
4. Freeze public APIs and documentation: `SL-120`, `SL-300`.
5. Prove actual VSIX lifecycle and accessibility/UAT: `SL-310..SL-320`.
6. Run lawful AppServer/TDS/database homologation and representative pilot: `SL-230`, `SL-330`.
7. Harden public supply chain and reproduce artifacts: `SL-340`.
8. Run final promotion ledger and request named authorization: `SL-350`.

## Non-negotiable stable gates

- all automated tests green and mutation at or above the configured 95% threshold;
- exact installed VSIX tested, including upgrade and rollback;
- no Docker prerequisite in the product;
- licensed live AppServer/RPO/TDS/database evidence for every supported live claim;
- keyboard/screen reader/high-contrast/zoom and pt-BR/en evidence;
- clean public CodeQL/dependency/secret/OSV/npm/license review;
- SBOM, SHA-256 manifest, provenance attestation and downloaded-artifact verification;
- support, security, privacy, migration, compatibility and deprecation policies;
- representative user pilot before quantified productivity or leadership claims;
- explicit owner authorization before GitHub visibility, release, Marketplace or announcement.

## What the owner must provide later

Repository work can reach the 1.0 RC without installing Protheus locally. Stable promotion still needs:

1. lawful access to a supported homologation environment or legitimate Portal TOTVS AppServer/RPO/dictionary/include artifacts;
2. approved License Server/DBAccess/test database connectivity for the live window;
3. a legal non-customer smoke project and test RPO;
4. representative Protheus users for UAT and pilot;
5. Marketplace publisher/domain and legal/trademark validation;
6. named authorization for public GitHub and Marketplace actions.

## Current decision

The P0/P1 repository implementation is complete for its declared automated contracts and is undergoing final exact-candidate verification. Stable promotion remains `NO-GO`: the official analyzer lane failed its output contract, and lawful AppServer/RPO/database homologation, lifecycle Linux/remote coverage, assistive/human UAT, representative pilot, public CI/CodeQL/attestations, legal review and named publication authorization remain external gates.
