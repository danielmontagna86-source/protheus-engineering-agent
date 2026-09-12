# Code review — descoberta pública e marca

**Data:** 2026-09-12
**Escopo:** `README.md`, manifesto da extensão, documentação de marca/publicação,
spec de descoberta e regressões de publicação. Não há mudança de runtime, MCP,
integração Protheus, credenciais ou política de execução.

## Evidência revisada

- GitHub API do repositório público: About, tópicos, Community Profile,
  proteção de `main`, controles de segurança, checks do commit `975f9f1` e
  release `v0.3.0`.
- Fontes oficiais do manifesto e publishing do VS Code, além de superfícies
  públicas de OpenCode, Cline, Aider, Continue, Roo Code, TDS-VSCode e TOTVS
  EngPro Skills.
- Diff integral da mudança e artefato VSIX recém-empacotado.

## Achados e tratamento

| Severidade | Achado | Tratamento |
| --- | --- | --- |
| Média | O guia de lançamento descrevia um repositório privado, CodeQL pendente e private vulnerability reporting indisponível, apesar do estado público observado. | Corrigido com snapshot datado e teste que rejeita as frases obsoletas. |
| Baixa | A descoberta do VS Code omitia `Programming Languages`, embora ADVPL/TLPP seja a superfície central. | Corrigido no manifesto e validado pelo contrato de publicação e empacotamento VSIX. |
| Baixa | A mensagem pública competia implicitamente com agentes horizontais em vez de tornar explícito o diferencial Protheus. | Posicionamento e README agora priorizam evidência, contexto e coexistência com TDS/hosts de IA. |
| Externo | Marca, publisher, mídia acessível e piloto não podem ser atestados por testes locais. | Mantidos como gates `NO-GO`, sem claims de Stable/Marketplace. |

## Testes executados

| Comando | Resultado |
| --- | --- |
| `npm test` | PASS — 348/348 |
| `node --test test/publication.test.mjs` | PASS — 46/46 |
| `node scripts/check.mjs` | PASS — 64 fontes, 16 manifests |
| `npm audit --audit-level=moderate` | PASS — 0 vulnerabilidades |
| `npm run publication:check` | PASS — 268 arquivos, sem erros/bloqueios no modo development |
| `npm run package:extension` | PASS — VSIX 0.3.1, 28 entradas |
| `git diff --check` | PASS |

## Veredito

**Aprovar para merge.** O change melhora coerência pública e descoberta sem
ampliar permissões, superfícies de execução ou alegações não comprovadas.
Ele não autoriza tag, GitHub Release adicional, Marketplace ou Stable; os gates
externos descritos na especificação e no plano de publicação continuam válidos.
