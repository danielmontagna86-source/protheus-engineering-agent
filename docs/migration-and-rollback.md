# Upgrade, migration, and rollback

## Upgrade

1. Back up or commit `.pea/config.json`, `memory.md`, `memory.jsonl`, and `journal.jsonl`.
2. Verify the new VSIX SHA-256 against the release manifest.
3. Install the candidate in an isolated VS Code profile first.
4. Run Doctor, index, active-file review, Git-change review, and context read.
5. Confirm configured snapshots still match their recorded digests and licensing metadata.

Schema 0 project configuration is migrated in memory to schema 1; the runtime never overwrites it automatically. Structured Memory and Journal schema 1 records are append-only JSONL. Corrupt records are omitted and reported as anomalies rather than executed or silently repaired.

## Rollback

1. Export/commit `.pea` state.
2. Uninstall the candidate VSIX.
3. Install the previously verified VSIX by exact version and SHA-256.
4. Restore the backed-up `.pea` files only if a newer schema is unsupported.
5. Re-run the offline smoke. Do not reuse an in-flight build request; reconcile its evidence manually.

The product does not auto-downgrade state or retry a build step with unknown outcome.

Exercise the installed path with `node scripts/run-vscode-lifecycle.mjs <previous-verified.vsix> 1.95.3`. Operational triggers, containment, receipt requirements, and Marketplace limitations are documented in [`operations/support-monitoring-rollback.md`](operations/support-monitoring-rollback.md).
