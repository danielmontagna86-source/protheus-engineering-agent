# Dependency and License Review

**Assessment date:** 2026-09-07

**Decision:** PASS for the alpha source release and VSIX; review again whenever `package-lock.json` changes.

## Distribution boundary

The runtime and distributed VSIX contain bundled code from this repository and use no third-party runtime package. The npm dependency tree is development/release tooling only. A source release includes `package-lock.json`, but not `node_modules`; the VSIX allow-list rejects `node_modules` and development sources.

## Direct development tools

| Package | Pinned version | Declared license | Purpose |
|---|---:|---|---|
| `@stryker-mutator/core` | 10.0.0 | Apache-2.0 | mutation testing |
| `@vscode/test-electron` | 3.1.0 | MIT | isolated Extension Host testing |
| `@vscode/vsce` | 3.9.2 | MIT | VSIX packaging |
| `adm-zip` | 0.6.0 | MIT | archive verification/normalization |
| `esbuild` | 0.28.2 | MIT | self-contained runtime bundles |

## Transitive review

The lockfile contains 474 non-root package records, including optional platform packages. Declared metadata contains permissive licenses and documentation/data licenses. Items requiring explicit interpretation were reviewed as follows:

- `jszip` declares `MIT OR GPL-3.0-or-later`; this project uses it under MIT.
- `@vscode/vsce-sign` and its platform packages use Microsoft VSCE-SIGN terms. They are development-only, signing scripts are disabled, and they are not included in the VSIX or redistributed as binaries.
- `caniuse-lite`, `spdx-exceptions`, Artistic-2.0 and WTFPL packages are transitive tooling/data only and are not shipped in the VSIX.

No mandatory GPL/AGPL runtime dependency was found. The generated CycloneDX SBOM captures the exact resolved release tree, and `npm audit --audit-level=high` reports zero known vulnerabilities for this candidate.

This is an engineering distribution review, not legal advice. A future runtime dependency, Marketplace package, embedded third-party asset, or copied corpus fixture requires a new license decision before release.
