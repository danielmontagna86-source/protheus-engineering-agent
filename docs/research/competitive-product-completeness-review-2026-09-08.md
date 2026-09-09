# Competitive and product-completeness review — 2026-09-08

## Executive decision

The strongest market position is not “an AI that codes ADVPL”. It is **the evidence and governance layer for Protheus engineering**: a VS Code-native product that explains change impact, applies transparent deterministic checks, grounds agents in project/domain knowledge, supervises external operations and emits the same auditable evidence locally and in CI.

The repository has a credible technical core, but the user-facing product is not complete. Most differentiated contracts exist behind runtime/CLI/MCP boundaries while the extension exposes only doctor, index, context and active-file review. The next release must productize existing capability before adding more autonomous AI.

This review uses first-party documentation, repository/Marketplace snapshots and direct inspection of the current source. Counts are dated adoption/activity proxies, not proof of quality, effectiveness or addressable market.

## Method and scope

- **Repository observation:** manifests, commands, runtime packages, tests, Specs, QA evidence and release gates at the reviewed commit/branch.
- **Direct competitors:** official TDS-VSCode and community AdvPL-VSCode.
- **Adjacent domain references:** official EngPro ADVPL/TLPP skills, EngPro AI Engineering Coach and official TOTVS development containers/pipelines.
- **Horizontal benchmarks:** GitHub Copilot/VS Code agents, Cline, Continue, Cursor and Windsurf.
- **Effectiveness evidence:** DORA, METR and Stack Overflow; used to shape validation, not to borrow marketing claims.
- **Research date:** 2026-09-08. GitHub and Marketplace numbers can change and must be refreshed before publication.

## Current product: observed strengths

1. **A reusable deterministic core.** CodeGraph, review, project context, policy, build supervisor, integrations, subagents, AI gateway, CLI and MCP are separated from the extension.
2. **Offline first value.** The core review path does not require Hermes, a model account, credentials or network access.
3. **Fail-closed external boundaries.** Database/build/subagent operations require explicit contracts and permissions; fixture success is not represented as live production proof.
4. **Evidence discipline.** Release checks bind tests, mutation, supply-chain evidence, artifacts and hashes; claims distinguish verified behavior from external gates.
5. **Correct strategic boundary.** VS Code remains the cockpit; Hermes is optional; TDS remains the owner of compile/debug/RPO/server capabilities.
6. **Public-source hygiene.** Apache-2.0 is selected, LionCodeLabs MIT provenance is recorded, and proprietary/GPL corpora are not bundled.

## Current product: observed gaps

### The experience does not yet match the architecture

The VS Code manifest exposes four commands. There is no native place to see environment readiness, changed-file review, graph impact, memory/journal, integrations, build state or evidence history. Ordinary users cannot discover most runtime capabilities.

### The main review unit is wrong for professional work

Active-file review is useful, but code review happens over a Git change. The product does not yet automatically reconcile staged/unstaged/branch changes, graph impact, validations and build proof into one UI/CI report.

### “Agent” interoperability is present but incomplete

MCP tools exist, but the server uses a minimal custom protocol implementation. The official TypeScript SDK already supplies validated schemas, transports, lifecycle and evolving protocol behavior. VS Code also supports extension-contributed language-model tools and portable Agent Skills. The product should use those native/standard surfaces instead of owning a chat loop.

### CodeGraph fidelity is an explicit ceiling

The parser is lexical/regex based. It is valuable for bounded rules and simple call evidence, but cannot substantiate complete ADVPL/TLPP semantics. There is no versioned conformance corpus, incremental invalidation model or measured support for the full set of preprocessor, class, method, namespace and entry-point constructs.

### Integration contracts are not onboarding

TDN, dictionary, Oracle and build contracts are tested with fixtures, but users still need a guided way to create/validate snapshots, configure a safe environment and understand unavailable capabilities. The build supervisor is not a complete VS Code/CLI/MCP journey.

### Team delivery is not a first-class product surface

There is no distributable GitHub Action and no SARIF output with stable fingerprints. This leaves a gap between good local evidence and the PR/code-scanning surfaces teams already use.

### Market proof is correctly absent—but must be planned

Synthetic results and technical QA do not prove time saved, defect reduction or willingness to adopt. Those outcomes need representative Protheus users and a preregistered pilot.

## Competitive evidence

### Direct Protheus development tools

