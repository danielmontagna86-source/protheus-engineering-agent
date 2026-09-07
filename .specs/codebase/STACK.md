# Tech Stack

**Analyzed on:** 2026-09-07

## Core

- Node.js: `>=22`; tested locally with 22.23.2.
- JavaScript: ESM for runtime packages; CommonJS for VS Code activation.
- VS Code: extension engine `^1.95.0`; local inspection used 1.133.0.
- Protocols: minimal MCP JSON-RPC over stdio; optional ACP compatibility descriptor.
- Storage: bounded Markdown/JSONL files under workspace `.pea/`.
- External npm dependencies: none.

## Build and Packaging

- The runtime has no third-party runtime dependency; development tests and packaging require `npm ci` from the lockfile.
- Syntax/manifests: `node scripts/check.mjs`.
- Tests: Node built-in test runner.
- Distribution target: GitHub source archive plus installable VSIX first; Visual Studio Marketplace after alpha and publisher validation.

## ADVPL/TLPP Surface

- Read-only parser extensions: `.prw`, `.prg`, `.prx`, `.tlpp`, `.ppx`, `.ppp`, `.apw`, `.aph`.
- Decoder: UTF-8 strict with Windows-1252 fallback.
- No AppServer, RPO, compiler or TIR dependency in the current product.
