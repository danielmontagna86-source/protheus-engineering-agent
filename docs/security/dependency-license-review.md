# Dependency and License Review

**Assessment date:** 2026-09-09

**Decision:** PASS for the current source and VSIX composition. A fresh online audit on 2026-09-09 reported zero known vulnerabilities after replacing `adm-zip`; the audit must still be repeated for the exact release commit.

## Distribution boundary

The MCP bundle in the distributed VSIX contains the official MCP server SDK and its runtime dependencies. The source release includes `package-lock.json`, but not `node_modules`; the VSIX allow-list rejects `node_modules` and development sources. The runtime CLI bundle remains based on repository code and Node.js built-ins.

## Direct runtime package

| Package | Pinned version | Declared license | Purpose |
|---|---:|---|---|
| `@modelcontextprotocol/server` | 2.0.0 | package metadata: MIT; upstream LICENSE: Apache-2.0 transition with retained MIT contributions and CC-BY-4.0 documentation | official MCP server lifecycle, schema validation and stdio transport |

Its resolved runtime dependencies are `@modelcontextprotocol/core` 2.0.0, covered by the same upstream transition license file, and Zod 4.5.4 under MIT. The VSIX includes `THIRD_PARTY_NOTICES.md`, the upstream MCP license text, and the Zod MIT text next to the bundle.

## Direct development tools

| Package | Pinned version | Declared license | Purpose |
|---|---:|---|---|
| `@stryker-mutator/core` | 10.0.0 | Apache-2.0 | mutation testing |
| `@vscode/test-electron` | 3.1.0 | MIT | isolated Extension Host testing |
| `@vscode/vsce` | 3.9.2 | MIT | VSIX packaging |
| `buffer-crc32` | 1.0.0 | MIT | ZIP entry integrity verification |
| `esbuild` | 0.28.2 | MIT | self-contained runtime bundles |
| `yaml` | 2.9.0 | ISC | parse and validate workflow YAML in repository checks |
| `yauzl` | 3.4.0 | MIT | bounded lazy ZIP verification |
| `yazl` | 3.3.1 | MIT | deterministic ZIP normalization |

## Transitive review

The lockfile contains development, runtime and optional platform packages with declared license metadata. Items requiring explicit interpretation were reviewed as follows:

- `jszip` declares `MIT OR GPL-3.0-or-later`; this project uses it under MIT.
- `@vscode/vsce-sign` and its platform packages use Microsoft VSCE-SIGN terms. They are development-only, signing scripts are disabled, and they are not included in the VSIX or redistributed as binaries.
- `caniuse-lite`, `spdx-exceptions`, Artistic-2.0 and WTFPL packages are transitive tooling/data only and are not shipped in the VSIX.

No mandatory GPL/AGPL runtime dependency was found in the reviewed direct/runtime packages. The generated CycloneDX SBOM captures the exact resolved release tree. The former direct `adm-zip` dependency was removed because no published version simultaneously cleared the two active advisory ranges; the replacement reader verifies CRC32, enforces entry-count, per-entry and aggregate uncompressed-size bounds, and never extracts paths to the filesystem.

This is an engineering distribution review, not legal advice. A future runtime dependency, Marketplace package, embedded third-party asset, or copied corpus fixture requires a new license decision before release.
