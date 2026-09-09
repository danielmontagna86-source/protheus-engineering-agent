# Protheus Engineering Agent

Extensão VS Code autônoma para engenharia ADVPL/TLPP, com runtime aberto e reutilizável, análise baseada em evidências e interoperabilidade por MCP.

> Projeto comunitário independente, em estágio alpha. Não é afiliado, patrocinado ou mantido pela TOTVS, pela marca Protheus ou pelo projeto Hermes Agent. As marcas pertencem aos seus respectivos titulares.

[English](README.en.md) · [Começar](docs/getting-started.md) · [Contrato público](docs/public-contract.md) · [Compatibilidade](docs/compatibility.md) · [Limites](docs/limitations.md) · [Roadmap](docs/roadmap.md) · [Segurança](SECURITY.md) · [Como contribuir](CONTRIBUTING.md)

O caminho principal exige somente o VSIX: não exige Hermes, conta de IA, modelo, Python, Oracle, TDN ou AppServer. O runtime determinístico é empacotado junto da extensão.

## O que já executa

- indexação local de símbolos, chamadas, callers, dependências, ambiguidades e alvos não resolvidos;
- pre-review determinístico e bug review rastreável com evidência de arquivo/linha/impacto;
- Project Memory e Journal locais, atribuídos, limitados e atômicos, com promoção revisada, hashes, expiração e recuperação de corrupção;
- política `local/development/test/homologation/production` com deny-by-default e broker de aprovação;
- supervisor de build injetável com evidência de compilador/artefato e retomada idempotente;
- onboarding de snapshots TDN/Dictionary com licença/proveniência, freshness, SHA-256 e atualização atômica; adapters Oracle/PostgreSQL read-only por consulta nomeada;
- subagentes MCP limitados por tool, profundidade, concorrência, timeout, checkpoint e diff;
- gateway de IA neutro, opt-in, estruturado, com redaction e sem telemetria;
- servidor MCP stdio para as capacidades portáveis do runtime;
- Skills em caminhos padrão do ecossistema, Rules locais e provedores fixados por commit, todos limitados e tratados como dados não confiáveis;
- adaptador experimental e opcional para Hermes, fora do caminho crítico e do gate de release;
- extensão VS Code fina com Central de Engenharia, comandos determinísticos, Language Model Tools e skill portável, sem UI de terminal/explorer/Git própria.

As integrações são contratos prontos, mas continuam inativas até o host fornecer configuração, autorização e, quando aplicável, credenciais. O compilador/AppServer/RPO real e um driver Oracle real não estão embutidos. O produto nunca transforma simulação em prova de compilação.

## Desenvolvimento local

Pré-requisito: Node.js 22 ou superior. Os testes e o empacotamento usam dependências de desenvolvimento bloqueadas no `package-lock.json`.

```sh
npm ci
npm run validate
```

O runtime de domínio continua desacoplado; o servidor MCP usa o SDK oficial empacotado. A CLI também pode ser chamada diretamente:

```sh
node packages/runtime/src/cli.mjs doctor .
node packages/runtime/src/cli.mjs index /path/to/workspace
node packages/runtime/src/cli.mjs session /path/to/workspace
node packages/runtime/src/cli.mjs review /path/to/source.prw /path/to/workspace
```

### Compatibilidade opcional com Hermes

Hermes não participa dos comandos normais nem dos critérios de publicação. Para testar voluntariamente o adaptador experimental:

```sh
node packages/runtime/src/cli.mjs doctor . --probe-hermes
```

Se `hermes` não estiver no `PATH`, use `PEA_HERMES_COMMAND` no ambiente do processo. O produto nunca exige nem modifica o perfil pessoal do Hermes; por padrão usa `<workspace>/.pea/hermes`. Esse resultado é evidência de compatibilidade opcional, não um gate do núcleo.

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

Para conceder escrita de Project Memory ao processo, defina `PEA_GRANTS=context:write` de forma explícita no host. TDN/Dictionary usam apenas snapshots configurados. Oracle, IA e build exigem adapters do host e grants próprios; um grant nunca autoriza outra capacidade.

## Extensão VS Code

