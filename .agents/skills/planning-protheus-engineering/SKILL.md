---
name: planning-protheus-engineering
description: Use when planning a Protheus Engineering Agent product feature, integration, release, or architectural change that needs traceable requirements and ordered validation.
---

# Planning Protheus Engineering

## Purpose

Turn a product request into an executable Protheus engineering contract without losing the repository's audited origins, safety boundaries, or existing decisions.

## Required context

Read only what the feature needs, in this order:

1. `.specs/project/PROJECT.md`, `ROADMAP.md`, and `STATE.md`.
2. Relevant `.specs/codebase` documents and current code/tests.
3. Existing feature specs that the change extends.
4. `docs/reference-audit.md` when reuse, LionCodeLabs, Hermes, or third-party code is involved.
5. Official sources for any fact that may have changed.

Do not replace observed repository behavior with assumptions or old design prose.

## Planning contract

For a multi-component or public-facing feature, create:

- `context.md`: confirmed user decisions, unresolved choices, and source hierarchy.
- `spec.md`: problem, outcome, prioritized requirement IDs, WHEN/THEN acceptance criteria, non-functional requirements, and non-goals.
- `design.md`: boundaries, data/control flow, reuse decisions, security model, alternatives, and distribution effects.
- `tasks.md`: atomic ordered tasks with status, files, dependencies, reuse source, done condition, tests, and gate.
- `validation.md`: pre-change baseline, requirement traceability, exact QA gates, evidence placeholders, and GO/NO-GO rule.

Keep P0 independently useful. Put external-system and model-dependent capabilities behind later phases unless the user explicitly changes that priority.

## Product invariants

- VS Code is the primary cockpit; do not plan a duplicate IDE, terminal, explorer, Git UI, compiler UI, or debugger.
- Runtime behavior remains reusable outside the extension through stable APIs, CLI, or MCP.
- Hermes and model providers are optional adapters, never prerequisites or silent release gates.
- LionCodeLabs is an audited architectural reference; reuse contracts deliberately and record provenance before copying any code.
- Official EngPro skills guide domain workflows but do not prove correctness. Preserve their provider, license, revision, and human-review requirement.
- No productivity, defect-prevention, or leadership claim is accepted without product-specific evidence.
- Publication, repository visibility, merge, tag, release, Marketplace submission, and production mutation require explicit authorization at the action boundary.

## Traceability check

Before execution, verify:

1. Every requirement maps to at least one task and one validation gate.
2. Every task names exact files or a deliberately bounded discovery step.
3. Each code task starts with a failing behavior test and ends with targeted plus full gates.
4. Deferred work is visible in the roadmap and cannot be mistaken for shipped behavior.
5. Risks distinguish observed defects, plausible risks, and unknowns requiring UAT or external evidence.

If any check fails, correct the plan before editing implementation code.
