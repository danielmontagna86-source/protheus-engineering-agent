# Target architecture

## Decisão

Adotar um **hexágono local**: o domínio Protheus Engineering vive em módulos sem UI e sem dependência do Hermes; VS Code, Hermes ACP/MCP, TDN, Dictionary, Oracle e compilador são adaptadores nas bordas.

```text
VS Code commands/output
        |
        v
Runtime API / CLI -------------------- MCP stdio <---- Hermes ACP session
        |
        +-- Project Context (memory + journal)
        +-- ADVPL/TLPP CodeGraph
        +-- Review / Bug Sheet
        +-- Policy / Permission Gate
        +-- Build Supervisor
        |
        +-- Ports: TDN | Dictionary | Oracle | Compiler
                       (unavailable by default)
```

## Invariantes

1. VS Code apresenta e encaminha; não contém regra de negócio.
2. Hermes orquestra, mas não é o dono do estado especializado do projeto.
3. Memória e resultados externos entram no prompt como dados não confiáveis, delimitados e limitados.
4. Toda capacidade mutável ou externa passa pela política do ambiente.
5. `production` exige grant explícito para escrita, build e Oracle.
6. Integrações ausentes falham fechadas e nunca acionam fallback pago/rede.
7. CodeGraph e review são read-only no P0.
8. Nenhum módulo assume que compilação, AppServer, RPO, Oracle ou TDN estão disponíveis.
9. Erros retornam contratos estruturados; stdout MCP permanece exclusivo de JSON-RPC.
10. O runtime é executável sem extensão, Hermes ou dependências npm.

## Data flow de review

1. A extensão envia o caminho do arquivo e o workspace ao CLI.
2. O runtime valida contenção e extensão.
3. O decoder tenta UTF-8 estrito e cai para Windows-1252.
4. O reviewer produz findings determinísticos com arquivo, linha, regra e severidade.
5. O CodeGraph opcional resolve símbolo-alvo e callers/callees.
6. A bug sheet reconcilia evidência de fonte e impacto do grafo.
7. Hermes poderá consumir o mesmo resultado via MCP, sem nova implementação.

## Project Memory e Journal

- Estado em `<workspace>/.pea/`.
- `.pea`, arquivos de contexto e Hermes home rejeitam symlink/junction que escape a fronteira do workspace.
- `memory.md` limitado a 8 KiB no P0.
- `journal.jsonl` rotacionado por contagem.
- fila por instância serializa gravações concorrentes.
- escrita usa arquivo temporário no mesmo diretório e rename.
- colisão ou symlink falha fechada.
- P1 adicionará locking entre processos e proveniência de commits/builds.

## Hermes integration

O runtime já entrega o launch descriptor de `hermes acp` e o descriptor MCP da sessão. O `HERMES_HOME` padrão fica em `<workspace>/.pea/hermes`, e `PEA_HERMES_COMMAND` permite localizar o executável sem fixar caminho pessoal. Quando o CLI nasce no Extension Host, o contrato Electron-as-Node é preservado também no MCP iniciado pelo Hermes. O cliente ACP visual no VS Code ainda é P1; o produto não duplica o cliente nem altera o perfil Hermes cotidiano.

## Environment permissions

| Capability | Development | Test | Production |
|---|---|---|---|
| workspace/context read | allow | allow | allow |
| context write | allow | allow | explicit grant |
| workspace write | explicit grant | undeclared | explicit grant |
| build execute | explicit grant | undeclared | explicit grant |
| Oracle read | undeclared | undeclared | explicit grant |
| unknown capability | deny | deny | deny |

## Error handling

- CLI: JSON no stdout em sucesso, JSON no stderr e exit code 1 em falha, code 2 para uso inválido.
- MCP: erro de tool usa `isError: true`; método desconhecido usa JSON-RPC `-32601`.
- Integrações: `INTEGRATION_UNAVAILABLE` sem side effect.
- Build: primeira etapa bloqueada/falha encerra a execução e preserva o estado parcial.
