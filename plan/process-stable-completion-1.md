---
goal: Concluir tecnicamente a candidata Stable 1.0 sem fabricar gates externos
version: 1.0
date_created: 2026-09-23
last_updated: 2026-09-23
owner: Protheus Engineering Agent maintainers
status: 'In progress'
tags: [release, qa, supply-chain, vscode, protheus, stable]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In%20progress-yellow)

Este plano executa todo trabalho seguro e reproduzivel que ainda depende apenas
do repositorio e do laboratorio autorizado. Gates humanos, de publisher e de
publicacao permanecem fail-closed ate produzirem evidencia real vinculada ao
mesmo commit e conjunto de artefatos Stable.

## 1. Requirements & Constraints

- **REQ-001**: Reconciliar as Specs Stable com o estado observado do repositorio e com os recibos saneados do laboratorio.
- **REQ-002**: Atualizar dependencias e Actions relacionadas como um conjunto atomico, mantendo SHAs completos e testes de politica sincronizados.
- **REQ-003**: Executar a bateria automatizada completa no commit candidato exato e preservar qualquer falha como bloqueio.
- **REQ-004**: Repetir apenas testes live autorizados, limitados e nao destrutivos no AppServer/TDS de laboratorio.
- **REQ-005**: Manter `1.0.0`, tag, GitHub Release e Marketplace bloqueados ate G0..G13 estarem verdes no mesmo artefato.
- **SEC-001**: Nenhuma credencial, token RPO, caminho pessoal, dado de cliente ou configuracao privada pode entrar no Git.
- **SEC-002**: CodeQL `init` e `analyze` devem usar o mesmo SHA e a mesma versao.
- **SEC-003**: A referencia da Action TruffleHog e o binario solicitado pelo campo `version` devem representar a mesma versao revisada.
- **CON-001**: Docker permanece infraestrutura interna de QA e nao pode virar dependencia do VSIX/runtime.
- **CON-002**: Evidencia historica de Preview/laboratorio nao substitui recibos do futuro artefato Stable.
- **CON-003**: UAT com tres participantes, tecnologia assistiva, piloto representativo, publisher/termos e autorizacao final nao podem ser autoatestados.
- **GUD-001**: Cada alteracao de codigo ou workflow inicia com teste de comportamento/politica e termina com gates direcionados e completos.
- **PAT-001**: Usar VS Code como cockpit, runtime reutilizavel e adapters opcionais fail-closed.

## 2. Implementation Steps

### Phase 1 — Reconcile specification and evidence

- **TASK-001**: Atualizar `.specs/features/stable-1-0-launch/tasks.md`, `.specs/features/stable-1-0-launch/validation.md` e `.specs/project/STATE.md` com os recibos saneados de 2026-09-17, preservando G6 como `PARTIAL` e Stable como `NO-GO`.
  - Depends on: none
  - Done when: o texto diferencia contrato automatizado, compilacao live historica e artefato Stable futuro.
  - Validation: `git diff --check`; testes de contexto/publicacao.

- **TASK-002**: Atualizar `.specs/features/stable-continuous-execution-v1/tasks.md` para marcar a linha de base desta branch como executada somente apos os gates correspondentes.
  - Depends on: TASK-001
  - Done when: nenhum `DONE` aparece sem comando, commit ou recibo identificavel.
  - Validation: revisao de rastreabilidade REQ-SCE-001..006.

### Phase 2 — Atomic supply-chain maintenance

- **TASK-003**: Criar testes de politica que exijam consistencia atomica de CodeQL, OSV Scanner e TruffleHog antes de atualizar os workflows.
  - Files: `test/publication.test.mjs`
  - Depends on: TASK-002
  - Done when: os testes falham com pares de versao/SHA divergentes e passam com o conjunto coerente.
  - Validation: `node --test --test-concurrency=1 test/publication.test.mjs`.

