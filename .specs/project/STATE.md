# State

**Last Updated:** 2026-09-07
**Current Work:** Public GitHub Release - local preparation and review

---

## Recent Decisions

### AD-001: Product is public and engine-agnostic (2026-09-07)

**Decision:** O produto será preparado para divulgação pública e Hermes será um adapter opcional.
**Reason:** Equipes devem usar o runtime e MCP sem depender de uma instalação pessoal específica.
**Trade-off:** Integração Hermes profunda será incremental.
**Impact:** Nenhum caminho, perfil, credencial ou estado pessoal pode aparecer na distribuição.

### AD-002: VS Code remains the cockpit (2026-09-07)

**Decision:** A extensão será fina e reutilizará editor, terminal, explorer, diff e Git nativos.
**Reason:** Evita duplicação de IDE e concentra investimento no domínio Protheus.
**Trade-off:** Experiências visuais especializadas exigirão contribuições específicas do VS Code.
**Impact:** Runtime e MCP continuam independentes da UI.

### AD-003: Apache-2.0 selected for public distribution (2026-09-07)

**Decision:** Licenciar o produto sob Apache License 2.0.
**Reason:** A licença permissiva inclui concessão expressa de patentes e regras claras para contribuições e redistribuição.
**Trade-off:** Distribuidores devem preservar a licença, os avisos aplicáveis e as obrigações previstas no texto legal.
**Impact:** O gate de licença está resolvido; a publicação permanece NO-GO enquanto os demais gates de release estiverem abertos.

### AD-004: Publication is a tested product boundary (2026-09-07)

**Decision:** Manter um auditor local distinto para desenvolvimento e release.
**Reason:** O desenvolvimento local pode continuar de forma independente, mas um release deve falhar fechado sem URL canônica, árvore portátil e evidências externas completas.
**Trade-off:** O gate precisa acompanhar novos formatos de credencial e artefatos.
**Impact:** `npm run validate` aprova a árvore local; `npm run publication:release-check` permanece bloqueado até as decisões do proprietário.

### AD-005: Security review findings are regression tests (2026-09-07)

**Decision:** Converter achados de revisão sobre Electron/Node, multi-root, symlink/junction, limites e checksum em testes automatizados.
**Reason:** O comportamento de segurança precisa permanecer verificável após refactors.
**Trade-off:** A suíte inclui mais I/O real e processos filhos, ainda mantendo execução offline curta.
**Impact:** A revisão final não encontrou achado bloqueante ou alto; os smokes externos continuam obrigatórios.

### AD-006: Descriptive public brand with independent positioning (2026-09-07)

**Decision:** Manter `Protheus Engineering Agent` e o slug `danielmontagna86-source/protheus-engineering-agent`.
**Reason:** O nome maximiza clareza e intenção de busca para equipes ADVPL/TLPP; não foi encontrado produto ou repositório com o nome exato na validação de 2026-09-07.
**Trade-off:** `Protheus` é marca de terceiro e exige disclaimer permanente, identidade visual independente e revisão jurídica antes de exploração comercial relevante.
**Impact:** Metadados, READMEs e documentação usam uma promessa funcional e não alegam afiliação ou suporte oficial.

## Active Blockers

### B-003: External release evidence is incomplete

**Discovered:** 2026-09-07
**Impact:** Blocker para release e visibilidade pública.
**Workaround:** Manter o remoto privado e o gate de release em `NO-GO`.
**Progress:** Repositório privado criado; PR #1 e `main` final passaram a matriz Windows/Linux, Node.js 22/24, smoke, auditoria de dependências e mutação; probe Hermes isolado passou com `Hermes ACP check OK`.
**Resolution:** Smoke VS Code, reconciliação do commit candidato, checksum e aprovação registrados.

## Resolved Blockers

### B-001: Product license not selected

**Resolved:** 2026-09-07
**Resolution:** Apache-2.0 aplicada aos manifests, ao arquivo `LICENSE.md` e às regras de contribuição.

### B-002: GitHub owner and repository slug not selected

**Resolved:** 2026-09-07
**Resolution:** `danielmontagna86-source/protheus-engineering-agent` selecionado e aplicado aos metadados.

## Lessons Learned

### L-001: Hermes check initializes logging

**Context:** `hermes acp --check` foi executado durante o P0.
**Problem:** O check tenta inicializar logs do perfil ativo.
**Solution:** Usar sempre `HERMES_HOME` dentro do workspace ou temporário.
**Prevents:** Alteração acidental do perfil cotidiano em testes e CI.

### L-002: Installed SDD specify reference is corrupted

**Context:** A referência local `advpl-tlpp-sdd/references/specify.md` foi lida em 2026-09-07.
**Problem:** O arquivo contém bundle JavaScript truncado, não o template Markdown esperado.
**Solution:** Usar a estrutura de requisito definida no `SKILL.md`, nas referências válidas e neste diretório `.specs`.
**Prevents:** Tratar instrução corrompida como especificação de produto.

## Deferred Ideas

- [ ] Marketplace VS Code após o GitHub alpha estabilizar.
- [ ] Parser ADVPL/TLPP completo e incremental.
- [ ] Telemetria opt-in com redaction e sem código-fonte.

## Todos

- [x] Escolher licença do produto: Apache-2.0.
- [x] Escolher owner e slug do GitHub: `danielmontagna86-source/protheus-engineering-agent`.
- [ ] Executar smoke manual da extensão antes do primeiro release.
- [ ] Executar a matriz CI no primeiro draft PR.

## Preferences

**Model Guidance Shown:** 2026-09-07
