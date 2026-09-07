# Protheus Engineering Agent for VS Code

Thin VS Code interface for the Protheus Engineering Agent runtime.

The alpha provides four commands: Doctor, Index Workspace, Show Engineering Context, and Review Active ADVPL/TLPP File. Domain analysis runs in the bundled reusable runtime; the extension does not replace VS Code's editor, explorer, terminal, Git, diff, or chat interfaces.

This is an independent community project. It is not affiliated with, sponsored by, or maintained by TOTVS, the Protheus brand, or Hermes Agent.

## Safety defaults

- The extension is disabled for untrusted workspaces.
- Hermes is optional and uses an isolated profile under the workspace.
- External integrations are unavailable until explicitly configured and granted.
- Source, Skills, Rules, logs, and integration results are treated as untrusted project data.

Project source, documentation, limitations, and security reporting are available at https://github.com/danielmontagna86-source/protheus-engineering-agent.

