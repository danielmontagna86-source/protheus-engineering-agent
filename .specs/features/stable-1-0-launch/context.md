# Stable 1.0 launch — Context

## Goal

Promote Protheus Engineering Agent from an evidence-rich preview candidate to a stable public product with measurable user value, a legally defensible Protheus test strategy and reproducible release assurance.

## Canonical inputs

- `.specs/features/product-completeness-v1/` — product capabilities and P0/P1/P2 requirements.
- `docs/research/competitive-product-completeness-review-2026-09-08.md` — competitor/product validation.
- `docs/research/docker-test-lab-and-stable-launch-review-2026-09-08.md` — Docker admission and stable-launch research.
- `docs/plans/2026-09-08-product-completeness-0.4-test-plan.md` — expanded 0.4 QA plan.
- current release evidence, publication auditors and repository policy.

## Organizing principle

The program has three independently visible tracks and one final promotion gate:

1. **Premium product:** implement the differentiated workflows users can discover and repeat.
2. **Internal Protheus QA lab:** prove deterministic behavior, official-tool integration and licensed live compatibility without becoming a product dependency or redistributing proprietary assets.
3. **Stable release system:** prove installation, upgrade, security, accessibility, support and exact-artifact reproducibility.
4. **Promotion decision:** only a complete evidence manifest plus named authorization can publish stable `1.0.0`.

## Current evidence

- Runtime, CLI, MCP, CodeGraph, memory/journal primitives, review pipeline, permissions, build contracts and a thin VS Code extension exist.
- The 0.3 candidate previously passed the configured unit/integration suite, installed-VSIX smoke on minimum/current VS Code, TDS coexistence and a 95.17% mutation score.
- The expanded Engineering Center, changed-files product journey, SARIF/Action, parser conformance, live AppServer homologation, accessibility UAT and representative pilot are not complete.
- Publication remains fail-closed and separately authorized.

## Constraints

- VS Code is the primary product surface; Hermes is optional and non-gating.
- TDS remains the official owner of compile/debug/RPO/server workflows.
- No proprietary TOTVS files, customer source, credentials or validation corpus may ship.
- Community Docker images are untrusted dependencies until explicit admission; two reviewed historical projects are rejected outright.
- Official TOTVS Docker images are development fixtures, not production homologation.
- Docker is internal QA infrastructure only; it is absent from the standard installation, first-value journey and supported user contract.
- “Premium”, “stable”, “production-ready”, “leader” and quantified improvement are claims with evidence gates, not roadmap labels.
