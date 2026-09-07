# Protheus Engineering Agent for VS Code

Standalone VS Code interface for evidence-backed ADVPL/TLPP engineering. The reusable deterministic runtime is bundled into the VSIX.

The preview provides four commands: Doctor, Index Workspace, Show Engineering Context, and Review Active ADVPL/TLPP File. Review findings appear in the native Problems panel while the complete machine-readable report remains in the Output channel. Domain analysis runs in the bundled reusable runtime; the extension does not replace VS Code's editor, explorer, terminal, Git, diff, or chat interfaces.

Use the built-in **Get Started: Start with evidence-backed Protheus review** walkthrough to validate the workspace, index supported sources, and run the first review.

This is an independent community project. It is not affiliated with, sponsored by, or maintained by TOTVS, the Protheus brand, or Hermes Agent.

## Safety defaults

- The extension is disabled for untrusted workspaces.
- Normal commands require no Hermes, model account, Python, network, Oracle, TDN or AppServer.
- Experimental Hermes compatibility is optional and uses an isolated profile under the workspace.
- External integrations are unavailable until explicitly configured and granted.
- Source, Skills, Rules, logs, and integration results are treated as untrusted project data.

Project source, documentation, limitations, and security reporting are available at https://github.com/danielmontagna86-source/protheus-engineering-agent.
