# GitHub Action for ADVPL/TLPP review

The root `action.yml` runs the deterministic changed-file reviewer without a model, network request, Docker image, Protheus installation or database. It emits stable JSON and SARIF files. The Action itself requests no token and performs no upload.

Consumers should pin an immutable 40-character commit SHA:

```yaml
permissions:
  contents: read

steps:
  - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
    with:
      fetch-depth: 0
  - id: pea
    uses: danielmontagna86-source/protheus-engineering-agent@<40-character-release-commit>
    with:
      scope: branch
      base-ref: ${{ github.event.pull_request.base.sha }}
      fail-on: major
```

Use `.github/workflows/examples/advpl-review.yml` to retain evidence as a normal workflow artifact. Uploading SARIF to GitHub code scanning is intentionally a separate example because GitHub requires `security-events: write`; see `.github/workflows/examples/advpl-review-sarif.yml`. Do not grant that permission to the analysis-only job unless code-scanning upload is required.

The official GitHub documentation defines `sarif_file` as the input for third-party results and documents the `security-events: write` boundary: <https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file>.

Outputs:

- `json`: stable, redacted change-review evidence;
- `sarif`: SARIF 2.1.0 for GitHub code scanning;
- `assessment`: deterministic assessment;
- `findings`: number of findings.

The Action fails only at or above `fail-on`. Accepted values are `major` (default), `critical`, and `never`. A compiler result is never inferred from this static review.

