# Dependency and License Review

**Current candidate assessment:** 2026-11-18 (UTC). Historical evidence is dated separately below.

The candidate keeps the SDK license notices and scans both the application lockfile and the identified MCP composition. In PR #76, GitHub Actions reported zero findings in 239 lockfile entries and eight installed or embedded MCP components. The full npm audit of the candidate also reported zero vulnerabilities. Exact release evidence still belongs to the release commit.

## Distribution boundary

The MCP bundle in the distributed VSIX contains the official MCP server SDK and its runtime dependencies. The source release includes `package-lock.json`, but not `node_modules`; the VSIX allow-list rejects `node_modules` and development sources. The runtime CLI bundle remains based on repository code and Node.js built-ins.

## Direct runtime package

| Package | Pinned version | Declared license | Purpose |
|---|---:|---|---|
| `@modelcontextprotocol/server` | 2.4.0, reconstructed from official source | package metadata: Apache-2.0; upstream LICENSE records retained MIT contributions and CC-BY-4.0 documentation | official MCP server lifecycle, schema validation and stdio transport |

Its resolved runtime dependencies are `@modelcontextprotocol/core` 2.4.0, covered by the upstream transition license, and Zod 4.6.7 under MIT. The VSIX includes `THIRD_PARTY_NOTICES.md`, the Zod MIT license, and the upstream MCP license with full notices for bundled Ajv 8.18.0, ajv-formats 3.0.1, fast-deep-equal 3.1.3 and json-schema-traverse 1.0.0 under MIT and fast-uri 3.1.9 under BSD-3-Clause. The [rebuild record](mcp-sdk-rebuild.md) describes the pinned source, upstream fix and checksums.

## Direct development tools

| Package | Pinned version | Declared license | Purpose |
|---|---:|---|---|
| `@stryker-mutator/core` | 10.0.0 | Apache-2.0 | mutation testing |
| `@vscode/test-electron` | 3.1.0 | MIT | isolated Extension Host testing |
| `buffer-crc32` | 1.0.0 | MIT | ZIP entry integrity verification |
| `esbuild` | 0.28.2 | MIT | self-contained runtime bundles |
| Secretlint core, recommended preset and dotenv rule | 10.2.2 | MIT | fail on errors in package text without logging matched content |
| `yaml` | 2.9.1 | ISC | parse and validate workflow YAML in repository checks |
| `yauzl` | 3.4.0 | MIT | bounded lazy ZIP verification |
| `yazl` | 3.3.1 | MIT | deterministic ZIP normalization |

## Transitive review

The lockfile contains development, runtime and optional platform packages with declared license metadata. Items requiring explicit interpretation were reviewed as follows:

- `jszip` declares `MIT OR GPL-3.0-or-later`; this project uses it under MIT.
- The local VSIX packager uses the existing MIT-licensed ZIP libraries and an explicit inventory. It does not install or run a signing tool.
- `caniuse-lite`, `spdx-exceptions`, Artistic-2.0 and WTFPL packages are transitive tooling/data only and are not shipped in the VSIX.

No mandatory GPL/AGPL runtime dependency was found in the reviewed direct/runtime packages. The release CycloneDX SBOM records the resolved production tree. The separate MCP composition CycloneDX inventories that runtime closure and the dependencies embedded in the verified Ajv provider. The former direct `adm-zip` dependency was removed in September 2026 because no published version simultaneously cleared the two advisory ranges then active. The replacement reader verifies CRC32, enforces entry-count, per-entry and aggregate uncompressed-size bounds, and does not extract paths to the filesystem.

## Isolated lifecycle fixture

The GitHub Actions upgrade and rollback job builds the historical preview `0.2.0-alpha.1` from the pinned commit `1a6836576049c213af49abfb8e7d3350890770ac`. Its historical `npm ci` reported 19 vulnerabilities (six moderate and 13 high) in the reviewed PR run. The preview is used only in the disposable hosted job with temporary extension, user-data and workspace directories. No release or deployment credentials are supplied to that step, and checkout credentials are not persisted. The preview's dependency tree does not enter the candidate VSIX or its audit, and the job does not upload it as a release artifact.

This is an engineering distribution review, not legal advice. A future runtime dependency, Marketplace package, embedded third-party asset, or copied corpus fixture requires a new license decision before release.

## Historical QA update on 2026-10-04

The SDK 2.1 candidate resolves development-only `brace-expansion` 5.0.12 (MIT) and `fast-uri` 3.1.8 (BSD-3-Clause), preserving dependency ranges and every other resolved package. The official registry versions and integrity hashes were verified. These updates address GHSA-q2hr-2g5m-vwhr, GHSA-qhr7-859c-m2p7, GHSA-6j4f-fj2g-mc7p and GHSA-hrr3-gc8f-f4qj. Neither package is added to the distributed MCP runtime bundle.

A fresh online `npm audit --audit-level=moderate` and `npm audit --omit=dev --audit-level=moderate` both reported zero vulnerabilities on this corrected lockfile. This supersedes the separately recorded initial audit failure, without weakening the CI audit policy. Audit and CI evidence must still be assessed for the exact candidate commit before release; the draft PR is not release approval. Detailed local checks and limits are in `.specs/features/mcp-sdk-eof-drain/validation.md`.
