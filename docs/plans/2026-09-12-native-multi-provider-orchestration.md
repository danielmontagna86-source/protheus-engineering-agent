# Native Multi-Provider Orchestration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Construir no Protheus Engineering Agent uma camada própria, segura e testável para conexões, rotas de modelo e fallback explícito entre APIs e clientes oficiais, sem depender do Hermes.

**Architecture:** O domínio `ai-connections` mantém somente configuração sem segredos, referências para VS Code SecretStorage, perfis de tarefa e recibos. Adaptadores normalizam respostas para o AI Gateway; um roteador tenta somente a rota explicitamente aprovada. A extensão oferece UX fina para conexão, rota, consentimento e evidência, enquanto MCP permanece interoperável para Cline/OpenCode.

**Tech Stack:** Node.js 22 ESM, `fetch` nativo, VS Code SecretStorage, MCP stdio, node:test, esbuild e VS Code Extension Host.

---

### Task 1: Contrato de Connection Plane

**Files:**
- Create: `packages/ai-connections/src/index.mjs`
- Create: `test/ai-connections.test.mjs`
- Modify: `.specs/features/multi-provider-ai-connectivity/spec.md`

**Step 1: Write the failing test**

Testar `Connection`, `ModelRoute`, `TaskProfile` e `Receipt`: rejeitar segredo
embutido, URL livre, provider/modelo desconhecido, fallback duplicado, budget
inválido e perfil com tool mutável.

**Step 2: Run test to verify it fails**

Run: `node --test test/ai-connections.test.mjs`  
Expected: FAIL porque o módulo não existe.

**Step 3: Write minimal implementation**

Criar validators JSON puros. Connection tem referência de SecretStorage, nunca
valor. Route tem primário, fallbacks, egress permitidos e limites. Perfis
`analysis`, `review` e `plan` são read-only. Receipt contém hashes, tentativa,
provider/modelo, uso e código sanitizado, nunca conteúdo.

**Step 4: Run test to verify it passes**

Run: `node --test test/ai-connections.test.mjs`  
Expected: PASS.

**Step 5: Commit**

Stage `packages/ai-connections`, `test/ai-connections.test.mjs` e spec; commit
`feat: add governed AI connection contracts`.

### Task 2: Roteador explícito e recibos

**Files:**
- Modify: `packages/ai-connections/src/index.mjs`
- Modify: `test/ai-connections.test.mjs`
- Modify: `packages/ai-gateway/src/index.mjs`
- Modify: `test/ai-gateway.test.mjs`

**Step 1: Write the failing test**

Cobrir ordem primary/fallback, zero tentativa fora de egress permitidos, parada
em credencial/policy/schema/cancelamento e recibo sem prompt/chave.

**Step 2: Run test to verify it fails**

Run: `node --test test/ai-connections.test.mjs test/ai-gateway.test.mjs`  
Expected: FAIL pela ausência do roteador.

**Step 3: Write minimal implementation**

Adicionar `createRouteProvider`. Apenas timeout, rate-limit e 5xx sanitizados
são elegíveis ao fallback; os demais erros encerram. O gateway existente continua
sendo a única porta de consentimento, redaction e validação de schema.

**Step 4: Run test to verify it passes**

Run: `node --test test/ai-connections.test.mjs test/ai-gateway.test.mjs`  
Expected: PASS.

**Step 5: Commit**

Stage domínio, gateway e testes; commit `feat: route governed AI providers with explicit fallback`.

### Task 3: APIs diretas e catálogo de modelos

**Files:**
- Modify: `packages/ai-providers/src/index.mjs`
- Modify: `test/ai-providers.test.mjs`
- Modify: `docs/ai-and-hermes.md`

**Step 1: Write the failing test**

Criar fixtures `fetch` para OpenRouter, Anthropic e Gemini que validam host
HTTPS, header correto, payload sem chave, JSON output, timeout/cancelamento,
429/5xx sanitizado e modelo efetivo. Cobrir catálogo sob demanda com cache
versionado, sem nome de modelo prometido como fixo.

**Step 2: Run test to verify it fails**

Run: `node --test test/ai-providers.test.mjs`  
Expected: FAIL para adaptadores e discovery ausentes.

**Step 3: Write minimal implementation**

Implementar adaptadores `openrouter`, `anthropic-api` e `gemini-api` com
`getApiKey`, allowlist de endpoint e parser específico. Não instalar SDK, não
usar chave na query string e não usar credenciais de CLI. Codex continua
adaptador App Server gerido separado.

