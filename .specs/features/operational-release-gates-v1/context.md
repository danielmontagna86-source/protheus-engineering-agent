# Operational release gates v1 — Context

## Confirmed decisions

- Baseline: public `main` at `1e7420796282079bae72b3ddbd872d97586209fe`.
- The product is a downloadable VS Code extension, not a hosted SaaS. Continuous monitoring therefore targets the public release, artifact integrity and supported install path.
- GitHub Actions is the existing public control plane; no paid monitoring vendor or new long-lived credential is required.
- The disposable Docker AppServer/TDS environment is authorized for destructive QA and is not part of the distributed product.
- Stable/Marketplace remains fail-closed while human accessibility, representative pilot and publisher/Marketplace gates are missing.

## Evidence hierarchy

1. Exact source, protected GitHub checks and immutable artifacts.
2. Installed VSIX lifecycle receipts.
3. Direct TDS/AppServer results and preserved RPO hashes from the private laboratory.
4. Versioned runbooks and scheduled probe configuration.
5. Human or Marketplace evidence only when it actually exists.

## Alternatives considered

1. **Managed monitoring vendor:** rejected for P0 because it adds account, secret and cost dependencies without improving the public-release integrity path.
2. **Single GitHub uptime request:** rejected because HTTP 200 alone does not prove that assets are complete or match their checksums.
3. **Scheduled integrity probe with confirmation:** selected. It downloads the public release assets, validates names, bounds and SHA-256, then confirms a first failure before failing the workflow.
4. **Automatic Marketplace withdrawal:** deferred because no Marketplace publication exists and publisher authorization remains external.
