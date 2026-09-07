# Roadmap

**Current Milestone:** Public Alpha Foundation
**Status:** In Progress

---

## Public Alpha Foundation

**Goal:** Disponibilizar um repositório público seguro, reproduzível e útil sem credenciais nem serviços externos.
**Target:** todos os gates `PUB-001` a `PUB-010` verificados e release `v0.2.0-alpha.1` aprovado.

### Features

**Executable Core** - COMPLETE

- Runtime/CLI, MCP, CodeGraph, review, contexto e permissões.
- 21 testes P0 aprovados antes do início do P1.

**Hermes Session Context** - IN PROGRESS

- Perfil ACP isolado por workspace.
- Skills/Rules relidos por snapshot.
- MCP do produto descrito para sessões ACP.

**Public Repository Readiness** - IN PROGRESS

- Specs, CI, segurança, contribuição e release plan.
- Remoção de referências privadas e auditoria de publicação.
- Licença e proprietário do repositório pendentes de decisão.

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

- Publicação opcional da extensão no VS Code Marketplace.
- Pacotes npm separados apenas se houver benefício de consumo externo.
- Compatibilidade com outras engines ACP além de Hermes.
