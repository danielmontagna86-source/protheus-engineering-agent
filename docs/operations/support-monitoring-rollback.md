# Support, monitoring, and rollback operations

This runbook covers the public GitHub release channel. It does not claim a hosted SaaS service or 24x7 staffing.

## Ownership and intake

The repository maintainer owns triage and release decisions. Bugs go to GitHub Issues, suspected vulnerabilities go through the private process in `SECURITY.md`, and public reports must contain only redacted evidence.

| Severity | Meaning | Best-effort initial response target |
| --- | --- | --- |
| S0 | Active security exposure, compromised artifact, or destructive data-loss path | 1 business day, through the private security channel |
| S1 | Release blocker or broadly unusable supported workflow | 2 business days |
| S2 | Material degradation with a safe workaround | 5 business days |
| S3 | Minor defect, documentation, or enhancement | Backlog review |

These are transparent project targets, not a paid SLA. Security and privacy take precedence over public status updates.

## Public artifact monitor

`.github/workflows/operational-monitor.yml` runs every six hours and on demand with read-only repository permission. `npm run monitor:release` downloads the declared public release assets with bounded time and size, verifies the GitHub API SHA-256 digest, and checks every payload named in `SHA256SUMS`.

A first failure is treated as possibly transient. The workflow waits and requires a second probe; only two consecutive failed attempts create a failed workflow and GitHub notification. A missing asset, malformed checksum set, byte mismatch, timeout, or exceeded size budget fails closed.

When a new release becomes the supported public baseline, update `PEA_MONITOR_RELEASE_TAG` in the same pull request that publishes and verifies its artifacts. Never point the monitor at a tag before that release exists.

## Incident containment

1. Preserve the failed workflow URL, release tag, UTC time, and redacted error.
2. Confirm from another network without bypassing digest verification.
3. For a compromised or inconsistent artifact, mark the GitHub release as affected and stop recommending installation.
4. Open a public incident issue only after removing secrets, customer code, RPOs, dictionaries, and proprietary packages.
5. Run the rollback drill below against the last verified VSIX.
6. Rebuild from an exact clean commit and publish only after normal security and release gates pass.

Actual Marketplace withdrawal requires an active Marketplace publisher account and remains a publisher operation. This repository must not claim that withdrawal was exercised before that channel exists.

## Installed rollback drill

Keep the previous public VSIX outside the source tree and verify its published SHA-256. Then run:

```powershell
node scripts/run-vscode-lifecycle.mjs C:\path\to\previous-verified.vsix 1.95.3
```

The drill installs the previous version, upgrades to the current candidate, uninstalls and reinstalls it, then rolls back to the exact previous VSIX in an isolated VS Code profile. A receipt is valid only when the command exits successfully and identifies different previous/current versions.

Rollback triggers include compromised checksums, activation failure, a supported-path blocker, a security boundary regression, or irrecoverable state incompatibility. Project state remains append-only; restore a backup only when the older version cannot read the newer schema.

## RPO containment

RPO validation is performed only in the private disposable Protheus lab. Start two independent authenticated compiler sessions concurrently. Accept safe server serialization or one explicit lock rejection followed by a successful retry; reject timeouts, ambiguous outcomes, two failures, changed baseline-RPO digest, unhealthy services, or failure of the final clean compile. Receipts must omit tokens, credentials, proprietary RPO bytes, and server identifiers.
