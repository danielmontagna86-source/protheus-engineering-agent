# Accessibility review — 2026-09-07

## Scope decision

The extension adds no webview, HTML, custom form, custom tree, terminal, editor or Git UI. Its user interface is the VS Code command palette, notification/progress service, Output channel and native Problems diagnostics. Therefore an axe-core browser scan and responsive/cross-browser matrix are not applicable to this release surface.

## Automated evidence

- every contributed command has a visible title and is discoverable in the command palette;
- active-file review reports progress through the native VS Code API;
- findings use native diagnostics with file, one-based source line, severity, code and source;
- malformed output clears stale diagnostics and produces a visible error;
- missing workspace/editor states produce visible warnings;
- no custom color-only, pointer-only or focus-managed control is introduced;
- the installed-VSIX host suite executes every command on the minimum and current supported VS Code versions.

## Manual acceptance gate

Before Marketplace submission, a human must run the packaged VSIX with the current stable VS Code and Windows screen reader/high-contrast configuration:

1. use keyboard only to open the command palette and run all four commands;
2. verify the warning, progress, Output and Problems announcements with NVDA or Narrator;
3. navigate from a Problem to the correct source line;
4. verify 200% zoom and a high-contrast theme without clipped command titles;
5. capture real product screenshots after the same run.

Status: automated native-surface checks PASS; assistive-technology and visual inspection NOT RUN because this environment cannot observe screen-reader output. This is a Marketplace gate, not silently counted as passed.
