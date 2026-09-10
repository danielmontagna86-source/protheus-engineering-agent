# Roadmap

**Current Milestone:** Stable 1.0 Launch Program
**Status:** In Progress

**Release strategy:** `0.3` remains the internal evidence baseline. `0.4` and `0.5` are implementation milestones; the public stable target is `1.0.0` only after the promotion ledger is green. Docker is internal QA only and is never a VSIX/runtime prerequisite.

---

## Public Alpha Foundation

**Goal:** Disponibilizar um repositório público seguro, reproduzível e útil sem credenciais nem serviços externos.
**Target:** preserve the `v0.3.0` evidence baseline; do not publish it as the stable product.

### Features

**Executable Core** - COMPLETE

- Runtime/CLI, MCP, CodeGraph, review, contexto e permissões.
- 21 testes P0 aprovados antes do início do P1.

**Standalone VS Code Product** - P0/P1 CONTRACT COMPLETE

- VSIX com runtime empacotado e comandos offline.
- Skills/Rules relidos por snapshot, raízes padrão e proveniência EngPro fixada.
- Achados de review publicados no painel Problems nativo.
- MCP portável e adapters de orquestrador opcionais.

**Public Repository Readiness** - LOCAL CANDIDATE IN PROGRESS

- Specs, CI, segurança, contribuição e release plan.
- Remoção de referências privadas e auditoria de publicação.
- Licença e proprietário do repositório definidos; evidência final e autorização externa permanecem pendentes.
- Metadados Marketplace `0.3.0`, ícone e walkthrough automatizado concluídos; screenshots, UAT TDS e aprovação externa permanecem pendentes.
- Contrato de divulgação pública rastreável concluído: tópicos, preview social, mídia real, publisher, segurança pública, proteção de `main`, proveniência, release/Marketplace e adoção ética agora possuem procedimento e critérios explícitos. A execução externa permanece bloqueada até o gate de release.

---

## Productized Evidence Layer 0.4

**Status:** Automated repository scope implemented; human/public gates remain.
**Goal:** Transformar os contratos especialistas existentes em jornadas completas e descobríveis no VS Code e no CI.

### P0 capabilities

- Engineering Center nativo para Workspace, Change Review, Memory, Integrations e Environment.
- revisão de staged/unstaged/branch diff com impacto CodeGraph e evidência consolidada;
- saída JSON/SARIF com fingerprint estável e GitHub Action reutilizável;
- migração do MCP para o SDK TypeScript oficial;
- VS Code Language Model Tools e Agent Skills portáveis, sem chat/modelo próprio obrigatório;
- configuração tipada, SecretStorage, pt-BR/en e sample workspace legal com jornada de cinco minutos;
- build supervisor completo em VS Code/CLI/MCP sem exigir Docker; analyzer oficial TOTVS apenas como validação interna de QA.

**Canonical spec:** `.specs/features/product-completeness-v1/`
**Execution plan:** `plan/feature-product-completeness-v1-1.md`

---

## Semantic Evidence 0.5

**Status:** Declared contract/corpus implemented; Linux and live-provider evidence remain.
**Goal:** Aumentar fidelidade sem alegar equivalência ao compilador.

- corpus legal de conformidade ADVPL/TLPP e IR versionada;
- parser tolerante incremental com confiança e relações não resolvidas explícitas;
- avaliação de enriquecimento TDS somente por interface suportada;
- UX de Project Memory/Journal com promoção, revisão e expiração;
- onboarding TDN/Dictionary e porta genérica para consultas nomeadas read-only;
- budgets de repositório grande em Windows/Linux.

---

## Governed 1.0

**Status:** External-evidence milestone.
**Goal:** Substituir hipóteses por evidência de homologação, acessibilidade, uso humano e release público.

- AppServer/RPO e banco em homologação autorizada;
- acessibilidade, screenshots e UAT visual;
- piloto representativo preregistrado, sem meta de ganho predeterminada;
- matriz de compatibilidade, suporte e depreciação;
- CI/OSV/CodeQL/SBOM/hashes/reprodução do artefato exato e revisão jurídica;
- publicação somente após autorização nominal.

**Stable launch spec:** `.specs/features/stable-1-0-launch/`

**Launch program:** `docs/plans/2026-09-08-stable-1-0-launch-program.md`

**QA plan:** `docs/plans/2026-09-08-stable-1-0-qa-plan.md`

---

## Specialist Integrations

**Goal:** Adicionar integrações reais somente após contratos e ambientes de teste seguros.

### Features

**TDN and Dictionary adapters** - VERSIONED SNAPSHOT CONTRACT COMPLETE

**Supervised Protheus build** - CONTRACT, PROCESS EVIDENCE AND DURABLE RESUME COMPLETE; LIVE APPSERVER GATE EXTERNAL

**Traceable bug review** - COMPLETE

---

## Supervised Engineering

**Goal:** Introduzir Oracle read-only, subagentes limitados e evals de produto.

### Features

**Bounded MCP subagents** - CONTRACT COMPLETE

**Oracle read-only** - NAMED-QUERY CONTRACT COMPLETE; LIVE DATABASE GATE EXTERNAL

**AI and grounding evals** - PROVIDER-NEUTRAL CONTRACT AND REGRESSION SUITE COMPLETE; HUMAN EFFECTIVENESS PILOT EXTERNAL

---

## Future Considerations

- Publicação da extensão no Visual Studio Marketplace somente após screenshots/UAT, CI final, validação do publisher e autorização explícita.
- Pacotes npm separados apenas se houver benefício de consumo externo.
- Compatibilidade opcional com hosts MCP/ACP sem engine obrigatória.
- Camada comercial/team somente após evidência de adoção e disposição a pagar; a edição comunitária permanece a hipótese inicial.
