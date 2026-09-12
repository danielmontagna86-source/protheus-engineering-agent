# Context — Premium product leadership

**Date:** 2026-09-07
**Scope:** Complex
**Decision owner:** Repository maintainer

## Confirmed product decisions

- The product is public-facing and must be useful beyond the maintainer's own environment.
- `Protheus Engineering Agent` remains the product name and the planned GitHub slug.
- VS Code is the primary interface; the extension stays thin and uses native editor surfaces.
- The reusable runtime is the product core. MCP is the portable boundary.
- Hermes is optional compatibility, not a requirement, engine, release gate, or marketing dependency.
- LionCodeLabs remains the audited architectural starting reference. It is not a codebase to fork blindly.
- The official TOTVS EngPro skills repository is a standards and domain-workflow provider, not proof that generated code is correct.
- Existing local QA and validated-example skills inform the product process. Their entire repositories or corpora are not copied blindly.
- Publication, making the repository public, Marketplace submission, tags, releases, and merges require an explicit final authorization.

## Gray areas resolved by design

| Question | Decision |
|---|---|
| Is the product only a VS Code extension? | One VSIX is the primary distribution, but it bundles a modular runtime usable by CLI, CI, MCP, and future hosts. |
| Does it replace TDS-VSCode? | No. It complements TDS with evidence, impact analysis, policy, QA, memory, and supervised workflows. |
| Are all EngPro skills vendored? | No. Product-owned skills are versioned locally. Third-party catalogs are referenced with provider, license, version/commit, and controlled import policy. |
| Is AI mandatory? | No. Deterministic offline value is P0. Model-assisted capabilities are opt-in and must retain evidence and permission boundaries. |
| Can productivity be advertised immediately? | No. Claims require a representative ADVPL/TLPP benchmark and a documented pilot. |
| What does premium mean? | Fast first value, specialist accuracy, safe operations, native UX, reproducible releases, clear provenance, and measurable developer outcomes. It does not mean visual polish alone. |

## Source hierarchy

1. Current repository code, tests, and `.specs`.
2. Audited `LionCodeLabs-main.zip` record in `docs/reference-audit.md`.
3. Official TOTVS EngPro repository and official TDS/VS Code/GitHub documentation.
4. Independent empirical productivity research.
5. Assumptions explicitly labeled and validated before marketing use.
