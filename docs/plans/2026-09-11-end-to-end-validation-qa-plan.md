# Plano QA completo — programa de validação ponta a ponta

**Release alvo:** Stable 1.0, após promoção do candidato fechado.

**Entrada:** SHA candidato, checkout limpo, lockfile aprovado, sem P0/P1 aberto,
ambientes externos identificados e artefatos gerados. **Saída:** todos os itens
`EV-001..EV-012` da spec rastreados; qualquer lacuna fica aceita formalmente
como `NO-GO`, nunca implícita.

## Estratégia e prioridade por risco

| Área | Impacto | Probabilidade | Risco | Cobertura obrigatória |
|---|---:|---:|---:|---|
| Permissões, execução e segredo | 5 | 3 | 15 crítico | Unitária, integração, regressão de segurança, revisão e mutation. |
| VSIX/distribuição/upgrade | 5 | 3 | 15 crítico | Build/verify, host instalado, lifecycle local/hosted, install manual. |
| Build/AppServer/RPO | 5 | 3 | 15 crítico | Contrato fail-closed + homologação licenciada. |
| Análise/review CodeGraph | 4 | 3 | 12 alto | Corpus, limite/borda, mutation, analyzer independente e piloto. |
| Memória/Journal/evidência | 4 | 2 | 8 médio | Unidade, integração atômica, recuperação e permissões. |
| TDN/dicionário/Oracle | 4 | 3 | 12 alto | Snapshot/allowlist/negação + ambiente live autorizado. |
| Acessibilidade e onboarding | 4 | 3 | 12 alto | Protocolo manual, pt-BR/en, acessibilidade, UAT. |
| Marketing/publisher/GitHub | 5 | 2 | 10 alto | Auditoria, legal, publisher, supply-chain e verificação pública. |

## Pirâmide de testes e cadência

| Nível | Responsabilidade | Ferramenta/evidência | Cadência |
|---|---|---|---|
| Unidade/propriedade | Funções, políticas, limites, parser e regras | `node --test` | Cada mudança/CI |
| Integração | CLI, MCP, memória, journal, build adapter, snapshots | `node --test`, `npm run smoke` | Cada PR/CI |
| Produto instalado | VSIX e extensão host/TDS | scripts VS Code + CI | Candidate e CI |
| Independente | Mutação, OSV, segredo, publicação | Stryker, scans, `publication-check` | CI/candidate |
| Ambiente admitido | Analisador/Postgres/AppServer | imagens oficiais/lab licenciado | Antes de Stable |
| Humano | Acessibilidade, UX, valor e suporte | protocolos versionados | Antes de Stable |
| Público | Security, provenance, install/download | GitHub/Marketplace | No release candidate público |

## Bateria P0 executável agora

1. Criar checkout temporário no SHA candidato, rodar `npm ci`.
2. Rodar `node --test`, `npm run check`, `npm run smoke` e `npm audit --audit-level=high`.
3. Gerar e verificar release: `npm run build:release` e `npm run verify:release`.
4. Rodar hosts VS Code atual, mínimo e coexistência TDS.
5. Rodar `npm run test:mutation`; o limiar configurado é bloqueante.
6. Rodar `node scripts/publication-check.mjs` no checkout limpo.
7. Reter logs, versões, duração e SHA-256 dos artefatos. Uma falha é investigada,
   corrigida e executada de novo no novo SHA; não é mascarada por retry.

## Protocolos externos que fecham o Stable

### Remote Extension Host

- Abrir a mesma amostra em WSL/Dev Container/SSH que constem na matriz pública.
- Instalar o VSIX pelo comando **Extensions: Install from VSIX** no endpoint.
- Registrar Client/Server VS Code, SO, VSIX hash e **Developer: Show Running Extensions**.
- Executar Doctor, indexação e review; interromper uma operação; confirmar caminho
  remoto e diagnóstico seguro.

### Homologação AppServer

- Usar somente AppServer/RPO/dicionário/includes/DBAccess/License Server de origem
  legítima, ambiente isolado e dados sintéticos.
- Cobrir compilação válida/inválida, include ausente, RPO bloqueado, indisponibilidade,
  timeout/cancel, redaction e auditoria de evidência.
- Não enviar logs, fontes ou credenciais ao repositório público.

### Acessibilidade, UAT e valor

- Revisor que não implementou o fluxo percorre onboarding, Doctor, indexação,
  review, memória, integrações indisponíveis e build supervisionado.
- Registrar teclado sem mouse, leitor de tela, alto contraste, 200% zoom, pt-BR e en.
- No piloto, medir tempo até primeiro valor, sucesso da tarefa, achados úteis/falsos
  positivos e feedback. Não anunciar melhoria de produtividade sem os dados.

### Publicação e rollback

- Confirmar identidade/publisher, domínio, legal/marca, support route e versão
  numérica no Marketplace.
- Publicar somente com release checker verde e aprovação nominal; validar download
  público, checksum e instalação em perfil limpo.
- Executar retirada/rollback em ambiente de ensaio e registrar comunicação.

## Critérios de qualidade

- Cobertura de requisitos: 100% mapeada; nenhum `GAP` sem decisão de risco.
- Flakiness: zero falhas inexplicadas no candidate; repetir somente para diagnóstico.
- Segurança: nenhuma vulnerabilidade moderada+ no `npm audit`, sem segredo/policy
  violation, e scans públicos verdes quando habilitados.
- Defeitos: nenhum P0/P1 aberto; P2 com impacto e decisão documentados.
- Release: evidência exata de commit/artefato; `publication:release-check` e todos
  os G0–G13 verdes; autorização nominal.

## Capacidade e dependências

Automação pode prosseguir sem usuário. A execução externa requer, no mínimo:
uma pessoa de release, um mantenedor do ambiente TOTVS licenciado, um revisor de
acessibilidade/UAT, participantes consentidos de piloto e titular de publisher/
domínio. Cada papel mantém 20–30% de buffer para reproduções e correções; não há
data realista de Stable sem a disponibilidade desses papéis.
