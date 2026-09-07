# P0 Test Plan — Protheus Engineering Agent

**Janela:** 2026-09-07
**Escopo:** MVP local offline 0.1.0
**Responsável:** Codex, com revisão do Montagna

## Scope

| Feature | Risk | Test Types | Resultado P0 |
|---|---|---|---|
| Política por ambiente | HIGH | Unit, integration | Passed |
| CodeGraph ADVPL/TLPP | HIGH | Unit, integration, encoding | Passed |
| Project Memory e Journal | HIGH | Unit, filesystem integration | Passed |
| Review determinístico | HIGH | Unit, contract | Passed |
| Hermes adapter | MED | Unit, capability probe opt-in | Passed com perfil isolado |
| MCP stdio | HIGH | Unit, protocol integration | Passed |
| Build supervisor | HIGH | Unit, state machine | Passed com runner injetado |
| VS Code extension fina | MED | Syntax, manifest, manual smoke | Automated passed; manual not run |
| TDN/Dictionary/Oracle ports | HIGH | Fail-closed unit tests | Passed sem conexão externa |

## Requirements-to-test coverage

| Req ID | Requirement | Test ID | Status |
|---|---|---|---|
| REQ-001 | Extensão VS Code fina | TEST-010, MAN-001 | Passed automated; manual not run |
| REQ-002 | Runtime CLI e MCP | TEST-008, TEST-009 | Passed |
| REQ-003 | Indexação ADVPL/TLPP | TEST-002, TEST-003 | Passed |
| REQ-004 | Review com evidências | TEST-005 | Passed |
| REQ-005 | Memory/Journal seguros | TEST-004 | Passed |
| REQ-006 | Hermes desacoplado | TEST-006, TEST-009 | Passed |
| REQ-007 | Integrações fail-closed | TEST-006 | Passed |
| REQ-008 | Supervisor determinístico | TEST-007 | Passed com runner injetado |
| SEC-002 | Deny by default | TEST-001, TEST-007 | Passed |

Não há GAP sem decisão: compilação real, conexão Hermes, rede TDN e Oracle foram explicitamente deferidas para P1/P2 por exigirem ambiente/credenciais/efeitos externos.

## Cenários por categoria

- Happy path: indexar workspace, revisar arquivo, ler contexto, listar/executar tool MCP.
- Validação: comando/arquivo/extensão/capacidade inválidos retornam erro estável.
- Erro: fonte inexistente, symlink de estado, integração indisponível e runner falho são contidos.
- Edge: CP1252, UTF-8 BOM, nomes case-insensitive, comentários e strings.
- Concorrência: duas gravações de journal não deixam arquivo parcial; stress completo fica no P1.
- Integração: CLI chama módulos reais; MCP chama runtime real; extensão chama CLI real.

## Priorização risco × esforço

| Prioridade | Cenários |
|---|---|
| DO FIRST | deny-by-default, contenção de caminho, MCP dispatch, parser básico |
| DO SECOND | memória atômica, review, CLI integrada, supervisor |
| DO THIRD | smoke manual da extensão e probe real Hermes |
| DEFER | Oracle, compilador, carga, subagentes paralelos reais |

## Effort Budget

| Atividade | Horas planejadas |
|---|---:|
| Testes unitários e integração | 6.0 |
| Implementação mínima | 7.0 |
| Documentação e auditoria | 3.0 |
| Verificação manual | 1.0 |
| Buffer de bugs/retestes | 5.0 |
| **Total** | **22.0** |

Planejado: 17h (77%); buffer: 5h (23%).

## Entry Criteria

- [x] ZIP validado e extraído em diretório de trabalho isolado.
- [x] Licença raiz e manifests diretos inspecionados.
- [x] Hermes e Protheus IA Lab inspecionados sem mutação.
- [x] Node e VS Code locais identificados.

## Exit Criteria

- [x] Todos os testes HIGH executados com zero falhas: 21 passed, 0 failed.
- [x] Nenhum acesso de rede, credencial ou stack externa durante o gate P0.
- [x] `node --check` limpo em todos os `.mjs`/`.js`/`.cjs`.
- [x] Manifests JSON parseáveis.
- [x] Smoke CLI com saídas JSON parseáveis.
- [x] Smoke manual da extensão registrado como não executado; cobertura automatizada do adaptador e manifest passou.

Evidências completas: `docs/validation-report.md`.

## Environment & Data

- Windows local; Node 22.23.2; VS Code 1.133.0.
- Testes usam somente diretórios temporários e fontes sintéticas sem APIs Protheus de framework.
- Nenhum teste usa o `HERMES_HOME`, Oracle, AppServer, RPO ou coleção RAG real.
