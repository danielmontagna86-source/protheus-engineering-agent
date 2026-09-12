# Tarefas — descoberta pública e consistência de marca

| ID | Tarefa | Dependência | Pronto quando | Verificação | Status |
| --- | --- | --- | --- | --- | --- |
| PDR-01 | Capturar metadados vivos do repositório e referências de mercado | nenhuma | relatório datado separa fatos, inferências e gates | GitHub API + fontes oficiais | COMPLETE |
| PDR-02 | Especificar decisão de categoria, mensagem e limites da marca | PDR-01 | spec/design documentam requisitos e não objetivos | revisão editorial | COMPLETE |
| PDR-03 | Atualizar About, README e guia de lançamento para o estado público | PDR-01, PDR-02 | não há snapshot privado apresentado como atual | `rg` focal + revisão de diff | COMPLETE |
| PDR-04 | Ajustar categoria do VS Code e regressões de publicação | PDR-02 | `Programming Languages`, `Linters`, `Testing` validados | teste focal + empacotamento VSIX | COMPLETE |
| PDR-05 | Executar validação e auditoria pré-merge | PDR-03, PDR-04 | checks focais, estrutural e revisão sem bloqueador | `npm test`, `npm run check`, `git diff --check` | COMPLETE |

## Itens externos, não encerrados por este change

- Registrar o preview social real na configuração do GitHub e verificar o card renderizado.
- Criar a identidade imutável do publisher do Marketplace, aceitar os termos e publicar somente o VSIX do candidato com hashes verificados.
- Capturar telas sanitizadas do VSIX instalado, validar acessibilidade assistiva e completar UAT/piloto humano.
- Realizar revisão jurídica de marca antes de campanha comercial ou remoção do estágio preview.
