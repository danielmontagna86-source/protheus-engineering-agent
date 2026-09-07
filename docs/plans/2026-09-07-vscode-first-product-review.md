# VS Code-first product review implementation plan

## Outcome

Make the public alpha independently useful as a VS Code extension while preserving a reusable runtime and optional integrations.

## Work sequence

1. Specify the standalone install and optional-orchestrator contract.
2. Correct the release evidence schema so Hermes is not mandatory.
3. Correct lexical graph resolution using test-first cases for ADVPL static/global scope.
4. Align CI with GitHub Flow and remove duplicate feature-branch workflow runs.
5. Update product, architecture, roadmap and validation documents from measured evidence.
6. Rebuild and verify the VSIX, run QA/security/mutation gates, review the diff and update the pull request.

## Rollback

All behavior changes remain on the `production-readiness` branch. No visibility, tag, release or Marketplace change is part of this plan. Reverting the final commit restores the prior candidate without affecting `main`.
