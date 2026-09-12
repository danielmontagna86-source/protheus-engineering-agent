# Production Readiness Validation

**Date:** 2026-09-07
**Spec:** `.specs/features/production-readiness/spec.md`
**Overall:** Local implementation in progress; public release remains NO-GO.

## Requirement status

| Requirement | Local result | Remaining external proof |
|---|---|---|
| PROD-001 | PASS | fresh downloaded source audit |
| PROD-002 | PASS, including fresh packaged install | downloaded GitHub Release VSIX reproduction |
| PROD-003 | PASS on VS Code 1.95.3 and 1.133.0 | VS Code 1.95.3 candidate CI |
| PROD-004 | PASS for local tests and npm audit | live OSV and candidate CI |
| PROD-005 | implementation PASS | clean candidate commit artifacts, hashes, and approver |

## Correctness and security findings resolved

- CodeGraph line lookup changed from repeated full-file scans to an indexed binary lookup; the 5,000-symbol regression dropped from about 2.4 seconds to tens of milliseconds.
- Declaration matching no longer consumes preceding blank lines, so symbol line evidence remains exact.
- MCP tool calls reject undeclared fields and empty required strings.
- MCP stdio rejects requests above 1 MiB and continues processing the next request.
- Extension runtime processes have a 120-second upper bound.
- VSIX timestamps and entry order are normalized; two consecutive builds produced the same SHA-256.
- ZIP permissions are normalized to writable `0644`; a real Windows install caught and now prevents read-only archive entries.
- The release set includes a CycloneDX SBOM in addition to source and VSIX artifacts.
- Final GO evidence is generated outside the tracked source tree and bound to the exact checksummed release manifest, avoiding a self-referential commit cycle.

Final counts, hashes, review outcome, and GitHub URLs are recorded after T8 completes.
