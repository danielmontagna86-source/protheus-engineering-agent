# Product completeness v1 — Design

## Architectural decision

Position the product as a **Protheus Engineering Evidence Layer** with three delivery surfaces over one runtime:

```text
VS Code native UX        Agent hosts                 CI / GitHub
TreeView, SCM, Problems  LM Tools + Agent Skills     Action + SARIF
         \                   |                         /
          \---------------- runtime API --------------/
                              |
        review | CodeGraph | memory/journal | policy | evidence
                              |
       read-only adapters | supervised build | MCP SDK
                              |
              TDS CLI/AppServer | TDN | SX2/SX3 | DB
```

The VS Code extension remains a thin adapter. It does not own a model loop. VS Code-native Language Model Tools and portable MCP tools call the same runtime operations. Deterministic workflows remain available without either surface.

## Product surfaces

### Engineering Center

Use a native View Container with small Tree Views instead of a custom dashboard webview:

- **Workspace:** indexed files, graph freshness, config and encoding.
- **Change Review:** changed-file count, findings by severity, unresolved impact, last evidence.
- **Memory:** current Project Memory, Journal entry count, stale items, promote/review actions.
- **Integrations:** TDS, TDN snapshot, dictionary and configured database capability status; internal Docker QA fixtures do not appear here.
- **Environment:** current profile, allowed actions and pending approvals.

Items deep-link to native editor, Source Control diff, Problems, Output or a virtual read-only evidence document. A webview is allowed later only for graph relationships that cannot be understood through a tree/list.

### Workflow commands

- `PEA: Review Changed Files`
- `PEA: Explain Change Impact`
- `PEA: Open Engineering Evidence`
- `PEA: Add Journal Entry`
- `PEA: Promote Journal Evidence`
- `PEA: Search TDN and Dictionary`
- `PEA: Prepare Supervised Build`
- `PEA: Run Environment Doctor`
- `PEA: Open Sample Workspace`

Commands are role-neutral primitives. Agent skills compose them into developer, reviewer, QA and release workflows.

## Runtime boundaries

### Operation contract

Every operation returns a common envelope:

```json
{
  "schemaVersion": "1",
  "operationId": "...",
  "status": "completed|denied|failed|cancelled|unavailable",
  "evidence": [],
  "diagnostics": [],
  "uncertainties": [],
  "artifacts": [],
  "startedAt": "...",
  "completedAt": "..."
}
```

UI, CLI, MCP and CI render the same envelope. No surface may convert `unavailable` or `unverified` into success.

### MCP migration

- Replace handwritten framing/dispatch with the official TypeScript SDK after dependency and license review.
- Keep stdio as the default local transport.
- Register tools with schemas generated/validated by the SDK.
- Add initialize/list/call/error/size/cancel/progress compatibility tests.
- Pin the supported protocol/SDK range and keep one release of backward compatibility where practical.

### Build integration

Add one `BuildAdapter` interface with implementations:

1. `TdsCliAdapter` — optional compiler/build integration only where the official CLI and valid environment are present.
2. `ProcessFixtureAdapter` — tests and demos, never represented as compiler proof.

Expose the supervisor uniformly through runtime, CLI, MCP and VS Code. An adapter declares capabilities; policy decides whether a requested action is allowed in the selected environment.

## Change review design

1. Resolve one selected Source Control repository.
2. Read staged, unstaged or branch diff through native Git/CLI abstraction.
3. Normalize paths inside the workspace; reject escaping paths and oversize scope.
4. Refresh only changed CodeGraph nodes plus affected dependents.
5. Run deterministic review and adapter evidence.
6. Reconcile findings, impact, validations, build proof and residual risk.
7. Publish native diagnostics and immutable JSON/SARIF evidence.

SARIF findings use a fingerprint derived from rule, normalized path, symbol and normalized evidence—not line number alone.

## Parser strategy

The current lexical parser remains a supported low-confidence fallback. Semantic depth is staged:

1. Define a redistributable conformance corpus and versioned intermediate representation.
2. Build a tolerant tokenizer/parser behind an interface; compare candidate Tree-sitter grammars only after a formal adoption gate.
3. Parse includes, preprocessor branches, classes/methods, namespaces, entry points and SQL regions incrementally.
4. Optionally enrich with stable TDS/LSP or RPO inspection evidence, with explicit provenance.
5. Measure precision/recall per construct; never label unsupported syntax as complete.

Tree-sitter is a technology candidate, not a decided dependency. The official parser list did not establish a maintained ADVPL/TLPP grammar during this review.

## Knowledge and memory design

- `.pea/config.json`: versioned non-secret project configuration with JSON Schema.
- `.pea/memory/*.md`: curated Project Memory items with owner/review/expiry metadata.
- `.pea/journal/*.jsonl`: append-only evidence entries; rotation and size limits apply.
- `.pea/evidence/`: optional local ignored artifacts; CI publishes build artifacts instead.
- `.pea/policies/`: reviewable environment policy packs without secrets.

Credentials live in SecretStorage or CI secret providers. Snapshot adapters store only source metadata, digest and redistributable/indexed content allowed by their source license.

## Distribution model

### 0.4 internal product milestone

- One VSIX with native Engineering Center and offline sample.
- Headless runtime plus first-party GitHub Action.
- MCP stdio server and extension-contributed read-only tools.
- Portable product skills; EngPro stays pinned upstream rather than silently vendored.

### 0.5 internal connected milestone

- Parser conformance and incremental indexing.
- TDN/dictionary import and memory/journal UX.
- Optional TDS CLI adapter plus internal, non-product analyzer/database QA lanes.

### 1.0 governed release

- Live environment, accessibility and representative pilot evidence.
- Compatibility/support lifecycle and legal approval.
- Team policy packs; commercial packaging remains a later business decision.

## Security and privacy

- Tools are capability-scoped and classified read/write/execute/network/database/deploy.
- All risky actions require an environment policy decision and correlation ID.
- Repository skills, MCP results and imported snapshots are untrusted data.
- Evidence redacts configured secrets and rejects output containing detected credential patterns.
- No telemetry by default. Local outcome collection is explicit opt-in with preview/export/delete controls.

## Alternatives rejected

- **Full custom chat/agent:** duplicates rapidly evolving VS Code/competitor surfaces and couples value to a provider.
- **TDS replacement:** duplicates official compile/debug/RPO ownership and raises compatibility/support cost.
- **Hermes-required runtime:** narrows adoption without improving deterministic product value.
- **Immediate full parser rewrite:** high schedule risk without a conformance corpus or real-repository evidence.
- **Webview-first dashboard:** increases accessibility and UI-test cost before native APIs are exhausted.
