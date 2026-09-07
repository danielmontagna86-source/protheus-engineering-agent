# Protheus Engineering Agent

**Vision:** Criar uma extensão de engenharia aberta para equipes que desenvolvem em ADVPL/TLPP, instalável diretamente no VS Code e sustentada por um runtime reutilizável e interoperável por MCP.
**For:** Desenvolvedores, consultores, mantenedores e equipes de qualidade do ecossistema Protheus.
**Solves:** Reúne contexto de projeto, análise de código, revisão, conhecimento especialista e execução supervisionada sem exigir uma IDE proprietária paralela.

## Goals

- Permitir que uma pessoa clone o repositório e execute doctor, CodeGraph, review e MCP apenas com Node.js suportado.
- Manter 100% dos testes bloqueantes aprovados em Windows e Linux antes de cada merge.
- Manter Hermes e outros orquestradores como compatibilidade opcional, sem torná-los dependência ou gate de release.
- Exigir evidência e proveniência para findings, builds e integrações especialistas.
- Publicar releases reproduzíveis com licença, checksums e notas de mudança.

## Tech Stack

**Core:**

- Runtime: Node.js 22 ou 24, módulos da biblioteca padrão.
- Language: JavaScript ESM; CommonJS somente na borda da extensão VS Code.
- Interface: VS Code Extension fina.
- Agent transport: tools nativas do VS Code no caminho principal futuro; MCP stdio para capacidades portáveis; ACP apenas em adapters opcionais.
- Persistence P0/P1: arquivos locais limitados em `.pea/`; sem banco obrigatório.

**Key dependencies:** nenhuma dependência npm em runtime no estágio atual.

## Scope

**v1 includes:**

- CodeGraph e review ADVPL/TLPP com evidências.
- Project Memory, Journal, Skills e Rules por projeto.
- Adaptadores opcionais e isolados para Hermes e outros hosts ACP/MCP.
- Build supervisionado, TDN/Dictionary e Oracle por adapters fail-closed.
- CI, segurança, documentação, contribuição e releases no GitHub.

**Explicitly out of scope:**

- Reimplementar editor, terminal, explorer, Git UI ou shell Electron.
- Distribuir Hermes, TOTVS, Protheus, AppServer, RPO ou conteúdo proprietário.
- Executar deploy, Oracle ou compilação real sem configuração e aprovação explícitas.
- Alegar afiliação ou suporte oficial da TOTVS ou Nous Research.

## Constraints

- Produto independente; marcas de terceiros devem ter disclaimer claro.
- Nenhuma credencial, caminho pessoal, corpus privado ou estado local entra no repositório público.
- Licença do produto: Apache-2.0, escolhida pelo proprietário em 2026-09-07.
- O primeiro release público será alpha e não prometerá compilação ou integrações externas ainda não validadas.
