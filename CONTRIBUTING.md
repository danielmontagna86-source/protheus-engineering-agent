# Contributing

Thank you for helping build a safer, reusable engineering agent for ADVPL/TLPP projects.

## Before opening a change

1. Read the feature specification under `.specs/features` and update it when behavior changes.
2. Add or change a failing test before production code.
3. Keep VS Code thin; domain behavior belongs in the runtime packages.
4. Keep integrations fail-closed and require explicit capabilities.
5. Do not commit customer code, credentials, logs, `.pea`, `.env`, binaries, or machine-specific paths.

## Local gate

Requires Node.js 22 or newer and no package installation.

```sh
npm run validate
```

Before proposing a release, also run:

```sh
npm run publication:release-check
```

The release check remains blocked until the final repository metadata and external release evidence are configured.

## Pull requests

- Keep a pull request focused and link its spec requirement.
- Explain risks, security boundaries, and validation evidence.
- Add tests for success, denial, and malformed-input paths.
- Record any test that could not be run; do not claim unverified runtime behavior.
- Changes to ADVPL/TLPP analysis must preserve source bytes and be tested with synthetic or redistributable fixtures.

By contributing, you agree to follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) and license intentional contributions under Apache-2.0 as described in section 5 of the product license, unless explicitly agreed otherwise in writing.
