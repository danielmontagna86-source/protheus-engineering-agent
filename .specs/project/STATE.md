# State

**Last Updated:** 2026-09-25
**Current Work:** A `main` em `c354e980f71af082e0015b0bc435a6758d0ff34f`, após os PRs #45–#47, passou a matriz protegida completa. O candidato `0.3.9` foi exercitado no TDS 2.1.4/AppServer 24.3.1.5 com compilação direta positiva/negativa, cancelamento, timeout, AppServer e RPO custom indisponíveis; a ponte pública continua corretamente `unverified/TDS_COMPILE_SUCCESS_UNPROVEN` quando a API upstream retorna zero diagnósticos sem prova de commit no RPO. O PostgreSQL real do laboratório contém 148 tabelas e o grupo físico `990` está `READY`; o adapter provider-neutral passou named queries, limites, cancelamento, concorrência, MCP e privilégio mínimo. A prévia pública `v0.3.9` permanece vinculada a `29993a8`; esses testes posteriores não reescrevem seus artefatos nem promovem Stable. Stable/Marketplace permanecem `NO-GO` pelos gates humanos, publisher, piloto, lock concorrente do RPO e artefato Stable exato.

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
**Trade-off:** `Protheus` é marca de terceiro e exige disclaimer permanente e identidade visual independente. A revisão jurídica de marca foi aprovada pelo responsável em 2026-09-12 e registrada em `docs/governance/legal-trademark-clearance-2026-09-12.md`; novas jurisdições, campanhas, modelo comercial ou nome exigem revisão adicional.
**Impact:** Metadados, READMEs e documentação usam uma promessa funcional e não alegam afiliação ou suporte oficial.

### AD-007: Final release evidence lives outside the tracked tree (2026-09-07)

**Decision:** Manter no Git apenas o draft `NO-GO`; gerar o template final em `release-artifacts/` e vinculá-lo por SHA-256 ao manifesto e ao commit exatos.
**Reason:** Alterar evidência final rastreada mudaria o próprio commit que ela pretende atestar.
**Trade-off:** A evidência final precisa ser anexada ao GitHub Release junto com os artefatos.
**Impact:** O auditor aceita `--evidence release-artifacts/<arquivo>.json`, verifica contenção, checksum, commit, conjunto de artefatos e todas as verificações do manifesto.

### AD-008: VS Code smoke validates the installed VSIX (2026-09-07)

**Decision:** Instalar o pacote em diretório de extensões temporário antes de executar a jornada de seis operações do host.
**Reason:** O modo de desenvolvimento não comprova que o arquivo distribuído pode ser instalado e carregado.
**Impact:** VS Code 1.95.3 e 1.133.0 passaram localmente; a primeira tentativa encontrou permissões ZIP não graváveis e virou regressão automatizada.

### AD-009: VS Code is the standalone product; Hermes is non-gating compatibility (2026-09-07)

**Decision:** Distribuir um único VSIX com runtime empacotado. Priorizar tools/chat nativos do VS Code e MCP; manter Hermes como adapter experimental opcional.
**Reason:** O público ADVPL/TLPP já trabalha no VS Code/TDS, enquanto exigir outra engine adiciona instalação e configuração antes do primeiro valor.
**Trade-off:** Recursos exclusivos do Hermes não estarão disponíveis no fluxo padrão; compatibilidade continuará sendo testada separadamente.
**Impact:** O release checker não exige probe Hermes e a documentação não o apresenta como engine do produto.

### AD-010: EngPro is a pinned standards provider, not a bundled oracle (2026-09-07)

**Decision:** Descobrir skills nas raízes `.agents/skills`, `.github/skills` e `.pea/skills`, manter duas skills próprias estreitas e registrar o EngPro oficial por repositório, licença e commit fixado.
**Reason:** Reaproveitar padrões abertos com proveniência sem copiar cegamente conteúdo externo ou confundir orientação com garantia de correção.
**Impact:** Skills de projeto são dados não confiáveis, limitados por tamanho/quantidade e deduplicados por precedência documentada.

### AD-011: Marketplace preview uses numeric version 0.3.0 (2026-09-07)

**Decision:** Usar `0.3.0` nos manifests e o sinalizador de pre-release do Marketplace, sem sufixo SemVer no número da extensão.
**Reason:** O formato de listagem exige versão numérica `major.minor.patch`.
**Impact:** Metadados, artefatos, specs e evidência usam a mesma versão; o status continua preview/NO-GO até autorização.

### AD-012: Review findings use native VS Code Problems (2026-09-07)

**Decision:** Publicar achados determinísticos como diagnostics nativos, preservando também a saída JSON no canal de evidência.
**Reason:** Navegação por arquivo/linha entrega valor imediato sem recriar editor, explorer ou interface própria.
**Impact:** Resultado malformado limpa diagnostics obsoletos e falha de forma visível; o VSIX instalado é o alvo do smoke.

