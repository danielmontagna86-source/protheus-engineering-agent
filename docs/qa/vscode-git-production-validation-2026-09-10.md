# VS Code, Git and production validation — 2026-09-10

## Candidate and decision

Validated code commit: `71238051a98458fab48c75321200050fd53e1c3c`.
VSIX SHA-256: `32f61668dadfc7a71e2cf9c9ecb8c1062b17c539800438a6df0a88fbd3477934`.

The executable candidate passes the checks below. Stable production promotion remains NO-GO because the complete release evidence is absent. This report documents a specific candidate; a later documentation commit does not inherit its artifact hashes. The owner has already requested publication; missing publisher access and validation evidence must not be described as missing general permission to continue.

## Installed product

Fresh isolated VSIX installations passed on Windows VS Code 1.95.3 and 1.136.2. Both registered all 19 declared commands and executed seven calls across doctor, indexing, project context, journal append and active-file review. The host verified a warm incremental cache and a real diagnostic in the native Problems panel. These checks execute the installed product; only the test driver runs as a development extension.

The TDS 2.1.2 coexistence run passed activation, command-ID noncollision, multi-root source selection and byte preservation of CP1252/LF. TDS emitted a rejected Copilot-configuration dialog in the test host; core assertions and the host exit status passed. This is an upstream observation, not evidence that every TDS workflow works.

The lifecycle test passed installation of 0.2.0-alpha.1, upgrade to 0.3.0, uninstall, reinstall and rollback in an isolated VS Code 1.136.2 profile. Use the direct invocation below on this host: npm rejected forwarding `--previous-vsix` before the test started; invoking Node ran the test successfully.

```sh
npm run test:vscode:host
npm run test:vscode:minimum
npm run test:vscode:tds
node scripts/run-vscode-lifecycle.mjs --previous-vsix release-artifacts/protheus-engineering-agent-v0.2.0-alpha.1.vsix
```

Registration of 19 commands does not mean all 19 have been exercised end to end. The checks above do not establish screen-reader/visual acceptance, remote-workspace compatibility or live compilation.

## Git and automated project gates

- [CI run 34434042290](https://github.com/danielmontagna86-source/protheus-engineering-agent/actions/runs/34434042290) completed successfully for the code commit above: Windows/Linux with Node 22/24, including full tests, CLI/MCP smoke, large-repository budgets, structural checks and publication-tree audit. The Linux installed Extension Host also passed.
- Mutation: 889 mutants, 837 killed, 8 timed out, 44 survived, no mutation errors; 95.05% against the configured 95% threshold. This measures the configured mutation scope, not whole-product completion.
- [OSV](https://github.com/danielmontagna86-source/protheus-engineering-agent/actions/runs/34434042259) and [verified-secret scanning](https://github.com/danielmontagna86-source/protheus-engineering-agent/actions/runs/34434042258) passed. CodeQL and dependency review were skipped while the repository was private.
- `git diff --check` passed and `git fsck --no-reflogs` exited zero. Git reported unreachable blobs, not missing or corrupt objects; no cleanup was needed. No open GitHub issues were returned, which is not proof that all defects are absent.
- actionlint 1.7.12 passed the repository workflows with exit zero. The Windows binary was downloaded from its official release, checked against the release checksum, and passed `gh attestation verify`. Optional ShellCheck/Pyflakes coverage is not claimed. [Official installation procedure](https://github.com/rhysd/actionlint/blob/main/docs/install.md).
- Release-mode audit in the isolated candidate checkout returned `BLOCKED`, zero source-tree errors and `RELEASE_EVIDENCE_INCOMPLETE`. Packaging integrity and permission to publish do not substitute for the missing acceptance results.

## Remaining production work

| Area | Required next evidence |
|---|---|
| Protheus | Diagnose the recorded community AppServer REST startup failure; obtain a functioning test runtime and prove compile success/error, RPO, includes and cancellation through the product integration. |
| Database/analyzer | Complete live product-driver and analyzer-adapter checks; direct container readiness alone is insufficient. |
| VS Code | Linux lifecycle, declared remote modes, keyboard/screen reader, contrast/zoom, locale and three-user first-value acceptance. |
| Product usefulness | Run the predefined representative pilot before any productivity or leadership claim. |
| GitHub and Marketplace | Verify publisher access and legal/brand records; complete public security runs, branch controls, consumer Action exercise and support drill. |
| Final release | Rebuild the selected final commit; reconcile its receipts, attestations, downloaded artifacts and installation before stable promotion. |

The existing G0–G13 contract remains the acceptance rule. The user-authorized Docker experiment is actual negative runtime evidence; it is not a successful end-to-end product test.
