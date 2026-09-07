# External Integrations

| Integration | Current contract | Current state | Write capability |
|---|---|---|---|
| Hermes | optional ACP process + MCP per-session descriptor | experimental compatibility check validated in isolated home; not a release gate | none by default |
| TDN | named adapter port | unavailable | none |
| Protheus Dictionary | named adapter port | unavailable | none |
| Oracle | named adapter port | unavailable | denied |
| Protheus compiler/build | injected build runner + capability gate | synthetic runner only | explicit grant required |
| VS Code | standalone extension invokes its bundled runtime | installed-VSIX host tests on minimum/current versions | workspace actions delegated |

No integration owns credentials. Future adapters must receive secrets from their host and redact them from outputs/logs.
