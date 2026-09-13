# Stable 1.0 launch — Validation

## Requirements traceability

| Requirement group | Tasks | Blocking evidence |
|---|---|---|
| REQ-SL-PROD | SL-100..SL-120 | product-completeness P0/P1 matrix, parity and journey UAT |
| REQ-SL-ENV-001 | SL-200 | offline/zero-network contract suite |
| REQ-SL-ENV-002 | SL-210 | official analyzer digest and positive/negative evidence |
| REQ-SL-ENV-003 | SL-220 | official Postgres isolation/read-only/teardown evidence |
| REQ-SL-ENV-004 | SL-230, SL-330 | licensed AppServer/RPO build evidence |
| REQ-SL-ENV-005..008 | SL-240, SL-310 | admission negative suite, explicit skip semantics and Docker-free installed VSIX |
| REQ-SL-REL-001..004 | SL-300, SL-310 | public contract plus install/upgrade/rollback/compatibility matrix |
| REQ-SL-REL-005..009 | SL-340, SL-350 | exact-commit release manifest, security gates, attestations and authorization |
| REQ-SL-UAT | SL-320, SL-330 | accessibility, clean-profile UAT, support drill and representative pilot |

## Stable 1.0 gate ledger

| Gate | Required proof | Current status |
|---|---|---|
| G0 baseline integrity | lint/type/build/tests, configured mutation >=95%, `git diff --check` | Commit `a1a4f4a` passed Windows/Linux Node 22/24 CI, installed VS Code host, mutation and workflow lint on 2026-09-11. Exact release evidence must be rebuilt after later changes. |
| G1 premium P0 | PC-010..PC-019 and installed offline journey | Automated implementation and installed journey complete; human timed/accessibility and public Action checks remain |
| G2 semantic P1 | PC-020..PC-026, corpus accuracy and performance | Declared contract/corpus and Windows/Linux CI performance gates passed for 7123805; live-provider evidence remains |
| G3 Tier 0 virtualization | zero-network success/error matrix | PASS for deterministic offline contracts |
| G4 official analyzer | pinned-digest clean/failing/cancel/timeout parity | PARTIAL — 2026-09-09 direct lab rerun proved the image's blank clean-result sentinel and a complete failing diagnostic. The product has no analyzer adapter/parity claim; timeout/cancel adapter evidence remains. |
| G5 official Postgres | loopback/read-only/named-query/teardown evidence | PARTIAL — 2026-09-09 direct lab rerun passed `pg_isready`, SX2/SX3 reads, write denial and teardown under a non-root/read-only container. A live driver/dialect product gate remains. |
| G6 licensed AppServer | compile success/error + RPO/TDS/CP1252 evidence | PARTIAL — em 2026-09-13, o AppServer de laboratório `Protheus Lab Local` com TDS 2.1.3/P12 compilou uma fixture identificada CP1252/LF com `TOTVS.CH` e acentos, e rejeitou uma fixture de include inexistente com rollback. A primeira tentativa positiva foi invalidada porque o TDS compilou o canal de saída, não a fixture; o registro saneado é `docs/qa/live-appserver-tds-homologation-2026-09-13.md`. A ponte pública `pea.compileWithTds` foi implementada, mas ainda não há homologação live dela no VSIX candidato. Faltam essa evidência, cancelamento/timeout/RPO bloqueado, diagnóstico nativo, DBAccess/dicionário via adapter e evidência vinculada ao commit/artefatos exatos. |
| G7 package lifecycle | actual VSIX install/upgrade/uninstall/rollback on supported matrix | PARTIAL — isolated lifecycle passed locally on Windows 1.136.2 and 1.95.3; commit `a1a4f4a` passed the same packaged preview-to-current lifecycle on GitHub-hosted Linux 1.95.3. Declared remote-mode repetition remains. |
| G8 UX/accessibility | pt-BR/en, keyboard, screen reader, contrast, zoom, three-user first value | PARTIAL — automated localization/host journey passed; assistive and human UAT not run |
| G9 security/supply chain | dependency review, secret scan, OSV/npm, CodeQL, SBOM, pinned workflows, attestations | PARTIAL — local audit/license/pinning/package controls and pinned dependency-review/secret-scan/attestation workflows pass; receipts require GitHub API run/workflow/repository/commit identity; exact public runs remain |
| G10 compatibility/support | published VS Code/TDS/Node/OS/Protheus matrix, support and deprecation drill | PARTIAL — public policy/matrix documented; live support drill and external matrix remain |
| G11 effectiveness/claims | preregistered representative pilot and approved claims table | UNPROVEN |
| G12 exact release | immutable source/VSIX/SBOM/manifest/evidence, hashes and download verification | PARTIAL — source-to-commit reproduction, commit-stamped VSIX rebuilt in an isolated source-archive checkout after clean `npm ci`, full npm-resolved production lock graph reconciliation and a five-subject attestation-verification workflow are enforced; public attestation/download verification not run |
| G13 publication | legal/brand/publisher and named owner authorization | PARTIAL — the responsible owner confirmed the legal/brand review on 2026-09-12 and its scoped record is `docs/governance/legal-trademark-clearance-2026-09-12.md`; publisher access, Marketplace terms and final bound authorization/receipt remain unverified |

