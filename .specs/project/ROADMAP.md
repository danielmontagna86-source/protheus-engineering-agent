# Roadmap

**Current Milestone:** Public Alpha Foundation
**Status:** In Progress

---

## Public Alpha Foundation

**Goal:** Disponibilizar um repositório público seguro, reproduzível e útil sem credenciais nem serviços externos.
**Target:** todos os gates `PUB-001` a `PUB-010` verificados e preview `v0.3.0` aprovado.

### Features

**Executable Core** - COMPLETE

- Runtime/CLI, MCP, CodeGraph, review, contexto e permissões.
- 21 testes P0 aprovados antes do início do P1.

**Standalone VS Code Product** - P0 COMPLETE / P1 IN PROGRESS

- VSIX com runtime empacotado e comandos offline.
- Skills/Rules relidos por snapshot, raízes padrão e proveniência EngPro fixada.
- Achados de review publicados no painel Problems nativo.
- MCP portável e adapters de orquestrador opcionais.

**Public Repository Readiness** - LOCAL CANDIDATE IN PROGRESS

- Specs, CI, segurança, contribuição e release plan.
- Remoção de referências privadas e auditoria de publicação.
- Licença e proprietário do repositório definidos; evidência final e autorização externa permanecem pendentes.
- Metadados Marketplace `0.3.0`, ícone e walkthrough automatizado concluídos; screenshots, UAT TDS e aprovação externa permanecem pendentes.

---

## Specialist Integrations

**Goal:** Adicionar integrações reais somente após contratos e ambientes de teste seguros.

### Features

**TDN and Dictionary adapters** - PLANNED

**Supervised Protheus build** - PLANNED

**Dual-tracer bug review** - PLANNED

---

## Supervised Engineering

**Goal:** Introduzir Oracle read-only, subagentes limitados e evals de produto.

### Features

**Bounded MCP subagents** - PLANNED

**Oracle read-only** - PLANNED

**AI and grounding evals** - PLANNED

---

## Future Considerations

- Publicação da extensão no Visual Studio Marketplace somente após screenshots/UAT, CI final, validação do publisher e autorização explícita.
- Pacotes npm separados apenas se houver benefício de consumo externo.
- Compatibilidade opcional com hosts MCP/ACP sem engine obrigatória.
