# Validação interna do candidato de release

**Data:** 2026-09-12
**Commit validado:** `296f7c077fbe2f178f97f018f69147f07ed2cdca`
**Versão:** `0.3.1`
**Decisão:** PASS interno; Stable e Marketplace permanecem `NO-GO`.

## Bateria executada sem retry

| Camada | Evidência | Resultado |
| --- | --- | --- |
| Instalação bloqueada | `npm ci` | PASS — 446 pacotes auditados, zero vulnerabilidades |
| Regressão e publicação em desenvolvimento | `npm run validate` | PASS — 348 testes, verificação estrutural e auditoria de publicação |
| Benchmark | `npm run benchmark` | PASS — as alegações de produtividade e liderança permanecem `NOT_PROVEN` |
| Caminho crítico | `npm run smoke` | PASS — doctor, index, review e MCP |
| Artefatos | `npm run build:release` + `npm run verify:release` | PASS — source ZIP, VSIX e SBOM reconstruídos/verificados a partir do commit |
| VS Code instalado | host mínimo e atual | PASS — VS Code 1.95.3 e 1.137.0 em perfil/workspace isolados |
| Coexistência | `npm run test:vscode:tds` | PASS — TDS 2.1.3 ativado, zero conflito, multi-root e CP1252/LF preservados |
| Dependências | `npm audit --audit-level=moderate` | PASS — zero vulnerabilidades |
| Mutação | `npm run test:mutation` | PASS — 95,05%, limiar 95%; 837 mutantes mortos, 44 sobreviventes, 8 timeout, zero erro |

## Artefatos verificáveis do candidato

| Arquivo | SHA-256 |
| --- | --- |
| `protheus-engineering-agent-v0.3.1-source.zip` | `59c8325c7027c429b63845a7fc974e1f74001b46e0b05f6272ce8d691427ab1e` |
| `protheus-engineering-agent-v0.3.1.vsix` | `84e2c93a7308641d6a8529d1d1ba4839477debf0fb74bba0be30d54c37ba521a` |
| `protheus-engineering-agent-v0.3.1.cdx.json` | `c6b14c3128585a2f974a747129037abc8f41615b5eaaced7c2e51b90cd7e23f9` |

Os arquivos foram gerados em `release-artifacts/`, intencionalmente fora da
árvore rastreada. Assim, a futura evidência de release pode apontar para um
commit e conjunto de bytes imutáveis sem modificar a própria revisão atestada.

## Checagem fail-closed

`npm run publication:release-check` verificou os artefatos acima com sucesso e
retornou somente `RELEASE_EVIDENCE_INCOMPLETE` para
`release-evidence/v0.3.1.json`. Esse é o comportamento esperado: o arquivo
final precisa vincular receipts públicos, homologação, evidência de publisher e
autorização nominal ao commit e aos artefatos exatos. Não há erro de código,
empacotamento ou dependência oculto nesse bloqueio.

## Gates que esta execução não pode encerrar

1. Publisher e termos do Visual Studio Marketplace, seguido de instalação do
   VSIX baixado do listing público.
2. Homologação com AppServer/RPO/DBAccess licenciados e dados sintéticos.
3. UAT assistiva (teclado, leitor de tela, alto contraste e zoom), capturas
   sanitizadas do VSIX e sessões de primeiro valor com pessoas reais.
4. Piloto representativo, suporte/rollback e receipts públicos vinculados à
   publicação final.

Nenhum desses gates foi simulado ou reclassificado como concluído.