| Product | Evidence-backed strengths | Boundary/opportunity for this product |
|---|---|---|
| [TOTVS TDS-VSCode](https://github.com/totvs/tds-vscode) | Official extension with language services, syntax/navigation, compile/recompile, debugging, server/RPO/patch/WS operations and documented CP1252 handling. Snapshot: about 165k Marketplace installs; repository active in September 2026. | Do not duplicate. Integrate/coexist and add change impact, evidence, policy, memory and CI governance around it. |
| [AdvPL-VSCode](https://marketplace.visualstudio.com/items?itemName=KillerAll.advpl-vscode) | Established community alternative with compile/debug and RPO-oriented workflows. Snapshot: about 48k Marketplace installs and strong user rating. | Confirms demand for VS Code in the niche; not evidence that another compile/debug extension is needed. |
| [EngPro ADVPL/TLPP Skills](https://github.com/totvs/engpro-advpl-tlpp-skills) | Official open skill catalog for domain workflows. Its own documentation says human curation is required and skills do not guarantee quality. | Use as pinned upstream guidance with provenance; differentiate through deterministic checks, execution policy and evidence. |
| [EngPro AI Engineering Coach](https://github.com/totvs/Engpro-AI-Engineering-Coach) | Local session analytics, anti-pattern catalog, context-health and learning concepts. Repository was archived in July 2026 and was not a Marketplace distribution proof. | Useful adjacent design reference. Prefer outcome evidence and workflow guidance; defer gamification/surveillance. |
| [TOTVS code-analyzer image](https://hub.docker.com/r/totvsengpro/advpl-tlpp-code-analyzer) | Official containerized static analyzer usable locally/CI. | Add an opt-in pinned adapter and preserve exact output as external evidence. |
| [Protheus CI Universo](https://github.com/totvs/protheus-ci-universo) | Official pipeline reference covering analysis, build, TIR, patch and deploy; documents that RPO, dictionary, includes and configuration are private inputs. | Confirms why a public product can test the orchestration but cannot ship a complete real AppServer environment. |

The official [TDS compilation documentation](https://github.com/totvs/tds-vscode/blob/master/docs/compilation.md) also shows that real compilation depends on an authenticated server/environment, includes, exclusive RPO access and sometimes authorization tokens. That makes a fixture-only “compiler success” claim unacceptable.

### Horizontal agent products

| Product | Capabilities users now expect | Lesson for Protheus Engineering Agent |
|---|---|---|
| GitHub Copilot / VS Code Agents | Repository instructions, Agent Skills, custom agents, MCP, extension tools, code review and native editor integration. VS Code distinguishes model-guided instructions from deterministic hooks/tools. | Ship portable skills and native tools; use policy/runtime code—not prompts—to enforce safety. Do not build another chat UI. |
| Cline | File edits, terminal/browser, MCP, per-action approvals, checkpoints, multi-provider choice and cost visibility. Snapshot: ~5.25M Marketplace installs and ~67.7k GitHub stars. | Checkpoints, visible actions and approvals are table stakes for mutation, but generic execution is not our differentiator. |
| Continue | Chat/Plan/Agent modes, tools, MCP, rules and configurable permission modes. Snapshot: ~4.10M Marketplace installs and ~35.8k GitHub stars. | Keep planning/read-only flows distinct from mutation; make tools composable across hosts. |
| Cursor | Agent tools, rules/skills/subagents/hooks/MCP, selective diff review, checkpoints and cloud/background evidence. | Native review and evidence UX matter. Avoid copying cloud-autonomy risk or forcing a new editor. |
| Windsurf / Devin Desktop | The current documentation (redirected from Windsurf) distinguishes versioned Rules/AGENTS.md/Workflows/Skills from local auto-generated Memories and recommends durable team knowledge in versioned rules. | Project knowledge needs lifecycle, provenance, explicit promotion and stale-state handling—not an opaque prompt dump. |

Primary references: [VS Code customization model](https://code.visualstudio.com/docs/agents/concepts/customization), [VS Code Agent Skills](https://code.visualstudio.com/docs/agent-customization/agent-skills), [VS Code Language Model Tools API](https://code.visualstudio.com/api/extension-guides/ai/tools), [Cline repository](https://github.com/cline/cline), [Continue agent documentation](https://docs.continue.dev/ide-extensions/agent/quick-start), [Cursor agent overview](https://cursor.com/docs/agent/overview), [Windsurf memories/rules](https://docs.windsurf.com/windsurf/cascade/memories).

## Market interpretation

### Supported conclusions

- VS Code is already a proven distribution surface for ADVPL/TLPP because TDS and AdvPL-VSCode have material install bases.
- Generic agent interaction is commoditizing around tools, MCP, skills, rules, checkpoints and native diff/review.
- Trust and verification are unresolved user problems. The 2025 Stack Overflow survey reported growing AI use but declining trust and frequent rework from “almost right” output.
- AI does not guarantee delivery improvement. DORA characterizes AI as an amplifier and reports throughput/stability tensions; METR found a 19% slowdown in one randomized study of experienced open-source developers using early-2025 tools on familiar repositories.

### Inferences for this product

- A specialist product should sell **verified change confidence**, not token generation.
- Deterministic analysis, traceable provenance and environment controls can complement any agent, including future ones.
- The winning first experience is a real change review with explainable evidence, not an empty chat box.
- CI parity creates team value and a distribution loop that an IDE-only feature cannot.
- Human pilot evidence must measure review time, escaped findings, first-pass validation and rework; it must be allowed to show no improvement.

### Unproven hypotheses

- Protheus teams will install a second extension alongside TDS for evidence/governance.
- Teams will version Project Memory/Journal and policy packs in Git.
- The proposed workflows reduce time-to-verified-change or defects in real repositories.
- A paid governed-team offering has willingness-to-pay.

## Strategic position

### Category

**Protheus Engineering Evidence Layer**

### Promise

“Entenda a mudança, valide o risco e leve a evidência do VS Code ao CI — sem trocar seu TDS ou depender de um único agente.”

This promise is narrower and more defensible than “AI senior developer for Protheus”. It is compatible with both deterministic-only use and user-selected agent hosts.

### Product tiers as delivery stages

1. **Offline Community:** Engineering Center, changed-files review, CodeGraph, Memory/Journal, deterministic rules, sample and JSON/SARIF.
2. **Connected Engineering:** versioned TDN/dictionary, official analyzer, optional TDS CLI and read-only database adapters.
3. **Governed Teams:** CI policies, approval/evidence ledger, compatibility/support lifecycle and auditable exports.

These are roadmap layers, not current commercial SKUs. Monetization remains a discovery decision.

## Prioritized gap register

| ID | Priority | Gap | Product response | Acceptance signal |
|---|---:|---|---|---|
| GAP-001 | P0 | Four-command extension hides most value | Native Engineering Center and role workflows | user reaches full offline review in ≤5 minutes |
| GAP-002 | P0 | Review is active-file, not change-centered | SCM-aware changed-files/branch review | same normalized scope in UI/CLI/MCP |
| GAP-003 | P0 | No CI-native output | GitHub Action + JSON/SARIF fingerprints | fixture appears once in code scanning |
| GAP-004 | P0 | Custom minimal MCP protocol | Official TypeScript SDK migration | conformance/negative/host tests pass |
| GAP-005 | P0 | “Agent” not native to modern VS Code | Extension LM tools + portable Agent Skills/plugin | read-only tools work with no bespoke chat |
| GAP-006 | P0 | Build capability not a complete journey | unified prepare/run/status/cancel/evidence | VS Code/CLI/MCP contract parity |
| GAP-007 | P0 | No compelling no-Protheus demo | legal sample workspace + walkthrough | fresh install timed UAT |
| GAP-008 | P0 | Configuration lacks product UX | schema, profiles, Doctor statuses, SecretStorage | no secret in config/log/artifact |
| GAP-009 | P1 | Regex/lexical semantic ceiling | corpus, tolerant parser, incremental IR | per-construct precision/recall and honest unknowns |
| GAP-010 | P1 | Memory/Journal has no lifecycle UI | append/link/promote/expiry/diff | Git-reviewable evidence lifecycle |
| GAP-011 | P1 | TDN/dictionary are adapter contracts only | permitted snapshot onboarding/search | offline query with provenance/digest |
| GAP-012 | P1 | Oracle-shaped database architecture | generic named-query port + gated dialects | negative security matrix per dialect |
| GAP-013 | P1 | Small synthetic performance proof | authorized large-workspace budgets | cold/incremental/memory gates |
| GAP-014 | P0/P2 | Portuguese market but incomplete localization/accessibility | pt-BR/en l10n and accessibility UAT | key completeness + manual UAT |
| GAP-015 | P2 | No real AppServer/database proof | customer-owned homologation matrix | exact live evidence, no fixture substitution |
| GAP-016 | P2 | No human outcome evidence | preregistered crossover pilot | publishable result, including null/negative |
| GAP-017 | P2 | Release/legal/support gaps | public CodeQL, artifact reproduction, trademark and lifecycle | exact 1.0 gate green |

## Roadmap recommendation

### 0.4 — Productize the core

Deliver Engineering Center, sample walkthrough, changed-files review, SARIF/GitHub Action, official MCP SDK, VS Code tools/skills, typed configuration, localization and complete build surfaces. This release closes the largest adoption gap without pretending the parser or live integrations are complete.

### 0.5 — Deepen domain evidence

Deliver parser conformance/incremental indexing, Memory/Journal lifecycle, TDN/dictionary onboarding, generic read-only database ports and representative repository performance.

### 1.0 — Prove production use

Require live homologation, accessibility, public supply-chain gates, compatibility/support lifecycle, legal review and a representative outcome pilot. Do not set an arbitrary “95% product complete” score; use the binary requirement/evidence matrix.

## Product validation plan

### Discovery before broad implementation

Interview at least 12 participants across three roles and multiple Protheus contexts. Show the current VSIX and a low-fidelity Engineering Center workflow. Capture current workflow, failure cost, TDS/agent use, security constraints and willingness to install/share config. Do not ask whether the idea is “good”; ask for recent concrete changes and defects.

### Prototype validation

Run five moderated sessions on a legal sample and at least three authorized real repositories. Measure time to first review, comprehension of evidence, false-positive handling, command discovery and abandonment.

### Outcome pilot

Use a preregistered crossover design: participants perform comparable tasks with baseline TDS/VS Code and with the product. Measure time-to-verified-change, findings confirmed by reviewers, first-pass validation, rework and confidence calibration. Report raw anonymized data and limitations.

## Final assessment

- **Technical foundation:** strong candidate with unusually disciplined evidence and safety boundaries.
- **Visible product:** incomplete; advanced value is hidden and key team workflows are absent.
- **Competitive differentiation:** credible if centered on evidence, Protheus context and governed execution; weak if positioned as a generic coding agent.
- **Market leadership claim:** not currently supportable.
- **Best next investment:** finish the 0.4 product surface and CI parity before adding more autonomous generation.

## Sources

### Protheus/TOTVS

- [TOTVS TDS-VSCode repository](https://github.com/totvs/tds-vscode)
- [TDS-VSCode compilation documentation](https://github.com/totvs/tds-vscode/blob/master/docs/compilation.md)
- [TDS-VSCode Marketplace listing](https://marketplace.visualstudio.com/items?itemName=totvs.tds-vscode)
- [AdvPL-VSCode Marketplace listing](https://marketplace.visualstudio.com/items?itemName=KillerAll.advpl-vscode)
- [TOTVS EngPro ADVPL/TLPP Skills](https://github.com/totvs/engpro-advpl-tlpp-skills)
- [TOTVS EngPro AI Engineering Coach](https://github.com/totvs/Engpro-AI-Engineering-Coach)
- [TOTVS ADVPL/TLPP code analyzer container](https://hub.docker.com/r/totvsengpro/advpl-tlpp-code-analyzer)
- [TOTVS Protheus development Docker documentation](https://docker-protheus.engpro.totvs.com.br/)
- [TOTVS Protheus CI Universo](https://github.com/totvs/protheus-ci-universo)

### Agent and platform capabilities

- [VS Code agent customization](https://code.visualstudio.com/docs/agents/concepts/customization)
- [VS Code Agent Skills](https://code.visualstudio.com/docs/agent-customization/agent-skills)
- [VS Code Language Model Tools API](https://code.visualstudio.com/api/extension-guides/ai/tools)
- [VS Code Tree View API](https://code.visualstudio.com/api/extension-guides/tree-view)
- [GitHub Copilot code review skills and MCP](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/request-a-code-review/use-code-review)
- [Official MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP tools specification](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
- [GitHub SARIF upload](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file)
- [Cline](https://github.com/cline/cline)
- [Continue Agent mode](https://docs.continue.dev/ide-extensions/agent/quick-start)
- [Cursor Agent overview](https://cursor.com/docs/agent/overview)
- [Windsurf Memories and Rules](https://docs.windsurf.com/windsurf/cascade/memories)
- [Tree-sitter](https://tree-sitter.github.io/)

### Effectiveness and trust

- [DORA State of AI-assisted Software Development 2025](https://dora.dev/research/2025/dora-report/)
- [DORA: balancing AI tensions](https://dora.dev/insights/balancing-ai-tensions/)
- [METR randomized study of experienced open-source developers](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)
- [Stack Overflow 2025 Developer Survey analysis](https://stackoverflow.blog/2025/12/29/developers-remain-willing-but-reluctant-to-use-ai-the-2025-developer-survey-results-are-here/)
- [GitHub Copilot controlled-task research](https://github.blog/news-insights/research/research-quantifying-github-copilots-impact-on-developer-productivity-and-happiness/)
