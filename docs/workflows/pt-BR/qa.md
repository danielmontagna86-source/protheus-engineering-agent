# Jornada de QA

1. Rode `npm ci`, `npm run validate`, smoke, benchmark e empacotamento em checkout limpo.
2. Instale o VSIX real em perfis isolados no VS Code mínimo e atual; repita com TDS.
3. Valide multi-root, Git scopes, CP1252/LF, cancelamento, timeout, entradas malformadas e ausência de rede/Docker.
4. Execute teclado, foco, leitor de tela, alto contraste, zoom e pt-BR/en.
5. Separe fixture, simulação, contrato e evidência live. Um adapter sintético nunca prova AppServer ou banco real.

Saída: matriz de gates ligada ao commit e hashes exatos, com NO-GO para qualquer prova obrigatória ausente.