### AD-013: External intelligence is injected and capability-gated (2026-09-07)

**Decision:** TDN/Dictionary use versioned snapshots; Oracle uses trusted named read-only queries; AI and child agents are host-injected governed contracts.
**Reason:** The offline VSIX must remain useful without credentials while connected features must be testable without silently expanding authority.
**Impact:** Live providers stay unavailable until a host supplies exact adapters, grants and approval evidence.

### AD-014: Product claims follow evidence levels (2026-09-07)

**Decision:** Publish the synthetic benchmark and its limitations; do not claim productivity uplift or market leadership before a consenting representative pilot.
**Impact:** Technical correctness on fixtures is separated from human outcome evidence.

### AD-015: The category is Protheus Engineering Evidence Layer (2026-09-08)

**Decision:** Position the product around verified change confidence, project/domain context, governed execution and local-to-CI evidence rather than as a generic coding chatbot.
**Reason:** TDS already owns compile/debug/RPO/server operations and horizontal agents already own general chat/edit/terminal workflows. The repository's strongest differentiated assets are deterministic Protheus analysis, provenance, policy and evidence.
**Trade-off:** The word “Agent” remains in the product name, but the product does not own or require a model loop.
**Impact:** 0.4 prioritizes Engineering Center, changed-files review, SARIF/Action and portable tools/skills before more generative features.

### AD-016: Product completeness is evidence-gated, not a percentage (2026-09-08)

**Decision:** Use the P0/P1/P2 requirement and validation matrix in `.specs/features/product-completeness-v1/`; do not claim “95% product complete”.
**Reason:** The 95% mutation threshold measures resistance of a configured test scope, not usability, semantic coverage, live integration or market effectiveness.
**Impact:** 0.4, 0.5 and 1.0 each have explicit automated, human and external gates.

### AD-017: Standard agent surfaces replace a bespoke chat roadmap (2026-09-08)

**Decision:** Expose runtime capabilities through VS Code Language Model Tools, portable Agent Skills/plugin and the official MCP TypeScript SDK; keep deterministic commands available without any agent.
**Reason:** These standards provide broader adoption and allow users to keep their chosen host/model while the product owns Protheus evidence and permission enforcement.
**Trade-off:** Compatibility work increases as VS Code/MCP evolve.
**Impact:** MCP conformance and host compatibility become release gates; Hermes remains an optional adapter.

### AD-018: Semantic analysis advances through a conformance corpus (2026-09-08)

**Decision:** Keep the lexical graph as an honest fallback and require a legal versioned ADVPL/TLPP corpus before adopting/building a tolerant incremental parser.
**Reason:** No maintained ADVPL/TLPP Tree-sitter grammar was established by the current source review, and compiler-equivalence claims would be unsupported.
**Impact:** Parser technology remains an evaluated implementation choice; support is reported per construct with confidence and unresolved evidence.

### AD-019: Docker is internal QA infrastructure only (2026-09-08)

**Decision:** Use official or admitted containers only in maintainer test lanes; the VSIX, runtime, sample, onboarding and supported GitHub Action do not require Docker.
**Reason:** The owner supplied Docker projects to improve our validation, not as a product feature. Community images also introduce provenance, licensing and supply-chain risks.
**Impact:** Official analyzer/Postgres images may cross-check internal behavior. Licensed AppServer evidence remains an external stable gate. Community images are rejected or quarantined and never shipped/recommended as the product.

### AD-020: Stable 1.0 replaces public-preview as the launch target (2026-09-08)

**Decision:** Keep 0.3 as an internal evidence baseline and 0.4/0.5 as implementation milestones; publish a regular `1.0.0` only after product, QA, live-environment, accessibility, support and exact-artifact gates pass.
**Reason:** A stable product requires a defined public contract, proven install/upgrade/rollback and support lifecycle; changing the version or Marketplace flag is insufficient.
**Impact:** `.specs/features/stable-1-0-launch/` is the promotion contract. Publication remains separately authorized.

### AD-021: Adoption targets are measurable, never release evidence (2026-09-09)

**Decision:** Treat 1,000 GitHub stars as an adoption target supported by a documented first-value, community and distribution loop; do not use stars, installs or generic AI claims as quality, readiness or productivity proof.
**Reason:** A professional developer product earns durable adoption through reproducible value, support and trustworthy claims. Repository visibility and Marketplace distribution also expose security and governance responsibilities.
**Impact:** `docs/public-launch-operations.md` is a required publication artifact. Its live GitHub/Marketplace settings, real product captures, legal/publisher checks and post-publication verification stay fail-closed until recorded for the exact release.

