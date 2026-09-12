# Design — Premium product leadership

## Architecture decision

The primary distribution is one installable VSIX. Internally, the extension is an adapter over a deterministic, reusable runtime. MCP exposes the same capabilities to compatible agents and CI. External systems remain behind explicit, fail-closed adapters.

```text
VS Code + TDS (existing developer cockpit)
  └─ thin Protheus Engineering Agent extension
      ├─ commands, Problems diagnostics, progress, walkthrough
      └─ bundled runtime API
          ├─ Project Context: Memory + Journal + Rules + Skills snapshot
          ├─ ADVPL/TLPP CodeGraph + deterministic review
          ├─ bug-review pipeline + evidence ledger
          ├─ permission broker + build supervisor
          ├─ MCP stdio server
          └─ versioned adapters
              ├─ TDN snapshot / Dictionary / Oracle read-only / compiler
              ├─ VS Code model tools or other model providers (optional)
              └─ Hermes ACP/MCP compatibility (optional)
```

## Reference-to-product mapping

| Source | Reuse decision | Product implementation |
|---|---|---|
| LionCodeLabs runner chokepoint | Adapt contract | Central runtime dispatch, evidence, cancellation, and permission state. |
| LionCodeLabs memory/journal | Adapt contract | Bounded local `.pea` state with atomic writes and anti-link controls. |
| LionCodeLabs live registries | Adapt contract | Snapshot skills/rules per session with digest and provenance. |
| LionCodeLabs Electron/renderer/explorer/terminal/Git | Reject | Use VS Code native surfaces. |
| Official TOTVS EngPro skills | Integrate as provider | Recognize standard skill roots; record upstream version/license; curate imports. |
| EngPro SDD | Adopt process | `.specs` traceability and per-task verification. |
| EngPro code-review guidance | Adapt deterministic subset | Tested rule catalog with evidence and explicit limitations. |
| Validated ADVPL examples | Optional evidence provider | Local symbol/signature verification; corpus is not redistributed. |
| QA skills | Adopt gates and reports | Risk-based plan, test layers, mutation, security, release readiness, humanized report. |
| Hermes | Optional adapter | Isolated compatibility probe only; never core architecture. |

## Module boundaries

### Extension adapter

- Owns VS Code commands, progress, diagnostics, walkthrough, and trust checks.
- Does not contain Protheus rule logic.
- Parses the runtime's versioned JSON contracts and fails visibly on invalid data.

### Agent resources

- Skill precedence: `.agents/skills` → `.github/skills` → `.pea/skills`.
- Duplicate identity is case-insensitive; first trusted root wins.
- Each skill result includes `name`, `path`, `source`, `sha256`, `content`, and `trust`.
- All parent roots and skill entries are checked against symlink/junction traversal.
- Resource count, individual size, and aggregate size stay bounded.

### Skill supply chain

- Product-owned workflow skills live in `.agents/skills` and are Apache-2.0 with the repository.
- External providers live in `config/skill-providers.json`, outside the local-state `.pea` directory, with URL, license, pinned revision, allowed skills, and update timestamp.
- Imports are deliberate, reviewable commits. There is no network auto-update in P0.
- Upstream EngPro content remains MIT and retains attribution if copied.
- The GPL validated-example corpus remains an optional local evidence provider and is never packaged into the VSIX.

### Deterministic review

- Lexical masking prevents rules from firing inside comments and strings.
- Each rule has ID, severity, category, title, guidance, line, excerpt, and origin/reference.
- The first expanded set targets high-value, syntactically recognizable rules. Taint analysis and semantic rules remain deferred until the parser supports them.
- Findings are not compilation proof and cannot authorize deployment.

### Permissions and integrations

- Capabilities are declared by adapter (`read`, `write`, `execute`, `network`, `database`, `deploy`).
- Environment policy is evaluated before adapter invocation.
- Missing configuration, user denial, timeout, malformed output, or unavailable dependency returns a typed denied/unavailable result.
- Production write/deploy is out of scope until a separate spec and explicit authorization exist.

## Distribution design

- GitHub source remains private until the release-readiness gate and owner authorization.
- VSIX Marketplace version uses valid `major.minor.patch`; preview status is expressed by Marketplace pre-release publication rather than SemVer suffix.
- Release artifacts include source archive, VSIX, CycloneDX SBOM, checksums, exact-commit manifest, and external final evidence.
- Automated workflows build and validate; release/publish steps remain manually dispatched and environment-protected.

## Effectiveness design

The product benchmark uses legal synthetic or explicitly contributed fixtures. Tasks represent maintenance, bug diagnosis, impact analysis, review, and safe build preparation. A crossover design compares the same cohort with and without the product while controlling task order. Primary outcomes are correctness and time-to-verified-change; speed without correctness does not count as gain.

## Alternatives rejected

- Fork LionCodeLabs: carries duplicate IDE surface and unrelated provider/UI complexity.
- Require Hermes: adds adoption friction and makes a niche host the product bottleneck.
- Put all logic in extension commands: prevents CLI/CI/MCP reuse and weakens testability.
- Vendor every available skill: increases prompt/supply-chain surface and obscures product differentiation.
- Lead with generic chat: competes with mature general agents instead of solving Protheus-specific engineering risk.
