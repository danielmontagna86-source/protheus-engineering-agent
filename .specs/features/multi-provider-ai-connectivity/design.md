# Conectividade multi-provider de IA — Design

## Princípio de produto

O PEA é a camada de evidência Protheus, não um chat genérico nem um gerenciador
de contas. O usuário escolhe o modelo/host; o PEA prepara contexto verificável,
governa o envio e mantém o resultado apenas como aconselhamento.

**Atualização de produto:** a conexão, seleção de modelo, fallback, budgets e
recibos passam a ser domínio nativo do PEA. Hermes não participa deste fluxo.
O detalhamento e a evidência de mercado estão em
`docs/research/native-multi-provider-orchestration-2026-09-12.md`.

```text
VS Code (comando único de IA)
  ├─ Registro de providers: estado sanitizado / modo de conexão
  ├─ SecretStorage: somente referências API do PEA
  └─ gateway governado: consentimento, redaction, limite, schema
                    |
        ┌───────────┼───────────┐
        v           v           v
 App Server      CLI oficial  HTTP API
 Codex           Claude/Gemini OpenRouter
        
 MCP externo: Cline e OpenCode recebem tools PEA sem entregar seus segredos ao PEA
```

## Contratos

`ProviderDescriptor` é dado estático, validado e livre de segredo:

```js
{ id, label, connection: 'managed-login' | 'api-key' | 'external-host',
  execution: 'app-server' | 'cli' | 'http' | 'mcp',
  scope: 'advisory-read-only', documentationUrl, limitations }
```

`ConnectionStatus` contém apenas `id`, `available`, `connected`, `mode` e
uma mensagem segura. Identidade, e-mail, token, URL de autorização, headers,
modelo de cobrança e texto do prompt não são estado de conexão.

O controlador nativo acrescenta quatro registros distintos: `Connection`
(referência de segredo e estado), `ModelRoute` (primary/fallback/egress/budget),
`TaskProfile` (analysis/review/plan sem ferramentas mutáveis) e `Receipt`
(metadados e hashes, nunca conteúdo). Uma rota não pode fazer fallback entre
processadores de dados sem permissão explícita e uma falha de credencial,
consentimento, schema ou política encerra a execução.

`OpenRouterProvider` implementa o `complete` já consumido pelo AI Gateway. A
chave é buscada no instante da requisição no SecretStorage, enviada apenas no
header HTTPS e descartada quando a Promise encerra. O endpoint é fixo por
default e sobrescrita só é aceita para teste se for HTTPS e origin allowlisted.

## Decisões de integração

- **Codex:** mantém a ponte App Server já existente.
- **Claude Code:** o P1 adiciona adaptador de `claude -p` somente com formato
  JSON, `--permission-mode plan`, `--max-turns`, limite de orçamento e sem
  persistência de sessão. A autenticação acontece no próprio Claude Code.
- **Gemini:** a CLI tem login Google/API/Vertex oficial e saída JSON em modo
  headless; o P1 só ativa execução quando a política de ferramentas tiver um
  perfil verificável que proíba mutação. Até lá aparece como conexão oficial
  para host/MCP, não como runner autônomo.
- **Cline:** oferece `--json` e `--auto-approve`; como seu padrão é aprovação
  automática, PEA nunca o invoca em P0. O usuário pode adicionar o MCP PEA no
  Cline e autentica usando `cline auth` no Cline.
- **OpenCode:** pode expor um servidor local com endpoints de provider/OAuth,
  mas a API é evolução rápida. P0 gera orientação/preview MCP; não opera
  `auth.json` e não inicia OAuth. O PEA também documenta a proibição explícita
  de plugins para usar Claude Pro/Max pelo OpenCode.
- **OpenRouter:** API-key-only no P0 via endpoint documentado; a lista de
  modelos é descoberta sob demanda, nunca hard-coded como garantia.
- **APIs diretas:** Gemini e Anthropic entram por adaptadores HTTP específicos
  com SecretStorage, não por extração de logins das CLIs. Cada um tem schema,
  endpoint, modelo e erro próprios.

## Privacidade e permissão

Cada turno coleta a sessão determinística após a pergunta do usuário, solicita
consentimento explícito com o nome do provider e passa somente então pelo
gateway. A resposta é schema-validada. Todas as conexões são desativadas no
perfil `test`, e modelos não recebem ferramentas, shell, banco, build ou escrita.

## Testes e rollout

Testes de contrato usam `fetch` e processo filho falsos — nunca uma conta real.
Os testes de IA incluem secret-redaction, prompt-injection como dado, schema
malformado, timeout/cancelamento e limites. A matriz UAT manual de cada
fornecedor é um gate externo, não é substituída por mock. O VSIX é recompilado
e instalado em hosts mínimo/atual depois da alteração.
