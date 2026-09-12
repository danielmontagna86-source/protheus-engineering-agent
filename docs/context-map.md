# Context Map — Protheus Engineering Agent

Data: 2026-09-07

## Bases inspecionadas

| Base | Evidência | Uso no produto |
|---|---|---|
| LionCodeLabs 1.5 | ZIP SHA-256 `55FB964DECB169D65FA65689CE2C85BF6DE170DBC8A4DCD75998C047721B6BEE`, 1.244 entradas, licença MIT | Referência de padrões de runner, memória, permissões, MCP, bug review e supervisão |
| Hermes Agent local | Checkout Git `56526bc0d36522ab7a87ee0056f70e3847d2f0e6`, branch local 32.026 commits atrás de `origin/main` | Contrato ACP/MCP e princípios de extensão; não será modificado |
| Protheus IA Lab foundation | Worktree `fix/qa-five-issues`, com arquivos não rastreados já existentes | Integração futura de RAG/evals; não será usado como diretório do novo produto |
| GitHub conectado | Nenhum repositório Hermes acessível; `LionLabsCommunity/LionCodeLabs` retorna 404 | Sem base remota privada para reutilização direta |

## Arquivos a criar no MVP

| Arquivo/módulo | Responsabilidade |
|---|---|
| `apps/vscode-extension/extension.cjs` | Adaptador fino de comandos e apresentação no VS Code |
| `packages/runtime/src/cli.mjs` | Entrada executável e saída JSON estável |
| `packages/codegraph-advpl/src/index.mjs` | Indexação local de símbolos e chamadas ADVPL/TLPP |
| `packages/project-context/src/index.mjs` | Project Memory e Journal com escrita atômica e limites |
| `packages/policy/src/index.mjs` | Capacidades por ambiente e decisão fail-closed |
| `packages/hermes-adapter/src/index.mjs` | Descoberta/launch descriptor de `hermes acp`, sem alterar Hermes |
| `packages/review/src/index.mjs` | Pipeline determinístico inicial de review |
| `packages/mcp/src/stdio.mjs` | Servidor MCP stdio pelo SDK oficial, com transporte limitado a 1 MiB |
| `packages/integrations/src/index.mjs` | Portas TDN, Dictionary e Oracle indisponíveis por padrão |
| `packages/build-supervisor/src/index.mjs` | Máquina de estados de build com runner injetável |
| `test/*.test.mjs` | Testes unitários, integração e contrato MCP |

## Dependências e relações

```text
VS Code extension
  -> runtime/CLI
      -> policy
      -> codegraph-advpl
      -> review
      -> project-context
      -> build-supervisor
      -> integrations

Hermes ACP
  -> MCP stdio do produto
      -> runtime/CLI modules
```

## Padrões de referência

| Referência | Padrão aproveitado | Decisão |
|---|---|---|
| LionCode `runner/permission-broker.ts` | pedido correlacionado, cancelamento libera espera com deny | Adaptar como política síncrona por ambiente no P0; broker assíncrono no P1 |
| LionCode `memory/project-memory-fs.ts` | limites, anti-symlink, escrita temp + rename | Reimplementar de forma menor e independente |
| LionCode `memory-block.ts` | memória tratada como dado não executável | Reutilizar princípio e delimitadores próprios |
| LionCode `runner/*-registry.ts` | snapshot live por turno, sem cache de boot | Aplicar a skills/rules/integrations no P1 |
| LionCode CodeGraph | CLI externa, lock, timeout, queries read-only | Não reutilizar parser; ADVPL/TLPP exige indexador próprio |
| Hermes `acp_adapter` | stdio ACP, MCP por sessão, aprovação fail-closed | Usar como integração preferencial |

## Riscos do mapa

- [x] API pública nova: contratos JSON/MCP serão versionados desde `0.1`.
- [ ] Migração de banco: não existe no P0; arquivos locais evitam dependência nativa.
- [x] Configuração: perfil padrão é `development`; produção nega escrita/execução sem concessão explícita.
- [x] Encoding: leitura ADVPL/TLPP usa detecção de BOM e fallback Windows-1252.
- [x] Integrações externas: permanecem fail-closed e não são chamadas nos testes.