- **TASK-004**: Atualizar CodeQL para v4.38.1 em `init` e `analyze`, OSV Scanner para a revisao v2.6.0 informada pelo upstream e TruffleHog para v3.97.5 incluindo seu campo `version`.
  - Files: `.github/workflows/codeql.yml`, `.github/workflows/security.yml`, `.github/workflows/secret-scan.yml`
  - Depends on: TASK-003
  - Done when: os testes de politica e a suite completa passam.
  - Validation: testes direcionados, `npm run validate`, `npm audit`.

- **TASK-005**: Atualizar `yaml` para 2.9.1 e avaliar `@vscode/vsce` 4.0.0 pelo build, empacotamento, verificacao e ciclo instalado antes de aceita-lo.
  - Files: `package.json`, `package-lock.json`
  - Depends on: TASK-004
  - Done when: lockfile reproduzivel, auditoria sem vulnerabilidades e VSIX verificavel; se o major falhar, registrar deferimento em vez de forcar merge.
  - Validation: `npm ci`, build/package/verify, lifecycle e suite completa.

### Phase 3 — Exact technical candidate

- **TASK-006**: Tornar o comando de teste local autocontido ou documentar/verificar explicitamente sua precondicao de build sem enfraquecer o fluxo de CI.
  - Files: `package.json`, `test/publication.test.mjs`, documentacao de contribuicao se necessario.
  - Depends on: TASK-005
  - Done when: `npm test` em checkout limpo nao falha por artefato gerado ausente.
  - Validation: remocao controlada de `apps/vscode-extension/dist`, seguida de `npm test`.

- **TASK-007**: Executar gates direcionados, `npm run validate`, benchmark, smoke, release build/verify, hosts VS Code suportados, lifecycle, TDS coexistence, audit e mutation.
  - Depends on: TASK-006
  - Done when: cada comando tem exit status real; qualquer falha permanece aberta.
  - Validation: comandos canonicos de `.agents/qa-project-context.md`.

- **TASK-008**: Executar preflight e matriz live nao destrutiva no laboratorio autorizado para PEA→TDS e TDS→AppServer, sem registrar credenciais e sem alegar RPO/licenca nao observados.
  - Depends on: TASK-007
  - Done when: alvo valido e invalido produzem recibos saneados; timeout/cancel/lock permanecem abertos se a API publica nao permitir prova segura.
  - Validation: protocolo `docs/qa/appserver-homologation-acceptance.md` e hashes dos recibos.

### Phase 4 — Independent review and external gates

- **TASK-009**: Executar code review independente de todo o diff e corrigir achados Critical/Important antes de propor merge.
  - Depends on: TASK-007, TASK-008
  - Done when: revisao sem achado bloqueante e gates repetidos apos a ultima correcao.
  - Validation: diff completo contra `origin/main`, testes frescos.

- **TASK-010**: Preparar recibos executaveis para remote host, acessibilidade, tres usuarios, suporte/rollback, piloto e publisher sem mudar seus estados para PASS.
  - Depends on: TASK-009
  - Done when: cada gate externo tem responsavel, ambiente, procedimento, saida e regra de aceite.
  - Validation: zero placeholder e zero autoatestado.

- **TASK-011**: Abrir PR e observar todos os checks publicos somente apos autorizacao explicita no limite da acao externa.
  - Depends on: TASK-009
  - Done when: branch remota e PR existem, checks do commit exato estao verdes e revisao foi registrada.
  - Validation: GitHub Checks API.

- **TASK-012**: Gerar `1.0.0`, artefatos finais, evidencia externa, tag, GitHub Release e Marketplace apenas quando G0..G13 estiverem verdes e houver autorizacao nominal no limite de publicacao.
  - Depends on: TASK-010, TASK-011, evidencias humanas/publisher reais
  - Done when: `publication-check --release` retorna `GO` para o conjunto exato e a instalacao baixada do canal publico passa o smoke pos-publicacao.
  - Validation: hashes, attestations, download, install, rollback e recibos publicos.

## 3. Alternatives

