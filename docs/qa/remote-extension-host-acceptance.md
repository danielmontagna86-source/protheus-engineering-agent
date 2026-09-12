# Remote Extension Host — acceptance record

## Purpose and boundary

This record defines the evidence required to accept the workspace extension in
a genuine VS Code Remote Extension Host. It does not replace the package,
local Extension Host, unit, contract, or AppServer acceptance gates.

The extension declares the workspace extension kind. Therefore, acceptance
must prove where the extension runs and that the critical product journeys are
available from a remote workspace, not merely that the source compiles in a
container.

## Candidate under test

- Commit: `51f7907f78bf2fcfec7f3f4edb6fb3daec28705d`
- VSIX SHA-256: `45c175034adb370fd97b459c4be298a91ccf5124cf1d8197401dbf720ac75104`.
- Declared remote modes: WSL, Dev Container, and SSH when a supported host is
  available. The test record must name every mode actually exercised.

## Evidence already obtained

| Check | Result | Evidence |
|---|---|---|
| Hosted VS Code Extension Host journeys | PASS | GitHub Actions CI run `34666226351`, job `VS Code Extension Host`, completed 2026-09-12 for this candidate. |
| Hosted installed-VSIX upgrade and rollback on Linux | PASS | Same CI run, `Exercise installed VSIX upgrade and rollback on Linux`. |
| WSL Remote endpoint deployment | PASS | VS Code Server 1.136.2 installed the exact VSIX in its remote extension directory; its manifest declares `extensionKind: ["workspace"]` and the embedded release commit matches the candidate. |
| WSL packaged runtime contract | PASS | The VS Code Server Node 24.18.1 on Linux/WSL executed `doctor`, `index`, `review`, and `context` against the isolated candidate checkout. The controlled review returned one INFO finding; unavailable TDN and an absent build-approval resolver failed closed. |
| Local Docker runtime | READY | Docker Desktop 29.7.2, Linux engine, and the official JavaScript Node 22 Dev Container image were verified. |
| Local Dev Container workspace mount | BLOCKED-HOST-RUNTIME | Docker Desktop recorded the folder-sharing approval, but a Windows bind mount still stalled before container creation. No product container was created and no user service was changed. The WSL endpoint provides independent remote-host evidence. |

The hosted checks and WSL evidence prove package placement and the deterministic
runtime contract in a genuine remote endpoint. They do **not** prove the final
operator-facing UI observation: `Developer: Show Running Extensions`, command
invocation through the remote VS Code window, and reconnect behavior. Those
items remain required for full EV-005 acceptance.

## Interactive protocol

1. In Docker Desktop, approve access to the candidate workspace directory only
   when its file-sharing prompt identifies that directory.
2. Open the exact commit in one declared remote mode: WSL, Dev Container, or
   SSH. Record the mode, VS Code version, Remote extension version, OS, and
   Docker/remote host version.
3. Install the VSIX built from the same commit **in the remote endpoint**.
   Reload the remote window.
4. Use `Developer: Show Running Extensions` and record that Protheus
   Engineering Agent runs in the Workspace/remote extension host.
5. Run the critical journeys from the remote workspace:
   - analyze an ADVPL/TLPP source selection;
   - generate or query the local CodeGraph;
   - open the review/bug pipeline with a controlled fixture;
   - invoke the local MCP/CLI discovery path;
   - verify environment permission denial and redaction behavior.
6. Disconnect and reconnect the remote window. Confirm the extension activates
   without duplicate state, secrets, or unexpected host-local writes.
7. Attach screenshots or command output that identify the mode and commit,
   the installed VSIX SHA-256, timestamp, tester, journey result, and any
   deviation.

## Pass/fail rules

- **PASS:** all critical journeys complete in the remote workspace extension
  host; the installed artifact and commit match; no P0/P1 defect is open.
- **FAIL:** activation occurs only locally, a critical journey fails, the
  artifact cannot be identified, or sensitive/redacted data reaches the wrong
  host.
- **BLOCKED:** a required remote-host permission, licensed system, or tester
  action is unavailable. A blocked result is not a pass and keeps EV-005
  unproven.

## Current decision

`EV-005 = PARTIAL-WORKSPACE-REMOTE` for this candidate: the exact VSIX was
installed in a WSL Remote Extension Host and its packaged runtime passed the
bounded critical contract. The final UI/reconnect observation remains
`UNPROVEN`. This does not alter the technical P0 result and keeps
Stable/Marketplace at `NO-GO` until the interactive record is completed for the
final release candidate.
