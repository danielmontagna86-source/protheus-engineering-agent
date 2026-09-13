# Qualificação live AppServer v1 — Especificação

## Objetivo

Transformar o laboratório isolado `Protheus Lab Local` em evidência
reproduzível de compilação TDS/AppServer, sem transportar segredos, binários
TOTVS ou dados de ambiente para o repositório público.

## Requisitos

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| LAQ-001 | Inventariar o laboratório antes de qualquer build. | AppServer, License Server, DBAccess e PostgreSQL têm estado/porta registrados sem segredo. |
| LAQ-002 | Compilar uma sonda válida pelo TDS. | Log saneado identifica P12, arquivo ativo, RPO e conclusão bem-sucedida. |
| LAQ-003 | Rejeitar uma fixture inválida sem commit parcial. | TDS relata erro e `Aborting end build (rollback changes)`. |
| LAQ-004 | Exercitar include válido e CP1252/LF com acentos. | Fonte tem bytes CP1252, LF e compila no TDS; hash pré/pós é preservado. |
| LAQ-005 | Exercitar indisponibilidade e reconexão sem vazar segredo. | Estado indisponível/reconectado fica explícito; logs e relatório não contêm tokens/senhas. |
| LAQ-006 | Avaliar cancelamento, timeout e RPO bloqueado. | Cada cenário obtém PASS, FAIL diagnosticado ou BLOCKED com motivo técnico verificável. |
| LAQ-007 | Verificar saúde do DBAccess/PostgreSQL de laboratório sem escrita. | Health checks e consulta de metadados read-only passam; nenhuma tabela de negócio é alterada. |
| LAQ-008 | Manter o gate de release honesto. | G6 só avança para o nível provado; supervisor PEA, DBAccess e artefato exato continuam declarados quando ausentes. |

## Fora de escopo

- uso de ambiente corporativo, produção ou dados reais;
- alteração manual de `servers.json`, tokens ou credenciais;
- cópia de fontes, logs integrais ou imagens TOTVS para o Git;
- alegar compatibilidade de produção ou aprovação Stable/Marketplace.
