# Homologação Docker, AppServer e PEA — 2026-09-24

## Decisão

O laboratório autorizado está **apto para desenvolvimento e para a matriz local
PEA → TDS → AppServer**. O responsável atestou em 2026-09-24 que a base de teste
e o RPO usados no laboratório foram obtidos oficialmente da TOTVS. O DBAccess declara
`TOP_NO_LICENSE`; esse estado comercial é registrado, mas não invalida os
resultados funcionais observados. Nenhuma evasão ou licença externa foi aplicada.

Esta execução fecha a pendência técnica do fluxo positivo/negativo no candidato
exato `0.3.9`, melhora a resiliência do laboratório e substitui o antigo erro de
inicialização REST. Durante o teste de AppServer indisponível foi encontrado e
corrigido um falso positivo: a ferramenta pública do TDS informa apenas mudança
de diagnósticos, não confirmação positiva de compilação. O PEA agora falha
fechado com `TDS_COMPILE_SUCCESS_UNPROVEN` quando há zero erros. Timeout,
cancelamento prévio/em voo, AppServer indisponível, banco do laboratório Protheus
e RPO custom indisponível também foram exercitados. A contenção concorrente de
lock do RPO não foi forçada. Nenhuma certificação ou suporte oficial TOTVS é
alegado.

## Autorização e limites

- Responsável pelo laboratório e autorização desta execução:
  `danielmontagna86-source`.
- Escopo autorizado: alterar, recriar, interromper e testar somente o projeto
  Docker local descartável de Protheus usado pelo PEA.
- Fora do escopo: produção, dados reais, credenciais corporativas, bypass de
  licença, publicação no Marketplace e alegação de homologação oficial TOTVS.
- Docker continua sendo infraestrutura privada de QA; não é dependência nem
  componente distribuído pelo produto.

## Candidato e matriz observada

| Item | Evidência |
| --- | --- |
| Commit do candidato | `45a6da5782c5841e0deaa5aafe08953460cddfc1` (`main`) |
| PEA | `0.3.9` |
| VSIX SHA-256 | `72be84d9703ce3eb8069d8109e9ffb73930d8e4a23046ef17725d1721da36d77` |
| TDS | `2.1.4` |
| AppServer | `24.3.1.5`, build `7.00.240223P` |
| DBAccess | `24.1.1.1`, modo declarado `TOP_NO_LICENSE` |
| PostgreSQL | `16.13`, encoding/cliente WIN1252 observado pelo DBAccess |
| Imagem AppServer derivada | `sha256:cac10dcba7803b4377f42327c18b3d9ad415da13498b089412ce8653117b6abf` |

As imagens externas de PostgreSQL, License Server e DBAccess permaneceram
fixadas por digest. A imagem AppServer local acrescenta apenas o INI isolado de
laboratório sobre o empacotamento comunitário também fixado por digest. Essa
origem do contêiner é distinta da procedência oficial da base e dos binários/RPO
de teste e é declarada para não sugerir uma imagem Docker oficial da TOTVS.

## Correções do laboratório

1. Todos os serviços receberam política de reinício `unless-stopped`.
2. Healthchecks TCP brutos foram substituídos por verificações passivas do
   processo e da porta em escuta. Isso removeu os falsos pacotes inválidos que o
   próprio healthcheck enviava ao License Server.
3. REST foi removido desta instância WebApp/TDS; a configuração anterior fazia
   o WebApp cair numa rota HTTPREST 404.
4. WebMonitor e App Monitor, ativados por padrão nas builds atuais, foram
   desligados explicitamente e suas portas deixaram de ser publicadas.
5. O AppServer foi empacotado numa imagem local mínima porque um novo bind mount
   do Windows ficou preso durante a criação do contêiner.
6. Volumes antigos sem referência foram clonados, comparados por contagem e hash
   agregado e só então removidos dos nomes conflitantes; volumes ativos não
   foram apagados.

## Casos executados

### Experimento controlado: RPO custom indisponível

