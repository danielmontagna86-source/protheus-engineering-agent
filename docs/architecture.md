# Target architecture

## Decisão

Adotar um **hexágono local distribuído como um único VSIX**: o domínio Protheus Engineering vive em módulos sem UI e sem dependência de engine; VS Code é a interface primária, MCP é a porta portável e Hermes, TDN, Dictionary, Oracle e compilador são adaptadores opcionais nas bordas.

```text
VS Code commands/output (produto primário)
        |
        v
Runtime empacotado / CLI ------------- MCP stdio <---- hosts compatíveis
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
2. Nenhum orquestrador externo é necessário ou dono do estado especializado do projeto.
3. Memória e resultados externos entram no prompt como dados não confiáveis, delimitados e limitados.
4. Toda capacidade mutável ou externa passa pela política do ambiente.
5. `homologation` e `production` exigem grant explícito para escrita, build, Oracle e provedor de IA.
6. Integrações ausentes falham fechadas e nunca acionam fallback pago/rede.
7. CodeGraph e review são read-only no P0.
8. Nenhum módulo assume que compilação, AppServer, RPO, Oracle ou TDN estão disponíveis.
9. Erros retornam contratos estruturados; stdout MCP permanece exclusivo de JSON-RPC.
10. O VSIX executa sem Hermes, modelo ou instalação separada do runtime; o runtime também é executável fora da extensão sem dependências npm obrigatórias.

## Data flow de review

1. A extensão envia o caminho do arquivo e o workspace ao CLI.
2. O runtime valida contenção e extensão.
3. O decoder tenta UTF-8 estrito e cai para Windows-1252.
4. O reviewer produz findings determinísticos com arquivo, linha, regra e severidade.
5. O CodeGraph opcional resolve símbolo-alvo e callers/callees.
6. A bug sheet reconcilia evidência de fonte e impacto do grafo.
7. VS Code tools, Hermes ou qualquer host MCP poderão consumir o mesmo resultado sem nova implementação do domínio.

## Project Memory e Journal

- Estado em `<workspace>/.pea/`.
- `.pea`, arquivos de contexto e Hermes home rejeitam symlink/junction que escape a fronteira do workspace.
- `memory.md` limitado a 8 KiB no P0.
- `journal.jsonl` rotacionado por contagem.
- fila por instância e lock exclusivo workspace-local serializam gravações concorrentes entre instâncias/processos;
- escrita usa arquivo temporário no mesmo diretório e rename.
- colisão ou symlink falha fechada.
- lock abandonado tem recuperação limitada por idade; symlink/junction e troca de ownership falham fechados.

## AI and optional orchestrators

O caminho P1 prioriza tools nativas do VS Code para capacidades que precisam do editor e MCP para capacidades portáveis. O usuário poderá empregar o modelo/orquestrador aceito pelo seu ambiente; o núcleo determinístico continua disponível sem IA.

O adaptador experimental Hermes entrega o launch descriptor de `hermes acp` e o descriptor MCP da sessão. O `HERMES_HOME` padrão fica em `<workspace>/.pea/hermes`, e `PEA_HERMES_COMMAND` permite localizar o executável sem fixar caminho pessoal. O probe é opt-in, não faz parte do gate do núcleo e nunca altera o perfil cotidiano.

## Coexistence with TDS-VSCode

TDS-VSCode permanece responsável por linguagem, LSP/DAP, compilação, depuração, RPO e servidores. Este produto se limita a contexto de engenharia, CodeGraph complementar, revisão baseada em evidência, memória/regras do projeto e integrações supervisionadas.

## Environment permissions

| Capability | Local | Development | Test | Homologation | Production |
|---|---|---|---|---|---|
| workspace/context read | allow | allow | allow | allow | allow |
| context write | allow | allow | allow | explicit grant | explicit grant |
| workspace write | explicit grant | explicit grant | undeclared | explicit grant | explicit grant |
| build execute | explicit grant | explicit grant | undeclared | explicit grant | explicit grant |
| Oracle read | undeclared | undeclared | undeclared | explicit grant | explicit grant |
| AI provider invoke | explicit grant | explicit grant | undeclared | explicit grant | explicit grant |
| unknown capability | deny | deny | deny | deny | deny |

The asynchronous permission broker correlates every approval, limits the purpose field and fails closed when the host has no approval handler, denies, times out, cancels or returns malformed evidence. Approval for one capability never grants another.

## Error handling

- CLI: JSON no stdout em sucesso, JSON no stderr e exit code 1 em falha, code 2 para uso inválido.
- MCP: erro de tool usa `isError: true`; método desconhecido usa JSON-RPC `-32601`.
- Integrações: `INTEGRATION_UNAVAILABLE` sem side effect.
- Build: primeira etapa bloqueada/falha encerra a execução e preserva o estado parcial.
