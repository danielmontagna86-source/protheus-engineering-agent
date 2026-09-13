# Qualificação live AppServer v1 — Tarefas

| ID | Tarefa | Depende de | Verificação | Estado |
| --- | --- | --- | --- | --- |
| T1 | Inventariar containers, portas e TDS sem segredos. | — | LAQ-001 | Concluída |
| T2 | Rodar fixture positiva e negativa via TDS. | T1 | LAQ-002, LAQ-003 | Parcial — negativa PASS; APP-TDS-001 invalidada, mas positiva identificada concluída em T4 |
| T3 | Criar fixture CP1252/LF com include válido e acentos. | T1 | LAQ-004 | Concluída |
| T4 | Executar T3 e comparar hashes/resultado. | T3 | LAQ-004 | Concluída — PASS às 08:51:48–08:51:49 BRT |
| T5 | Testar health read-only DBAccess/PostgreSQL. | T1 | LAQ-007 | Parcial — catálogo PostgreSQL read-only; DBAccess apenas health de processo/porta |
| T6 | Descobrir comandos seguros de cancelamento/lock/timeout e executar o que for exposto. | T2 | LAQ-006 | Concluída — bloqueio técnico documentado, sem API privada ou operação destrutiva |
| T7 | Mapear o adaptador de build PEA e decidir teste live possível. | T2 | LAQ-008 | Concluída — a ponte VSIX→`tds-lm-tools` foi adicionada; falta homologá-la no perfil autenticado e ela não substitui o supervisor host-neutral |
| T8 | Consolidar evidência saneada, rodar checks e atualizar gate. | T4–T7 | LAQ-008 | Em execução |
