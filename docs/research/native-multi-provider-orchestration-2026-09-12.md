# Orquestração nativa multi-provider

## Decisão recomendada

Construir no Protheus Engineering Agent (PEA) uma **AI Connection Plane**
própria. Ela deve administrar conectores, modelos, rotas explícitas, fallback,
limites, consentimento e evidência sem depender do Hermes, sem reproduzir IDEs
de terceiros e sem copiar perfis, tokens ou sessões deles.

O produto continuará VS Code-first e MCP-first. A novidade é uma camada de
execução opcional para quem quer usar modelos diretamente, preservando o mesmo
contexto Protheus, redaction, `ai:invoke` e autorização por ambiente.

## O que o mercado mostra

| Padrão observado | Evidência | Decisão PEA |
| --- | --- | --- |
| Configuração separa modelos, regras e ferramentas | [Continue](https://docs.continue.dev/guides/configuring-models-rules-tools) organiza modelos, regras e MCP separadamente | Separar Connection, Model Route, Task Profile e Tool Policy; nenhum campo mistura os quatro. |
| Agentes de plano devem negar escrita e shell | [OpenCode agents](https://opencode.ai/docs/agents) apresenta Plan com escrita e bash controlados; [Claude Code](https://code.claude.com/docs/en/permissions) define Plan Mode sem edição | Perfis `analysis`, `review` e `plan` são read-only por padrão; `build` é um fluxo PEA separado, sempre aprovado. |
| Autoaprovação é um risco de produto, não um default aceitável | [Cline](https://docs.cline.bot/cli/cli-reference) documenta auto-approve como padrão; [OpenCode permissions](https://opencode.ai/docs/permissions) documenta `--auto`; [Gemini policy](https://geminicli.com/docs/reference/policy-engine/) diferencia allow/deny/ask | Nunca invocar host CLI em modo auto/YOLO. Adaptadores externos começam em `observe` e falham fechados sem perfil seguro. |
| Credenciais pertencem ao cliente/fornecedor | [Claude Code](https://code.claude.com/docs/en/team) gerencia seus próprios tipos/armazenamentos de auth; [OpenCode providers](https://opencode.ai/docs/providers) mantém auth próprio | PEA usa `SecretStorage` somente para conexões criadas pelo PEA. Não lê, exporta, migra ou reutiliza auth de ferramentas externas. |
| Fallback aumenta disponibilidade, mas muda custo, modelo e, potencialmente, retenção | [OpenRouter routing](https://openrouter.ai/docs/guides/routing/provider-selection) e [fallbacks](https://openrouter.ai/docs/guides/routing/model-fallbacks) descrevem roteamento entre provider/modelos | Fallback é opt-in por rota, visível antes do envio, limitado a provedores permitidos e anotado no recibo. Nunca é silencioso entre fornecedores. |
| Integração externa deve usar MCP e permissões | [OpenCode MCP](https://opencode.ai/docs/cli/) e [Continue MCP](https://docs.continue.dev/customize/deep-dives/mcp) tratam tools como conexão distinta | Cline/OpenCode recebem as capacidades PEA por exportadores de configuração/validação; não se tornam backend oculto do PEA. |
| APIs diretas precisam de contratos próprios | [Gemini REST](https://ai.google.dev/api) usa `x-goog-api-key`; [OpenRouter](https://openrouter.ai/docs/quickstart) é OpenAI-compatible | Adaptadores HTTP específicos, sem SDK obrigatório, com allowlist de endpoint, parser defensivo e testes de contrato. |

## Arquitetura alvo

```text
                           VS Code
          Central de Conexões / Route Picker / Receipts
                                  |
               explicit consent + PEA environment policy
                                  v
                   AI Connection Plane (novo domínio)
      ┌──────────────┬──────────────┬────────────────────┐
      │ Connections  │ Model routes │ Task/tool profiles │
      │ Secret refs  │ fallback     │ analysis/review    │
      └──────┬───────┴──────┬───────┴────────┬───────────┘
             |              |                |
      Direct HTTP       Official login      External hosts
  OpenRouter/Anthropic/ Gemini/Codex    Cline/OpenCode via MCP
       Gemini API          clients          (user-managed)
             \              |                /
              \------ governed AI Gateway ---/
                      bounded untrusted context
```

### Domínios e contratos

1. **Connection** — `id`, provider, modo (`api-key`, `managed-login`,
   `external-host`), estado sanitizado e referência a segredo. Não contém a
   chave, e-mail, conta, cookie ou URL OAuth.
2. **ModelRoute** — modelo primário, lista ordenada de fallback, fornecedores
   permitidos, limites de gasto/tokens e política de residência/retenção. É
   versão controlada em `.pea/ai-routes.json`, sem segredo.
3. **TaskProfile** — `analysis`, `review`, `plan`, `build-supervised`. Os três
   primeiros não expõem write, shell, deploy, banco ou ferramentas mutáveis.
4. **Adapter** — implementa descoberta, invocação e normalização. Declara
   recursos realmente suportados; não infere suporte por nome de modelo.
5. **Receipt** — registra apenas provider/modelo efetivo, rota, tentativa,
   duração, uso retornado, código sanitizado e hashes do contexto/resultado.
   Conteúdo, chave e prompt ficam fora do recibo.

### Fornecedores e fases

| Fornecedor pedido | P0 funcional | P1 controlado | Nunca fazer |
| --- | --- | --- | --- |
| OpenRouter | API e catálogo remoto sob demanda, chave PEA | seleção de rota e fallback nativo do serviço | fallback sem consentimento / cabeçalho de chave em URL |
| Gemini | API direta com chave PEA, saída JSON | conexão oficial Gemini CLI apenas via adaptador seguro versionado | ler cache Google/CLI ou ativar shell/YOLO |
| Claude / Claude Code | cadastro de login oficial e estado externo | runner Claude Code Plan com permissões testadas ou API Anthropic por chave PEA | converter sessão Claude Code em chave ou bypass permissions |
| Codex / ChatGPT | App Server oficial existente | seleção no roteador apenas após UAT | cookie/token scraping |
| Cline | exportador MCP, conexão `cline auth` externa | runner Plan + `--auto-approve false` somente após UAT | modo act autoaprovado |
| OpenCode | exportador MCP e perfil Plan read-only | server adapter versionado, com endpoint/protocolo fixado | editar `auth.json` / promover Claude Pro/Max em plugin |

Não é correto prometer que todas as seis alternativas terão “login direto”
igual. API, OAuth gerido por um CLI, subscription e host MCP são contratos
diferentes. A interface deve exibir qual se aplica a cada conexão.

## Políticas de fallback

Uma rota só pode tentar fallback quando o usuário a criou e confirmou os
fornecedores permitidos. Falhas elegíveis: timeout, indisponibilidade transitória
e rate limit. Falhas que interrompem: credencial inválida, política/ambiente
negado, entrada inválida, limite de custo, consentimento negado e erro de schema.

Uma rota pode usar o fallback interno de OpenRouter, mas deve declarar `models`
e preferências de provider, retenção/privacidade e teto de custo. A resposta
deve trazer o modelo efetivo. Fallback entre APIs diretas Anthropic/Gemini/
OpenRouter será desligado por padrão porque altera o processador de dados.

## Segurança e operação

- Cada provider endpoint recebe allowlist rígida, HTTPS, timeout e limites
  próprios. Não há URLs livres em settings de workspace.
- A chave fica no SecretStorage e só é buscada na chamada; scanners verificam
  source, logs, VSIX, SBOM, receipt e `.pea`.
- O contexto é tratado como não confiável e não pode criar rota, ampliar
  toolset, modificar policy ou solicitar credenciais.
- Um modelo pode sugerir patch, mas somente fluxos PEA governados o aplicam.
- Login oficial inicia no cliente oficial e devolve estado sanitizado. Não há
  formulário de usuário/senha do PEA.
- Descoberta de modelos é cacheada, versionada e opt-in; modelos removidos
  tornam a rota `unavailable`, não recaem em uma escolha surpresa.

## Plano de validação

### Automatizado

1. Contratos de cada adapter: endpoint, header, payload, schema de saída,
   cancelamento, timeout e erro sanitizado.
2. Propriedades do roteador: ordem determinística, zero fallback sem opt-in,
   parada para credencial/policy/schema e nenhum provider fora da allowlist.
3. Segurança: segredo em cada possível campo de erro, prompt injection,
   URL maliciosa, modelo descontinuado, recibo/VSIX e persistência local.
4. Extensão: conexão, edição/remoção de segredo, seleção de rota, confirmação
   com lista de egressos, preview MCP e localização pt-BR/en.
5. Qualidade: testes completos, mutação >=95%, audit, package, VSIX host
   mínimo/atual, TDS coexistence e review estático.

### Homologação de conta (não simulável)

Para cada fornecedor: criar uma conexão de teste, validar estado sem segredo,
usar `analysis` e `review`, negar consentimento, cancelar, exceder limite,
revogar chave/login e comprovar que o próximo uso falha fechado. Cline/OpenCode
também exigem prova de permissões `plan`/`deny`. Essas evidências entram no
ledger do commit/VSIX exato e não são substituídas por mocks.

## Recomendação de entrega

Executar em quatro incrementos: (1) Connection Plane e perfis/rotas sem
segredos; (2) três APIs diretas e recibos; (3) login oficial/versionado e
adapters externos; (4) UAT, observabilidade opt-in, segurança e promoção.
Esse caminho produz valor imediato e evita lançar uma lista de logos sem
integrações utilizáveis ou uma superfície de automação insegura.

## Fontes

1. OpenCode. [Agents](https://opencode.ai/docs/agents) e
   [Permissions](https://opencode.ai/docs/permissions). Acessado em 12 set.
   2026.
2. Anthropic. [Configure permissions](https://code.claude.com/docs/en/permissions)
   e [Authentication](https://code.claude.com/docs/en/team). Acessado em 12
   set. 2026.
3. Google. [Gemini API reference](https://ai.google.dev/api),
   [Policy engine](https://geminicli.com/docs/reference/policy-engine/) e
   [Plan Mode](https://geminicli.com/docs/cli/plan-mode/). Acessado em 12 set.
   2026.
4. Cline. [CLI reference](https://docs.cline.bot/cli/cli-reference). Acessado
   em 12 set. 2026.
5. Continue. [Configuring models, rules, and tools](https://docs.continue.dev/guides/configuring-models-rules-tools).
   Acessado em 12 set. 2026.
6. OpenRouter. [Provider routing](https://openrouter.ai/docs/guides/routing/provider-selection)
   e [Model fallbacks](https://openrouter.ai/docs/guides/routing/model-fallbacks).
   Acessado em 12 set. 2026.
