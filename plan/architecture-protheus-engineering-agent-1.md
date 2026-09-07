---
goal: Protheus Engineering Agent MVP with thin VS Code interface and reusable runtime
version: 1.0
date_created: 2026-09-07
last_updated: 2026-09-07
owner: Montagna
status: 'In progress'
tags: [architecture, feature, vscode, hermes, protheus, mcp, qa]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In%20progress-yellow)

Construir um MVP local e desacoplado do Protheus Engineering Agent, usando o VS Code como interface, Hermes por ACP/MCP como engine opcional e módulos reutilizáveis para contexto, análise, revisão e governança.

## 1. Requirements & Constraints

- **REQ-001**: A interface principal deve ser uma extensão fina do VS Code.
- **REQ-002**: O runtime deve funcionar por CLI e MCP sem depender do VS Code.
- **REQ-003**: O MVP deve indexar símbolos e relações de chamada em `.prw`, `.prg`, `.prx`, `.tlpp`, `.ppx`, `.ppp`, `.apw` e `.aph`.
- **REQ-004**: O MVP deve gerar review determinístico inicial com evidências de arquivo e linha.
- **REQ-005**: Project Memory e Journal devem ser locais, limitados e escritos atomicamente.
- **REQ-006**: Hermes deve ser integrado por adaptador, sem alterações no checkout/configuração existente.
- **REQ-007**: TDN, Dictionary e Oracle devem existir como portas e falhar fechadas quando não configuradas.
- **REQ-008**: O supervisor de build deve ter estados determinísticos e runner injetável.
- **SEC-001**: Nenhuma credencial, configuração Hermes, banco do Protheus ou serviço externo será lido ou alterado no MVP.
- **SEC-002**: A política deve negar por padrão capacidades desconhecidas e operações não concedidas ao ambiente.
- **SEC-003**: Caminhos fornecidos devem permanecer dentro do workspace autorizado.
- **CON-001**: Não instalar dependências; o runtime deve usar somente Node.js 22 e bibliotecas nativas.
- **CON-002**: Não reimplementar Electron, explorer, terminal, Git UI ou editor.
- **CON-003**: Não afirmar compatibilidade de compilação ADVPL sem compilador/AppServer validado.
- **GUD-001**: Testes devem validar comportamento, não snapshots frágeis de implementação.
- **PAT-001**: Estado e integrações devem ser acessados por portas/adaptadores substituíveis.

## 2. Implementation Steps

### Implementation Phase 1 — P0 executable core

- GOAL-001: Entregar runtime offline executável, extensão fina e contratos testados.

| Task | Description | Completed | Date |
|---|---|---:|---|
| TASK-001 | Registrar auditoria do ZIP, licença e dependências em `docs/reference-audit.md`. | x | 2026-09-07 |
| TASK-002 | Implementar política fail-closed em `packages/policy/src/index.mjs` por TDD. | x | 2026-09-07 |
| TASK-003 | Implementar CodeGraph ADVPL/TLPP em `packages/codegraph-advpl/src/index.mjs` por TDD. | x | 2026-09-07 |
| TASK-004 | Implementar Project Memory e Journal em `packages/project-context/src/index.mjs` por TDD. | x | 2026-09-07 |
| TASK-005 | Implementar pipeline de review em `packages/review/src/index.mjs` por TDD. | x | 2026-09-07 |
| TASK-006 | Implementar adaptador Hermes e integrações fail-closed. | x | 2026-09-07 |
| TASK-007 | Implementar supervisor de build e MCP stdio. | x | 2026-09-07 |
| TASK-008 | Implementar extensão VS Code e CLI; executar validação offline completa. | x | 2026-09-07 |

### Implementation Phase 2 — P1 product integration

- GOAL-002: Ligar o runtime a Hermes e às fontes especialistas sob aprovação explícita.

| Task | Description | Completed | Date |
|---|---|---:|---|
| TASK-009 | Criar perfil Hermes isolado e instalar MCP do produto sem alterar o perfil atual. |  |  |
| TASK-010 | Integrar TDN MCP e dicionário com cache versionado e proveniência. |  |  |
| TASK-011 | Implementar parser incremental ADVPL/TLPP e persistência SQLite opcional. |  |  |
| TASK-012 | Integrar compilador/build real atrás de aprovação por ambiente. |  |  |
| TASK-013 | Implementar bug review com dois tracers e parecer reconciliado. |  |  |

### Implementation Phase 3 — P2 supervised engineering workflows

