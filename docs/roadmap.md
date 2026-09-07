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
- adaptador Hermes por contrato;
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

- perfil Hermes isolado, capability probe opt-in e descriptors ACP/MCP;
- Skills/Rules live, limitadas e tratadas como dados não confiáveis;
- contexto unificado exposto no runtime, CLI, MCP e comando fino do VS Code;
- specs persistentes, governança, auditor de publicação e CI localmente validada.

Próximos itens:

- cliente ACP ou integração com extensão ACP existente;
- SDK MCP oficial após licença/SBOM/audit;
- parser incremental com gramática validada para ADVPL/TLPP;
- persistência versionada e locking entre processos;
- TDN MCP e Dictionary com proveniência/cache;
- adapter Protheus IA Lab para RAG/evals;
- compilação supervisionada com workspace/ambiente allowlist;
- bug review com tracers independentes e aprovação humana.

Critérios de aceite:

- conversa no VS Code usa Hermes e as tools do produto numa sessão isolada;
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
| Hermes local defasado | Alto | capability probe, perfil isolado, sem patch no core |
| Licença/supply chain | Alto | Apache-2.0 explícita, no-copy P0, Actions por SHA e SBOM antes de novas dependências/publicação |
| Falsa confiança do review | Alto | disclaimer, compilação/testes separados, revisão humana |
