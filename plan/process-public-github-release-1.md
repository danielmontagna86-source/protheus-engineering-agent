---
goal: Prepare and publish the Protheus Engineering Agent as an independent public GitHub product
version: 1.0
date_created: 2026-09-07
last_updated: 2026-09-07
owner: Montagna
status: 'In progress'
tags: [process, github, release, open-source, security, qa]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In%20progress-yellow)

Transformar o scaffold local em um produto público independente, com especificação persistente, CI reproduzível, governança, licença explícita e release alpha auditável.

## 1. Requirements & Constraints

- **REQ-001**: Cumprir `PUB-001` a `PUB-010` em `.specs/features/public-github-release/spec.md`.
- **REQ-002**: Manter runtime executável sem dependências npm.
- **REQ-003**: Oferecer documentação em português e inglês antes do alpha.
- **SEC-001**: Não publicar credenciais, caminhos pessoais, `.pea`, `.env`, dumps, logs, RPO, fontes privados ou estado recuperado.
- **SEC-002**: GitHub Actions deve usar `contents: read`, sem segredos em PRs de forks e sem `pull_request_target`.
- **SEC-003**: Integrações externas permanecem fail-closed.
- **CON-001**: Apache-2.0 é a licença aprovada pelo proprietário.
- **CON-002**: O repositório canônico é `danielmontagna86-source/protheus-engineering-agent`.
- **CON-003**: Não publicar no Marketplace VS Code no primeiro alpha.
- **GUD-001**: Cada requisito deve apontar para teste, verificação manual ou blocker explícito.
- **PAT-001**: Releases usam SemVer, changelog, checksum e tag imutável.

## 2. Implementation Steps

### Implementation Phase 1 — Public repository foundation

- GOAL-001: Tornar o conteúdo portátil e verificável antes de criar o remoto.

| Task | Description | Completed | Date |
|---|---|---:|---|
| TASK-001 | Criar `.specs/project`, `.specs/codebase` e spec/design/tasks do release público. | x | 2026-09-07 |
| TASK-002 | Implementar Hermes isolado, Skills/Rules live e contexto MCP/VS Code. | x | 2026-09-07 |
| TASK-003 | Criar auditor de publicação testado em `scripts/publication-check.mjs`. | x | 2026-09-07 |
| TASK-004 | Criar README público, README inglês e arquivos de governança. | x | 2026-09-07 |
| TASK-005 | Criar CI GitHub multiplataforma com permissões mínimas. | x (local) | 2026-09-07 |

### Implementation Phase 2 — Release candidate gate

- GOAL-002: Produzir candidato alpha revisado e reproduzível.

| Task | Description | Completed | Date |
|---|---|---:|---|
| TASK-006 | Escolher e aplicar licença SPDX consistente. | x: Apache-2.0 | 2026-09-07 |
| TASK-007 | Definir owner/slug e completar URLs/metadados. | x | 2026-09-07 |
| TASK-008 | Executar full tests, structural audit, code review, security review, mutation gate e smokes. | partial: local automated/review/mutation PASS | 2026-09-07 |
| TASK-009 | Gerar arquivo `RELEASE-v0.3.0.md`, pacote e SHA-256. |  |  |

### Implementation Phase 3 — GitHub publication

- GOAL-003: Criar e proteger o repositório público somente após GO assinado.

| Task | Description | Completed | Date |
|---|---|---:|---|
| TASK-010 | Criar repositório inicialmente privado, enviar branch de preparação e abrir draft PR. |  |  |
| TASK-011 | Validar CI real e configurar required checks/review em `main`. |  |  |
| TASK-012 | Tornar público, criar tag/release e conferir artefatos baixados. |  |  |
| TASK-013 | Monitorar issues/security por 24 horas e registrar pós-release. |  |  |

## 3. Alternatives

- **ALT-001**: Publicar imediatamente o ZIP atual. Rejeitado: sem licença, CI, governança e disclaimer suficientes.
- **ALT-002**: Publicar um fork LionCodeLabs. Rejeitado: duplica IDE, amplia dependências e confunde autoria/escopo.
- **ALT-003**: Acoplar o produto ao checkout Hermes. Rejeitado: reduz portabilidade e arrisca estado/configuração do usuário.

## 4. Dependencies

- **DEP-001**: GitHub Actions reais e branch protection só podem ser validados após criação do remoto.
- **DEP-002**: Smoke VS Code exige Extension Development Host interativo.
- **DEP-003**: Smoke Hermes exige instalação suportada com perfil isolado.
- **DEP-004**: Aprovação final deve apontar para commit e artefato imutáveis.

## 5. Files

- **FILE-001**: `.specs/**` — fonte de verdade de projeto e feature.
- **FILE-002**: `scripts/publication-check.mjs` e testes — auditoria pública.
- **FILE-003**: `.github/workflows/ci.yml` — CI.
- **FILE-004**: `README.md`, `README.en.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`.
- **FILE-005**: `RELEASE-v0.3.0.md` — evidência final.

## 6. Testing

- **TEST-001**: Auditor detecta licença ausente, metadata inconsistente e caminho pessoal.
- **TEST-002**: CI contém matrix Windows/Linux, Node 22/24, concurrency e permissions read-only.
- **TEST-003**: Full Node suite passa sem rede ou dependências.
- **TEST-004**: MCP session context contém Skills/Rules e Hermes isolado.
- **TEST-005**: Code review não encontra issue bloqueante.
- **TEST-006**: Smoke manual VS Code executa os quatro comandos.
- **TEST-007**: GitHub draft PR exibe todos os checks esperados.
- **TEST-008**: Artefato baixado corresponde ao checksum publicado.
- **TEST-009**: Mutation score de policy/review permanece em pelo menos 60%.

## 7. Risks & Assumptions

- **RISK-001**: Marca Protheus pode sugerir afiliação; usar disclaimer e avaliar naming jurídico.
- **RISK-002**: CI localmente válido pode falhar no runner real; manter release bloqueado até draft PR.
- **RISK-003**: Dependências de teste podem introduzir CVEs; lockfile e `npm audit` são gates de release.
- **RISK-004**: Alpha gerar confiança excessiva; documentar claramente limites do parser/review.
- **ASSUMPTION-001**: O primeiro canal é GitHub Releases, não Marketplace ou npm.
- **ASSUMPTION-002**: O owner aceita contribuições externas após configurar SECURITY e contribuição.

## 8. Related Specifications / Further Reading

- `.specs/features/public-github-release/spec.md`
- `.specs/features/public-github-release/design.md`
- `.specs/features/public-github-release/tasks.md`
- `docs/reference-audit.md`
- `docs/test-plan-p0.md`
