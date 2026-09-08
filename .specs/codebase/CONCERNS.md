# Concerns

## Critical

- None open locally. Apache-2.0 and the canonical GitHub target are configured; external release evidence remains a release blocker.

## High

- **C-003 Lexical parser:** regex-based CodeGraph does not cover the complete ADVPL/TLPP grammar.
- **C-004 Trademark perception:** product name can imply vendor affiliation without a prominent independent-project disclaimer.
- **C-005 Unvalidated external systems:** Snapshot/adapter contracts are tested, but live Oracle and real AppServer/RPO acceptance require customer-owned homologation infrastructure and must stay fail-closed until then.
- **C-006 Extension compatibility:** packaged VSIX passed locally on current stable, minimum 1.95.3 and official TDS 2.0.16; exact-candidate CI still remains required.

## Medium

- **C-007 MCP implementation:** minimal protocol implementation now enforces exact arguments and a 1 MiB stdio limit; adopt the official SDK after dependency/license/security review.
- **C-009 Candidate CI:** the workflow passed previously on the repository, but the exact final `0.3.0` commit still requires green PR CI and OSV evidence.
- **C-013 Local mutation residue:** older ignored `.stryker-tmp` sandboxes are locked by unrelated Windows processes. Publication is verified from the exact committed archive; no broad process termination or unsafe cleanup is performed.
- **C-014 Skill precedence reservation:** a higher-priority skill directory claims its case-insensitive name even when its `SKILL.md` is invalid, preventing fallback to a lower-priority copy. This fail-closed behavior avoids silent shadow fallback and is documented as intentional.

## Tooling anomaly

- Installed SDD `references/specify.md` is corrupted locally; this repository's feature spec is the operative source of truth.

## Resolved

- **C-001 Public license missing:** resolved with Apache-2.0.
- **C-002 GitHub target missing:** resolved as `danielmontagna86-source/protheus-engineering-agent`.
- **C-010 Weak mutation resistance:** initial 36.19% score raised to 95.17% across the unchanged policy/review/CodeGraph mutation scope; the breaking gate is now 95%.
- **C-011 Review string/comment false positive:** resolved with lexical code-presence validation for direct metadata access.
- **C-012 CodeGraph quadratic line lookup:** resolved with a line index, exact-line regression, and sub-second large-source budget.
- **C-008 Multi-process state:** resolved with an exclusive workspace-local lock, atomic writes and concurrent-instance regression.
