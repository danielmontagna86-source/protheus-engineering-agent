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

The MCP executable uses `@modelcontextprotocol/server` 2.4.0 rebuilt locally from upstream tag `v2.4.0` at `951fe5603a7ec0b2dcb6a0b95d92cd86f93ad9e5`, with upstream fix `39ae8e6192cf43273aaaf2de4169dfa9f7216e28`. The resolved core is 2.4.0, and Zod 4.6.7 is MIT, copyright Colin McDonnell. The upstream MCP license records its Apache-2.0 transition, retained MIT contributions, and CC-BY-4.0 documentation boundary. The packaged license file also includes the notices for bundled Ajv 8.18.0 (MIT) and fast-uri 3.1.9 (BSD-3-Clause).

Development and release tooling is locked in `package-lock.json`: `@vscode/test-electron` (Microsoft, MIT), `buffer-crc32`, `esbuild`, `yauzl` and `yazl` (MIT), Stryker Mutator (Apache-2.0), and YAML (ISC). The local VSIX packager uses the project's ZIP writer and an explicit file inventory. It scans the packaged text with the same Secretlint preset and dotenv rule used by VSCE. Development-only tools and their transitive dependencies are excluded from the VSIX.

The dependency license review is recorded in [`docs/security/dependency-license-review.md`](docs/security/dependency-license-review.md).

## GitHub Actions

Continuous integration refers to the official `actions/checkout` and `actions/setup-node` actions pinned to reviewed release commit SHAs. Dependabot proposes future updates for review. The actions run in GitHub-hosted CI and are not redistributed in the source package.