Para desenvolvimento, instale as dependências bloqueadas no lockfile, abra a raiz deste produto no VS Code e execute `Run Protheus Engineering Agent Extension` com `F5`. A tarefa de inicialização gera o runtime autocontido antes de abrir o Extension Development Host.

```sh
npm ci
```

Para gerar o mesmo VSIX auditado que será anexado ao GitHub Release:

```sh
npm run package:extension
code --install-extension release-artifacts/protheus-engineering-agent-v0.3.0.vsix
```

No workspace ADVPL/TLPP, use a Central de Engenharia ou a paleta para:

- `Protheus Agent: Doctor`
- `Protheus Agent: Index Workspace`
- `Protheus Agent: Show Engineering Context`
- `Protheus Agent: Review Active ADVPL/TLPP File`
- `Protheus Agent: Review Git Changes`
- registrar, promover e expirar Memory/Journal;
- importar snapshots TDN/Dictionary autorizados;
- preparar, executar, consultar, cancelar e inspecionar evidência de build supervisionado.

A extensão apenas chama o runtime empacotado, preserva o JSON auditável no Output Channel e publica os findings no painel nativo Problems. Ela complementa o TDS-VSCode e não substitui editor, linguagem, compilador, debugger, terminal, explorer, Git, diff ou chat do VS Code.

## Estrutura

```text
apps/vscode-extension/        cliente fino do VS Code
packages/runtime/             composição e CLI
packages/agent-resources/     Skills e Rules do projeto
packages/codegraph-advpl/     parser/indexador P0
packages/project-context/     memory/journal
packages/policy/              permissões por ambiente
packages/hermes-adapter/      compatibilidade Hermes opcional
packages/review/              review e bug sheet
packages/mcp/                 MCP stdio
packages/integrations/        portas TDN/Dictionary/Oracle
packages/build-supervisor/    máquina de estados
packages/subagents/           execução filha limitada e recuperável
packages/ai-gateway/          provider de IA opcional e governado
benchmark/                    baseline de efetividade reproduzível
test/                         testes de comportamento
docs/                         arquitetura, auditoria, roadmap e QA
plan/                         plano executável por fases
```

## Qualidade e publicação

```sh
npm run validate
npm run smoke
npm run build:release
npm run verify:release
npm run test:vscode:host
npm run test:vscode:minimum
npm run test:vscode:tds
npm run benchmark
npm run benchmark:large
npm run publication:release-check
```

`validate` é o gate determinístico do código-fonte. `smoke` comprova o caminho crítico CLI/MCP em menos de cinco minutos. `build:release` só aceita árvore limpa e `verify:release` refaz o VSIX a partir do fonte para exigir igualdade byte a byte; `publication:release-check` sempre executa essa verificação antes de avaliar o GO. Os smokes instalam o VSIX em perfil isolado no VS Code atual e no mínimo 1.95.3; o UAT TDS também valida coexistência, multi-root e preservação CP1252/LF. O benchmark mede somente fixtures sintéticas e não sustenta promessa de produtividade. O gate de release permanece bloqueado sem evidências do commit candidato, CI, revisões, artefatos e aprovação.

## Limites atuais

- O CodeGraph usa parser léxico tolerante incremental com IR versionada e corpus legal declarado, não uma gramática completa nem equivalência ao compilador.
- O review é um pre-gate determinístico; não substitui compilação, análise oficial, testes funcionais ou revisão humana.
- A extensão não implementa chat próprio; usa comandos, superfícies nativas, Language Model Tools, skill portável e MCP governado.
- TDN/Dictionary foram exercitados com snapshots; Oracle/build/IA foram exercitados com adapters sintéticos e processos locais, não com infraestrutura de cliente.
- Integrações externas permanecem fail-closed, não recebem credenciais implicitamente e exigem validação no ambiente homologado do adotante.
- Ganho de produtividade e liderança de mercado não são alegações aprovadas; exigem o piloto humano publicado em `docs/effectiveness-methodology.md`.
- O produto é distribuído sob a licença [Apache-2.0](LICENSE.md); avisos e licenças de referências permanecem separados.

Os resultados reproduzíveis e os limites do gate estão no [relatório de validação](docs/validation-report.md). Veja também o [plano de publicação](docs/publication-plan.md).
