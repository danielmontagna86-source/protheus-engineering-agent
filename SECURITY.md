# Security Policy

## Supported versions

This project is pre-release software. Security fixes are applied to the latest development branch and newest published alpha only.

## Reporting a vulnerability

Do not disclose suspected vulnerabilities, credentials, private Protheus source, logs, or environment details in a public issue.

After the GitHub repository is created, use its **Security > Report a vulnerability** form. Until private vulnerability reporting is enabled, contact the maintainer through a private channel listed on the repository owner's profile and share only the minimum reproduction required.

Please include the affected version, impact, safe reproduction steps, and whether private business data may have been exposed. Receipt and remediation timelines will be documented before the first public alpha.

## Security boundaries

- External integrations are unavailable unless explicitly configured and granted.
- `.pea` contains local project state and must not be committed.
- Skills, Rules, MCP results, source code, and logs are untrusted inputs.
- Never put production credentials in repository files, prompts, fixtures, issues, or CI.

The current threat/coverage matrix is versioned in [docs/security/owasp-coverage.md](docs/security/owasp-coverage.md). A known high or critical dependency vulnerability, workspace-containment regression, credential finding, or untested active AI path blocks release.

## Response targets for a public alpha

- Acknowledge a complete private report within 3 business days.
- Triage severity and affected versions within 7 business days.
- Publish a remediation target after triage; critical findings may require immediately withdrawing the affected release.
- Never request customer source, credentials, database exports, or production logs when a minimal sanitized reproduction is sufficient.