### AD-022: User-authorized community Docker validation remains non-gating (2026-09-10)

**Decision:** Execute the owner-authorized `feliperaposo` AppServer stack only in a disposable internal Docker network and retain its exact negative result.
**Reason:** The staged topology started PostgreSQL, License Server and DBAccess, then AppServer failed `FAILURE TO START REST SERVER` / `Invalid REST Port`.
**Impact:** The product does not depend on this stack and it cannot close the licensed AppServer, TDS or stable-release gate.

### AD-023: Codex App Server is the optional managed-login bridge (2026-09-12)

**Decision:** Add an opt-in bridge to the official local Codex App Server for a user-owned ChatGPT login, while preserving provider-neutral API-key adapters and all offline workflows.
**Reason:** A managed account session can be a practical choice for eligible users without asking the extension to collect API keys or account credentials.
**Trade-off:** Account entitlement, context capacity, models, rate limits and cost remain provider/account dependent; a live test must use the official CLI, not a similarly named local command.
**Impact:** The bridge protocol-probes the executable, keeps only an opaque thread ID in VS Code global state, redacts bounded context, requires `ai:invoke` plus explicit confirmation, and gives a model only restricted read-only/on-request access. It remains experimental until an official-CLI live UAT records secret-free evidence.

### AD-024: Multi-provider means connection-neutral, not credential-neutral (2026-09-12)

**Decision:** Support Codex, Claude Code, Gemini CLI, Cline, OpenCode and OpenRouter through a registry that distinguishes managed official login, PEA-held API key and external MCP host. Only OpenRouter has an in-product HTTP adapter in P0; its key lives in VS Code SecretStorage.
**Reason:** Each supplier exposes a different official authentication and agent-control model. Treating a browser/session/cache as a portable API would create security, terms and support risk.
**Impact:** PEA does not read/write third-party auth stores, does not automate OAuth or installations, does not invoke Cline (whose documented default is auto-approval), and does not promote prohibited Claude Pro/Max OpenCode plugins. Claude/Gemini runners, OpenCode server control and live UAT are explicit P1/external gates.

### AD-025: Native PEA orchestration replaces Hermes as the model-control path (2026-09-12)

**Decision:** Implement provider selection, explicit fallback, connection status, SecretStorage references and per-turn audit in PEA; Hermes stays only a legacy optional ACP compatibility adapter.
**Reason:** The product must be useful to teams that do not use Hermes and must own its support/security contract rather than borrowing a profile with different approval semantics.
**Impact:** PEA never reads Hermes configuration/auth files and does not call Hermes as a provider. Its new connection controller is provider-neutral and is tested without a preconfigured external agent.

## Active Blockers

