# Validação — descoberta pública e consistência de marca

**Data da validação:** 2026-09-12
**Decisão:** PASS para o change de descoberta e documentação; não altera o
`NO-GO` de Stable/Marketplace.

| Requisito | Evidência planejada | Estado |
| --- | --- | --- |
| PDR-001 | GitHub API de 2026-09-12: repositório público, Community Profile 100%, proteção `main`, segurança e checks; guia de lançamento atualizado | PASS |
| PDR-002 | Manifesto com `Programming Languages`, `Linters`, `Testing`; 46/46 testes focais e VSIX 0.3.1 empacotado | PASS |
| PDR-003 | README, posicionamento, ícone e preview social revisados; captura real/renderização do card continuam externos | PASS COM GATE EXTERNO |
| PDR-004 | `docs/research/github-brand-discovery-benchmark-2026-09-12.md` com fontes e limites | PASS |
| PDR-005 | `npm test`: 348/348; `node scripts/check.mjs`: 64 fontes/16 manifests; `npm audit`: 0 vulnerabilidades; `publication:check`: PASS; `git diff --check`: PASS | PASS |

## Gates que permanecem externos

Revisão jurídica da marca, atribuição/renderização do preview social, capturas
acessíveis do VSIX, publisher/termos Marketplace, UAT assistiva, piloto humano,
homologação licenciada de AppServer e evidência do artefato do candidato exato.
