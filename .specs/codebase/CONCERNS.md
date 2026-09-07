# Concerns

## Critical

- None open locally. Apache-2.0 and the canonical GitHub target are configured; external release evidence remains a release blocker.

## High

- **C-003 Lexical parser:** regex-based CodeGraph does not cover the complete ADVPL/TLPP grammar.
- **C-004 Trademark perception:** product name can imply vendor affiliation without a prominent independent-project disclaimer.
- **C-005 Unvalidated external systems:** TDN, Dictionary, Oracle and real build remain untested and must stay fail-closed.
- **C-006 Extension manual smoke:** automated adapter tests do not replace an Extension Development Host run.

## Medium

- **C-007 MCP implementation:** minimal protocol implementation should adopt the official SDK after dependency/license/security review.
- **C-008 Multi-process state:** Project Journal serialization is per process; cross-process locking is not implemented.
- **C-009 Public CI:** workflow cannot be considered proven until a draft PR run exists in the actual repository.

## Tooling anomaly

- Installed SDD `references/specify.md` is corrupted locally; this repository's feature spec is the operative source of truth.

## Resolved

- **C-001 Public license missing:** resolved with Apache-2.0.
- **C-002 GitHub target missing:** resolved as `danielmontagna86-source/protheus-engineering-agent`.
- **C-010 Weak mutation resistance:** initial 36.19% score raised to 82.79% with contract and boundary tests.
- **C-011 Review string/comment false positive:** resolved with lexical code-presence validation for direct metadata access.
