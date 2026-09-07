# Project Structure

```text
.agents/                      QA and agent context
.github/                      GitHub automation and templates
.specs/project/               vision, roadmap and persistent state
.specs/codebase/              observed brownfield map
.specs/features/              traceable feature specifications
apps/vscode-extension/        thin VS Code adapter
packages/                     reusable runtime/domain/adapters
plan/                         machine-readable implementation plans
scripts/                      local and CI validation entrypoints
test/                         behavior and integration tests
docs/                         user, architecture and release documentation
```

Runtime project state is stored in `<target-workspace>/.pea/` and is excluded from the product repository.