Current evidence: [v0.3.9 Preview record](../../RELEASE-v0.3.9.md), [release gate issue](https://github.com/danielmontagna86-source/protheus-engineering-agent/issues/22), [live AppServer/TDS/database validation](../../docs/qa/docker-appserver-pea-homologation-2026-09-24.md) and the historical [VS Code, Git and production validation](../../docs/qa/vscode-git-production-validation-2026-09-10.md). The exact Preview commit `29993a8` passed the complete candidate battery and download/attestation reconciliation; post-Preview engineering through `c354e98` passed protected CI and the authorized live lab, but does not mutate the published Preview artifacts. The owner has requested publication repeatedly; further general permission to continue is not the blocker. Assistive/representative UAT, Marketplace publisher access, concurrent RPO-lock proof, Stable artifacts and final bound receipts remain incomplete. Historical progress below is retained as history and does not supersede this record.

### B-003: External release evidence is incomplete

**Discovered:** 2026-09-07
**Impact:** Blocker para promoção Stable e publicação no Marketplace; não bloqueia o repositório público nem a Preview do GitHub.
**Workaround:** Manter Stable e Marketplace em `NO-GO`, preservando o repositório público, o escopo e as alegações limitadas da Preview.
**Progress:** O baseline `00c4218` passou a matriz CI Windows/Linux, Node.js 22/24, OSV e secret scan. A reprodução local integral desse baseline passou 304 testes, verificação estrutural, benchmark sintético, smoke CLI/MCP, reprodução byte a byte de VSIX/SBOM/source ZIP, instalação em VS Code atual e mínimo, coexistência TDS com multi-root/CP1252-LF, `npm audit` sem vulnerabilidades e mutação 95,40% (limiar 95%). A revisão de código de 2026-09-09 corrigiu os bloqueadores de segredo em IA, correlação de aprovação, ambiente Hermes/MCP e concorrência de subagentes; o relatório e as regressões estão em `docs/qa/production-code-review-2026-09-09.md`. O gate de publicação falhou fechado como previsto por `RELEASE_EVIDENCE_INCOMPLETE`. A repetição Docker interna usou apenas imagens oficiais EngPro: o analyzer tem um sentinela vazio documentado para resultado limpo e diagnóstico completo para falha; o PostgreSQL passou `pg_isready`, leitura SX2/SX3 e negação de escrita em contêiner não-root/read-only. A prévia `v0.3.9` reconciliou CI, CodeQL, OSV, segredo, dependências e proveniência para o commit exato `29993a8`; a manutenção CodeQL `877b87b` repetiu a matriz protegida. Em 2026-09-17, os recibos saneados `pea-bridge-result.json` (SHA-256 `84a467d86c8f832b683951db5f030c9201b972819225bfdfd800717ee6d64a17`) e `result.json` (SHA-256 `d3a1756bb2f7e5da806866524027e2cdf839087e20c8cf42e16fa35206d4f9c1`) comprovaram novamente os cenários positivo e negativo no laboratório autorizado; eles permanecem fora do Git e não atestam licença/RPO. Permanecem abertos os gates documentados no ledger Stable: jornadas humanas/ações e provider ao vivo (G1/G2), analyzer e driver/dialeto em ambiente real (G4/G5), AppServer/DBAccess e lifecycle remoto (G6/G7), acessibilidade/UAT (G8), suporte/matriz externa (G10), piloto representativo (G11), artefatos Stable exatos (G12) e publisher, termos e autorização vinculada (G13).
**Update 2026-09-24:** O laboratório Docker autorizado foi corrigido e homologado até `90b3115`: reinício automático real, WebApp HTTP 200, TDS direto positivo/negativo, ponte PEA fail-closed, timeout, cancelamento e AppServer indisponível passaram. O adapter PostgreSQL real também passou leitura nomeada/MCP, bind e negações, limites, concorrência e cancelamento no servidor. O registro é `docs/qa/docker-appserver-pea-homologation-2026-09-24.md`. O responsável atestou que o RPO veio do portal oficial TOTVS. `TOP_NO_LICENSE` é limitação comercial registrada, não falha funcional; G6 continua PARTIAL por RPO bloqueado/indisponível e futura repetição no artefato Stable. Nenhum bypass foi aplicado e nenhuma certificação oficial é alegada.
**Update 2026-09-24 (VS Code):** O VSIX instalado passou perfil automatizado de acessibilidade no VS Code 1.139.0 (views nativas, alto contraste, zoom 2, accessibilitySupport on, 24 comandos e primeira entrega automatizada em 12,988 s). A repetição WSL instalou produto e sonda no catálogo remoto e conectou o agent, mas Remote WSL 0.104.3 registrou `PendingMigrationError` e nenhum recibo de comando remoto foi emitido. WSL/SSH/containers foram explicitamente reclassificados como experimentais; G7/G8/G10 seguem PARTIAL sem simular screen reader, UAT humano ou operação Marketplace.
**Update 2026-09-25 (Dictionary):** O PR #47 integrou a repetição após inicialização oficial do dicionário. O banco passou de 80 para 148 tabelas; `SX2990`, `SX3990` e `SIX990` ficaram prontos, sem chaves vazias, duplicadas ou órfãs e sem índices inválidos. Uma role efêmera somente leitura executou a matriz e teve escrita negada; ela e seus objetos foram removidos. G5 passa tecnicamente para esse laboratório, mas continua PARTIAL no ledger Stable até a repetição no artefato exato.
**Resolution:** Os controles públicos e a reconciliação da prévia estão registrados. A promoção continua dependente de todos os gates PARTIAL ou UNPROVEN do ledger Stable e da evidência de um candidato Stable futuro; não há resolução automática por documentação ou CI.

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

- [ ] Marketplace VS Code como release regular `1.0.0` após todos os gates estáveis e autorização.
- [ ] Parser ADVPL/TLPP completo; 0.5 plans a tolerant incremental parser with corpus-scoped support, not compiler equivalence.
- [ ] Telemetria opt-in com redaction e sem código-fonte.
- [ ] Commercial/team packaging after adoption and willingness-to-pay discovery.

## Todos

- [x] Escolher licença do produto: Apache-2.0.
- [x] Escolher owner e slug do GitHub: `danielmontagna86-source/protheus-engineering-agent`.
- [x] Executar fresh-install smoke local da extensão no VS Code mínimo e atual.
- [x] Executar e reconciliar a matriz CI/OSV/CodeQL da prévia `v0.3.9` e da manutenção pública subsequente.
- [x] Executar coexistência automatizada com TDS, multi-root e CP1252/LF.
- [ ] Executar UAT visual/acessível e capturar screenshots reais antes da publicação no Marketplace.

## Preferences

**Model Guidance Shown:** 2026-09-07
