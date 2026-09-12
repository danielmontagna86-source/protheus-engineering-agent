# Release-owner journey

1. Freeze commit, version, public contract, compatibility, changelog, and approved claims.
2. Verify Windows/Linux and Node 22/24 CI, CodeQL, dependency review, OSV/npm audit, licenses, and secret scan.
3. Reproduce VSIX, source ZIP, SBOM, and manifest; verify SHA-256 and post-download installation.
4. Verify UAT/accessibility, licensed homologation, pilot, support, and rollback evidence.
5. Record named approval. Repository visibility, tag, GitHub Release, Marketplace submission, and announcement remain separate authorized actions.

Outcome: GO only when every gate belongs to the same commit and artifact set; otherwise an explicit NO-GO ledger.