- **ALT-001**: Mesclar os seis PRs Dependabot separadamente. Rejeitada porque CodeQL parcial quebra o workflow e os testes de politica; OSV e TruffleHog possuem metadados duplicados que precisam ser atualizados em conjunto.
- **ALT-002**: Promover `0.3.9` diretamente para Stable. Rejeitada porque a tag publicada aponta para outro commit e a decisao AD-020 exige `1.0.0` com todos os gates.
- **ALT-003**: Marcar gates humanos como N/A. Rejeitada enquanto acessibilidade, onboarding e alegacoes de efetividade fizerem parte do contrato Stable.
- **ALT-004**: Usar o laboratorio comunitario como prova licenciada. Rejeitada; ele fornece confianca tecnica interna, nao identidade/licenca de suporte.

## 4. Dependencies

- **DEP-001**: Node.js 22/24 e lockfile npm do repositorio.
- **DEP-002**: VS Code minimo/atual e TDS 2.1.3 para os testes declarados.
- **DEP-003**: Laboratorio local autorizado em `localhost:1234` somente para casos seguros previstos no protocolo.
- **DEP-004**: GitHub Actions para CodeQL, OSV, segredo, dependencia, mutacao e Extension Host.
- **DEP-005**: Participantes representativos, tecnologia assistiva e publisher Marketplace para gates externos.

## 5. Files

- **FILE-001**: `.specs/features/stable-1-0-launch/tasks.md` — estado canonico das tarefas Stable.
- **FILE-002**: `.specs/features/stable-1-0-launch/validation.md` — ledger G0..G13.
- **FILE-003**: `.specs/features/stable-continuous-execution-v1/tasks.md` — execucao autonoma segura.
- **FILE-004**: `.specs/project/STATE.md` — decisoes, bloqueios e evidencia corrente.
- **FILE-005**: `test/publication.test.mjs` — invariantes de supply chain/publicacao.
- **FILE-006**: `.github/workflows/*.yml` — Actions protegidas por SHA.
- **FILE-007**: `package.json` e `package-lock.json` — dependencias e comandos canonicos.
- **FILE-008**: `docs/qa/live-appserver-tds-homologation-2026-09-13.md` — historico saneado do laboratorio.

## 6. Testing

- **TEST-001**: Politica de workflows pinados e consistentes.
- **TEST-002**: Suite Node completa em serie e em fluxo padrao.
- **TEST-003**: Build, package, SBOM, manifesto, checksums e reproducibilidade.
- **TEST-004**: Smoke CLI/MCP e benchmark de repositorio.
- **TEST-005**: VSIX instalado no VS Code minimo/atual, coexistencia TDS e lifecycle.
- **TEST-006**: npm audit/OSV/CodeQL/secret scan e mutacao >=95%.
- **TEST-007**: Ponte live positiva/negativa no laboratorio, com limitacoes explicitas.
- **TEST-008**: Gate release fail-closed ate evidencia externa completa.

## 7. Risks & Assumptions

- **RISK-001**: `@vscode/vsce` 4.0.0 pode alterar empacotamento/transitivos. Mitigacao: aceitar somente apos reproducibilidade e lifecycle completos.
- **RISK-002**: PRs automaticos atualizam apenas uma ocorrencia de Actions versionadas. Mitigacao: testes de consistencia atomica.
- **RISK-003**: O laboratorio nao prova licenca, RPO, DBAccess ou suporte de mercado. Mitigacao: manter G6 parcial e limitar a alegacao.
- **RISK-004**: Uma mudanca apos UAT invalida recibos do artefato. Mitigacao: congelar o commit antes dos gates externos finais.
- **ASSUMPTION-001**: O laboratorio permanece descartavel e autorizado, conforme declaracao do proprietario; nenhuma credencial sera lida ou persistida.

## 8. Related Specifications / Further Reading

- `.specs/features/stable-1-0-launch/`
- `.specs/features/stable-continuous-execution-v1/`
- `.specs/features/end-to-end-validation-program-v1/`
- `docs/plans/2026-09-17-stable-continuous-execution.md`
- `docs/qa/appserver-homologation-acceptance.md`
- `docs/maintainer-release-handoff.md`
