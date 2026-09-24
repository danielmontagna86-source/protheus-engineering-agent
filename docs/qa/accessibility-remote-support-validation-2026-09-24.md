# Accessibility, remote and support validation — 2026-09-24

## Decision

The installed Windows VSIX accessibility profile passed its automated checks.
WSL package placement and Linux runtime remain proven, but operator-facing
activation in the WSL Extension Host is still unproven. Stable and Marketplace
therefore remain `NO-GO`; WSL is not part of the supported Stable matrix yet.

## Installed accessibility profile

`npm run test:vscode:accessibility` built and installed the VSIX in an isolated
VS Code 1.139.0 profile and executed the normal seven-invocation journey. The
receipt reported:

| Check | Result |
|---|---|
| Installed package and 24 public commands | PASS |
| Five command families exercised | PASS |
| Native tree views (no product webview) | PASS |
| `editor.accessibilitySupport=on` | PASS |
| Default High Contrast theme active | PASS |
| `window.zoomLevel=2` | PASS |
| Automated clean-profile first value | PASS in 12.988 seconds |

This is compatibility evidence, not a WCAG certification or a substitute for
an assistive-technology session. The official VS Code guidance treats keyboard
navigation, high contrast, zoom and screen-reader mode as distinct surfaces.
NVDA/JAWS announcement quality, focus order and the three-participant first
value protocol remain external G8 evidence.

## WSL remote attempt

The bounded WSL runner installed the product VSIX 0.3.9 and a test-only probe
directly into the Ubuntu VS Code Server catalog, verified both identifiers, and
opened a `vscode-remote://wsl+Ubuntu/...` workspace after restarting the
dedicated test distribution. The remote agent connected, but no probe receipt
was produced and the product command journey did not execute in that remote
Extension Host.

The local logs identify VS Code 1.139.0, Remote WSL 0.104.3 and repeated
`PendingMigrationError: navigator is now a global in nodejs` frames inside the
Remote WSL resolver. A matching public upstream WSL report exists for Remote
WSL 0.104.3. This is recorded as `BLOCKED-HOST-RUNTIME`, not PASS and not a
product defect attribution. The runner requires
`PEA_WSL_ALLOW_RESTART=1` so it cannot silently restart an ordinary user
distribution.

The already accepted Linux evidence remains bounded to package placement and
execution of the packaged deterministic runtime. Full remote acceptance still
requires activation, command invocation, running-location observation and
reconnect on a supported Remote build.

## Support and rollback tabletop

Scenario: a new Marketplace build either fails activation or corrupts source
encoding. The documented operating response is internally consistent:

1. stop promotion and mark the affected release;
2. withdraw it from Marketplace when publisher access exists;
3. publish the last verified VSIX and checksum;
4. open a public incident without attaching private evidence;
5. reinstall and smoke the prior version in a clean profile;
6. rotate credentials as an additional action if secret exposure is involved.

The existing installed-package lifecycle proves upgrade, uninstall, reinstall
and rollback for preview versions. The tabletop passes at documentation level,
but an actual Marketplace withdrawal remains external because publisher access
and the Stable artifact do not exist yet.

## Primary references

- [VS Code accessibility](https://code.visualstudio.com/docs/configure/accessibility/accessibility)
- [Testing VS Code extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Supporting remote development](https://code.visualstudio.com/api/advanced-topics/remote-extensions)
- [Remote development in WSL](https://code.visualstudio.com/docs/remote/wsl-tutorial)
- [Upstream Remote WSL 0.104.3 navigator report](https://github.com/microsoft/vscode-remote-release/issues/11376)
