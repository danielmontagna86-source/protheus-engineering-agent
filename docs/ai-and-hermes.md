# Provider-neutral AI and optional Hermes

The deterministic product does not require AI. Doctor, CodeGraph, context, review, snapshots and benchmark keep working when no provider is configured.

`createAiGateway` accepts an injected provider instead of embedding a vendor SDK or credential store. Before a request reaches the provider it requires the exact `ai:invoke` capability, keeps project text in a structured `untrusted-project-data` field, redacts common secret-key fields plus detected inline credential assignments, service URIs and Bearer tokens, and applies request, response, timeout and cancellation limits. Only structured output is returned; provider-declared side effects are ignored. Telemetry is disabled in the contract.

The gateway does not claim that prompt injection can be completely solved. Hosts must still restrict tool capabilities, review model output and avoid placing secrets in project context.

Hermes remains an optional ACP/MCP adapter. It receives an isolated workspace-local home and emits the active project profile as `PEA_ENVIRONMENT` in its MCP descriptor. It is neither an AI provider embedded in the product nor a release dependency.

## ChatGPT via Codex App Server (opt-in)

The VS Code extension also offers an optional **Conectar ChatGPT via Codex**
command. It is not an API-key form: it starts the managed browser or device
login published by a local, protocol-compatible Codex App Server. The bridge
proves the `codex-app-server` handshake before using a command; an executable
merely named `codex` is never trusted automatically. This matters on machines
where another product provides a command with that name.

The App Server, not Protheus Engineering Agent, owns the account session. The
extension never reads, accepts, writes or logs ChatGPT tokens, browser cookies,
account IDs, email addresses or authorization URLs. It retains only the opaque
conversation thread ID in VS Code global state. A status can expose just the
authentication mode and a plan label.

After authentication, **Perguntar ao Codex com contexto do projeto** asks for
one question and a second explicit confirmation before sending the bounded,
redacted runtime session. The prompt labels project material as untrusted and
uses the existing `ai:invoke` permission gateway. The initial bridge has a
restricted read-only workspace policy and on-request approvals: it does not
grant build, write, shell, deployment, database or MCP mutation authority to a
model response.

Install and authenticate the official Codex CLI/App Server for the user
account, then run the connection command in a trusted workspace. If the
official CLI is not the `codex` command on `PATH`, set
`PEA_CODEX_APP_SERVER_COMMAND` to its explicit executable before launching VS
Code. The bridge fails closed and leaves all offline workflows available when
the command is absent or does not implement the protocol.

ChatGPT login and API-key billing are separate official choices. Eligibility,
available models, context capacity, rate limits and cost depend on the account
and plan; the product makes no lower-cost or unlimited-use claim. API-key
providers remain optional injected adapters, and login for other vendors is
deferred until each provides a documented, reviewable local-client protocol.

## Conexões multi-provider

**Protheus Agent: Configurar conexões de IA** separa os modelos de conexão em
vez de fingir que todos são iguais:

| Caminho | Como conectar | O que o PEA não faz |
| --- | --- | --- |
| ChatGPT/Codex | Login gerido pelo App Server oficial | Ler tokens, cookies ou conta |
| Claude Code | Login/configuração no cliente Claude Code | Ler credenciais ou executar escrita automática |
| Gemini CLI | Login Google, API ou Vertex no Gemini CLI | Ler cache de login ou habilitar ferramentas mutáveis |
| Cline | Adicionar a prévia MCP do PEA e usar `cline auth` | Ler `.cline`, chave ou autoaprovar tools |
| OpenCode | Adicionar a prévia MCP e conectar no OpenCode | Ler `auth.json` ou iniciar OAuth em nome do usuário |
| OpenRouter | Informar uma chave API, guardada no SecretStorage | Gravar chave em settings, `.pea` ou logs |

O registro é deliberadamente conservador. Cline documenta autoaprovação como
padrão, portanto o PEA não o chama como subprocesso. Gemini e Claude Code só
ganharão runner direto após haver um perfil de ferramentas somente leitura
verificado na versão oficial exata. OpenCode documenta que plugins que usam
Claude Pro/Max são proibidos pela Anthropic; o PEA não os oferece nem os
promove. Cada pergunta continua exigindo confirmação, `ai:invoke`, redaction,
limite e saída estruturada.

O novo controlador de conexões é próprio do PEA e não depende do Hermes. A
compatibilidade ACP antiga continua opcional para quem já a usa, mas não é o
caminho de seleção de provider, fallback ou credenciais do produto.

## APIs diretas governadas

Além dos clientes oficiais e dos hosts MCP, o PEA possui adaptadores HTTP para
OpenRouter, Anthropic API e Gemini API. Cada conexão informa o **modelo**
escolhido explicitamente; o produto não fixa nem promete disponibilidade de um
modelo. O catálogo, quando habilitado pela pessoa usuária, consulta o endpoint
oficial do fornecedor e permanece apenas em cache temporário no processo.

As três integrações usam uma allowlist de HTTPS e cabeçalhos de autenticação em
memória. A chave vem exclusivamente de `SecretStorage`; ela não entra no
manifesto `.pea`, em query string, recibo, saída, log ou artefato. Respostas
são reduzidas a JSON estruturado antes de chegar ao gateway. Cancelamento,
credencial, policy e schema encerram a rota; apenas indisponibilidade de rede,
rate limit ou erro temporário 5xx podem acionar um fallback já aprovado na
rota. O recibo mantém somente hash de entrada/saída, tentativa, modelo, uso e
um código sanitizado.

Uma rota é limitada por bytes de entrada/saída e por teto de custo quando o
adaptador puder fornecer custo verificável. Sem preço verificável, o PEA não
inventa uma estimativa nem afirma que o teto financeiro foi aplicado. As rotas
criadas hoje deixam o teto financeiro como `null`; uma UX de orçamento e preço
antes do envio ainda é trabalho posterior, não uma garantia atual.

As instruções e os endpoints são verificáveis nas documentações oficiais do
[Claude Code](https://code.claude.com/docs/en/cli-usage),
[Gemini CLI](https://geminicli.com/docs/get-started/authentication/),
[Cline](https://docs.cline.bot/cli/cli-reference),
[OpenCode](https://opencode.ai/docs/providers) e
[OpenRouter](https://openrouter.ai/docs/quickstart).
Os contratos HTTP diretos seguem as referências oficiais de
[Anthropic Messages](https://platform.claude.com/docs/en/api/messages) e
[Gemini generateContent](https://ai.google.dev/api/generate-content).

O roteiro que separa teste automatizado de homologação de conta/host está em
[provider-uat.md](provider-uat.md). Enquanto ele não tiver evidências externas
para o commit e VSIX exatos, a integração não é declarada homologada.
