# Changelog

All notable changes are recorded here. The project follows Semantic Versioning after the first public alpha.

## Unreleased

### Added

- Public product specification, governance, publication audit, and cross-platform CI.
- Live bounded Skills and Rules snapshots.
- Isolated Hermes ACP/MCP session descriptors and executable override.
- Engineering context exposed through runtime, CLI, MCP, and VS Code.
- Canonical public product identity, repository metadata, and market positioning.
- Dependency-free release smoke for the critical CLI/MCP path.
- Self-contained VSIX build with bundled runtime and MCP entry points.
- Automated fresh installation of the packaged VSIX and real Extension Host smoke for all four commands on minimum/current VS Code.
- OSV dependency gate, npm/GitHub Actions Dependabot coverage, and OWASP/agent threat mapping.
- Clean-commit source/VSIX/CycloneDX release builder with deterministic VSIX normalization, SHA-256 manifest verification, and an external final-evidence template.
- VS Code-first product specification, effectiveness review, governance, support, issue forms, pull-request template, and CODEOWNERS.
- Native VS Code Problems diagnostics and progress for active-file review.
- Standard `.agents/skills` and `.github/skills` discovery with deterministic precedence and provider provenance.
- Product-owned planning and evidence-review skills plus a pinned official EngPro reference catalog.
- High-confidence deterministic EngPro review rules for restricted calls/assignments, transactions, loops, ISAM, console output, and procedure creation.
- Marketplace walkthrough, independent product icon, citation metadata, and numeric preview version `0.3.0`.

### Security

- Release gate for personal paths, secret filenames, license consistency, and repository metadata.
- VSIX content allow-list, root/nested Git metadata regression checks, and untrusted-workspace disablement.
- Exact MCP tool arguments, 1 MiB stdio request cap, extension process timeout, and writable archive permission checks.

### Changed

- CodeGraph line lookup now uses an indexed binary search, preserves exact declaration lines, and meets the 5,000-symbol sub-second budget.
- The VSIX is now explicitly standalone; Hermes is optional compatibility and no longer a core release gate.
- CodeGraph now prefers same-file static functions, rejects inaccessible cross-file statics, and leaves duplicate global targets ambiguous.
- CI now follows GitHub Flow without duplicating full runs for feature-branch pushes that already have a pull request.
- Marketplace preview status is expressed by the publication flag instead of a SemVer suffix.

## 0.1.0 - 2026-09-07

### Added

- Executable P0 runtime, CLI, MCP server, thin VS Code extension, CodeGraph, Project Memory, Journal, policy engine, review pipeline, integration ports, and build supervisor.
