# Tarefas — fechamento interno do candidato de release

| ID | Tarefa | Pronto quando | Verificação | Status |
| --- | --- | --- | --- | --- |
| IRC-01 | Atualizar o handoff e a matriz Stable para a aprovação jurídica registrada | nenhum documento operacional pede nova revisão para o escopo já aprovado | revisão de diff e testes de publicação | COMPLETE |
| IRC-02 | Criar plano e matriz de execução do candidato | requisitos, evidências e limites externos são rastreáveis | revisão dos documentos | COMPLETE |
| IRC-03 | Executar a bateria do candidato no commit limpo | todos os comandos internos terminam com sucesso | `npm run validate:release-candidate` | COMPLETE — `296f7c0`, mutação 95,05% |
| IRC-04 | Registrar o resultado e manter o gate externo fechado | relatório tem SHA, comandos, resultado e bloqueios reais | `npm run publication:release-check` deve falhar somente por evidência externa incompleta | COMPLETE — único blocker `RELEASE_EVIDENCE_INCOMPLETE` |
| IRC-05 | Revisar, integrar e verificar CI do commit exato | PR e checks protegidos estão verdes | GitHub checks no SHA de merge | Pendente |
