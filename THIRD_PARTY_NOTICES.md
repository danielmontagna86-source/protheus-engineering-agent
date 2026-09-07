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

## Runtime and build dependencies

The alpha runtime uses Node.js standard-library modules only. The VSIX contains generated bundles of this project's own runtime modules and does not redistribute LionCodeLabs, Hermes Agent, React, SQLite bindings, ACP SDK or MCP SDK packages.

Development and release tooling is locked in `package-lock.json`: `@vscode/test-electron` and `@vscode/vsce` (Microsoft, MIT), `esbuild` (MIT), `adm-zip` (MIT), and Stryker Mutator (Apache-2.0). These tools and their transitive dependencies are not included in the VSIX. Their installed license metadata is part of the release dependency review.

The resolved review, including dual-license and VSCE signing-tool treatment, is recorded in [`docs/security/dependency-license-review.md`](docs/security/dependency-license-review.md).

## GitHub Actions

Continuous integration refers to the official `actions/checkout` and `actions/setup-node` actions pinned to reviewed release commit SHAs. Dependabot proposes future updates for review. The actions run in GitHub-hosted CI and are not redistributed in the source package.
