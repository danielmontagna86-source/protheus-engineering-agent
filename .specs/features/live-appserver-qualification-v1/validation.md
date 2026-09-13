# Qualificação live AppServer v1 — Matriz de validação

| Requisito | Caso | Tipo | Evidência esperada | Resultado |
| --- | --- | --- | --- | --- |
| LAQ-001 | APP-HEALTH-001 | Ambiente | containers/portas ativos | PASS em 2026-09-13 |
| LAQ-002 | APP-TDS-001 | Live positivo | TDS P12/RPO + sucesso | INVALIDADO — o output do TDS, não a fixture, recebeu a compilação |
| LAQ-003 | APP-TDS-002 | Live negativo | erro + rollback | PASS em 2026-09-13 |
| LAQ-004 | APP-TDS-003 | Encoding/include | CP1252/LF + include + sucesso | PASS — 2026-09-13, fixture identificada compilada pelo TDS e hash preservado |
| LAQ-005 | APP-TDS-004 | Reconexão | sem vazamento de segredo | PARTIAL — sessão reautenticada interativamente |
| LAQ-006 | APP-TDS-005..007 | Resiliência | cancel/timeout/lock reais | BLOCKED — TDS 2.1.3 não contribui comando público de cancelamento; não há adapter PEA live nem ensaio seguro de lock/timeout |
| LAQ-007 | APP-DB-001 | Infra read-only | health/catálogos somente leitura | PARTIAL — portas/processos ativos e catálogo PostgreSQL read-only; sem consulta DBAccess/adapter PEA |
| LAQ-008 | APP-PEA-001 | Produto | artefato do supervisor PEA | PARTIAL — existe ponte opcional VSIX→`tds-lm-tools`, ainda sem evidência live no perfil autenticado e sem artefato supervisor `compiler-verified` |

**Regra:** PASS de infraestrutura/TDS não é PASS do VSIX. G6 é **PARTIAL** pela
evidência de compilação correta, mas continua `NO-GO` até APP-PEA-001 e os
cenários críticos restantes terem evidência exata.
