# Governance

Protheus Engineering Agent is an independent community project. The repository owner is the initial maintainer and release approver.

## Decisions

- Behavior changes start with a specification under `.specs/features` and a pull request.
- Maintainers evaluate correctness, security boundaries, compatibility, tests and documented evidence.
- Changes to permissions, external writes, release policy, licenses or trust boundaries require explicit maintainer approval.
- Optional integrations cannot become core prerequisites without a public design decision and migration plan.

## Releases

One named maintainer records the final GO decision after required CI, review, installed-VSIX and artifact checks pass. Tags are immutable; a faulty published version is withdrawn and replaced by a new version rather than rewritten.

## Single-maintainer merge mode

While the repository has only one maintainer with write access, `main` requires a pull request, resolved conversations, administrator enforcement and every configured CI/security check, but does not require a second GitHub approval. The maintainer must still review the complete diff and record the validation evidence in the pull request before merging.

This is a transparent operating exception, not an independent review. Claims or release gates that specifically require independent human review, customer acceptance, legal approval or publisher authorization remain unmet until the relevant external evidence exists. When a second maintainer is added, the required approving-review count on `main` must return to at least one before that person receives merge permission.

Governance will be revised before adding maintainers or granting release permissions.
