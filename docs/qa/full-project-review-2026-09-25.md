# Revisão integral do projeto — 2026-09-25

## Escopo

Revisão do commit `c354e980f71af082e0015b0bc435a6758d0ff34f` cobrindo runtime, MCP, extensão VS Code, testes, CI, supply chain, documentação e gates Stable.

## Evidência observada

- 365 testes existentes passaram no baseline; a árvore corrigida passou 366/366.
- Cobertura final medida apenas no código mantido: 90,44% linhas, 74,15% branches e 90,22% funções, acima dos gates 85/70/80.
- Mutation gate protegido: 95,05% no escopo crítico configurado.
- Smoke, auditoria de dependências, benchmarks, pacote VSIX e Extension Host no VS Code 1.95.3 e 1.139.0 passaram.
- CI pós-merge do PR #47 passou Windows/Linux, Node 22/24, Extension Host, CodeQL, OSV, segredos e dependências.
- AppServer/TDS/PostgreSQL e dicionário físico `990` foram homologados conforme `docs/qa/docker-appserver-pea-homologation-2026-09-24.md`.

## Achados

| ID | Severidade | Estado | Achado e tratamento |
| --- | --- | --- | --- |
| PEA-REV-001 | Major | Corrigido | Uma rejeição do canal opcional de progresso MCP substituía o resultado da ferramenta. Regressão RED/GREEN adicionada; notificações agora são best-effort. |
| PEA-REV-002 | Major | Corrigido | A suíte não impunha cobertura do código mantido. Gate nativo 85/70/80 foi adicionado ao `validate` e à matriz CI. |
| PEA-REV-003 | Major | Corrigido | `STATE.md` e o handoff ainda pediam homologações já concluídas no PR #47. Documentos foram reconciliados mantendo Stable `NO-GO`. |
| PEA-REV-004 | Minor | Mitigado | SDK MCP 2.1.0 está disponível, mas perdeu respostas assíncronas quando stdin finito fechou. A versão 2.0.0 permanece fixada e coberta pelo teste real de processo. |
| PEA-REV-005 | Minor | Planejado P1 | `apps/vscode-extension/extension.cjs` concentra 1.266 linhas. A decomposição precisa de spec própria e paridade VSIX; não é bloqueador funcional ou de segurança deste release. |
| PEA-REV-006 | Minor | Documentado | Empacotamentos simultâneos no mesmo checkout disputam o mesmo destino VSIX no Windows. O fluxo suportado de CI/release é sequencial e passou; execução concorrente deve usar checkouts ou diretórios de saída separados. |
| PEA-REV-007 | Major | Corrigido | O GitHub anunciou a migração de `ubuntu-latest` para Ubuntu 26 em 19/10/2026. A matriz foi fixada em `ubuntu-24.04` e ganhou contrato contra regressão para evitar mudança silenciosa do ambiente de validação. |

## Limites e decisão

Nenhum achado crítico de segurança, corrupção de dados ou bypass de permissão foi observado. O review aprova as correções para PR quando todos os gates desta árvore passarem. Ele não promove Stable/Marketplace: UAT assistiva/humana, piloto representativo, publisher/termos, RPO bloqueado e artefatos Stable exatos continuam externos ou não provados.
