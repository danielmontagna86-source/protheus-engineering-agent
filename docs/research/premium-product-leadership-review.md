# Premium product leadership review

**Research date:** 2026-09-07
**Decision:** Build a specialist engineering layer for Protheus in VS Code; do not build another IDE or require Hermes.

## Executive conclusion

The credible path to a leading Protheus developer product is not “more AI chat.” It is a trustworthy bridge between existing VS Code/TDS work and the parts generic agents cannot safely infer: project memory, ADVPL/TLPP impact evidence, curated EngPro standards, environment permissions, compiler/build evidence, and release-grade QA.

The current repository proves a useful foundation, but it does not yet prove market leadership or developer productivity uplift. Those claims remain blocked until the P1 benchmark and external user pilot exist.

## Evidence classification

- **Observed:** verified in this repository, its tests, the audited LionCode ZIP, or exact GitHub/Marketplace metadata.
- **Externally supported:** stated by a linked primary or official source.
- **Inference:** product conclusion derived from observed and external evidence.
- **Unknown:** requires a benchmark, user study, legal review, or live environment not yet available.

## Starting references preserved

### LionCodeLabs

The audited ZIP remains the architectural starting reference. Its runner chokepoint, bounded memory/journal, live skills/rules/MCP registries, permission broker, bug-review states, and build-supervisor contracts are reusable ideas. Its Electron shell, renderer, explorer, terminal, Git UI, provider catalog, pricing UI, and voice features are intentionally excluded. Exact ZIP provenance, SHA-256, license, dependencies, and the adapt/reject matrix remain in `docs/reference-audit.md`.

### Official TOTVS EngPro skills

