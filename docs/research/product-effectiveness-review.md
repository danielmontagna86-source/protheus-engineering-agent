# Product effectiveness review — 2026-09-07

## Conclusion

The strongest public product is a **standalone VS Code extension backed by a reusable deterministic runtime**. Hermes is useful as optional compatibility, but is not needed to deliver the core value and must not be a prerequisite.

This is not a recommendation to put all logic inside the extension. The VSIX is the distribution and interaction surface; the runtime remains modular so the same CodeGraph, review, policy and project-context behavior can run in tests, CI and MCP clients.

## Evidence

### Audience and distribution

- The Visual Studio Marketplace Gallery API reported 165,389 installs for `totvs.tds-vscode` and 47,855 for `KillerAll.advpl-vscode` when queried on 2026-09-07. Marketplace counters are adoption proxies, not counts of active developers.
- The official TDS-VSCode product already supplies ADVPL/TLPP editing, navigation, linting, compilation, debugging, RPO and server workflows. Rebuilding those surfaces would create conflict rather than differentiation.
- The 2025 Stack Overflow Developer Survey, with more than 49,000 responses, kept Visual Studio and VS Code in the leading developer-environment positions. It is broad ecosystem evidence, not an ADVPL-specific market size estimate.

### Hermes

- The public `NousResearch/hermes-agent` repository reported 243,019 stars and 50,024 forks through the GitHub API on 2026-09-07. Those figures show visibility, not verified active use in the ADVPL/TLPP community.
- Hermes supports ACP over stdio and can host MCP-backed specialist tools, so it remains a technically valid optional orchestrator.
- Requiring it would add Python 3.11+, a separate package/runtime, model/provider configuration and an ACP client before the user reaches the product's deterministic features.

### Native VS Code path

- VS Code supports extension-contributed language-model tools for editor-aware capabilities, MCP for portable local or remote tools, chat participants for specialist conversations and model-provider extensions.
- VS Code already supplies workspace trust, tool confirmation and MCP trust boundaries. The product should integrate with these controls rather than introduce a second general-purpose agent shell.

### Exploratory ADVPL/TLPP corpus run

The current lexical indexer was run read-only against the locally installed validation corpus. It traversed 955 candidate files in about six seconds and reported 104 declarations plus 1,155 calls: 23 same-file static targets, 13 unique global targets and 1,119 unresolved calls. It also encountered both UTF-8 and Windows-1252 inputs.

This is a robustness observation, not an accuracy benchmark. The recovered corpus snapshot is unsuitable for precision/recall claims: 733 candidate files contained NUL bytes and inspected samples included truncated or non-ADVPL content. The low declaration yield and high unresolved rate therefore cannot be attributed solely to the parser. The public alpha must state the lexical limitation until a curated, versioned and legally redistributable benchmark exists.

## Product boundary

### Core alpha

- one VSIX installation;
- offline doctor, CodeGraph, project context and deterministic review;
- no model, network, Hermes, Oracle, TDN or AppServer required;
- no code modification or build execution by default.

### P1

- editor-aware VS Code tools backed by the existing runtime;
- optional native chat participant when a compatible user-selected model exists;
- MCP packaging/discovery for reuse outside VS Code;
- evidence benchmark built from redistributable synthetic fixtures and separately measured real-project samples.

### Optional adapters

- Hermes ACP/MCP compatibility;
- TDN, Dictionary, Oracle and compiler connections with explicit capabilities;
- other MCP/ACP-compatible hosts.

## Effectiveness claims allowed now

- The alpha is installable and its four commands have automated Extension Host coverage.
- The runtime handles UTF-8 and Windows-1252 inputs and produces deterministic structured findings.
- The architecture is host-neutral internally and VS Code-first in distribution.

## Claims not yet supported

- parser completeness for ADVPL/TLPP;
- defect-detection recall or precision on representative production repositories;
- developer time saved;
- correctness of live compilation, TDN, Dictionary or Oracle integrations;
- Hermes adoption within the target community.

These claims require a versioned benchmark, representative consenting projects and outcome measurements. GitHub stars, Marketplace installs and a contaminated public corpus are insufficient substitutes.

## Sources

- [VS Code AI extensibility overview](https://code.visualstudio.com/api/extension-guides/ai/ai-extensibility-overview)
- [VS Code language model tools](https://code.visualstudio.com/api/extension-guides/ai/tools)
- [VS Code MCP server trust and management](https://code.visualstudio.com/docs/agent-customization/mcp-servers)
- [VS Code Chat Participant API](https://code.visualstudio.com/api/extension-guides/ai/chat)
- [TOTVS Developer Studio for VSCode in the Marketplace](https://marketplace.visualstudio.com/items?itemName=totvs.tds-vscode)
- [TOTVS TDS-VSCode source and feature surface](https://github.com/totvs/tds-vscode)
- [AdvPL Language Support in the Marketplace](https://marketplace.visualstudio.com/items?itemName=KillerAll.advpl-vscode)
- [Hermes programmatic integration and ACP](https://github.com/nousresearch/hermes-agent/blob/main/website/docs/developer-guide/programmatic-integration.md)
- [Hermes Agent package requirements](https://pypi.org/project/hermes-agent/)
- [2025 Stack Overflow Developer Survey](https://survey.stackoverflow.co/2025/)

Marketplace figures were retrieved from the public Visual Studio Marketplace Gallery API and rounded only in narrative summaries. GitHub figures were retrieved from the public repository API. Both are dated snapshots and must be refreshed before a marketing claim is published.
