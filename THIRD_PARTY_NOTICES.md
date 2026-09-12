# Third-party references

This repository is an independent compatibility project. Product and company names identify compatibility targets only and do not imply affiliation or endorsement.

## LionCodeLabs 1.5

- Source supplied as `LionCodeLabs-main.zip`.
- SHA-256: `55FB964DECB169D65FA65689CE2C85BF6DE170DBC8A4DCD75998C047721B6BEE`.
- Repository-level license in the ZIP: MIT, copyright 2026 BrenoLionLab.
- A bundled font directory contains its own `OFL.txt` (SIL Open Font License); the font and all LionCode visual assets are excluded from this product.
- Used only as an architectural reference. No source file was copied.

## Hermes Agent

- Local checkout remote: `https://github.com/NousResearch/hermes-agent.git`.
- Inspected local revision: `56526bc0d36522ab7a87ee0056f70e3847d2f0e6`.
- Repository license: MIT.
- Used only to confirm the supported ACP, MCP, plugin, permission and profile contracts. No Hermes source file was copied or modified.

## TOTVS EngPro AI Agent Skills

- Official source: `https://github.com/totvs/engpro-advpl-tlpp-skills`.
- Reviewed revision: `93e2f81ba71e3e132fa112a99e35162c2176f62b`.
- Repository license: MIT.
- The pinned provider and curated allow-list are recorded in `config/skill-providers.json`.
- Used as an external standards and workflow reference. The full upstream catalog is not redistributed in this product.

## Validated ADVPL examples

- Optional local evidence provider based on the `dan-atilio/AdvPL` corpus.
- Corpus license: GPL-3.0.
- No corpus source file or index is included in this repository or VSIX.

## Runtime and build dependencies

The MCP executable uses the official `@modelcontextprotocol/server` 2.0.0 package and its `@modelcontextprotocol/core` 2.0.0 dependency. Their package metadata declares MIT, while the distributed upstream license file records the MCP project's Apache-2.0 transition, retained MIT contributions, and CC-BY-4.0 documentation boundary. Zod 4.5.4 is MIT, copyright Colin McDonnell. Their code is included only in the generated MCP bundle. The VSIX carries this notice plus the upstream MCP and Zod license texts; it does not redistribute LionCodeLabs, Hermes Agent, React, SQLite bindings or ACP SDK packages.

Development and release tooling is locked in `package-lock.json`: `@vscode/test-electron` and `@vscode/vsce` (Microsoft, MIT), `buffer-crc32`, `esbuild`, `yauzl` and `yazl` (MIT), Stryker Mutator (Apache-2.0), and YAML (ISC). Development-only tools and their transitive dependencies are not included in the VSIX. Their installed license metadata is part of the release dependency review.

The resolved review, including dual-license and VSCE signing-tool treatment, is recorded in [`docs/security/dependency-license-review.md`](docs/security/dependency-license-review.md).

## GitHub Actions

Continuous integration refers to the official `actions/checkout` and `actions/setup-node` actions pinned to reviewed release commit SHAs. Dependabot proposes future updates for review. The actions run in GitHub-hosted CI and are not redistributed in the source package.
