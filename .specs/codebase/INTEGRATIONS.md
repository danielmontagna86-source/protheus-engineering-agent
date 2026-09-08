# External Integrations

| Integration | Current contract | Current state | Write capability |
|---|---|---|---|
| Hermes | optional ACP process + MCP per-session descriptor | experimental compatibility check validated in isolated home; not a release gate | none by default |
| TDN | versioned local snapshot adapter + MCP | implemented, unconfigured by default | none |
| Protheus Dictionary | versioned local snapshot adapter + MCP | implemented, unconfigured by default | none |
| Oracle | allowlisted named-query adapter + MCP | implemented contract, no bundled driver/credential | explicit `oracle:read` grant |
| Protheus compiler/build | shell-free injected runner + evidence + durable store | process contract validated; live AppServer external | explicit grant and named approval |
| AI provider | injected structured provider gateway | implemented contract, unavailable by default | explicit `ai:invoke` grant |
| MCP subagents | bounded injected child transport | implemented contract, unavailable by default | exact host tool allowlist |
| VS Code | standalone extension invokes its bundled runtime | installed-VSIX host tests on minimum/current versions | workspace actions delegated |

No integration owns credentials. Future adapters must receive secrets from their host and redact them from outputs/logs.
