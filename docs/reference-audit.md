# Audit of LionCodeLabs and available technical bases

Data da inspeção: 2026-09-07.

## Proveniência do ZIP

- Arquivo recebido: `LionCodeLabs-main.zip`.
- Tamanho: 4.212.596 bytes.
- SHA-256: `55FB964DECB169D65FA65689CE2C85BF6DE170DBC8A4DCD75998C047721B6BEE`.
- Entradas validadas antes da extração: 1.244; nenhuma entrada absoluta ou com travessia `..`.
- Arquivos após extração: 1.131, em monorepo pnpm.
- O repositório declarado no README (`LionLabsCommunity/LionCodeLabs`) retornou 404 na conexão GitHub atual; portanto o ZIP, e não uma branch remota, é a evidência auditada.

## Licenças

| Item | Evidência | Consequência |
|---|---|---|
| Código LionCodeLabs | `LICENSE` MIT, copyright 2026 BrenoLionLab; raiz `package.json` declara MIT | Reuso é permitido com preservação do aviso, mas o P0 não copia código |
| Fonte LionLabs Grotesk | `packages/renderer/src/assets/fonts/.../OFL.txt` | Não reutilizar: identidade/UI não pertencem ao produto e o VS Code já controla tipografia |
| Pacotes do monorepo | Manifests internos não repetem o campo `license` | A licença raiz cobre o repositório, mas uma publicação separada exigiria manifests/avisos consistentes |
| Dependências npm | ZIP contém lockfile, mas não `node_modules`, SBOM ou relatório de licenças | Licenças transitivas não foram confirmadas; nenhum pacote LionCode é redistribuído no P0 |

Antes de copiar qualquer implementação no futuro, registrar arquivo/commit de origem e incluir o texto MIT aplicável. A estratégia preferida continua sendo reimplementação por contrato, não copy/paste.

## Dependências diretas observadas

| Área | Dependências principais | Avaliação |
|---|---|---|
| Server | `@agentclientprotocol/sdk@1.2.1`, `@anthropic-ai/claude-agent-sdk@^0.3.177`, `@modelcontextprotocol/sdk@^1.29.0`, `better-sqlite3@^12.10.1`, `node-pty@^1.1.0`, `zod@4.4.3` | Bons contratos, mas ACP/provider/native modules aumentam instalação e superfície de supply chain |
| Shell | `electron@^33.4.11` | Descartado; VS Code já é o shell |
| Renderer | React 18, Vite 5, Vitest 2, Tailwind 3, xterm 6, Shiki 4 | Descartado no P0; UI duplicaria VS Code |
| MCP servers | MCP SDK `^1.29.0` e Zod `4.4.3` | Padrão útil; P0 usa protocolo mínimo sem dependência, P1 pode adotar SDK após auditoria |
| Testes | Playwright `^1.61.1` | Útil quando houver webview/fluxo UI real; não necessário para a extensão fina P0 |
| Build | pnpm 9, TypeScript 5.5, módulos nativos com ABI Node/Electron | Complexidade evitada no MVP com ESM JavaScript e Node padrão |

O lockfile reduz deriva, mas vários manifests usam `^`; uma futura incorporação exige SBOM, licença e vulnerabilidades da resolução efetiva.

## Matriz de reaproveitamento

| Componente LionCode | Decisão | Justificativa para o produto |
|---|---|---|
| Runner como chokepoint de eventos/persistência | ADAPTAR | Mantém drivers simples e centraliza auditoria |
| `project-memory-fs`, `journal`, `memory-block` | ADAPTAR | Limites, escrita atômica, anti-symlink e memória como dado são diretamente úteis |
| Skills/Rules/MCP/Subagents registries live-per-turn | ADAPTAR | Evita configuração velha e permite snapshot estável por turno |
| Permission broker com cancelamento fail-closed | ADAPTAR | Necessário para build/Oracle/deploy supervisionados |
| MCP bridges com URL loopback efêmera + bearer | ADAPTAR P1 | Bom isolamento entre subprocessos; P0 não precisa de loopback interno |
| Bug-review motor e build supervisor | ADAPTAR O CONTRATO | Implementação é grande e acoplada ao banco/runner LionCode; reutilizar estados/gates, não o motor inteiro |
| CodeGraph externo | DESCARTAR COMO ENGINE | Não há evidência no ZIP de parser ADVPL/TLPP; manter apenas conceitos de lock, timeout e queries read-only |
| Shared contracts | RECRIAR | Os tipos LionCode carregam providers e UI fora do escopo |
| Electron shell e renderer | DESCARTAR | Duplica VS Code |
| File explorer, terminal/xterm, Git actions/diff | DESCARTAR | Funcionalidades nativas do VS Code |
| Remote machines/SSH UI | DESCARTAR P0 | VS Code Remote cobre o caso; runtime continuará transport-agnostic |
| Voice, pricing UI, provider catalog | DESCARTAR | Não compõem o primeiro produto Protheus Engineering |
| Secret vault local | AVALIAR P1 | Preferir SecretStorage do VS Code e credenciais do Hermes; não criar terceiro cofre sem necessidade |

## Hermes existente

Foi encontrado checkout Git completo em instalação local, remoto `NousResearch/hermes-agent`, licença MIT. A revisão mostrou:

- `hermes acp`/`hermes-acp` expõe stdio ACP para VS Code, Zed e JetBrains;
- sessões ACP aceitam MCPs por sessão;
- aprovação mapeia allow-once/session/always e nega em timeout/erro;
- o core deve permanecer estreito; produtos terceiros devem ser plugins/MCPs externos;
- prompt e toolsets são estáveis durante uma conversa por causa de cache;
- perfis isolam `HERMES_HOME`;
- testes reais devem usar estado temporário, não o perfil do usuário.

O checkout observado estava 32.026 commits atrás de `origin/main` e tinha artefatos não rastreados preexistentes. Ele é uma base de contrato, não uma base segura para patch direto. O MVP não modificou nem executou configuração/jobs/gateway do Hermes.

## Protheus IA Lab existente

O worktree foundation foi inspecionado e já contém RAG/evals/governança valiosos, mas possui gates e mudanças locais próprios. O novo produto fica em repositório/diretório separado e deverá consumir o Lab por uma porta versionada em P1, sem mover ou duplicar coleções protegidas.
