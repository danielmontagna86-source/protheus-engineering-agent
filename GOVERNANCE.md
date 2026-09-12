# Governance

Protheus Engineering Agent is an independent community project. The repository owner is the initial maintainer and release approver.

## Decisions

- Behavior changes start with a specification under `.specs/features` and a pull request.
- Maintainers evaluate correctness, security boundaries, compatibility, tests and documented evidence.
- Changes to permissions, external writes, release policy, licenses or trust boundaries require explicit maintainer approval.
- Optional integrations cannot become core prerequisites without a public design decision and migration plan.

## Releases

One named maintainer records the final GO decision after required CI, review, installed-VSIX and artifact checks pass. Tags are immutable; a faulty published version is withdrawn and replaced by a new version rather than rewritten.

Governance will be revised before adding maintainers or granting release permissions.
