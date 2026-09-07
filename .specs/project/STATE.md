# State

**Last Updated:** 2026-09-07
**Current Work:** Production-ready public GitHub release candidate

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

### AD-007: Final release evidence lives outside the tracked tree (2026-09-07)

**Decision:** Manter no Git apenas o draft `NO-GO`; gerar o template final em `release-artifacts/` e vinculá-lo por SHA-256 ao manifesto e ao commit exatos.
**Reason:** Alterar evidência final rastreada mudaria o próprio commit que ela pretende atestar.
**Trade-off:** A evidência final precisa ser anexada ao GitHub Release junto com os artefatos.
**Impact:** O auditor aceita `--evidence release-artifacts/<arquivo>.json`, verifica contenção, checksum, commit, conjunto de artefatos e todas as verificações do manifesto.

### AD-008: VS Code smoke validates the installed VSIX (2026-09-07)

**Decision:** Instalar o pacote em diretório de extensões temporário antes de executar os quatro comandos.
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

## Active Blockers

### B-003: External release evidence is incomplete

**Discovered:** 2026-09-07
**Impact:** Blocker para release e visibilidade pública.
**Workaround:** Manter o remoto privado e o gate de release em `NO-GO`.
**Progress:** Repositório privado criado; `main` e o candidato anterior passaram a matriz Windows/Linux, Node.js 22/24, smoke, auditoria de dependências e mutação. O candidato `0.3.0` passou localmente no VS Code mínimo e atual; CI/OSV do commit final, screenshots/UAT TDS e evidência externa ainda precisam ser reconciliados.
**Resolution:** Candidate CI/OSV, reconciliação do commit, artefatos/manifesto limpos, reprodução após download e aprovação nomeada registrados.

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
- [x] Executar fresh-install smoke local da extensão no VS Code mínimo e atual.
- [ ] Executar e reconciliar a matriz CI/OSV no commit final do PR candidato.
- [ ] Executar UAT visual/acessível e coexistência com TDS antes da publicação no Marketplace.

## Preferences

**Model Guidance Shown:** 2026-09-07
