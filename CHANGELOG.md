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

### Security

- Release gate for personal paths, secret filenames, license consistency, and repository metadata.
- VSIX content allow-list, root/nested Git metadata regression checks, and untrusted-workspace disablement.
- Exact MCP tool arguments, 1 MiB stdio request cap, extension process timeout, and writable archive permission checks.

### Changed

- CodeGraph line lookup now uses an indexed binary search, preserves exact declaration lines, and meets the 5,000-symbol sub-second budget.

## 0.1.0 - 2026-09-07

### Added

- Executable P0 runtime, CLI, MCP server, thin VS Code extension, CodeGraph, Project Memory, Journal, policy engine, review pipeline, integration ports, and build supervisor.
