# Registro de release — v0.3.9 Preview do GitHub

**Status:** prévia publicada no GitHub; **não** é release Stable nem publicação
no Visual Studio Marketplace.

**Publicada:** 2026-09-15
**Commit exato:** `29993a84c4a30896bfa9e48556ffdd6db040fc45`
**Release:** <https://github.com/danielmontagna86-source/protheus-engineering-agent/releases/tag/v0.3.9>

## Ativos publicados e hashes SHA-256

| Ativo | SHA-256 |
| --- | --- |
| `protheus-engineering-agent-v0.3.9-source.zip` | `20225d040d6c295bb79a57a1b13793928e7c4a50419a20130cae4002e817285b` |
| `protheus-engineering-agent-v0.3.9.cdx.json` | `126239487fb7e8ff97bb9ceed8c3466e35e7515b609787ec06474548d13f480f` |
| `protheus-engineering-agent-v0.3.9.vsix` | `0c4cce8299336438f7208e3b60c844450340f6978e88aae3a62a3ff31dbb0633` |
| `release-manifest-v0.3.9.json` | `8b583a10252a5d99dbb4a89b6bf6931ea3852cd28191aa39c9b5cd2782f0f435` |
| `SHA256SUMS` | `36d39380685cc0880dd78e2b5b31368ad60701cdd4f5b85319bd5a97ffadd483` |

Os cinco ativos foram baixados e tiveram os hashes conferidos contra a API do
GitHub. As atestações dos artefatos distribuíveis foram verificadas. A candidata
também passou `npm run validate:release-candidate` em clone limpo, incluindo
357 testes, VS Code 1.137/1.95.3, coexistência TDS 2.1.3, auditoria sem
vulnerabilidades e mutação de 95,05%.

O commit posterior `877b87bf768067c1858fdfbb787696e2a4d1a2c5` atualizou as
Actions CodeQL de forma atômica; seu CI pós-merge passou, mas ele não altera
estes ativos e não cria uma nova release.

## Limites da prévia

Esta evidência não fecha os gates de uma futura `1.0.0`. Publisher Marketplace,
UAT com tecnologia assistiva, piloto representativo, homologação live adicional
e autorização nominal de release continuam necessários. Não reutilize estes
recibos para uma tag Stable futura.