The official repository publishes an open Agent Skills catalog for ADVPL/TLPP, including 20 domain skills and 14 general workflow skills. It supports project-level `.agents/skills` and `.github/skills`, uses MIT licensing, and explicitly warns that skills alone do not guarantee code quality; human curation remains necessary. This product therefore integrates EngPro as a versioned standards provider, not as a correctness oracle or an opaque vendored bundle. [Official EngPro repository](https://github.com/totvs/engpro-advpl-tlpp-skills)

### TDS-VSCode

TDS already provides the language/editor and operational surface: syntax and language services, navigation, formatting, compile, debug/run, patches, RPO, and server workflows. Duplicating those capabilities would divide effort and create compatibility risk. The product should consume or coexist with TDS and invest in evidence, policy, impact, and QA. [Official TDS-VSCode repository](https://github.com/totvs/tds-vscode) and [Marketplace listing](https://marketplace.visualstudio.com/items?itemName=totvs.tds-vscode)

## Product and competitor capability matrix

| Capability | Mature general tools | TDS | Current foundation | Selected product direction |
|---|---|---|---|---|
| Chat/model orchestration | Strong | Not the primary purpose | Intentionally absent | Integrate optionally; do not compete head-on |
| Editor/LSP/debug/compile UI | Uses VS Code | Strong Protheus surface | Not reimplemented | Reuse TDS/VS Code |
| Project rules and skills | Copilot/Continue/Cursor/Cline support rules or skills | Limited as agent workflow | `.pea` resources exist | Standard Agent Skills roots + provenance + EngPro provider |
| MCP/tools | Broad and growing | Not the specialist evidence layer | Minimal bounded MCP exists | Keep portable, versioned specialist contracts |
| Codebase/impact understanding | General indexes and repository maps | Language navigation | Lexical CodeGraph P0 | ADVPL/TLPP impact evidence with ambiguity and limits |
| Safe modes/checkpoints | Plan/read-only, approvals, checkpoints vary by tool | Operational confirmations vary | Fail-closed policy/build states exist | Environment permissions + checkpoint/diff evidence |
| Protheus standards | Generic unless instructed | Language/tooling focused | Small deterministic rule set | Tested EngPro subset + curated project skills |
| TDN/dictionary evidence | Generic web/RAG | Some platform integration | Adapter contracts only | Read-only, cited, cached adapters |
| Quality/release evidence | CI/review integrations vary | Not a release-governance product | Strong local gates | Exact-commit VSIX/SBOM/mutation/security/QA evidence |
| Measured ADVPL/TLPP gain | No public domain proof found | Not this product claim | Not measured | Legal benchmark + pilot before claims |

Representative official capability sources: [VS Code AI extensibility](https://code.visualstudio.com/api/extension-guides/ai/ai-extensibility-overview), [VS Code tools](https://code.visualstudio.com/api/extension-guides/ai/tools), [VS Code MCP trust](https://code.visualstudio.com/docs/agent-customization/mcp-servers), [GitHub Copilot code review](https://docs.github.com/en/copilot/concepts/agents/code-review), [Continue agent modes](https://docs.continue.dev/ide-extensions/agent/how-it-works), [Cline checkpoints](https://docs.cline.bot/core-workflows/checkpoints), and [Cursor rules](https://docs.cursor.com/context/rules).

## What creates a defensible difference

1. **Evidence over confident text.** Every source finding, dependency, build result, and external fact has a file/line, digest, adapter provenance, or explicit unavailable state.
2. **Protheus-specific impact.** CodeGraph and bug review connect a suspected routine to callers, ambiguous targets, affected files, standards findings, and validation requirements.
3. **Standards as a supply chain.** EngPro and project skills are discoverable, pinned, licensed, reviewable, size-bounded, and treated as untrusted data until selected.
4. **Safe real-world execution.** Environment policy, approval, timeout, cancellation, logs, and artifact identity precede compiler/database/deploy claims.
5. **Fits the incumbent workflow.** One VSIX, native Problems/progress/diff, TDS coexistence, no second IDE, no required Hermes.
6. **Claims backed by domain measurement.** Speed and quality claims wait for a transparent ADVPL/TLPP benchmark and consenting user pilot.

## Productivity evidence: useful but not transferable as a promise

A controlled GitHub Copilot experiment reported that participants completed a bounded JavaScript HTTP-server task 55.8% faster. This supports the possibility of AI assistance improving some tasks, but it does not validate this product or mature Protheus maintenance. [Study preprint](https://arxiv.org/abs/2302.06590)

METR's randomized study of experienced open-source developers working in familiar, mature repositories found that the tested early-2025 AI tools made participants about 19–20% slower. A later METR update says newer tools likely improved, while also explaining that the follow-up estimate was not reliable enough to quantify. These results are a direct warning against turning generic AI optimism into a product claim. [METR study](https://metr.org/Early_2025_AI_Experienced_OS_Devs_Study-paper.pdf) and [2026 update](https://metr.org/blog/2026-02-24-uplift-update/)

DORA's 2025 research frames AI as an amplifier of the surrounding engineering system rather than a guaranteed performance shortcut. That supports this product's focus on tests, workflow, evidence, and feedback loops. [DORA 2025 report](https://dora.dev/research/2025/dora-report/)

**Inference:** A specialist product can outperform a generic assistant on Protheus risk only if it improves verified outcomes, not merely generation speed. The benchmark must therefore prioritize correctness and rework alongside elapsed time.

## Premium GitHub and Marketplace publication gaps

### Already present or substantially implemented

- Canonical repository metadata, Apache-2.0, notices, governance, contribution, security, support, issue/PR templates, Code Owners, Dependabot, pinned Actions, Windows/Linux Node matrix, OSV scan, mutation test, VSIX package verification, SBOM, checksums, and fail-closed release evidence.
- Thin extension, offline runtime, CLI/MCP boundaries, multi-root-aware review command, minimum/current VS Code host smoke, and independent-project positioning.

### Must close before public alpha

- Native Problems diagnostics and polished first-value walkthrough.
- Valid Marketplace numeric version/pre-release strategy; Marketplace does not accept a SemVer prerelease suffix as the listing version.
- Reviewed PNG icon, screenshots, gallery metadata, pricing/Q&A fields, and accessibility check.
- Standard skill-root support, product-owned skills, and pinned EngPro provider provenance.
- Broader high-confidence deterministic rule coverage and an explicit rule catalog.
- Clean exact-commit audit without locked local mutation residue.
- Candidate PR CI/OSV on the final commit and named maintainer approval.

Official publication and UX requirements: [extension manifest](https://code.visualstudio.com/api/references/extension-manifest), [publishing extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension), [VS Code UX guidelines](https://code.visualstudio.com/api/ux-guidelines/overview), [continuous integration](https://code.visualstudio.com/api/working-with-extensions/continuous-integration), and [extension runtime security](https://code.visualstudio.com/docs/configure/extensions/extension-runtime-security).

### Must close before a stronger v1 claim

- Real TDS coexistence and CP1252/LF UAT.
- Read-only TDN/dictionary integration with fixtures and provenance.
- Supervised build proof in an authorized Protheus environment.
- Product-effectiveness benchmark and external pilot.
- Public repository ruleset, required reviews/checks, signed/reproducible artifacts, attestations, and post-download verification.

GitHub recommends core community files and security controls; protected rules can require pull requests, status checks, resolved conversations, linear history, and code scanning. Artifact attestations add signed build provenance but do not replace the other controls. [Repository best practices](https://docs.github.com/en/repositories/creating-and-managing-repositories/best-practices-for-repositories), [rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets), and [artifact attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations).

## Claim policy

| Claim | Current status | Publication wording |
|---|---|---|
| Works without Hermes or a model | Observed and tested locally | Allowed with exact supported commands/version evidence |
| Produces deterministic line findings | Observed for current limited rules | Allowed with rule-list and parser disclaimer |
| Complements TDS | Architecture inference; coexistence UAT pending | Describe intent, not certified compatibility |
| Improves developer productivity | Unknown | Prohibited until benchmark/pilot |
| Prevents production defects | Unknown | Prohibited; say it adds review evidence and gates |
| Market leader | Unknown and not objectively established | Prohibited as factual claim |
| Official TOTVS product | False | Always state independent community project |

## Go-to-market validation sequence

1. Private alpha: complete P0 gates and clean-profile UAT.
2. Public technical preview: publish honest deterministic capabilities and invite benchmark/pilot participants.
3. Measured beta: publish methodology, raw aggregate results, limitations, TDS compatibility, and real build evidence.
4. v1: only then promote verified differentiators and configure stronger public repository/release controls.

This sequence treats “premium” as proven trust and specialist outcomes, not an unsupported superlative.