- GOAL-003: Adicionar execução multiagente, Oracle read-only e evals de produto.

| Task | Description | Completed | Date |
|---|---|---:|---|
| TASK-014 | Implementar subagentes MCP com limites de profundidade, concorrência e orçamento. |  |  |
| TASK-015 | Implementar Oracle read-only com allowlist de consultas, timeout e redaction. |  |  |
| TASK-016 | Adicionar evals de review, CodeGraph, grounding TDN e regressão de prompts. |  |  |
| TASK-017 | Adicionar telemetria local opt-in e release readiness. |  |  |

## 3. Alternatives

- **ALT-001**: Forkar LionCodeLabs. Rejeitado porque carrega Electron, renderer, terminal, explorer, Git UI, SQLite nativo e providers fora do objetivo.
- **ALT-002**: Implementar diretamente no core do Hermes. Rejeitado porque o próprio Hermes exige produtos terceiros como plugin/MCP externo e o checkout local está muito atrás do remoto.
- **ALT-003**: Extensão VS Code monolítica. Rejeitada porque impediria reutilização no Hermes, CLI, CI e futuros hosts MCP.

## 4. Dependencies

- **DEP-001**: Node.js 22.23.2 observado localmente; nenhuma dependência npm no P0.
- **DEP-002**: VS Code 1.133.0 observado localmente para teste manual da extensão.
- **DEP-003**: `hermes acp` é o contrato preferencial, mas a conexão real é opcional e não faz parte do gate offline P0.
- **DEP-004**: TDN, Dictionary, Oracle e compilador são integrações P1/P2 e permanecem indisponíveis no P0.

## 5. Files

- **FILE-001**: `apps/vscode-extension/package.json` e `extension.cjs` — cliente fino.
- **FILE-002**: `packages/runtime/src/*.mjs` — composição e CLI.
- **FILE-003**: `packages/codegraph-advpl/src/index.mjs` — grafo local.
- **FILE-004**: `packages/project-context/src/index.mjs` — memória/journal.
- **FILE-005**: `packages/policy/src/index.mjs` — permissões.
- **FILE-006**: `packages/review/src/index.mjs` — review.
- **FILE-007**: `packages/mcp/src/*.mjs` — tools MCP.
- **FILE-008**: `packages/hermes-adapter/src/index.mjs` — contrato Hermes.
- **FILE-009**: `packages/integrations/src/index.mjs` — portas externas.
- **FILE-010**: `packages/build-supervisor/src/index.mjs` — supervisão.

## 6. Testing

- **TEST-001**: Política nega capacidade desconhecida e produção sem grant.
- **TEST-002**: CodeGraph encontra símbolos/callers sem confundir comentários/strings.
- **TEST-003**: Leitura de fonte aceita UTF-8 BOM e Windows-1252.
- **TEST-004**: Memory/Journal bloqueiam symlink, limitam conteúdo e escrevem atomicamente.
- **TEST-005**: Review retorna achados com regra, severidade, arquivo e linha.
- **TEST-006**: Integrações não configuradas não fazem rede e retornam indisponível.
- **TEST-007**: Supervisor bloqueia etapa não autorizada e preserva transições.
- **TEST-008**: MCP inicializa, lista tools e executa chamadas válidas; método desconhecido retorna erro JSON-RPC.
- **TEST-009**: CLI `doctor`, `index` e `review` retornam JSON parseável e códigos de saída estáveis.
- **TEST-010**: Arquivos JavaScript passam por `node --check` e manifests por parse JSON.

## 7. Risks & Assumptions

- **RISK-001**: Regex não é parser completo de ADVPL/TLPP; o MVP marca confiança e P1 prevê parser incremental.
- **RISK-002**: A licença dos pacotes transitivos do LionCode não foi auditada porque o ZIP não contém `node_modules`/SBOM; nenhum pacote ou código será copiado no P0.
- **RISK-003**: O checkout Hermes local está defasado; integração real deve usar capability probe, não versão presumida.
- **RISK-004**: Compilação e Oracle podem causar efeitos externos; continuam bloqueados até configuração e aprovação humanas.
- **ASSUMPTION-001**: O MVP será usado localmente em workspace confiável e single-user.
- **ASSUMPTION-002**: VS Code pode iniciar processos Node locais por comandos da extensão.

## 8. Related Specifications / Further Reading

- `docs/context-map.md`
- `docs/reference-audit.md`
- `docs/test-plan-p0.md`
- `docs/architecture.md`
