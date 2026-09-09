# Support and security lifecycle

- Bugs and feature requests use the repository issue forms; include product/VS Code/Node/TDS versions, operating system, redacted logs, and a minimal legal fixture.
- Security reports follow `SECURITY.md` and must not disclose customer code, credentials, RPOs, dictionaries, or proprietary packages.
- Blocker/high regressions in supported deterministic paths block release. Connected adapters block only their own claim unless the failure affects the offline core or security boundary.
- Deprecations are announced in the changelog for at least one minor release and 90 days when security permits.
- The maintainers publish only evidence-backed support combinations. Unlisted AppServer/TDS/database combinations are unsupported, not assumed compatible.
- A release owner can roll back by withdrawing the Marketplace version, marking the GitHub release, publishing the last verified VSIX/hash, and opening a public incident issue without exposing sensitive evidence.
