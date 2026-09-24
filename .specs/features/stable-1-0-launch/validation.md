# Stable 1.0 launch — Validation

## Requirements traceability

| Requirement group | Tasks | Blocking evidence |
|---|---|---|
| REQ-SL-PROD | SL-100..SL-120 | product-completeness P0/P1 matrix, parity and journey UAT |
| REQ-SL-ENV-001 | SL-200 | offline/zero-network contract suite |
| REQ-SL-ENV-002 | SL-210 | official analyzer digest and positive/negative evidence |
| REQ-SL-ENV-003 | SL-220 | official Postgres isolation/read-only/teardown evidence |
| REQ-SL-ENV-004 | SL-230, SL-330 | authorized AppServer/RPO functional evidence with lawful user-owned inputs |
| REQ-SL-ENV-005..008 | SL-240, SL-310 | admission negative suite, explicit skip semantics and Docker-free installed VSIX |
| REQ-SL-REL-001..004 | SL-300, SL-310 | public contract plus install/upgrade/rollback/compatibility matrix |
| REQ-SL-REL-005..009 | SL-340, SL-350 | exact-commit release manifest, security gates, attestations and authorization |
| REQ-SL-UAT | SL-320, SL-330 | accessibility, clean-profile UAT, support drill and representative pilot |

## Stable 1.0 gate ledger

| Gate | Required proof | Current status |
|---|---|---|
| G0 baseline integrity | lint/type/build/tests, configured mutation >=95%, `git diff --check` | Public `main` merge `3a2c0c6` passed the full local candidate battery in a clean checkout (357 tests, installed VSIX hosts and 95,05% mutation) plus the protected Windows/Linux Node 22/24, Extension Host, secret, OSV and CodeQL matrix. A future Stable artifact still requires its own exact rebuild. |
| G1 premium P0 | PC-010..PC-019 and installed offline journey | Automated implementation and installed journey complete; human timed/accessibility and public Action checks remain |
| G2 semantic P1 | PC-020..PC-026, corpus accuracy and performance | Declared contract/corpus and Windows/Linux CI performance gates passed for 7123805; live-provider evidence remains |
| G3 Tier 0 virtualization | zero-network success/error matrix | PASS for deterministic offline contracts |
| G4 official analyzer | pinned-digest clean/failing/cancel/timeout parity | PARTIAL — 2026-09-09 direct lab rerun proved the image's blank clean-result sentinel and a complete failing diagnostic. The product has no analyzer adapter/parity claim; timeout/cancel adapter evidence remains. |
| G5 official Postgres | loopback/read-only/named-query/teardown evidence | PARTIAL — em 2026-09-24, o adapter provider-neutral do candidato `90b3115` foi injetado no PostgreSQL 16 descartável e passou consulta nomeada real, binds, negações, transação read-only, limites, redação, timeout, cancelamento no servidor, concorrência e rota MCP. O produto não embute driver/credencial. Resta repetir no artefato Stable exato e publicar uma receita de host suportada sem depender da API de cancelamento de baixo nível do `pg` 8.x. |
| G6 authorized AppServer | compile success/error + RPO/TDS/CP1252 evidence | PARTIAL — o histórico manual e os primeiros recibos estão em `docs/qa/live-appserver-tds-homologation-2026-09-13.md`. Em 2026-09-24, o candidato `0.3.9`/`90b3115` e seu VSIX SHA-256 `c3439e3...` passaram no TDS 2.1.4/AppServer 24.3.1.5. A conexão TDS direta comprovou compilação válida e C2090 inválido. A ponte pública preservou `failed` no inválido e, após um teste real com AppServer parado revelar o limite upstream, foi corrigida para retornar `unverified/TDS_COMPILE_SUCCESS_UNPROVEN` em zero erros, nunca falso `completed`. Cancelamento prévio/em voo, timeout e AppServer indisponível passaram; todos os serviços e WebApp HTTP 200 foram restaurados. O responsável atestou a origem Portal TOTVS do RPO; `TOP_NO_LICENSE` é estado comercial, não falha funcional. Restam RPO bloqueado/indisponível e repetição no artefato Stable. A prova não implica certificação ou suporte oficial TOTVS. |
| G7 package lifecycle | actual VSIX install/upgrade/uninstall/rollback on supported matrix | PARTIAL — merge `3a2c0c6` installed its VSIX in isolated VS Code 1.139.0 and 1.95.3 hosts, passed TDS 2.1.4 coexistence with CP1252/LF and multi-root, and passed install/upgrade/uninstall/reinstall/rollback from 0.3.8 to 0.3.9. On 2026-09-24, the exact Preview package and probe were placed in WSL and the remote agent connected, but Remote WSL 0.104.3 emitted `PendingMigrationError` and no command receipt; remote stays unsupported/unproven. Final Stable-artifact repetition also remains. |
| G8 UX/accessibility | pt-BR/en, keyboard, screen reader, contrast, zoom, three-user first value | PARTIAL — automated localization plus installed native-view, high-contrast, zoom, forced accessibility and 24-command keyboard-surface checks passed on VS Code 1.139.0; automated clean-profile first value was 12.988 seconds. NVDA/JAWS announcements, focus UAT and three human sessions remain. |
| G9 security/supply chain | dependency review, secret scan, OSV/npm, CodeQL, SBOM, pinned workflows, attestations | PARTIAL — merge `3a2c0c6` passed public CI, CodeQL 4.38.1, secret scan, OSV 2.6.0 and local npm audit; its local source ZIP, VSIX and SBOM were reproduced and verified. Public attestations and all receipts must be repeated for the future Stable artifact set. |
| G10 compatibility/support | published VS Code/TDS/Node/OS/Protheus matrix, support and deprecation drill | PARTIAL — the public matrix now marks remote modes experimental, and the activation-failure/encoding-corruption incident tabletop passed against the documented withdrawal and rollback procedure. Actual Marketplace withdrawal and external matrix remain. |
| G11 effectiveness/claims | preregistered representative pilot and approved claims table | UNPROVEN |
| G12 exact release | immutable source/VSIX/SBOM/manifest/evidence, hashes and download verification | PARTIAL — `v0.3.9` source ZIP, VSIX, SBOM, manifest and sums were downloaded from GitHub, reconciled by SHA-256 and verified by attestation against commit `29993a8`. This is Preview evidence; a Stable candidate must repeat it with its own commit, final evidence receipt and artifact set. |
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
