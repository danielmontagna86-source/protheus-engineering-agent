# Linux VSIX lifecycle — CI evidence

**Commit:** `a1a4f4ab6bdf868c5f8ea5bed65c5101d0bbc769`  
**Workflow:** [CI 34589150205](https://github.com/danielmontagna86-source/protheus-engineering-agent/actions/runs/34589150205)  
**Date:** 2026-09-11

## Result

The GitHub-hosted Ubuntu job passed the actual packaged-extension lifecycle on VS Code `1.95.3` under `xvfb`:

1. checks out the fixed latest supported preview commit `1a6836576049c213af49abfb8e7d3350890770ac`;
2. builds its `0.2.0-alpha.1` VSIX with its own lockfile;
3. installs the preview in an isolated VS Code profile;
4. upgrades to the current `0.3.0` package;
5. uninstalls and reinstalls the current package;
6. rolls back to the preview and verifies the installed version.

The same workflow also passed Node 22/24 on Ubuntu and Windows, the installed VS Code Extension Host journey, dependency audit and the configured mutation gate.

## Scope and limits

This evidence closes the hosted Linux lifecycle repetition requested by `SL-310`. It does not prove remote-extension-host compatibility, accessibility UAT, licensed AppServer/RPO compilation, representative-user effectiveness, public CodeQL/attestations, legal review, or publication authorization. Those gates remain fail-closed.
