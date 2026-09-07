# Protheus Engineering Agent

Runtime aberto de engenharia para ADVPL/TLPP, com VS Code como interface principal, análise baseada em evidências e integração opcional com engines como Hermes por ACP/MCP.

> Projeto comunitário independente, em estágio alpha. Não é afiliado, patrocinado ou mantido pela TOTVS, pela marca Protheus ou pelo projeto Hermes Agent. As marcas pertencem aos seus respectivos titulares.

[English](README.en.md) · [Posicionamento](docs/brand-positioning.md) · [Arquitetura](docs/architecture.md) · [Roadmap](docs/roadmap.md) · [Segurança](SECURITY.md) · [Como contribuir](CONTRIBUTING.md)

## O que já executa

- indexação local de símbolos e chamadas ADVPL/TLPP;
- pre-review determinístico com evidência de arquivo/linha;
- Project Memory e Journal locais, limitados e atômicos;
- política por ambiente com deny-by-default;
- supervisor de build com runner injetável e gate de capacidade;
- servidor MCP stdio com tools de doctor, index, review e contexto;
- Skills e Rules locais lidas ao vivo, limitadas e tratadas como dados não confiáveis;
- adaptador Hermes que produz os descritores ACP/MCP com perfil isolado e faz probe somente quando solicitado;
- extensão VS Code fina com quatro comandos, sem UI de terminal/explorer/Git própria.

O chat ACP completo dentro da extensão, o compilador Protheus, TDN/Dictionary reais, Oracle e subagentes paralelos estão planejados para P1/P2 e ainda não estão disponíveis.

## Executar sem instalação

Pré-requisito: Node.js 22 ou superior.

```sh
node --test
node scripts/check.mjs
node packages/runtime/src/cli.mjs doctor .
node packages/runtime/src/cli.mjs index /path/to/workspace
node packages/runtime/src/cli.mjs session /path/to/workspace
node packages/runtime/src/cli.mjs review /path/to/source.prw /path/to/workspace
```

O comando `doctor` não inicia nem consulta Hermes por padrão. Para um probe explícito de capacidade:

```sh
node packages/runtime/src/cli.mjs doctor . --probe-hermes
```

Se `hermes` não estiver no `PATH`, use `PEA_HERMES_COMMAND` no ambiente do processo. O produto nunca exige nem modifica o perfil pessoal do Hermes; por padrão usa `<workspace>/.pea/hermes`.

O executável Hermes pode inicializar seu subsistema de logs mesmo no `--check`. Em validações e CI, use um `HERMES_HOME` isolado; não aponte o probe para o perfil cotidiano.

## Servidor MCP

O processo usa o diretório atual como workspace e, por segurança, inicia no ambiente `production`, onde escrita de memória exige grant explícito.

```powershell
node packages/mcp/src/stdio.mjs
```

Configuração conceitual para um host MCP:

```json
{
  "command": "node",
    "args": ["/path/to/protheus-engineering-agent/packages/mcp/src/stdio.mjs"],
    "cwd": "/path/to/protheus-workspace"
}
```

Para conceder escrita de Project Memory ao processo, defina `PEA_GRANTS=context:write` de forma explícita no host. TDN, Dictionary, Oracle e build real não ganham acesso com esse grant.

## Extensão VS Code

Abra a raiz deste produto no VS Code e execute a configuração `Run Protheus Engineering Agent Extension` com `F5`. No Extension Development Host, abra um workspace Protheus e use a paleta:

- `Protheus Agent: Doctor`
- `Protheus Agent: Index Workspace`
- `Protheus Agent: Show Engineering Context`
- `Protheus Agent: Review Active ADVPL/TLPP File`

A extensão apenas chama o runtime e mostra JSON em um Output Channel. Ela não substitui editor, terminal, explorer, Git, diff ou chat do VS Code.

## Estrutura

```text
apps/vscode-extension/        cliente fino do VS Code
packages/runtime/             composição e CLI
packages/agent-resources/     Skills e Rules do projeto
packages/codegraph-advpl/     parser/indexador P0
packages/project-context/     memory/journal
packages/policy/              permissões por ambiente
packages/hermes-adapter/      contrato ACP
packages/review/              review e bug sheet
packages/mcp/                 MCP stdio
packages/integrations/        portas TDN/Dictionary/Oracle
packages/build-supervisor/    máquina de estados
test/                         testes de comportamento
docs/                         arquitetura, auditoria, roadmap e QA
plan/                         plano executável por fases
```

## Qualidade e publicação

```sh
npm run validate
npm run smoke
npm run publication:release-check
```

`validate` é o gate local completo. `smoke` comprova o caminho crítico CLI/MCP em menos de cinco minutos. O gate de release é deliberadamente mais rigoroso e permanece bloqueado sem evidências reais de CI, revisões e smokes externos. O CI repete testes, smoke e verificações estruturais em Windows e Linux.

## Limites atuais

- O CodeGraph usa uma análise léxica deliberadamente pequena, não uma gramática completa.
- O review é um pre-gate determinístico; não substitui compilação, análise oficial, testes funcionais ou revisão humana.
- A extensão ainda não implementa um cliente ACP de chat.
- Nenhuma integração externa foi configurada ou exercitada.
- Integrações externas permanecem fail-closed e não recebem credenciais implicitamente.
- O produto é distribuído sob a licença [Apache-2.0](LICENSE.md); avisos e licenças de referências permanecem separados.

Os resultados reproduzíveis e os limites do gate estão no [relatório de validação](docs/validation-report.md). Veja também o [plano de publicação](docs/publication-plan.md).