- **Hipótese:** com `RPOCustom` apontando temporariamente para um destino
  inexistente, o PEA/TDS não deve declarar compilação concluída; após restaurar
  o INI, o AppServer deve voltar a saudável e uma compilação direta deve passar.
- **Estado estável:** quatro serviços saudáveis, WebApp/TDS em escuta e hashes
  SHA-256 registrados para `custom.rpo` e `tttm120.rpo`.
- **Blast radius:** somente o contêiner AppServer do laboratório descartável;
  PostgreSQL, DBAccess, License Server e os arquivos RPO não são alterados.
- **Injeção:** substituir apenas o valor de `RPOCustom` no INI por um caminho
  inexistente e reiniciar o AppServer.
- **Abortar se:** algum hash de RPO mudar durante a injeção, o contêiner não
  aceitar restauração do INI ou qualquer outro serviço perder saúde.
- **Rollback obrigatório:** restaurar byte a byte o INI original, reiniciar o
  AppServer, aguardar saúde, comparar os hashes e recompilar a fixture válida.

Resultado: **PASS com abort controlado**. O AppServer recusou iniciar e registrou
`RPO file ... not found`, `Error opening repository file` e
`FAILED TO START APPLICATION SERVER`. O limite de 120 s acionou o rollback. O
INI restaurado ficou idêntico ao original por SHA-256
`40657f3c7af40c09cc7222baa521266ea8acc3b92319aae0b474672d51f23d95`;
os quatro serviços voltaram a saudáveis, o WebApp respondeu HTTP 200 e a
compilação direta positiva/negativa passou novamente. Os hashes dos RPOs foram
preservados durante a injeção. Esta definição foi escrita antes da execução.

| Caso | Resultado |
| --- | --- |
| Compose válido e quatro serviços saudáveis | PASS |
| WebApp `/webapp/` | PASS, HTTP 200 |
| Seleção real `SIGACFG` / `P12` até a tela de login | PASS, sem automação de credencial |
| Encerramento real de `appsrvlinux` | PASS, reinício automático e WebApp recuperado |
| Encerramento real de `dbaccess64` | PASS, reinício automático e saúde recuperada |
| TDS direto, fixture CP1252/LF válida | PASS, retorno `0` e `SUCCESS` |
| TDS direto, include inexistente | EXPECTED FAIL, retorno `-1` e C2090 |
| Escrita real no RPO custom | PASS, `custom.rpo` mudou de `f69331...a6480` para `fc71b2...94dc`; `tttm120.rpo` permaneceu `5bb8b2...ed96` |
| RPO custom indisponível | PASS com abort/rollback: AppServer recusou iniciar, INI foi restaurado byte a byte, RPOs preservados e recompilação pós-recuperação passou |
| Ponte do PEA, fixture válida | PASS fail-closed, `unverified/TDS_COMPILE_SUCCESS_UNPROVEN`, 0 erros e diagnóstico atualizado; prova positiva vem do TDS direto |
| Ponte do PEA, fixture inválida | EXPECTED FAIL, `failed`, 1 erro na linha 2 |
| Ponte do PEA, cancelada antes de iniciar | PASS, `unverified/TDS_TOOL_CANCELLED` |
| Ponte do PEA, timeout de 1 ms | PASS, `unverified/TDS_TOOL_TIMEOUT` |
| Ponte do PEA, cancelamento em voo | PASS, `unverified/TDS_TOOL_CANCELLED` |
| AppServer parado durante a ponte | PASS, `unverified/TDS_COMPILE_SUCCESS_UNPROVEN`; nenhum falso `completed` |
| Banco do laboratório Protheus em transação somente leitura | PASS, PostgreSQL 16.13/WIN1252, 80 tabelas, 159 MB, 0 índices inválidos |
| Catálogo de infraestrutura Protheus | PASS: `env_config`, `protheus_reposit`, `sys_company` e `top_field` presentes |
| Prontidão do dicionário de negócio | NOT INITIALIZED: `SX2`, `SX3` e `SIX` ainda ausentes; `sxsbra.txt` e `sx2.unq` existem em `systemload` |
| Adapter de banco via runtime/MCP | PASS: consulta nomeada, binds exatos, negação de SQL bruto/escrita, limite, redação, 8 leituras concorrentes |
| Timeout/cancelamento no banco | PASS em 36/22 ms; consultas lentas ativas zeradas em 8 ms na execução registrada |

