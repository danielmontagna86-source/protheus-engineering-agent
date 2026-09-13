# Internal Release Candidate Closure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Encerrar e comprovar todos os gates internos do candidato sem fabricar
aprovações ou integrações externas.

**Architecture:** Reutilizar o pipeline de release existente como fonte única de
artefatos e verificação. Atualizar somente a documentação de governança que
ainda não reflete a aprovação jurídica já registrada; o relatório final mantém
o `NO-GO` de Stable/Marketplace para dependências externas.

**Tech Stack:** Node.js 22+, npm lockfile, scripts do repositório, VS Code
Extension Host, GitHub Actions.

---

### Task 1: Corrigir os registros de governança

**Files:**
- Modify: `docs/maintainer-release-handoff.md`
- Modify: `.specs/features/stable-1-0-launch/validation.md`
- Create: `.specs/features/internal-release-closure-v1/{spec,design,tasks,validation}.md`

**Step 1:** Registrar a aprovação jurídica fornecida pelo responsável, sem
publicar parecer e sem eliminar o disclaimer.

**Step 2:** Confirmar que publisher, AppServer licenciado, UAT e evidência
final continuam explicitamente externos.

**Step 3:** Executar `node --test test/publication.test.mjs` e
`node scripts/check.mjs`.

### Task 2: Preparar e executar o candidato exato

**Files:**
- Create: `docs/qa/internal-release-candidate-validation-2026-09-12.md`

**Step 1:** Criar um commit limpo com a documentação de Task 1.

**Step 2:** Executar `npm ci` e `npm run validate:release-candidate` no mesmo
commit, sem retry para mascarar falha.

**Step 3:** Executar `npm run publication:release-check`; registrar o bloqueio
esperado de evidência externa, se for o único bloqueio.

**Step 4:** Registrar SHA, bateria, artefatos e limites externos; não incluir
credenciais, dados de clientes ou artefatos proprietários.

### Task 3: Revisar e integrar

**Files:**
- Modify: `.specs/features/internal-release-closure-v1/{tasks,validation}.md`

**Step 1:** Rodar `npm test`, `node scripts/check.mjs`, `npm run
publication:check` e `git diff --check`.

**Step 2:** Criar PR, aguardar CI completo e integrar somente se todos os
checks do commit exato estiverem verdes.

**Step 3:** Confirmar que o relatório final mantém Stable/Marketplace em
`NO-GO` até existir prova externa vinculada ao artefato.
