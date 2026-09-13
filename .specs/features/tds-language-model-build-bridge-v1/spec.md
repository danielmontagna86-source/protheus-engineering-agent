# Especificação — Ponte de compilação TDS por Language Model Tool v1

## Contexto

O PEA deve complementar, não substituir, o TDS. O TDS 2.1.3 instalado publica a
ferramenta oficial `tds-lm-tools`, cujo contrato aceita o comando `compiler`, um
alvo explícito e flags de diagnóstico. O VS Code expõe `vscode.lm.invokeTool` para
uma extensão chamar uma Language Model Tool contribuída por outra extensão.

## Requisitos

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| TDSB-001 | Expor o comando PEA de compilação TDS. | `pea.compileWithTds` aparece no VS Code e só atua em workspace confiável. |
| TDSB-002 | Enviar apenas alvo local explícito e contido. | Caminho absoluto, arquivo AdvPL/TLPP permitido e dentro do workspace; nenhum conteúdo, senha ou token é enviado. |
| TDSB-003 | Usar exclusivamente a ferramenta oficial contribuída pelo TDS. | Chamada `vscode.lm.invokeTool('tds-lm-tools', …)` com `compiler`, `only=all`, `sort=file` e `format=json`; nenhuma API interna, log ou comando TDS privado. |
| TDSB-004 | Exigir decisão humana antes de compilar. | O comando apresenta confirmação modal com arquivo e alerta de alteração no RPO. |
| TDSB-005 | Produzir resultado seguro e útil. | Saída limitada, higienizada, com estado `completed`, `failed` ou `unverified`; timeout ou resposta malformada nunca são sucesso. |
| TDSB-006 | Preservar compatibilidade. | Em VS Code/TDS sem `lm.invokeTool`, devolver indisponibilidade explicável sem quebrar os demais comandos. |
| TDSB-007 | Cobrir falhas e caminho feliz em TDD. | Testes unitários comprovam contrato, limite, escopo, cancelamento, indisponibilidade, confirmação e manifesto. |
| TDSB-008 | Não elevar o gate de release além da prova. | A documentação registra que resultado de diagnósticos não equivale a artefato `compiler-verified` do supervisor até haver API de evidência/exit code. |

## Fora de escopo

- Reimplementar compilador, protocolo AppServer, RPO, token, Debug, Explorer ou terminal do TDS.
- Guardar credenciais ou ler `servers.json`, logs do TDS ou estado interno do TDS.
- Aplicar patch, deploy ou `BuildKillUsers`.
- Declarar execução do supervisor PEA como verificada apenas por diagnósticos.