Detailed code-candidate evidence: `docs/qa/vscode-git-production-validation-2026-09-10.md`; earlier records remain historical.

## QA battery by layer

### Code and contract

- unit, integration, property/boundary and mutation tests;
- config/schema migration and backward compatibility;
- CLI/MCP/VS Code/GitHub Action parity;
- stable JSON/SARIF fingerprints and malformed-output rejection;
- CP1252/LF byte preservation and path/symlink/multi-root isolation;
- secret redaction, permission denial and audit correlation.

### Environment

- deterministic Tier 0 success and failure injection;
- official analyzer clean/failing/includes/config/time/resource/cancel matrix;
- Postgres readiness, read-only named queries, injection/write denial and teardown;
- AppServer successful and failing compilation, locked RPO, bad includes, unavailable dependencies and cancellation;
- Docker daemon absent, pull denied and digest mismatch must degrade explicitly.
- installed VSIX and normal runtime workflows pass on a machine/profile without Docker.

### Extension product

- Extension Development Host integration tests;
- installed VSIX smoke on minimum/current VS Code;
- Windows and Linux, declared remote mode and multi-root;
- clean install, preview upgrade, uninstall/reinstall and rollback;
- walkthrough, command discovery, native Problems/diff navigation and cancellation;
- keyboard, screen reader, high contrast, zoom and pt-BR/en.

### Release

- clean checkout and locked dependency install;
- public CodeQL, dependency review, secret scan, OSV/npm audit and license policy;
- SBOM, hash manifest, artifact attestation and verification negative tests;
- public download/install/execute/re-verify smoke;
- rollback/support incident tabletop and immutable release check.

## Stable acceptance rule

`1.0.0` is `GO` only when G0 through G13 are green for the same commit and artifact set. “Not applicable” is allowed only when the capability is removed from the supported public contract and all UI/docs/marketing surfaces agree. A missing external gate remains `NO-GO`.

## Community Docker acceptance rule

- `folegini/Protheus_Docker`: permanent no-run reference unless a new maintained, licensed revision is independently re-reviewed.
- `endersonmaia/totvs-protheus-docker`: permanent no-run reference while archived/obsolete.
- `juliansantosinfo/*`: quarantine only; execution needs explicit legal/provenance and security admission and never satisfies G6.
- `feliperaposo/*`: executed once on 2026-09-10 with explicit owner authorization, exact upstream compose topology and isolated teardown. The AppServer failed its REST startup; the result is a negative compatibility record, never G6 proof.