Recibos saneados mantidos fora da árvore pública:

| Recibo | SHA-256 |
| --- | --- |
| TDS direto (`result.json`) | `024bfaa4a66a4e3d085e0962f36a3a9762b161da5fc1238c74e4d17559c6d88b` |
| PEA → TDS (`pea-bridge-result.json`) | `547409a3ea6a215b781863d415594dbef39377f4df2f5b35827fed4d622fe873` |
| PEA → TDS com AppServer indisponível | `a4dcd5f781a15accef44b1550f82dcc5c2210e412c6c8983ad38773983bf9e23` |
| Adapter de banco (`database-adapter-result.json`) | `7650cff2e55df4ec27d79cd90507f5066e8b958ed87a6ca777915f00ec09cdd4` |

Os recibos não contêm senha, token RPO, identidade de usuário ou configuração
de servidor. O hash muda a cada repetição e liga apenas a execução descrita.

## Interpretação do gate G6

O caminho técnico solicitado está comprovado no candidato exato: o PEA chama a
ferramenta pública do TDS, preserva falhas estruturadas, limita espera e
cancelamento e não promove ausência de diagnósticos a sucesso. A compilação
positiva da fonte válida no AppServer é comprovada pelo recibo direto do TDS; a
ponte pública, por limitação do contrato upstream, registra apenas diagnóstico
zero atualizado e mantém o estado `unverified`. Resiliência, exposição local e
restauração após AppServer indisponível também foram verificadas.

G6 permanece **PARTIAL** por dois limites materiais:

1. RPO indisponível foi exercitado com rollback completo, mas a contenção de
   dois escritores tentando obter o lock do RPO não foi forçada;
2. `main`/VSIX `0.3.9` está tecnicamente exercitado, porém a promoção pública
   Stable continua dependente dos demais gates G0–G13 e aprovações de release.

O gate de banco do laboratório passou para o mesmo commit: o produto continuou
sem driver ou credencial embutidos, enquanto um host privado injetou `pg` 8.23.0,
transação `READ ONLY`, allowlist e cancelamento real no servidor. A API de
cancelamento usada pelo harness é de baixo nível e está marcada para mudança no
futuro `pg` 9; isso é uma restrição do harness privado, não dependência pública.

A procedência oficial da base e do RPO é uma declaração nominal do responsável
e não autoriza redistribuição. O catálogo confirma a infraestrutura Protheus,
mas a ausência de `SX2`, `SX3` e `SIX` demonstra que a carga do dicionário de
negócio ainda não foi concluída. A TOTVS orienta manter o dicionário completo
`SXSBRA.TXT` no `systemload` e executar o atualizador apropriado; essa carga é
uma preparação do laboratório, não requisito do produto distribuído.
`TOP_NO_LICENSE` não é usado como bloqueio funcional nem convertido em alegação
de ambiente comercial licenciado.

## Fontes primárias e upstream

- [TOTVS WebMonitor — ativação padrão e `ENABLE=0`](https://tdn.totvs.com/display/tec/TOTVS%2B%7C%2BWebMonitor)
- [TOTVS: configuração do AppServer](https://tdn.totvs.com/pages/viewpage.action?pageId=6064745)
- [TOTVS Framework: migradores e UPDDISTR](https://tdn.totvs.com/display/framework/Framework%2B%7C%2BMigradores)
- [TOTVS: dicionário completo em `systemload` e execução do UPDDISTR](https://tdn.totvs.com/pages/viewpage.action?pageId=374311673)
- [TOTVS Protheus CI Universo](https://github.com/totvs/protheus-ci-universo)
- [Imagem comunitária usada no laboratório](https://hub.docker.com/r/feliperaposo/protheus)
