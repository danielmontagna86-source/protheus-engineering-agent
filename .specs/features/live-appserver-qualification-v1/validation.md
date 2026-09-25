# Qualificação live AppServer v1 — Matriz de validação

| Requisito | Caso | Tipo | Evidência esperada | Resultado |
| --- | --- | --- | --- | --- |
| LAQ-001 | APP-HEALTH-001 | Ambiente | containers/portas ativos | PASS — quatro serviços saudáveis, WebApp HTTP 200 |
| LAQ-002 | APP-TDS-001 | Live positivo | TDS P12/RPO + sucesso | PASS — TDS 2.1.4 retornou `0/SUCCESS`; hash do `custom.rpo` mudou e o RPO padrão foi preservado |
| LAQ-003 | APP-TDS-002 | Live negativo | erro + rollback | PASS — retorno `-1`, C2090 e nenhuma alteração do RPO padrão |
| LAQ-004 | APP-TDS-003 | Encoding/include | CP1252/LF + include + sucesso | PASS — fixture CP1252/LF identificada e compilada no AppServer real |
| LAQ-005 | APP-TDS-004 | Reconexão | sem vazamento de segredo | PASS — token reutilizável permaneceu no TDS; recibos saneados não contêm token, senha ou usuário |
| LAQ-006 | APP-TDS-005..007 | Resiliência | cancel/timeout/RPO reais | PARTIAL — cancelamento, timeout, AppServer indisponível e RPO custom indisponível passaram; contenção concorrente de lock não foi forçada |
| LAQ-007 | APP-DB-001 | Infra read-only | health/catálogos somente leitura | PASS — adapter/runtime/MCP, role efêmera somente leitura e catálogo Protheus passaram; grupo físico `990` reconhecido como `READY` com `SX2990`/`SX3990`/`SIX990` íntegros |
| LAQ-008 | APP-PEA-001 | Produto | artefato do supervisor PEA | PASS no limite do contrato — VSIX 0.3.9 executou o fluxo live e manteve sucesso positivo como `unverified/TDS_COMPILE_SUCCESS_UNPROVEN` |

**Regra:** PASS de infraestrutura/TDS não é PASS do VSIX. A matriz técnica live
está vinculada ao commit `ef09aac35a1b64fa612ba62d2207522361ac812c` e ao
VSIX SHA-256 `72be84d9703ce3eb8069d8109e9ffb73930d8e4a23046ef17725d1721da36d77`.
G6 permanece **PARTIAL** somente porque a contenção concorrente de lock não foi
forçada e a promoção Stable depende dos demais gates de release.