**Step 4: Run test to verify it passes**

Run: `node --test test/ai-providers.test.mjs`  
Expected: PASS.

**Step 5: Commit**

Stage provider adapters, testes e documentação; commit `feat: add direct governed AI provider adapters`.

### Task 4: Persistência sem segredo e Central de IA no VS Code

**Files:**
- Create: `packages/ai-connections/src/store.mjs`
- Modify: `apps/vscode-extension/extension.cjs`
- Modify: `apps/vscode-extension/package.json`
- Modify: `apps/vscode-extension/package.nls.json`
- Modify: `apps/vscode-extension/package.nls.pt-br.json`
- Modify: `apps/vscode-extension/l10n/bundle.l10n.pt-br.json`
- Modify: `test/vscode-extension.test.mjs`

**Step 1: Write the failing test**

Cobrir criação, edição e remoção de conexão/rota, SecretStorage exclusivo,
confirmação com lista completa de egressos e resposta sem chave. Cline/OpenCode
devem gerar apenas preview MCP.

**Step 2: Run test to verify it fails**

Run: `node --test test/vscode-extension.test.mjs`  
Expected: FAIL para Central de IA/rotas inexistentes.

**Step 3: Write minimal implementation**

Substituir o comando provisório por `Configurar conexões`, `Configurar rota` e
`Perguntar à rota`. Persistir manifests validados em `.pea`, apenas chaves em
SecretStorage e receipt sem conteúdo. Localizar português e inglês.

**Step 4: Run test to verify it passes**

Run: `node --test test/vscode-extension.test.mjs`  
Expected: PASS.

**Step 5: Commit**

Stage extensão, storage e testes; commit `feat: add VS Code AI connection and route controls`.

### Task 5: Hosts oficiais e interoperabilidade

**Files:**
- Modify: `packages/ai-providers/src/index.mjs`
- Modify: `test/ai-providers.test.mjs`
- Create: `docs/provider-uat.md`
- Modify: `docs/ai-and-hermes.md`

**Step 1: Write the failing test**

Validar previews MCP de Cline/OpenCode sem arquivo de auth, sem auto mode e com
perfil plan/read-only quando suportado. Claude Code e Gemini CLI devem ficar
`login-official-pending-uat`, nunca conectados por presunção.

**Step 2: Run test to verify it fails**

Run: `node --test test/ai-providers.test.mjs`  
Expected: FAIL por status/version gate inexistente.

**Step 3: Write minimal implementation**

Versionar capabilities e preparar matriz UAT de login oficial, plan/read-only,
cancelamento, negação de tool, revogação e evidence sem segredo. Não executar
OAuth, instalar CLI nem abrir sessão automatizada.

**Step 4: Run test to verify it passes**

Run: `node --test test/ai-providers.test.mjs`  
Expected: PASS.

**Step 5: Commit**

Stage arquivos da tarefa; commit `docs: define safe external AI host interoperability`.

### Task 6: Bateria de release e UAT externa

**Files:**
- Modify: `docs/plans/2026-09-08-stable-1-0-qa-plan.md`
- Modify: `.specs/project/ROADMAP.md`
- Modify: `.specs/project/STATE.md`
- Create: `release-artifacts/provider-uat-template.json`

**Step 1: Write the failing test**

Adicionar scanning de segredos em VSIX/receipt e mutantes/propriedades do
roteador e egress list.

**Step 2: Run test to verify it fails**

Run: `node --test test/ai-connections.test.mjs test/ai-providers.test.mjs`  
Expected: FAIL antes das proteções.

**Step 3: Write minimal implementation**

Atualizar scanners, checklist UAT e matriz de risco. Não mudar publicação para
GO: Marketplace, acessibilidade, AppServer, contas e evidência humana são gates
separados.

**Step 4: Run complete candidate battery**

Run: `npm run validate:release-candidate`  
Expected: testes, check, benchmark, smoke, artefatos, VS Code atual/mínimo/TDS,
audit e mutação aprovados; qualquer correção exige nova bateria integral.

**Step 5: Commit**

Stage docs/tests/scripts; commit `test: validate native multi-provider release candidate`.

### Task 7: Homologação real por fornecedor

Usar conta de teste por fornecedor para conexão, análise limitada, revisão,
negação, cancelamento, fallback opt-in e revogação. Não registrar chaves, telas
de conta ou prompts. Executar `npm run publication:release-check` com evidence
do commit/VSIX exato; manter NO-GO até todos os gates externos preexistentes
também forem fechados.
