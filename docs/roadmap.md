# Roadmap P0 / P1 / P2

## P0 — Executable offline vertical slice

Entrega atual:

- runtime/CLI sem dependências externas;
- extensão VS Code fina;
- CodeGraph léxico ADVPL/TLPP;
- Project Memory e Journal;
- review determinístico e bug sheet;
- política por ambiente;
- MCP stdio;
- adaptador Hermes experimental por contrato, sem dependência no caminho principal;
- portas externas fail-closed;
- supervisor de build injetável;
- testes e documentação.

Critérios de aceite:

- suíte completa com zero falhas;
- syntax/manifest gate com zero falhas;
- doctor/index/review retornam JSON parseável;
- MCP initialize/list/call funciona em processo real;
- nenhum teste usa rede, credencial, Hermes state, Oracle, AppServer ou coleção RAG;
- smoke visual/manual da extensão explicitamente registrado como não executado no P0; adapter e manifest cobertos por testes automatizados.

## P1 — Specialist integration

Em andamento. Já entregue na preparação pública:

- VSIX autônomo, com runtime empacotado e quatro comandos sem engine/modelo;
- compatibilidade Hermes isolada, opt-in e fora do gate de release;
- Skills/Rules live, limitadas e tratadas como dados não confiáveis;
- contexto unificado exposto no runtime, CLI, MCP e comando fino do VS Code;
- specs persistentes, governança, auditor de publicação e CI localmente validada.
- CodeGraph explicável, bug review rastreável e benchmark sintético reproduzível;
- snapshots TDN/Dictionary versionados e supervisor de build com evidência verificável;
- coexistência real com TDS 2.0.16, workspace multi-root e arquivo CP1252/LF validada.

Próximos itens:

- tools nativas do VS Code para index, contexto e review, com testes determinísticos sem chamada de modelo;
- chat participant opcional que respeite o modelo escolhido pelo usuário e degrade com clareza quando indisponível;
- descoberta/configuração MCP para reutilizar as mesmas capacidades fora do VS Code;
- SDK MCP oficial após licença/SBOM/audit;
- parser incremental com gramática validada para ADVPL/TLPP;
- fixtures mínimas e evals derivados de exemplos ADVPL/TLPP validados, com checagem de assinaturas e sem copiar fontes GPL para o produto Apache-2.0;
- persistência versionada e locking entre processos;
- ampliar TDN/Dictionary para conectores autenticados sem perder proveniência/cache;
- adapter Protheus IA Lab para RAG/evals;
- executar compilação supervisionada em AppServer/RPO de homologação fornecido;
- executar piloto humano descrito em `docs/effectiveness-methodology.md`.

Critérios de aceite:

- fluxo especialista no VS Code usa as tools do produto sem exigir um orquestrador específico;
- mudança de skill/rule vale no próximo turno sem quebrar cache da conversa;
- cada finding especialista cita fonte e versão;
- compilação só roda após decisão explícita e registra comando/resultado sanitizado;
- zero escrita no perfil Hermes existente e na coleção RAG protegida;
- matriz de requisitos sem GAP não aceito.

## P2 — Supervised product workflows

- subagentes MCP com papel, depth, concorrência, timeout e orçamento;
- Oracle read-only com allowlist, bind variables, timeout e redaction;
- build supervisor durável com pause/resume/retry idempotente;
- revisão de diffs e gates de merge usando UI nativa do VS Code;
- evals de grounding, CodeGraph, review, bug diagnosis e prompt regression;
- telemetria local opt-in, SBOM, security scan e release readiness.

Critérios de aceite:

- execução sobrevive restart sem repetir efeitos não idempotentes;
- subagentes não herdam ferramentas/capacidades fora da allowlist;
- Oracle não aceita DDL/DML e nunca registra dados sensíveis;
- nenhum P0/P1 aberto; rollback testado;
- evals versionados, reproduzíveis e aprovados por humano;
- publicação somente após licença do produto e auditoria de dependências.

## Riscos prioritários

| Risco | Nível | Mitigação |
|---|---|---|
| Parser léxico divergir da sintaxe real | Alto | corpus, fontes padrão, fixtures CP1252 e parser dedicado no P1 |
| Agente executar no ambiente errado | Crítico | capability gate, workspace containment, grants e confirmação humana |
| Memory/prompt injection | Alto | dados delimitados, limites, proveniência e prioridade do turno atual |
| Oracle/TDN expor dado ou credencial | Crítico | adapters isolados, read-only, redaction, no fallback |
| Adapter externo incompatível | Médio | contrato versionado, capability probe opt-in e nenhuma dependência no core |
| Licença/supply chain | Alto | Apache-2.0 explícita, no-copy P0, Actions por SHA e SBOM antes de novas dependências/publicação |
| Falsa confiança do review | Alto | disclaimer, compilação/testes separados, revisão humana |
