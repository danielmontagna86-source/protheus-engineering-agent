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
