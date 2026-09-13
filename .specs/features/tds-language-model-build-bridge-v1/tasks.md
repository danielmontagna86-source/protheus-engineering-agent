# Tarefas — Ponte de compilação TDS por Language Model Tool v1

| ID | Tarefa | Dependência | Verificação | Estado |
| --- | --- | --- | --- | --- |
| T1 | Acrescentar testes que falham para invocação TDS, escopo, confirmação, indisponibilidade e normalização. | — | RED confirmado antes da implementação | Concluída |
| T2 | Implementar helper puro de validação, higienização e normalização. | T1 | testes TDSB-002/005/006 passam | Concluída |
| T3 | Integrar comando `pea.compileWithTds` e ferramenta PEA, preservando os comandos atuais. | T2 | testes TDSB-001/003/004/007 passam | Concluída |
| T4 | Declarar manifesto, localização PT-BR/EN e documentação de limite de evidência. | T3 | teste de manifesto e `npm run check` passam | Concluída |
| T5 | Rodar regressão, host VS Code e revisão de código; empacotar VSIX. | T4 | `npm run validate:release-candidate` passa | Concluída — 352 testes, hosts mínimo/atual/TDS, auditoria, VSIX/SBOM e mutação 95,05% |
| T6 | Exercitar no AppServer de laboratório pelo VSIX instalado. | T5 | relatório saneado com alvo, resultado e limites | Pendente — o CLI do VS Code instala VSIX, mas não expõe execução de command ID na janela autenticada; não se simula resultado live |
