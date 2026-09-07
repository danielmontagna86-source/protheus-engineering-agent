# External Integrations

| Integration | Current contract | Current state | Write capability |
|---|---|---|---|
| Hermes | ACP process + MCP per-session descriptor | capability check validated in isolated home | none by default |
| TDN | named adapter port | unavailable | none |
| Protheus Dictionary | named adapter port | unavailable | none |
| Oracle | named adapter port | unavailable | denied |
| Protheus compiler/build | injected build runner + capability gate | synthetic runner only | explicit grant required |
| VS Code | extension commands invoke local CLI | automated contract tested | workspace actions delegated |

No integration owns credentials. Future adapters must receive secrets from their host and redact them from outputs/logs.
