# Design — Ponte de compilação TDS por Language Model Tool v1

```text
Comando PEA no VS Code
  └─ valida workspace confiável + arquivo AdvPL/TLPP contido
       └─ confirmação explícita do desenvolvedor
            └─ vscode.lm.invokeTool("tds-lm-tools")
                 └─ TDS compila o alvo explícito no servidor já autenticado
                      └─ PEA limita/higieniza o resultado de diagnósticos
                           └─ canal PEA: completed | failed | unverified
```

## Decisões

1. A ponte fica no VSIX, pois `vscode.lm.invokeTool` requer Extension Host. O
   runtime/MCP continua independente e não passa a executar processo arbitrário.
2. O alvo é o editor AdvPL/TLPP ativo ou um caminho explicitamente fornecido pelo
   chamador; ambos passam por validação de containment e extensão.
3. A ponte não interpreta ausência de diagnósticos como sucesso do compilador.
   Se o TDS indicar timeout, resultado não JSON ou contrato inesperado, o retorno
   é `unverified`.
4. O recurso é opcional: versões sem a API ou sem a ferramenta TDS retornam
   `TDS_TOOL_UNAVAILABLE` de forma segura.
5. A evidência exibida omite padrões de credencial e é limitada a 64 KiB.

## Segurança

- workspace não confiável é recusado;
- não há acesso a SecretStorage, `servers.json` ou saída de terminal/log;
- o conjunto de flags é fixo; o usuário/LLM não controla comandos TDS;
- a compilação requer confirmação modal em toda invocação do comando;
- cancelamento é encaminhado ao token da API pública do VS Code.

## Limite de evidência

O TDS Tool retorna diagnósticos e sinal de atualização; não expõe, nesse
contrato, o código de saída, a identidade do compilador e o artefato hash exigidos
pelo `createBuildSupervisor`. Portanto, esta ponte torna a compilação iniciável e
correlacionada ao alvo correto, mas não transforma o resultado em
`compiler-verified`.
