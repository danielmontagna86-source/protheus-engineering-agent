# Release evidence reconciliation v1 — Design

This change updates documentation only. Immutable release facts are copied from
the GitHub Release API into a versioned historical record; policy facts remain
in the Stable ledger. The current `main` security-maintenance commit is named
separately so it cannot be confused with the Preview artifact commit.

No release checker input, runtime behavior, extension manifest, publisher or
Marketplace state changes in this feature.
