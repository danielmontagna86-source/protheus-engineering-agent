# Jornada do revisor

1. Selecione staged, unstaged, working tree ou branch/base de forma explícita.
2. Confira arquivos excluídos, renomes, binários, findings, callers e dependências.
3. Abra os diagnostics no painel Problemas e compare o JSON/SARIF pelo fingerprint.
4. Exija build/teste externo quando houver risco que a análise léxica não cobre.
5. Registre a decisão no Journal com autoria; promova para Memory somente após revisar a prévia e os hashes.

Saída: parecer rastreável com incertezas e riscos residuais, nunca “aprovado” apenas porque não houve finding determinístico.
