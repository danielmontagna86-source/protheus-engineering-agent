# Production Readiness Design

**Spec:** `.specs/features/production-readiness/spec.md`
**Status:** Implemented locally; candidate CI pending

## Architecture

The VS Code extension remains a thin process adapter. Build tooling bundles the existing CLI and MCP entry points into the extension, stages only public files, packages a VSIX, normalizes its ZIP metadata, and verifies its allow-list. Release tooling builds a Git source archive, VSIX, CycloneDX SBOM, checksums, and a manifest from one clean commit.

## Trust boundaries

1. The runtime revalidates VS Code paths against the workspace.
2. MCP tool arguments are exact-contract objects; undeclared fields are rejected.
3. MCP stdio requests are limited to 1 MiB and an oversized request does not terminate the session.
4. Project Memory, Journal, Skills, Rules, sources, and integration output remain untrusted data.
5. Hermes receives an isolated workspace-local home and is never probed implicitly.
6. Artifact output is confined to ignored directories with symlink/junction checks.

## Release artifacts

```text
clean reviewed commit
  -> source ZIP
  -> deterministic VSIX
  -> CycloneDX SBOM
  -> SHA256SUMS + release manifest
```

The build also creates a fail-closed final-evidence template in the ignored artifact directory. This prevents the evidence from changing the commit it attests while allowing the release audit to bind a named approval, CI URL, smokes and reviews to the checksummed manifest. GitHub artifact attestation is enabled after public visibility permits the required repository feature. Until then, checksums and the exact commit provide local candidate evidence but do not satisfy the final public-release gate.
