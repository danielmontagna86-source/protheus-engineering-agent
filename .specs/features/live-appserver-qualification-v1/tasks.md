# Qualificação live AppServer v1 — Tarefas

| ID | Tarefa | Depende de | Verificação | Estado |
| --- | --- | --- | --- | --- |
| T1 | Inventariar containers, portas e TDS sem segredos. | — | LAQ-001 | Concluída |
| T2 | Rodar fixture positiva e negativa via TDS. | T1 | LAQ-002, LAQ-003 | Concluída — TDS 2.1.4 retornou `0/SUCCESS` e `-1/C2090`; hash comprovou escrita apenas no RPO custom |
| T3 | Criar fixture CP1252/LF com include válido e acentos. | T1 | LAQ-004 | Concluída |
| T4 | Executar T3 e comparar hashes/resultado. | T3 | LAQ-004 | Concluída — PASS às 08:51:48–08:51:49 BRT |
| T5 | Testar health read-only DBAccess/PostgreSQL. | T1 | LAQ-007 | Concluída — adapter real, role efêmera somente leitura, catálogo Protheus acima de 100 tabelas, limites, cancelamento e MCP passaram; dicionário físico `990` está `READY` e íntegro |
| T6 | Descobrir comandos seguros de cancelamento/lock/timeout e executar o que for exposto. | T2 | LAQ-006 | Parcial — cancelamento e timeout passaram; RPO indisponível passou com rollback; contenção concorrente de lock não foi forçada |
| T7 | Mapear o adaptador de build PEA e decidir teste live possível. | T2 | LAQ-008 | Concluída — VSIX 0.3.9 chamou `tds-lm-tools` no AppServer real e preservou o estado fail-closed do contrato upstream |
| T8 | Consolidar evidência saneada, rodar checks e atualizar gate. | T4–T7 | LAQ-008 | Concluída para o commit `ef09aac35a1b64fa612ba62d2207522361ac812c`; regressão após a carga do dicionário passou; promoção Stable continua fora deste gate isolado |
