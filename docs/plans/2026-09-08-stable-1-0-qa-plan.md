# Stable 1.0 QA plan

**Scope:** product behavior, installed extension, internal Protheus lab and exact public release  
**Policy:** fail closed; skipped required checks are not passes

## Quality objectives

- Prove value through complete developer journeys, not command registration alone.
- Prove that local, agent and CI surfaces return equivalent evidence.
- Prove safety under denial, malformed input, unavailable services, cancellation and hostile workspace data.
- Prove the exact installed/released artifact, not only source or development-host execution.
- Keep Docker entirely in internal QA and prove normal operation without it.

## Test suites

### Suite A — deterministic product core

- config/schema/migration and secret rejection;
- changed-file discovery for staged, unstaged, branch, rename, delete, multi-repo and empty diff;
- CodeGraph incremental invalidation and unresolved/confidence behavior;
- review reconciliation and stable JSON/SARIF fingerprints;
- permission broker allow/deny/approval/timeout/audit cases;
- Project Memory/Journal append, promotion, expiry, crash and concurrency;
- TDN/dictionary provenance and poisoning cases;
- named-query allowlist, parameterization, timeout and write denial;
- CP1252/LF, symlink/junction, path escape, size and output limits.

### Suite B — interfaces and parity

- CLI exit codes and JSON envelope;
- official MCP SDK initialize/list/call/error/cancel/progress/size behavior;
- VS Code commands, Tree Views, Problems, diff/evidence navigation and cancellation;
- GitHub Action JSON/SARIF/summary and local parity;
- LM tool/skill discovery where supported, with deterministic fallback when absent.

### Suite C — installed product

- actual VSIX clean install and activation;
- upgrade from the latest supported preview with config/memory migration;
- uninstall/reinstall without corrupting project data;
- documented rollback to the previous supported package;
- minimum/current VS Code on Windows/Linux and declared remote mode;
- multi-root, untrusted workspace and no-Docker host;
- offline five-minute first-value sample.

### Suite D — accessibility and UX

- keyboard-only completion of every P0 workflow;
- logical focus and focus restoration;
- accessible names/roles/status announcements;
- high contrast, dark/light themes and 200% zoom;
- pt-BR/en command, walkthrough, status, error and settings text;
- no notification spam or unnecessary modal/webview;
- three clean-profile usability sessions with recorded time/errors/help.

### Suite E — internal Docker QA

- admission before pull/run; full digest only;
- official analyzer clean and failing fixtures, includes, JSON, timeout, cancel and resource bounds;
- official Postgres loopback, ephemeral credentials, read-only account, named queries, injection/write denial and teardown;
- licensed AppServer compile success/failure, RPO lock, bad include, dependency unavailable, timeout/cancel and redaction;
- Docker absent/pull denied/digest mismatch produces explicit skipped/unavailable evidence;
- community images remain no-run/quarantine and never satisfy the live gate.

### Suite F — AI/effectiveness

- deterministic operation remains correct without a model;
- prompt/tool regression for supported agent hosts;
- grounding/provenance, unsafe-request refusal and permission-boundary tests;
- preregistered human crossover pilot comparing baseline TDS/VS Code with the product;
- no quality/time/rework claim without raw anonymized evidence and limitations.

### Suite G — supply chain and release

- clean locked install, lint/type/build/test and mutation >=95%;
- dependency review, Dependabot, secret scan, npm/OSV and license policy;
- CodeQL on the exact public commit;
- pinned actions and least-privilege workflow permissions;
- source/VSIX/SBOM/evidence manifest with SHA-256;
- artifact provenance attestation and tamper-negative verification;
- download public VSIX, install in a fresh profile, run core workflow and re-check hash;
- immutable release, rollback drill and support/security tabletop.

## Defect policy

| Severity | Stable decision |
|---|---|
| Blocker | NO-GO; data loss, arbitrary execution, secret leak, broken install or false success |
| High | NO-GO; core workflow unavailable, permission bypass, wrong evidence or major accessibility failure |
| Medium | Must be fixed or explicitly excluded from the supported contract with owner approval |
| Low | May defer with documented limitation and issue owner |

## Evidence retention

Each run records commit, dependency lock digest, VSIX hash, environment/version matrix, test command, result, timestamps and redacted raw artifact links. Docker-specific evidence is internal; public release evidence reports only the supported claim and the lawful environment identity needed to reproduce it.

## Release decision

QA signs `GO` only when the gate ledger in `.specs/features/stable-1-0-launch/validation.md` is green for one exact artifact set. The final publication decision remains with the owner.

